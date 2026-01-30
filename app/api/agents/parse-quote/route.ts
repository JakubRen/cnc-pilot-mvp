import { NextRequest, NextResponse } from 'next/server'
import {
  GoogleGenerativeAI,
  SchemaType,
  type FunctionCall,
  type FunctionDeclaration,
} from '@google/generative-ai'
import { createClient } from '@/lib/supabase-server'

// =====================================================
// Parse Quote Email → JSON (Google Gemini 2.5 Flash)
// With Function Calling: searches real inventory
// =====================================================

/** Item returned to frontend with inventory status */
interface ParsedQuoteItem {
  part_name: string
  material: string | null
  quantity: number
  unit_price: number | null
  dimensions: string | null
  complexity: 'simple' | 'medium' | 'complex' | null
  notes: string | null
  // Inventory linking
  product_id: string | null
  product_name: string | null
  available_quantity: number | null
  inventory_status: 'in_stock' | 'out_of_stock' | 'not_found'
}

interface ParseQuoteResponse {
  items: ParsedQuoteItem[]
  customer_name: string | null
  customer_email: string | null
  deadline: string | null
  raw_summary: string
}

// =====================================================
// Tool: Search inventory in Supabase
// =====================================================

interface InventorySearchResult {
  product_id: string
  product_name: string
  sku: string
  category: string
  unit: string
  description: string | null
  available_quantity: number
}

async function searchInventory(
  supabase: Awaited<ReturnType<typeof createClient>>,
  companyId: string,
  query: string,
  category?: string
): Promise<InventorySearchResult[]> {
  // Search products by name, sku, or description using ilike
  const searchTerm = `%${query}%`

  let productsQuery = supabase
    .from('products')
    .select(`
      id, name, sku, category, unit, description,
      inventory_locations ( available_quantity )
    `)
    .eq('company_id', companyId)
    .eq('is_active', true)
    .or(`name.ilike.${searchTerm},sku.ilike.${searchTerm},description.ilike.${searchTerm}`)
    .limit(5)

  if (category) {
    productsQuery = productsQuery.eq('category', category)
  }

  const { data: products, error } = await productsQuery

  if (error || !products) {
    console.error('[parse-quote] Inventory search error:', error)
    return []
  }

  return products.map((p) => {
    const locations = (p.inventory_locations || []) as Array<{ available_quantity: number }>
    const totalAvailable = locations.reduce(
      (sum, loc) => sum + (Number(loc.available_quantity) || 0),
      0
    )
    return {
      product_id: p.id,
      product_name: p.name,
      sku: p.sku,
      category: p.category,
      unit: p.unit,
      description: p.description,
      available_quantity: totalAvailable,
    }
  })
}

// =====================================================
// Gemini Tool Definition
// =====================================================

const TOOL_DECLARATIONS: FunctionDeclaration[] = [
  {
    name: 'search_inventory',
    description:
      'Search the company inventory/warehouse database for products by name, material, or SKU. ' +
      'Use this for EVERY part_name and material mentioned in the email to find the exact product ' +
      'from the database. Try common Polish synonyms too (e.g. "kwasówka" → search "nierdzewna", ' +
      '"alu" → search "aluminium").',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        query: {
          type: SchemaType.STRING,
          description: 'Search term (product name, material name, or SKU)',
          nullable: false,
        },
        category: {
          type: SchemaType.STRING,
          description:
            'Optional category filter: "raw_material" for materials, "finished_good" for parts/products, ' +
            '"semi_finished" for semi-finished goods, "tool" for tools, "consumable" for consumables',
          nullable: true,
        },
      },
      required: ['query'],
    },
  },
]

// =====================================================
// System Prompt (updated for tool use)
// =====================================================

const SYSTEM_PROMPT = `You are a CNC machining expert. Your task is to extract quote items from an email or text message.

CRITICAL RULES:
1. For EVERY part_name and material you identify, you MUST call search_inventory to find the real product from the database.
2. Try multiple search queries if the first doesn't match (e.g. for "kwasówka" try: "kwasówka", "nierdzewna", "stal nierdzewna", "1.4301").
3. For parts/products use category "finished_good". For materials use category "raw_material".
4. Use the EXACT product name from search results - never invent names.
5. If search returns no results, set product_id to null and inventory_status to "not_found".
6. If search finds the product but available_quantity is 0, set inventory_status to "out_of_stock".

After searching, return JSON matching this schema:
{
  "items": [
    {
      "part_name": "string (EXACT name from search_inventory or original if not found)",
      "material": "string or null (EXACT name from search_inventory or original if not found)",
      "quantity": "number (default 1)",
      "unit_price": "number or null",
      "dimensions": "string or null (e.g. '100x50x20mm')",
      "complexity": "'simple' | 'medium' | 'complex' | null",
      "notes": "string or null",
      "product_id": "string or null (UUID from search_inventory)",
      "product_name": "string or null (exact name from DB)",
      "available_quantity": "number or null (stock level from DB)",
      "inventory_status": "'in_stock' | 'out_of_stock' | 'not_found'"
    }
  ],
  "customer_name": "string or null",
  "customer_email": "string or null",
  "deadline": "string or null (ISO YYYY-MM-DD)",
  "raw_summary": "string (1-2 sentence summary in Polish)"
}`

