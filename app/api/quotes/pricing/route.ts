// =====================================================
// API: Unified Pricing (FREE Version)
// =====================================================
// POST /api/quotes/pricing
// Combines rule-based + historical pricing
// NO AI, NO OpenAI API calls
// =====================================================

import { NextRequest, NextResponse } from 'next/server'
import { getUnifiedPricing } from '@/lib/pricing/unified-engine-free'
import { logger } from '@/lib/logger'
import { rateLimit } from '@/lib/rate-limit'

// Rate limiter: 30 requests per minute per IP
const limiter = rateLimit({
  interval: 60 * 1000, // 1 minute
  uniqueTokenPerInterval: 500,
})

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const ip = request.headers.get('x-forwarded-for') ||
               request.headers.get('x-real-ip') ||
               'anonymous'

    try {
      await limiter.check(30, ip)
    } catch {
      return NextResponse.json(
        { error: 'Zbyt wiele żądań. Spróbuj ponownie za chwilę.' },
        { status: 429 }
      )
    }

    // Parse request body
    const body = await request.json()
    const { material, quantity, partName, length, width, height, complexity } = body

    // Validate required fields
    if (!material || !quantity) {
      return NextResponse.json(
        { error: 'Materiał i ilość są wymagane' },
        { status: 400 }
      )
    }

    // Validate quantity
    if (quantity < 1 || quantity > 10000) {
      return NextResponse.json(
        { error: 'Ilość musi być między 1 a 10000' },
        { status: 400 }
      )
    }

    // Validate complexity
    if (complexity && !['simple', 'medium', 'complex'].includes(complexity)) {
      return NextResponse.json(
        { error: 'Nieprawidłowa złożoność. Wybierz: simple, medium lub complex' },
        { status: 400 }
      )
    }

    // Calculate unified pricing
    const result = await getUnifiedPricing({
      material,
      quantity: Number(quantity),
      partName: partName || undefined,
      length: length ? Number(length) : undefined,
      width: width ? Number(width) : undefined,
      height: height ? Number(height) : undefined,
      complexity: complexity || 'medium'
    })

    logger.info('Pricing calculated successfully', {
      method: result.recommended.method,
      price: result.recommended.price,
      confidence: result.recommended.confidence
    })

    return NextResponse.json(result, { status: 200 })

  } catch (error) {
    logger.error('Pricing calculation error', { error })

    return NextResponse.json(
      {
        error: error instanceof Error
          ? error.message
          : 'Nie udało się obliczyć wyceny',
      },
      { status: 500 }
    )
  }
}

// Optional: GET endpoint to show pricing info
export async function GET() {
  return NextResponse.json({
    message: 'Unified Pricing API - FREE Version',
    version: '1.0',
    methods: ['rule_based', 'historical', 'hybrid'],
    features: [
      'Kalkulator rule-based (12 materiałów)',
      'Dane historyczne z podobnych zleceń',
      'Automatyczny wybór najlepszej metody',
      'Brak kosztów AI'
    ],
    usage: {
      endpoint: 'POST /api/quotes/pricing',
      body: {
        material: 'string (required)',
        quantity: 'number (required)',
        partName: 'string (optional)',
        length: 'number (optional, mm)',
        width: 'number (optional, mm)',
        height: 'number (optional, mm)',
        complexity: 'simple | medium | complex (optional)'
      }
    }
  })
}
