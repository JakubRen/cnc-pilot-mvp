// =====================================================
// API: Accept Quote
// =====================================================
// POST /api/quotes/accept
// Public endpoint - accepts quote and auto-converts to order
// =====================================================

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { logger } from '@/lib/logger'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Parse request body
    const { token } = await request.json()

    if (!token) {
      return NextResponse.json(
        { error: 'Token wymagany' },
        { status: 400 }
      )
    }

    // Get quote by token (PUBLIC - no auth required)
    const { data: quote, error: fetchError } = await supabase
      .from('quotes')
      .select('*')
      .eq('token', token)
      .single()

    if (fetchError || !quote) {
      return NextResponse.json(
        { error: 'Oferta nie znaleziona' },
        { status: 404 }
      )
    }

    // Check if expired
    if (quote.expires_at && new Date(quote.expires_at) < new Date()) {
      return NextResponse.json(
        { error: 'Oferta wygasła' },
        { status: 400 }
      )
    }

    // Check if already accepted
    if (quote.status === 'accepted') {
      return NextResponse.json(
        { error: 'Oferta już zaakceptowana' },
        { status: 400 }
      )
    }

    // Update quote status to "accepted"
    const { error: updateError } = await supabase
      .from('quotes')
      .update({
        status: 'accepted',
        accepted_at: new Date().toISOString()
      })
      .eq('id', quote.id)

    if (updateError) {
      logger.error('Failed to update quote status', { error: updateError })
      return NextResponse.json(
        { error: 'Nie udało się zaakceptować oferty' },
        { status: 500 }
      )
    }

    // Auto-convert to order
    // Generate order number similar to quote number
    const year = new Date().getFullYear()

    // Count orders for this company this year
    const { count } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', quote.company_id)
      .gte('created_at', `${year}-01-01`)

    const orderNumber = `ORD-${year}-${String((count || 0) + 1).padStart(4, '0')}`

    // Create order from quote
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        order_number: orderNumber,
        company_id: quote.company_id,
        created_by: quote.created_by,
        customer_name: quote.customer_name,
        part_name: quote.part_name,
        material: quote.material,
        quantity: quote.quantity,
        deadline: quote.deadline,
        status: 'pending',
        total_cost: quote.total_price,
        material_cost: quote.breakdown?.materialCost || 0,
        labor_cost: quote.breakdown?.laborCost || 0,
        overhead_cost: quote.breakdown?.setupCost || 0,
        notes: `Automatycznie utworzone z oferty ${quote.quote_number}. Metoda wyceny: ${quote.pricing_method || 'unknown'}.`
      })
      .select()
      .single()

    if (orderError) {
      logger.error('Failed to create order from quote', { error: orderError })
      // Don't fail the acceptance, just log the error
      // The quote is still accepted, but order wasn't created
    }

    // Link quote to order
    if (order) {
      await supabase
        .from('quotes')
        .update({ converted_order_id: order.id })
        .eq('id', quote.id)
    }

    logger.info('Quote accepted successfully', {
      quote_id: quote.id,
      quote_number: quote.quote_number,
      order_id: order?.id,
      order_number: orderNumber
    })

    return NextResponse.json({
      success: true,
      message: 'Oferta zaakceptowana pomyślnie',
      quote_id: quote.id,
      order_id: order?.id,
      order_number: orderNumber
    }, { status: 200 })

  } catch (error) {
    logger.error('Error accepting quote', { error })

    return NextResponse.json(
      {
        error: error instanceof Error
          ? error.message
          : 'Nie udało się zaakceptować oferty',
      },
      { status: 500 }
    )
  }
}