// =====================================================
// POST Handler
// =====================================================

export async function POST(request: NextRequest) {
  try {
    // Auth check
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get company_id
    const { data: userProfile } = await supabase
      .from('users')
      .select('company_id')
      .eq('auth_id', user.id)
      .single()

    if (!userProfile?.company_id) {
      return NextResponse.json({ error: 'User has no company' }, { status: 403 })
    }

    const companyId = userProfile.company_id

    // Validate API key
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY
    if (!apiKey) {
      console.error('[parse-quote] Missing GOOGLE_GENERATIVE_AI_API_KEY')
      return NextResponse.json({ error: 'AI service not configured' }, { status: 503 })
    }

    // Parse request body
    const body = await request.json()
    const emailText: string | undefined = body.text

    if (!emailText || typeof emailText !== 'string' || emailText.trim().length === 0) {
      return NextResponse.json(
        { error: 'Field "text" is required and must be a non-empty string' },
        { status: 400 }
      )
    }

    if (emailText.length > 10_000) {
      return NextResponse.json(
        { error: 'Text too long. Maximum 10,000 characters.' },
        { status: 400 }
      )
    }

    // =====================================================
    // Agent Loop with Function Calling
    // =====================================================

    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      tools: [{ functionDeclarations: TOOL_DECLARATIONS }],
    })

    const chat = model.startChat({
      generationConfig: { temperature: 0.1 },
    })

    // Step 1: Send email text to model
    let response = await chat.sendMessage([
      SYSTEM_PROMPT,
      `\n\n--- EMAIL TEXT ---\n${emailText}\n--- END ---`,
    ])

    // Step 2: Agent loop - handle function calls (max 10 rounds to prevent infinite loops)
    const MAX_ROUNDS = 10
    for (let round = 0; round < MAX_ROUNDS; round++) {
      const candidate = response.response.candidates?.[0]
      const parts = candidate?.content?.parts

      if (!parts) break

      // Collect all function calls from this response
      const functionCalls = parts.filter(
        (p): p is { functionCall: FunctionCall } => 'functionCall' in p
      )

      if (functionCalls.length === 0) break // No more tool calls - model is done

      // Execute all function calls
      const functionResponses = await Promise.all(
        functionCalls.map(async (part) => {
          const call = part.functionCall
          if (call.name === 'search_inventory') {
            const args = call.args as { query: string; category?: string }
            const results = await searchInventory(
              supabase,
              companyId,
              args.query,
              args.category
            )
            return {
              functionResponse: {
                name: call.name,
                response: {
                  results,
                  count: results.length,
                  query: args.query,
                },
              },
            }
          }
          return {
            functionResponse: {
              name: call.name,
              response: { error: 'Unknown function' },
            },
          }
        })
      )

      // Send results back to model
      response = await chat.sendMessage(functionResponses)
    }

    // Step 3: Extract final JSON from model response
    const responseText = response.response.text()

    let parsed: ParseQuoteResponse
    try {
      parsed = JSON.parse(responseText)
    } catch {
      console.error('[parse-quote] Gemini returned invalid JSON:', responseText.slice(0, 500))
      return NextResponse.json(
        { error: 'AI returned invalid response. Try again.' },
        { status: 502 }
      )
    }

    // Validate & sanitize
    if (!Array.isArray(parsed.items)) {
      parsed.items = []
    }

    parsed.items = parsed.items.map((item) => ({
      part_name: String(item.part_name || 'Unknown part'),
      material: item.material ?? null,
      quantity: Math.max(1, Math.floor(Number(item.quantity) || 1)),
      unit_price: item.unit_price != null ? Number(item.unit_price) : null,
      dimensions: item.dimensions ?? null,
      complexity: ['simple', 'medium', 'complex'].includes(item.complexity as string)
        ? item.complexity
        : null,
      notes: item.notes ?? null,
      product_id: item.product_id ?? null,
      product_name: item.product_name ?? null,
      available_quantity: item.available_quantity != null ? Number(item.available_quantity) : null,
      inventory_status: ['in_stock', 'out_of_stock', 'not_found'].includes(item.inventory_status)
        ? item.inventory_status
        : 'not_found',
    }))

    return NextResponse.json({
      success: true,
      data: parsed,
      model: 'gemini-2.5-flash',
      items_count: parsed.items.length,
    })
  } catch (error) {
    console.error('[parse-quote] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
