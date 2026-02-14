import { NextRequest, NextResponse } from 'next/server'
import { getUserProfile } from '@/lib/auth-server'
import { getDynamicPriceSuggestion } from '@/lib/ai/features/dynamic-pricing'
import type { Complexity } from '@/lib/ai/features/dynamic-pricing'

// =====================================================
// POST /api/agents/dynamic-pricing
// Returns dynamic pricing suggestion for a part.
//
// Frontend contract:
//   Request:  { partName, material?, quantity, complexity, basePricePerUnit?, daysUntilDeadline?, customerName? }
//   Response: { success, data: { suggested_price, base_price, total_price, confidence, factors, reasoning, historical_comparison, combined_multiplier, source } }
// =====================================================

export async function POST(request: NextRequest) {
  try {
    const userProfile = await getUserProfile()

    if (!userProfile?.company_id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    const { partName, material, quantity, complexity, basePricePerUnit, daysUntilDeadline, customerName } = body

    if (!partName || typeof partName !== 'string') {
      return NextResponse.json({ error: 'Field "partName" is required' }, { status: 400 })
    }
    if (!quantity || typeof quantity !== 'number' || quantity < 1) {
      return NextResponse.json({ error: 'Field "quantity" must be a positive number' }, { status: 400 })
    }

    // basePricePerUnit defaults to 100 if not provided (frontend may not always have it)
    const basePrice = (typeof basePricePerUnit === 'number' && basePricePerUnit > 0) ? basePricePerUnit : 100

    const validComplexities = ['simple', 'medium', 'complex']
    const safeComplexity: Complexity = validComplexities.includes(complexity) ? complexity : 'medium'

    const result = await getDynamicPriceSuggestion(
      {
        partName,
        material: material || 'Stal',
        quantity: Math.floor(quantity),
        complexity: safeComplexity,
        daysUntilDeadline: daysUntilDeadline != null ? Number(daysUntilDeadline) : null,
        customerName: customerName || null,
      },
      basePrice
    )

    // Transform to frontend contract
    const data = {
      suggested_price: result.suggestedPricePerUnit,
      base_price: result.basePricePerUnit,
      total_price: result.totalSuggestedPrice,
      confidence: result.confidence,
      factors: result.factors.map(f => ({
        name: f.name,
        impact: f.impact > 1 ? 'increase' as const : f.impact < 1 ? 'decrease' as const : 'neutral' as const,
        weight: Math.round(Math.abs(f.impact - 1) * 100), // e.g. 1.10 → 10
        description: f.reason,
      })),
      reasoning: result.factors.map(f => f.reason).join(' '),
      historical_comparison: result.historicalComparison,
      combined_multiplier: result.combinedMultiplier,
      source: result.source,
    }

    return NextResponse.json({
      success: true,
      data,
    })
  } catch (error) {
    console.error('[dynamic-pricing] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
