// app/api/pricing/estimate/route.ts - Pricing Calculator API

import { NextRequest, NextResponse } from 'next/server'
import { calculatePricing } from '@/lib/pricing-calculator'
import type { PricingEstimateRequest } from '@/types/pricing'

export async function POST(request: NextRequest) {
  try {
    const body: PricingEstimateRequest = await request.json()

    // Validate required fields
    if (!body.material || !body.quantity) {
      return NextResponse.json(
        { error: 'Brak wymaganych pól: materiał i ilość są wymagane' },
        { status: 400 }
      )
    }

    // Validate quantity
    if (body.quantity < 1) {
      return NextResponse.json(
        { error: 'Ilość musi być większa niż 0' },
        { status: 400 }
      )
    }

    // Validate complexity
    if (!['simple', 'medium', 'complex'].includes(body.complexity)) {
      return NextResponse.json(
        { error: 'Nieprawidłowa złożoność. Wybierz: simple, medium lub complex' },
        { status: 400 }
      )
    }

    // Calculate pricing using rule-based calculator
    const result = calculatePricing(body)

    return NextResponse.json(result, { status: 200 })
  } catch (error) {
    console.error('Pricing calculation error:', error)

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Nie udało się obliczyć wyceny',
      },
      { status: 500 }
    )
  }
}

// Optional: GET endpoint to fetch material options
export async function GET() {
  const { MATERIAL_OPTIONS } = await import('@/lib/pricing-calculator')

  return NextResponse.json({
    materials: MATERIAL_OPTIONS,
    complexities: [
      { value: 'simple', label: 'Proste (1-2h obróbki)' },
      { value: 'medium', label: 'Średnie (3-6h obróbki)' },
      { value: 'complex', label: 'Złożone (8-20h obróbki)' },
    ],
  })
}
