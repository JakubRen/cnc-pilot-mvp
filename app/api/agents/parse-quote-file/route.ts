import { NextRequest, NextResponse } from 'next/server'
import {
  GoogleGenerativeAI,
  SchemaType,
  type FunctionCall,
  type FunctionDeclaration,
} from '@google/generative-ai'
import { createClient } from '@/lib/supabase-server'
import { getUserProfile } from '@/lib/auth-server'
import { sanitizeUserInput, sanitizeField, FIELD_LIMITS } from '@/lib/ai/security/sanitizer'
import {
  validateFile,
  isImageType,
  fuzzyMatchCustomer,
  type ExistingCustomer,
} from '@/lib/ai/features/quote-pdf-import'

// =====================================================
// POST /api/agents/parse-quote-file
// Parses a PDF or image file into structured quote data.
// Uses Gemini multimodal for images, text extraction for PDFs.
// =====================================================

/** Item returned to frontend */
interface ParsedQuoteItem {
  part_name: string
  material: string | null
  quantity: number
  unit_price: number | null
  dimensions: string | null
  complexity: 'simple' | 'medium' | 'complex' | null
  notes: string | null
}

interface ParseQuoteFileResponse {
  items: ParsedQuoteItem[]
  customer_name: string | null
  customer_email: string | null
  deadline: string | null
  raw_summary: string
  customer_match: {
    customer_id: string | null
    match_confidence: number
    is_new_customer: boolean
  }
}

// =====================================================
// Gemini Tool: Search inventory
// (Same as parse-quote/route.ts for consistency)
// =====================================================

interface InventorySearchResult {
  product_id: string
  product_name: string
  sku: string
  category: string
  available_quantity: number
}

async function searchInventory(
  supabase: Awaited<ReturnType<typeof createClient>>,
  companyId: string,
  query: string
): Promise<InventorySearchResult[]> {
  const searchTerm = `%${query}%`
  const { data: products, error } = await supabase
    .from('products')
    .select(`id, name, sku, category, inventory_locations ( available_quantity )`)
    .eq('company_id', companyId)
    .eq('is_active', true)
    .or(`name.ilike.${searchTerm},sku.ilike.${searchTerm}`)
    .limit(5)

  if (error || !products) return []

  return products.map((p) => {
    const locations = (p.inventory_locations || []) as Array<{ available_quantity: number }>
    const totalAvailable = locations.reduce((sum, loc) => sum + (Number(loc.available_quantity) || 0), 0)
    return {
      product_id: p.id,
      product_name: p.name,
      sku: p.sku,
      category: p.category,
      available_quantity: totalAvailable,
    }
  })
}

const TOOL_DECLARATIONS: FunctionDeclaration[] = [
  {
    name: 'search_inventory',
    description: 'Search company inventory by product name or SKU.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        query: { type: SchemaType.STRING, description: 'Search term', nullable: false },
      },
      required: ['query'],
    },
  },
]

const SYSTEM_PROMPT = `You are a CNC machining expert. Extract quote items from this document (PDF text or image).

Return JSON:
{
  "items": [{ "part_name": "string", "material": "string|null", "quantity": number, "unit_price": number|null, "dimensions": "string|null", "complexity": "simple|medium|complex|null", "notes": "string|null" }],
  "customer_name": "string|null",
  "customer_email": "string|null",
  "deadline": "YYYY-MM-DD|null",
  "raw_summary": "1-2 sentence summary in Polish"
}

Use search_inventory for every part/material to find real products in the database.`

// =====================================================
// Error Handler
// =====================================================

function handleAIError(error: unknown): NextResponse {
  const errorMessage = error instanceof Error ? error.message : String(error)
  const errorStatus = (error as { status?: number })?.status

  if (errorStatus === 429 || errorMessage.includes('429') || errorMessage.includes('RESOURCE_EXHAUSTED')) {
    return NextResponse.json({ error: 'System AI jest przeciazony. Odczekaj chwile.' }, { status: 429 })
  }
  if (errorStatus === 404 || errorMessage.includes('not found')) {
    return NextResponse.json({ error: 'Model AI niedostepny.' }, { status: 503 })
  }
  return NextResponse.json({ error: 'Blad komunikacji z AI.' }, { status: 502 })
}

// =====================================================
// POST Handler
// =====================================================

