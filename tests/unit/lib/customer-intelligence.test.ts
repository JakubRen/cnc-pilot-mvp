/**
 * Unit Tests for Customer Intelligence (AI Feature #3)
 *
 * Tests: churn risk calculation, inactive detection,
 * buying pattern analysis, customer segmentation.
 *
 * TDD: These tests define expected behavior. They will fail until
 * backend-dev implements lib/ai/customer-intelligence.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// ============================================
// MOCKS
// ============================================

const mockSupabaseChain = () => {
  const chain: Record<string, unknown> = {}
  const self = (): typeof chain => chain
  chain.select = vi.fn(self)
  chain.eq = vi.fn(self)
  chain.neq = vi.fn(self)
  chain.gte = vi.fn(self)
  chain.lte = vi.fn(self)
  chain.lt = vi.fn(self)
  chain.gt = vi.fn(self)
  chain.not = vi.fn(self)
  chain.in = vi.fn(self)
  chain.is = vi.fn(self)
  chain.order = vi.fn(self)
  chain.limit = vi.fn(self)
  chain.single = vi.fn().mockResolvedValue({ data: null })
  chain.then = vi.fn((resolve: (v: { data: unknown[]; error: null }) => void) => resolve({ data: [], error: null }))
  // Make it thenable (Promise-like)
  Object.defineProperty(chain, 'then', {
    value: (resolve: (v: { data: unknown[]; error: null }) => void) => Promise.resolve({ data: [], error: null }).then(resolve),
    writable: true,
  })
  return chain
}

vi.mock('@/lib/supabase-server', () => ({
  createClient: vi.fn().mockResolvedValue({
    from: vi.fn(() => mockSupabaseChain()),
  }),
}))

vi.mock('@google/generative-ai', () => {
  return {
    GoogleGenerativeAI: class {
      getGenerativeModel() {
        return {
          generateContent: vi.fn().mockResolvedValue({
            response: { text: () => '[]' },
          }),
        }
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

// ============================================
// CHURN SCORE CALCULATION
// ============================================

describe('Customer Intelligence — Churn Score', () => {
  it('should return high churn risk for customers inactive > 60 days', async () => {
    const { calculateChurnScore } = await import('@/lib/ai/customer-scoring')

    const score = calculateChurnScore({
      daysSinceLastOrder: 75,
      totalOrders: 10,
      averageOrderFrequencyDays: 14,
      recentOrderTrend: 'declining',
    })

    expect(score).toBeDefined()
    expect(score.risk).toBe('high')
    expect(score.score).toBeGreaterThanOrEqual(70)
    expect(score.score).toBeLessThanOrEqual(100)
  })

  it('should return medium churn risk for customers inactive 30-60 days', async () => {
    const { calculateChurnScore } = await import('@/lib/ai/customer-scoring')

    const score = calculateChurnScore({
      daysSinceLastOrder: 45,
      totalOrders: 10,
      averageOrderFrequencyDays: 14,
      recentOrderTrend: 'stable',
    })

    expect(score.risk).toBe('medium')
    expect(score.score).toBeGreaterThanOrEqual(30)
    expect(score.score).toBeLessThanOrEqual(69)
  })

  it('should return low churn risk for recently active customers', async () => {
    const { calculateChurnScore } = await import('@/lib/ai/customer-scoring')

    const score = calculateChurnScore({
      daysSinceLastOrder: 5,
      totalOrders: 20,
      averageOrderFrequencyDays: 14,
      recentOrderTrend: 'growing',
    })

    expect(score.risk).toBe('low')
    expect(score.score).toBeLessThanOrEqual(29)
  })

  it('should factor in order frequency — irregular customer = higher risk', async () => {
    const { calculateChurnScore } = await import('@/lib/ai/customer-scoring')

    // Customer who normally orders every 7 days, now 30 days without order
    const frequent = calculateChurnScore({
      daysSinceLastOrder: 30,
      totalOrders: 50,
      averageOrderFrequencyDays: 7,
      recentOrderTrend: 'stable',
    })

    // Customer who normally orders every 45 days, now 30 days without order
    const infrequent = calculateChurnScore({
      daysSinceLastOrder: 30,
      totalOrders: 5,
      averageOrderFrequencyDays: 45,
      recentOrderTrend: 'stable',
    })

    // The frequent customer should have HIGHER risk since they're overdue
    expect(frequent.score).toBeGreaterThan(infrequent.score)
  })

  it('should return zero risk for brand new customer with no history', async () => {
    const { calculateChurnScore } = await import('@/lib/ai/customer-scoring')

    const score = calculateChurnScore({
      daysSinceLastOrder: 0,
      totalOrders: 0,
      averageOrderFrequencyDays: 0,
      recentOrderTrend: 'stable',
    })

    // No data = can't calculate churn
    expect(score.risk).toBe('low')
    expect(score.score).toBe(0)
  })
})

// ============================================
// INACTIVE CUSTOMER DETECTION
// ============================================

describe('Customer Intelligence — Inactive Detection', () => {
  it('should identify customers with no orders in 30+ days', async () => {
    const { getInactiveCustomers } = await import('@/lib/ai/customer-intelligence')

    const result = await getInactiveCustomers('test-company', 30)

    expect(result).toBeDefined()
    expect(Array.isArray(result)).toBe(true)
    // Each inactive customer should have name and days since last order
    result.forEach((customer: { name: string; daysSinceLastOrder: number; totalOrders: number }) => {
      expect(customer).toHaveProperty('name')
      expect(customer).toHaveProperty('daysSinceLastOrder')
      expect(customer.daysSinceLastOrder).toBeGreaterThanOrEqual(30)
    })
  })

  it('should return empty array when all customers are active', async () => {
    const { getInactiveCustomers } = await import('@/lib/ai/customer-intelligence')

    // With default mock returning empty data, no inactive customers
    const result = await getInactiveCustomers('test-company', 30)
    expect(result).toEqual([])
  })

  it('should respect custom inactivity threshold', async () => {
    const { getInactiveCustomers } = await import('@/lib/ai/customer-intelligence')

    const thirtyDays = await getInactiveCustomers('test-company', 30)
    const sixtyDays = await getInactiveCustomers('test-company', 60)

    // More customers should be inactive at 30 days threshold than 60 days
    expect(thirtyDays.length).toBeGreaterThanOrEqual(sixtyDays.length)
  })
})

// ============================================
// BUYING PATTERN ANALYSIS
// ============================================

describe('Customer Intelligence — Buying Patterns', () => {
  it('should identify most ordered materials per customer', async () => {
    const { analyzeBuyingPatterns } = await import('@/lib/ai/customer-intelligence')

    const result = await analyzeBuyingPatterns('test-company', 'customer-1')

    expect(result).toBeDefined()
    expect(result).toHaveProperty('topMaterials')
    expect(Array.isArray(result.topMaterials)).toBe(true)
  })

  it('should calculate average order value', async () => {
    const { analyzeBuyingPatterns } = await import('@/lib/ai/customer-intelligence')

    const result = await analyzeBuyingPatterns('test-company', 'customer-1')

    expect(result).toHaveProperty('averageOrderValue')
    expect(typeof result.averageOrderValue).toBe('number')
    expect(result.averageOrderValue).toBeGreaterThanOrEqual(0)
  })

  it('should detect order frequency (e.g., monthly, weekly)', async () => {
    const { analyzeBuyingPatterns } = await import('@/lib/ai/customer-intelligence')

    const result = await analyzeBuyingPatterns('test-company', 'customer-1')

    expect(result).toHaveProperty('orderFrequency')
    expect(['daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'irregular', 'none']).toContain(
      result.orderFrequency
    )
  })

  it('should detect trend direction (growing, stable, declining)', async () => {
    const { analyzeBuyingPatterns } = await import('@/lib/ai/customer-intelligence')

    const result = await analyzeBuyingPatterns('test-company', 'customer-1')

    expect(result).toHaveProperty('trend')
    expect(['growing', 'stable', 'declining']).toContain(result.trend)
  })

  it('should return sensible defaults for customer with zero orders', async () => {
    const { analyzeBuyingPatterns } = await import('@/lib/ai/customer-intelligence')

    const result = await analyzeBuyingPatterns('test-company', 'nonexistent-customer')

    expect(result.topMaterials).toEqual([])
    expect(result.averageOrderValue).toBe(0)
    expect(result.orderFrequency).toBe('none')
    expect(result.trend).toBe('stable')
  })
})

// ============================================
// CUSTOMER SEGMENTATION
// ============================================

describe('Customer Intelligence — Segmentation', () => {
  it('should segment customers into VIP, Regular, Occasional, At Risk', async () => {
    const { segmentCustomers } = await import('@/lib/ai/customer-intelligence')

    const result = await segmentCustomers('test-company')

    expect(result).toBeDefined()
    expect(result).toHaveProperty('segments')
    expect(Array.isArray(result.segments)).toBe(true)

    const validSegments = ['vip', 'regular', 'occasional', 'at_risk', 'new']
    result.segments.forEach((segment: { name: string; count: number }) => {
      expect(validSegments).toContain(segment.name)
      expect(segment.count).toBeGreaterThanOrEqual(0)
    })
  })

  it('should categorize VIP customers by revenue contribution', async () => {
    const { segmentCustomers } = await import('@/lib/ai/customer-intelligence')

    const result = await segmentCustomers('test-company')

    // VIP segment should include customers contributing top 20% revenue
    const vipSegment = result.segments.find((s: { name: string }) => s.name === 'vip')
    expect(vipSegment).toBeDefined()
  })

  it('should return empty segments for new company with no customers', async () => {
    const { segmentCustomers } = await import('@/lib/ai/customer-intelligence')

    const result = await segmentCustomers('empty-company')

    expect(result.segments).toBeDefined()
    const totalCustomers = result.segments.reduce(
      (sum: number, s: { count: number }) => sum + s.count,
      0
    )
    expect(totalCustomers).toBe(0)
  })
})
