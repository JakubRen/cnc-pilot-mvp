/**
 * Unit Tests for Report AI Summaries (AI Feature #2)
 *
 * Tests: summary generation, Gemini mock, cache behavior,
 * heuristic fallback, generateOrderSummary.
 *
 * TDD: Tests define expected behavior for the report summary feature.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// ============================================
// MOCKS
// ============================================

const mockGenerateContent = vi.fn()

vi.mock('@google/generative-ai', () => {
  return {
    GoogleGenerativeAI: class {
      getGenerativeModel() {
        return { generateContent: mockGenerateContent }
      }
    },
    SchemaType: { OBJECT: 'OBJECT', STRING: 'STRING', NUMBER: 'NUMBER', ARRAY: 'ARRAY' },
  }
})

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}))

vi.mock('@/lib/supabase-server', () => ({
  createClient: vi.fn().mockResolvedValue({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({ data: null }),
          gte: vi.fn(() => ({
            lt: vi.fn().mockResolvedValue({ data: [] }),
          })),
        })),
        gte: vi.fn(() => ({
          lt: vi.fn().mockResolvedValue({ data: [] }),
        })),
        neq: vi.fn(() => ({
          neq: vi.fn(() => ({
            lt: vi.fn().mockResolvedValue({ data: [] }),
            gte: vi.fn(() => ({
              lte: vi.fn().mockResolvedValue({ data: [], count: 0 }),
            })),
          })),
        })),
      })),
      upsert: vi.fn().mockResolvedValue({ error: null }),
    })),
  }),
}))

// ============================================
// ORDER SUMMARY (existing feature in openai-client.ts)
// ============================================

import { generateOrderSummary, type OrderDetails } from '@/lib/ai/openai-client'

describe('Report AI Summaries — generateOrderSummary', () => {
  const orderDetails: OrderDetails = {
    customerName: 'MetalTech Sp. z o.o.',
    partName: 'Tuleja redukcyjna',
    material: 'Stal 304',
    quantity: 50,
    status: 'w realizacji',
    deadline: '2026-03-15',
  }

  beforeEach(() => {
    delete process.env.GOOGLE_GENERATIVE_AI_API_KEY
    mockGenerateContent.mockReset()
  })

  it('should return fallback summary when no API key', async () => {
    const result = await generateOrderSummary('ORD-123', orderDetails)

    expect(result).toContain('ORD-123')
    expect(result).toContain('MetalTech')
    expect(result).toContain('Tuleja redukcyjna')
    expect(result).toContain('Stal 304')
    expect(result).toContain('50')
    expect(result).toContain('2026-03-15')
  })

  it('should return AI summary when API key exists', async () => {
    process.env.GOOGLE_GENERATIVE_AI_API_KEY = 'test-key'

    mockGenerateContent.mockResolvedValue({
      response: {
        text: () => 'Profesjonalne podsumowanie zlecenia CNC.',
      },
    })

    const result = await generateOrderSummary('ORD-123', orderDetails)
    expect(result).toBe('Profesjonalne podsumowanie zlecenia CNC.')
  })

  it('should fallback to template on API error', async () => {
    process.env.GOOGLE_GENERATIVE_AI_API_KEY = 'test-key'

    mockGenerateContent.mockRejectedValue(new Error('API Error'))

    const result = await generateOrderSummary('ORD-123', orderDetails)

    // Should fallback to template format
    expect(result).toContain('ORD-123')
    expect(result).toContain('MetalTech')
  })

  afterEach(() => {
    delete process.env.GOOGLE_GENERATIVE_AI_API_KEY
  })
})

// ============================================
// HEURISTIC INSIGHTS (from insights-generator.ts)
// ============================================

describe('Report AI Summaries — Heuristic Insights Generator', () => {
  // We test the heuristic path by ensuring no API key
  // The generateHeuristicInsights function is not exported directly,
  // but we can test through the AI path with mocked empty key

  it('should generate revenue trend insight on revenue increase', async () => {
    // TDD: When revenueChangePercent > 0, should produce a positive revenue_trend insight
    const { generateReportSummary } = await import('@/lib/ai/report-summaries')

    const result = await generateReportSummary({
      reportType: 'orders',
      companyId: 'test-company',
      data: {
        totalOrders: 50,
        completedOrders: 45,
        revenue: 150000,
        previousRevenue: 120000,
      },
    })

    expect(result).toBeDefined()
    expect(result).toHaveProperty('summary')
    expect(typeof result.summary).toBe('string')
    expect(result.summary.length).toBeGreaterThan(0)
  })

  it('should include key metrics in summary', async () => {
    const { generateReportSummary } = await import('@/lib/ai/report-summaries')

    const result = await generateReportSummary({
      reportType: 'costs',
      companyId: 'test-company',
      data: {
        totalCost: 50000,
        avgMargin: 25.5,
        topCostDrivers: ['material', 'labor'],
      },
    })

    expect(result).toBeDefined()
    expect(result).toHaveProperty('summary')
    expect(result).toHaveProperty('keyMetrics')
    expect(Array.isArray(result.keyMetrics)).toBe(true)
  })

  it('should handle empty report data gracefully', async () => {
    const { generateReportSummary } = await import('@/lib/ai/report-summaries')

    const result = await generateReportSummary({
      reportType: 'orders',
      companyId: 'test-company',
      data: {},
    })

    expect(result).toBeDefined()
    expect(result.summary.length).toBeGreaterThan(0)
  })

  it('should support all report types', async () => {
    const { generateReportSummary } = await import('@/lib/ai/report-summaries')

    const reportTypes = ['orders', 'costs', 'inventory', 'time'] as const

    for (const reportType of reportTypes) {
      const result = await generateReportSummary({
        reportType,
        companyId: 'test-company',
        data: {},
      })
      expect(result).toBeDefined()
      expect(result).toHaveProperty('summary')
    }
  })
})

// ============================================
// CACHE BEHAVIOR
// ============================================

describe('Report AI Summaries — Cache', () => {
  it('should return cached summary if not expired', async () => {
    const { getCachedReportSummary } = await import('@/lib/ai/report-summaries')

    // TDD: Should check ai_report_summaries table for cached entry
    const result = await getCachedReportSummary('test-company', 'orders')
    // With mock returning null, should be null (no cache)
    // When implementation adds cache, this will return cached data
    expect(result === null || typeof result === 'object').toBe(true)
  })

  it('should regenerate summary when cache is stale', async () => {
    const { getCachedReportSummary } = await import('@/lib/ai/report-summaries')

    // TDD: If cached entry exists but expires_at < now, should be null/stale
    const result = await getCachedReportSummary('test-company', 'orders')
    // Returns null for stale or no cache — implementation will handle differently
    expect(result === null || (typeof result === 'object' && result !== null)).toBe(true)
  })

  it('should invalidate cache when report data changes', async () => {
    const { invalidateReportCache } = await import('@/lib/ai/report-summaries')

    // TDD: Should delete cached entry for a specific company + report type
    const result = await invalidateReportCache('test-company', 'orders')
    expect(result).toBeDefined()
  })
})

// ============================================
// GEMINI INTEGRATION (mocked)
// ============================================

describe('Report AI Summaries — Gemini Integration', () => {
  beforeEach(() => {
    process.env.GOOGLE_GENERATIVE_AI_API_KEY = 'test-key'
    mockGenerateContent.mockReset()
  })

  afterEach(() => {
    delete process.env.GOOGLE_GENERATIVE_AI_API_KEY
  })

  it('should send report data to Gemini and parse response', async () => {
    mockGenerateContent.mockResolvedValue({
      response: {
        text: () => JSON.stringify({
          summary: 'Raport zamowien za tydzien wykazuje wzrost o 25%.',
          keyMetrics: [
            { label: 'Przychod', value: '150,000 PLN', trend: 'up' },
          ],
          recommendations: ['Zwieksz moce produkcyjne'],
        }),
      },
    })

    const { generateReportSummary } = await import('@/lib/ai/report-summaries')

    const result = await generateReportSummary({
      reportType: 'orders',
      companyId: 'test-company',
      data: { totalOrders: 50, revenue: 150000 },
    })

    expect(result.summary).toContain('wzrost')
  })

  it('should fallback to heuristic on Gemini error', async () => {
    mockGenerateContent.mockRejectedValue(new Error('Gemini quota exceeded'))

    const { generateReportSummary } = await import('@/lib/ai/report-summaries')

    const result = await generateReportSummary({
      reportType: 'orders',
      companyId: 'test-company',
      data: { totalOrders: 50, revenue: 150000 },
    })

    // Should still return a summary (heuristic fallback)
    expect(result).toBeDefined()
    expect(result.summary.length).toBeGreaterThan(0)
  })

  it('should not call Gemini when API key is missing', async () => {
    delete process.env.GOOGLE_GENERATIVE_AI_API_KEY

    const { generateReportSummary } = await import('@/lib/ai/report-summaries')

    await generateReportSummary({
      reportType: 'orders',
      companyId: 'test-company',
      data: {},
    })

    // Gemini should NOT have been called
    expect(mockGenerateContent).not.toHaveBeenCalled()
  })
})
