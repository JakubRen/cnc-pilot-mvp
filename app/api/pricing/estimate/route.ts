// =====================================================
// DEPRECATED ENDPOINT
// =====================================================
// This endpoint is deprecated. Use /api/quotes/pricing instead.
// Reason: Unified pricing engine provides better accuracy
// Migration date: 2025-12-14
// =====================================================

import { NextResponse } from 'next/server'

export async function POST() {
  return NextResponse.json({
    error: 'Endpoint deprecated. Use /api/quotes/pricing instead.',
    migration: {
      old: 'POST /api/pricing/estimate',
      new: 'POST /api/quotes/pricing',
      reason: 'Unified pricing engine (rule-based + historical data) provides better accuracy',
      benefits: [
        'Automatyczny wybór najlepszej metody wyceny',
        'Dane historyczne z podobnych zleceń',
        'Fallback do rule-based gdy brak danych',
        'Edytowalna cena z live margin adjustment'
      ],
      migration_guide: 'Replace fetch("/api/pricing/estimate") with fetch("/api/quotes/pricing")'
    }
  }, { status: 410 }) // 410 Gone
}

export async function GET() {
  return NextResponse.json({
    deprecated: true,
    message: 'This endpoint is deprecated. Use /api/quotes/pricing instead.',
    new_endpoint: 'GET /api/quotes/pricing',
    migration_date: '2025-12-14'
  }, { status: 410 })
}
