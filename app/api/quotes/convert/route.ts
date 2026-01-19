// =====================================================
// API: Convert Quote to Order (Internal)
// =====================================================
// POST /api/quotes/convert
// Authenticated endpoint - manually converts quote to order
// =====================================================

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { getUserProfile } from '@/lib/auth-server'
import { logger } from '@/lib/logger'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Verify authentication
    const userProfile = await getUserProfile()
    if (!userProfile || !userProfile.company_id) {
      return NextResponse.json(
        { error: 'Brak autoryzacji' },
        { status: 401 }
      )
    }

    // Parse request body
    const { quote_id } = await request.json()

    if (!quote_id) {
      return NextResponse.json(
        { error: 'ID oferty wymagane' },
        { status: 400 }
      )
    }

    // Get quote (must belong to user's company)
    const { data: quote, error: fetchError } = await supabase
      .from('quotes')
      .select('*')
      .eq('id', quote_id)
      .eq('company_id', userProfile.company_id)
      .single()

    if (fetchError || !quote) {
      return NextResponse.json(
        { error: 'Oferta nie znaleziona' },
        { status: 404 }
      )
    }

    // Check if already converted
    if (quote.converted_order_id) {
      return NextResponse.json(
        { error: 'Oferta już przekonwertowana na zamówienie', order_id: quote.converted_order_id },
        { status: 400 }
      )
    }

    // Generate order number
    const year = new Date().getFullYear()
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
        created_by: userProfile.id,
        customer_name: quote.customer_name,
        part_name: quote.part_name,
        material: quote.material,
        quantity: quote.quantity,
        deadline: quote.deadline,
        status: 'pending',
        selling_price: quote.total_price,
        total_cost: quote.total_price,
        material_cost: quote.breakdown?.materialCost || 0,
        labor_cost: quote.breakdown?.laborCost || 0,
        overhead_cost: quote.breakdown?.setupCost || 0,
        notes: `Utworzone z oferty ${quote.quote_number}. Metoda wyceny: ${quote.pricing_method || 'unknown'}.`
      })
      .select()
      .single()

    if (orderError) {
      logger.error('Failed to create order from quote', { error: orderError })
      return NextResponse.json(
        { error: 'Nie udało się utworzyć zamówienia: ' + orderError.message },
        { status: 500 }
      )
    }

    // Update quote with converted_order_id and status
    const { error: updateError } = await supabase
      .from('quotes')
      .update({
        converted_order_id: order.id,
        status: quote.status === 'draft' ? 'accepted' : quote.status
      })
      .eq('id', quote.id)

    if (updateError) {
      logger.error('Failed to update quote with order reference', { error: updateError })
    }

    logger.info('Quote manually converted to order', {
      quote_id: quote.id,
      quote_number: quote.quote_number,
      order_id: order.id,
      order_number: orderNumber,
      user_id: userProfile.id
    })

    return NextResponse.json({
      success: true,
      message: 'Zamówienie utworzone pomyślnie',
      order: {
        id: order.id,
        order_number: orderNumber
      }
    }, { status: 200 })

  } catch (error) {
    logger.error('Error converting quote to order', { error })

    return NextResponse.json(
      {
        error: error instanceof Error
          ? error.message
          : 'Nie udało się utworzyć zamówienia',
      },
      { status: 500 }
    )
  }
}