export async function POST(request: NextRequest) {
  try {
    const userProfile = await getUserProfile()
    if (!userProfile?.company_id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const companyId = userProfile.company_id
    const supabase = await createClient()

    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'AI service not configured' }, { status: 503 })
    }

    // Parse FormData
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'Field "file" is required' }, { status: 400 })
    }

    // Validate file
    const validation = validateFile({
      fileType: file.type,
      fileSizeBytes: file.size,
    })

    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }

    // Read file content
    const buffer = Buffer.from(await file.arrayBuffer())

    // Build Gemini input parts
    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      tools: [{ functionDeclarations: TOOL_DECLARATIONS }],
    })

    const chat = model.startChat({ generationConfig: { temperature: 0.1 } })

    const messageParts: Array<{ text: string } | { inlineData: { data: string; mimeType: string } }> = [
      { text: SYSTEM_PROMPT },
    ]

    if (isImageType(file.type)) {
      // Image: send as inline data for multimodal
      messageParts.push({
        inlineData: {
          data: buffer.toString('base64'),
          mimeType: file.type,
        },
      })
      messageParts.push({ text: '\n\nExtract quote data from the image above.' })
    } else {
      // PDF: extract text content (basic approach — raw buffer as UTF-8)
      // For proper PDF parsing, a library like pdf-parse would be needed
      const textContent = buffer.toString('utf-8')
      const sanitized = sanitizeUserInput(textContent, {
        maxLength: FIELD_LIMITS.LONG,
        checkInjection: true,
        stripHtml: true,
      })
      messageParts.push({ text: `\n\n--- DOCUMENT TEXT ---\n${sanitized.text}\n--- END ---` })
    }

    // Send to Gemini
    let response
    try {
      response = await chat.sendMessage(messageParts)
    } catch (aiError: unknown) {
      return handleAIError(aiError)
    }

    // Agent loop for function calls (max 10 rounds)
    const MAX_ROUNDS = 10
    for (let round = 0; round < MAX_ROUNDS; round++) {
      const candidate = response.response.candidates?.[0]
      const parts = candidate?.content?.parts
      if (!parts) break

      const functionCalls = parts.filter(
        (p): p is { functionCall: FunctionCall } => 'functionCall' in p
      )
      if (functionCalls.length === 0) break

      const functionResponses = await Promise.all(
        functionCalls.map(async (part) => {
          const call = part.functionCall
          if (call.name === 'search_inventory') {
            const args = call.args as { query: string }
            const results = await searchInventory(supabase, companyId, args.query)
            return {
              functionResponse: {
                name: call.name,
                response: { results, count: results.length },
              },
            }
          }
          return { functionResponse: { name: call.name, response: { error: 'Unknown function' } } }
        })
      )

      try {
        response = await chat.sendMessage(functionResponses)
      } catch (aiError: unknown) {
        return handleAIError(aiError)
      }
    }

    // Extract JSON
    let responseText: string
    try {
      responseText = response.response.text()
    } catch {
      return NextResponse.json({ error: 'Blad przetwarzania danych z AI.' }, { status: 502 })
    }

    let parsed: ParseQuoteFileResponse
    try {
      let jsonText = responseText.trim()
      if (jsonText.startsWith('```')) {
        jsonText = jsonText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
      }
      parsed = JSON.parse(jsonText)
    } catch {
      console.error('[parse-quote-file] Invalid JSON:', responseText.slice(0, 500))
      return NextResponse.json({ error: 'Blad przetwarzania danych z AI.' }, { status: 502 })
    }

    // Sanitize output
    parsed.customer_name = parsed.customer_name ? sanitizeField(parsed.customer_name, FIELD_LIMITS.SHORT) : null
    parsed.customer_email = parsed.customer_email ? sanitizeField(parsed.customer_email, FIELD_LIMITS.SHORT) : null
    parsed.raw_summary = sanitizeField(parsed.raw_summary, FIELD_LIMITS.MEDIUM) || ''

    if (!Array.isArray(parsed.items)) parsed.items = []

    parsed.items = parsed.items.map((item) => ({
      part_name: sanitizeField(item.part_name, FIELD_LIMITS.SHORT) || 'Unknown part',
      material: item.material ? sanitizeField(item.material, FIELD_LIMITS.SHORT) : null,
      quantity: Math.max(1, Math.floor(Number(item.quantity) || 1)),
      unit_price: item.unit_price != null ? Number(item.unit_price) : null,
      dimensions: item.dimensions ? sanitizeField(item.dimensions, FIELD_LIMITS.DIMENSIONS) : null,
      complexity: ['simple', 'medium', 'complex'].includes(item.complexity as string)
        ? item.complexity
        : null,
      notes: item.notes ? sanitizeField(item.notes, FIELD_LIMITS.MEDIUM) : null,
    }))

    // Customer auto-matching
    const { data: existingCustomers } = await supabase
      .from('customers')
      .select('id, name, email')
      .eq('company_id', companyId)
      .eq('is_active', true)

    const customerMatch = fuzzyMatchCustomer(
      parsed.customer_name || '',
      (existingCustomers || []) as ExistingCustomer[]
    )

    return NextResponse.json({
      success: true,
      data: {
        items: parsed.items,
        customer_name: customerMatch.customerName,
        customer_email: parsed.customer_email || customerMatch.customerEmail,
        deadline: parsed.deadline,
        raw_summary: parsed.raw_summary,
        customer_match: {
          customer_id: customerMatch.customerId,
          match_confidence: customerMatch.matchConfidence,
          is_new_customer: customerMatch.isNewCustomer,
        },
      },
      source_type: isImageType(file.type) ? 'image_multimodal' : 'pdf_text',
      model: 'gemini-2.5-flash',
      items_count: parsed.items.length,
    })
  } catch (error) {
    console.error('[parse-quote-file] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
