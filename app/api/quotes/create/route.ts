// =====================================================
// API: Create Quote
// =====================================================
// POST /api/quotes/create
// Creates new quote with portal link
// =====================================================

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { logger } from '@/lib/logger'
import type { CreateQuoteInput, CreateQuoteResponse } from '@/types/quotes'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Nie jesteś zalogowany' },
        { status: 401 }
      )
    }

    // Get user profile
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('id, company_id, full_name')
      .eq('auth_id', user.id)
      .single()

    if (profileError || !userProfile?.company_id) {
      return NextResponse.json(
        { error: 'Nie znaleziono profilu użytkownika lub firmy' },
        { status: 400 }
      )
    }

    // Parse request body
    const body: CreateQuoteInput = await request.json()

    // Validate required fields
    if (!body.customer_name || !body.quantity || !body.total_price) {
      return NextResponse.json(
        { error: 'Brak wymaganych pól: customer_name, quantity, total_price' },
        { status: 400 }
      )
    }

    // Generate quote number
    const { data: quoteNumber, error: quoteNumberError } = await supabase
      .rpc('generate_quote_number', { p_company_id: userProfile.company_id })

    if (quoteNumberError || !quoteNumber) {
      logger.error('Failed to generate quote number', { error: quoteNumberError })
      return NextResponse.json(
        { error: 'Nie udało się wygenerować numeru oferty' },
        { status: 500 }
      )
    }

    // Generate random token for portal
    const { data: token, error: tokenError } = await supabase
      .rpc('generate_quote_token')

    if (tokenError || !token) {
      logger.error('Failed to generate token', { error: tokenError })
      return NextResponse.json(
        { error: 'Nie udało się wygenerować tokenu' },
        { status: 500 }
      )
    }

    // Calculate price per unit
    const pricePerUnit = body.total_price / body.quantity

    // Create quote
    const { data: quote, error: createError } = await supabase
      .from('quotes')
      .insert({
        quote_number: quoteNumber,
        company_id: userProfile.company_id,
        customer_name: body.customer_name,
        customer_email: body.customer_email || null,
        customer_phone: body.customer_phone || null,
        part_name: body.part_name || null,
        material: body.material || null,
        quantity: body.quantity,
        deadline: body.deadline || null,
        total_price: body.total_price,
        price_per_unit: pricePerUnit,
        breakdown: body.breakdown || null,
        pricing_method: body.pricing_method || null,
        confidence_score: body.confidence_score || null,
        reasoning: body.reasoning || null,
        status: 'draft',
        token: token,
        created_by: userProfile.id,
      })
      .select()
      .single()

    if (createError) {
      logger.error('Failed to create quote', { error: createError })
      return NextResponse.json(
        { error: 'Nie udało się utworzyć oferty: ' + createError.message },
        { status: 500 }
      )
    }

    // Generate portal URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const portalUrl = `${baseUrl}/quotes/view/${token}`

    // Generate mailto URL
    const subject = encodeURIComponent(`Oferta ${quoteNumber}`)
    const emailBody = encodeURIComponent(
      `Dzień dobry,\n\n` +
      `Przesyłam ofertę na zlecenie: ${body.part_name || 'zlecenie CNC'}\n\n` +
      `Szczegóły oferty:\n` +
      `${portalUrl}\n\n` +
      `Oferta ważna przez 14 dni.\n\n` +
      `Pozdrawiam,\n` +
      `${userProfile.full_name}`
    )

    const mailtoUrl = body.customer_email
      ? `mailto:${body.customer_email}?subject=${subject}&body=${emailBody}`
      : `mailto:?subject=${subject}&body=${emailBody}`

    const response: CreateQuoteResponse = {
      quote,
      portal_url: portalUrl,
      mailto_url: mailtoUrl
    }

    logger.info('Quote created successfully', {
      quote_id: quote.id,
      quote_number: quoteNumber,
      customer: body.customer_name,
      total_price: body.total_price
    })

    return NextResponse.json(response, { status: 201 })

  } catch (error) {
    logger.error('Error creating quote', { error })

    return NextResponse.json(
      {
        error: error instanceof Error
          ? error.message
          : 'Nie udało się utworzyć oferty',
      },
      { status: 500 }
    )
  }
}
