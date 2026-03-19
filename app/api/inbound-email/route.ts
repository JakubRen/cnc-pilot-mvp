// =====================================================
// API: Inbound Email → Auto Quote Draft
// =====================================================
// POST /api/inbound-email
//
// Receives emails from webhook providers (Postmark, Resend, generic)
// → Parses with Gemini AI → Matches customer → Creates draft quote
// → Notifies company users
//
// Security: Verified via INBOUND_EMAIL_SECRET header
// =====================================================

import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { sanitizeUserInput, sanitizeField, FIELD_LIMITS } from '@/lib/ai/security/sanitizer'
import { logger } from '@/lib/logger'

// =====================================================
// Types
// =====================================================

interface NormalizedEmail {
  from_email: string
  from_name: string | null
  subject: string
  text: string
}

interface ParsedQuoteData {
  items: Array<{
    part_name: string
    material: string | null
    quantity: number
    dimensions: string | null
    complexity: 'simple' | 'medium' | 'complex' | null
    notes: string | null
  }>
  customer_name: string | null
  customer_email: string | null
  deadline: string | null
  raw_summary: string
}

// =====================================================
// Email Normalizer (provider-agnostic)
// =====================================================

function normalizeEmail(body: Record<string, unknown>): NormalizedEmail | null {
  // Postmark inbound format
  if (body.FromFull || body.TextBody) {
    const fromFull = body.FromFull as { Email?: string; Name?: string } | undefined
    return {
      from_email: fromFull?.Email || (body.From as string) || '',
      from_name: fromFull?.Name || (body.FromName as string) || null,
      subject: (body.Subject as string) || '',
      text: (body.TextBody as string) || (body.HtmlBody as string) || '',
    }
  }

  // Resend inbound format
  if (body.type === 'email.received' && body.data) {
    const data = body.data as Record<string, unknown>
    return {
      from_email: (data.from as string) || '',
      from_name: null,
      subject: (data.subject as string) || '',
      text: (data.text as string) || (data.html as string) || '',
    }
  }

  // Generic format (for testing / manual triggers)
  if (body.from_email || body.text) {
    return {
      from_email: (body.from_email as string) || '',
      from_name: (body.from_name as string) || null,
      subject: (body.subject as string) || '',
      text: (body.text as string) || '',
    }
  }

  return null
}

// =====================================================
// Gemini Parser (simplified for draft quotes)
// =====================================================

const PARSE_PROMPT = `You are a CNC machining expert. Extract quote request items from this email.

Return JSON matching this schema:
{
  "items": [
    {
      "part_name": "string",
      "material": "string or null",
      "quantity": "number (default 1)",
      "dimensions": "string or null (e.g. '100x50x20mm')",
      "complexity": "'simple' | 'medium' | 'complex' | null",
      "notes": "string or null"
    }
  ],
  "customer_name": "string or null (sender name if found)",
  "customer_email": "string or null (sender email if found)",
  "deadline": "string or null (ISO YYYY-MM-DD)",
  "raw_summary": "string (1-2 sentence summary in Polish)"
}

If no items can be extracted, return empty items array.
Always respond with valid JSON only.`

async function parseEmailWithAI(emailText: string): Promise<ParsedQuoteData | null> {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY
  if (!apiKey) {
    logger.error('[inbound-email] Missing GOOGLE_GENERATIVE_AI_API_KEY')
    return null
  }

  const sanitized = sanitizeUserInput(emailText, {
    maxLength: FIELD_LIMITS.LONG,
    checkInjection: true,
    stripHtml: true,
  })

  if (sanitized.injectionDetected) {
    logger.warn('[inbound-email] Potential prompt injection detected')
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

    const result = await model.generateContent([
      PARSE_PROMPT,
      `\n\n--- EMAIL TEXT ---\n${sanitized.text}\n--- END ---`,
    ])

    let jsonText = result.response.text().trim()
    if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
    }

    const parsed: ParsedQuoteData = JSON.parse(jsonText)

    // Sanitize output
    parsed.customer_name = parsed.customer_name ? sanitizeField(parsed.customer_name, FIELD_LIMITS.SHORT) : null
    parsed.customer_email = parsed.customer_email ? sanitizeField(parsed.customer_email, FIELD_LIMITS.SHORT) : null
    parsed.raw_summary = sanitizeField(parsed.raw_summary, FIELD_LIMITS.MEDIUM) || ''

    if (!Array.isArray(parsed.items)) parsed.items = []

    parsed.items = parsed.items.map(item => ({
      part_name: sanitizeField(item.part_name, FIELD_LIMITS.SHORT) || 'Nieznana część',
      material: item.material ? sanitizeField(item.material, FIELD_LIMITS.SHORT) : null,
      quantity: Math.max(1, Math.floor(Number(item.quantity) || 1)),
      dimensions: item.dimensions ? sanitizeField(item.dimensions, FIELD_LIMITS.SHORT) : null,
      complexity: ['simple', 'medium', 'complex'].includes(item.complexity as string) ? item.complexity : null,
      notes: item.notes ? sanitizeField(item.notes, FIELD_LIMITS.MEDIUM) : null,
    }))

    return parsed
  } catch (error) {
    logger.error('[inbound-email] Gemini parse error', { error })
    return null
  }
}

// =====================================================
// POST Handler
// =====================================================

