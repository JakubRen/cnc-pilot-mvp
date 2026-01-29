import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { createClient } from '@/lib/supabase-server'

// =====================================================
// Parse Quote Email → JSON (Google Gemini 1.5 Flash)
// =====================================================

/** Shape returned by Gemini for each extracted item */
interface ParsedQuoteItem {
  part_name: string
  material: string | null
  quantity: number
  unit_price: number | null
  dimensions: string | null
  complexity: 'simple' | 'medium' | 'complex' | null
  notes: string | null
}

interface ParseQuoteResponse {
  items: ParsedQuoteItem[]
  customer_name: string | null
  customer_email: string | null
  deadline: string | null
  raw_summary: string
}

const SYSTEM_PROMPT = `You are a CNC machining expert. Your task is to extract quote items from an email or text message.

Return ONLY valid JSON matching this schema:
{
  "items": [
    {
      "part_name": "string (required - name of the part)",
      "material": "string or null (e.g. 'stal nierdzewna', 'aluminium 6061', 'PA6')",
      "quantity": "number (default 1 if not specified)",
      "unit_price": "number or null (price per unit if mentioned)",
      "dimensions": "string or null (e.g. '100x50x20mm', 'fi 30x150mm')",
      "complexity": "'simple' | 'medium' | 'complex' | null (estimate based on description)",
      "notes": "string or null (any extra info about this item)"
    }
  ],
  "customer_name": "string or null (sender/company name if found)",
  "customer_email": "string or null (email address if found)",
  "deadline": "string or null (ISO date YYYY-MM-DD if deadline mentioned)",
  "raw_summary": "string (1-2 sentence summary of the request in Polish)"
}

Rules:
- Extract ALL distinct parts/items from the text
- If quantity is not specified, default to 1
- Estimate complexity: simple (basic turning/milling), medium (multi-operation), complex (5-axis, tight tolerances)
- Keep material names in their original language (usually Polish)
- If no items can be extracted, return empty items array with raw_summary explaining why
- Return ONLY the JSON object, no markdown, no explanation`

export async function POST(request: NextRequest) {
  try {
    // Auth check
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Validate API key exists
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY
    if (!apiKey) {
      console.error('[parse-quote] Missing GOOGLE_GENERATIVE_AI_API_KEY')
      return NextResponse.json(
        { error: 'AI service not configured' },
        { status: 503 }
      )
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

    // Limit input length (prevent abuse)
    if (emailText.length > 10_000) {
      return NextResponse.json(
        { error: 'Text too long. Maximum 10,000 characters.' },
        { status: 400 }
      )
    }

    // Call Gemini
    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.1,
      },
    })

    const result = await model.generateContent([
      SYSTEM_PROMPT,
      `\n\n--- EMAIL TEXT ---\n${emailText}\n--- END ---`,
    ])

    const responseText = result.response.text()

    // Parse and validate Gemini output
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

    // Basic validation of parsed structure
    if (!Array.isArray(parsed.items)) {
      parsed.items = []
    }

    // Sanitize items
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
    }))

    return NextResponse.json({
      success: true,
      data: parsed,
      model: 'gemini-2.5-flash',
      items_count: parsed.items.length,
    })
  } catch (error) {
    console.error('[parse-quote] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