export async function POST(request: NextRequest) {
  try {
    // 1. Verify webhook secret
    const secret = process.env.INBOUND_EMAIL_SECRET
    if (secret) {
      const providedSecret =
        request.headers.get('x-webhook-secret') ||
        request.headers.get('authorization')?.replace('Bearer ', '')

      if (providedSecret !== secret) {
        logger.warn('[inbound-email] Invalid webhook secret')
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
    }

    // 2. Parse and normalize email
    const body = await request.json()
    const email = normalizeEmail(body)

    if (!email || !email.text.trim()) {
      return NextResponse.json(
        { error: 'Could not parse email payload or empty body' },
        { status: 400 }
      )
    }

    logger.info('[inbound-email] Received email', {
      from: email.from_email,
      subject: email.subject,
      textLength: email.text.length,
    })

    // 3. Find company (use env var for MVP, later: map by "to" address)
    const companyId = process.env.INBOUND_EMAIL_COMPANY_ID
    if (!companyId) {
      logger.error('[inbound-email] Missing INBOUND_EMAIL_COMPANY_ID env var')
      return NextResponse.json({ error: 'Inbound email not configured' }, { status: 503 })
    }

    // 4. Parse email with AI
    const fullText = email.subject
      ? `Temat: ${email.subject}\n\n${email.text}`
      : email.text

    const parsed = await parseEmailWithAI(fullText)

    if (!parsed || parsed.items.length === 0) {
      logger.info('[inbound-email] No items extracted from email', { from: email.from_email })
      return NextResponse.json({
        success: true,
        action: 'skipped',
        reason: 'No quote items found in email',
      })
    }

    // 5. Match customer by sender email
    let customerId: string | null = null
    let customerName = parsed.customer_name || email.from_name || email.from_email

    if (email.from_email) {
      const { data: customer } = await supabaseAdmin
        .from('customers')
        .select('id, name')
        .eq('company_id', companyId)
        .ilike('email', email.from_email)
        .limit(1)
        .single()

      if (customer) {
        customerId = customer.id
        customerName = customer.name
      }
    }

    // 6. Generate quote number and token
    const { data: quoteNumber, error: numError } = await supabaseAdmin
      .rpc('generate_quote_number', { p_company_id: companyId })

    if (numError || !quoteNumber) {
      logger.error('[inbound-email] Failed to generate quote number', { error: numError })
      return NextResponse.json({ error: 'Failed to generate quote number' }, { status: 500 })
    }

    const { data: token, error: tokenError } = await supabaseAdmin
      .rpc('generate_quote_token')

    if (tokenError || !token) {
      logger.error('[inbound-email] Failed to generate token', { error: tokenError })
      return NextResponse.json({ error: 'Failed to generate token' }, { status: 500 })
    }

    // 7. Create draft quote
    const totalQuantity = parsed.items.reduce((sum, i) => sum + i.quantity, 0)
    const summaryPartName = parsed.items.length === 1
      ? parsed.items[0].part_name
      : `${parsed.items.length} pozycji`
    const summaryMaterial = parsed.items.length === 1
      ? parsed.items[0].material
      : (parsed.items.length > 1 ? 'Różne' : null)

    const { data: quote, error: quoteError } = await supabaseAdmin
      .from('quotes')
      .insert({
        quote_number: quoteNumber,
        company_id: companyId,
        customer_id: customerId,
        customer_name: customerName,
        customer_email: email.from_email || parsed.customer_email || null,
        part_name: summaryPartName,
        material: summaryMaterial,
        quantity: totalQuantity,
        total_price: 0, // Draft — pricing pending
        deadline: parsed.deadline || null,
        status: 'draft',
        token,
        reasoning: `Auto-import z emaila: ${parsed.raw_summary}`,
        notes: `Źródło: email od ${email.from_email || 'nieznany'}\nTemat: ${email.subject || 'brak'}\n\n${parsed.raw_summary}`,
      })
      .select('id')
      .single()

    if (quoteError || !quote) {
      logger.error('[inbound-email] Failed to create quote', { error: quoteError })
      return NextResponse.json({ error: 'Failed to create draft quote' }, { status: 500 })
    }

    // 8. Create quote items
    if (parsed.items.length > 0) {
      const { error: itemsError } = await supabaseAdmin
        .from('quote_items')
        .insert(
          parsed.items.map(item => ({
            quote_id: quote.id,
            part_name: item.part_name,
            material: item.material,
            quantity: item.quantity,
            unit_price: 0,
            total_price: 0,
            dimensions: item.dimensions,
            complexity: item.complexity,
            notes: item.notes,
          }))
        )

      if (itemsError) {
        logger.error('[inbound-email] Failed to create quote items', { error: itemsError })
      }
    }

    // 9. Notify company admins/managers
    const { data: companyUsers } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('company_id', companyId)
      .in('role', ['owner', 'admin', 'manager'])

    if (companyUsers && companyUsers.length > 0) {
      const notifications = companyUsers.map(user => ({
        user_id: user.id,
        company_id: companyId,
        type: 'info' as const,
        title: `Nowa wycena email od ${customerName}`,
        message: `${parsed.raw_summary} (${parsed.items.length} pozycji)`,
        link: `/quotes/${quote.id}`,
      }))

      const { error: notifError } = await supabaseAdmin
        .from('notifications')
        .insert(notifications)

      if (notifError) {
        logger.error('[inbound-email] Failed to create notifications', { error: notifError })
      }
    }

    logger.info('[inbound-email] Draft quote created', {
      quoteId: quote.id,
      quoteNumber,
      customerName,
      itemCount: parsed.items.length,
      customerMatched: !!customerId,
    })

    return NextResponse.json({
      success: true,
      action: 'quote_created',
      quote_id: quote.id,
      quote_number: quoteNumber,
      items_count: parsed.items.length,
      customer_matched: !!customerId,
    })
  } catch (error) {
    logger.error('[inbound-email] Unexpected error', { error })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
