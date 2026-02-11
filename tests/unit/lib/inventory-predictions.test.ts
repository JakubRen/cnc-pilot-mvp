/**
 * Unit Tests for Inventory Predictions (AI Feature #4)
 *
 * Tests: usage velocity calculation, stockout date prediction,
 * reorder threshold, reorder alerts.
 *
 * TDD: These tests define expected behavior. They will fail until
 * backend-dev implements lib/ai/inventory-predictions.ts
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
  chain.ilike = vi.fn(self)
  chain.order = vi.fn(self)
  chain.limit = vi.fn(self)
  chain.single = vi.fn().mockResolvedValue({ data: null })
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
// USAGE VELOCITY MATH
// ============================================

describe('Inventory Predictions — Usage Velocity', () => {
  it('should calculate daily usage rate from consumption history', async () => {
    const { calculateUsageVelocity } = await import('@/lib/ai/inventory-math')

    // Given: 100 units consumed over 30 days
    const velocity = calculateUsageVelocity({
      totalConsumed: 100,
      periodDays: 30,
    })

    expect(velocity).toBeDefined()
    expect(velocity.dailyRate).toBeCloseTo(3.33, 1)
    expect(velocity.weeklyRate).toBeCloseTo(23.33, 1)
    expect(velocity.monthlyRate).toBeCloseTo(100, 0)
  })

  it('should handle zero consumption', async () => {
    const { calculateUsageVelocity } = await import('@/lib/ai/inventory-math')

    const velocity = calculateUsageVelocity({
      totalConsumed: 0,
      periodDays: 30,
    })

    expect(velocity.dailyRate).toBe(0)
    expect(velocity.weeklyRate).toBe(0)
    expect(velocity.monthlyRate).toBe(0)
  })

  it('should handle single-day period', async () => {
    const { calculateUsageVelocity } = await import('@/lib/ai/inventory-math')

    const velocity = calculateUsageVelocity({
      totalConsumed: 50,
      periodDays: 1,
    })

    expect(velocity.dailyRate).toBe(50)
    expect(velocity.weeklyRate).toBe(350)
  })

  it('should handle fractional consumption', async () => {
    const { calculateUsageVelocity } = await import('@/lib/ai/inventory-math')

    const velocity = calculateUsageVelocity({
      totalConsumed: 7,
      periodDays: 30,
    })

    expect(velocity.dailyRate).toBeCloseTo(0.233, 2)
  })

  it('should throw or return zero for zero-day period', async () => {
    const { calculateUsageVelocity } = await import('@/lib/ai/inventory-math')

    const velocity = calculateUsageVelocity({
      totalConsumed: 100,
      periodDays: 0,
    })

    // Should handle gracefully — either 0 or Infinity guarded
    expect(Number.isFinite(velocity.dailyRate)).toBe(true)
  })
})

// ============================================
// STOCKOUT DATE CALCULATION
// ============================================

describe('Inventory Predictions — Stockout Date', () => {
  it('should predict stockout date based on current stock and velocity', async () => {
    const { predictStockoutDate } = await import('@/lib/ai/inventory-math')

    // Given: 100 units in stock, consuming 10/day
    const result = predictStockoutDate({
      currentStock: 100,
      dailyUsageRate: 10,
    })

    expect(result).toBeDefined()
    expect(result.daysUntilStockout).toBe(10)
    expect(result.stockoutDate).toBeDefined()

    // Verify the date is ~10 days from now
    const expectedDate = new Date()
    expectedDate.setDate(expectedDate.getDate() + 10)
    const resultDate = new Date(result.stockoutDate!)
    const diffDays = Math.abs(
      (resultDate.getTime() - expectedDate.getTime()) / (1000 * 60 * 60 * 24)
    )
    expect(diffDays).toBeLessThan(1) // Within 1 day tolerance
  })

  it('should return Infinity/null when no consumption (zero velocity)', async () => {
    const { predictStockoutDate } = await import('@/lib/ai/inventory-math')

    const result = predictStockoutDate({
      currentStock: 100,
      dailyUsageRate: 0,
    })

    // Zero consumption = never runs out
    expect(result.daysUntilStockout).toBe(Infinity)
    expect(result.stockoutDate).toBeNull()
  })

  it('should return 0 when stock is already depleted', async () => {
    const { predictStockoutDate } = await import('@/lib/ai/inventory-math')

    const result = predictStockoutDate({
      currentStock: 0,
      dailyUsageRate: 5,
    })

    expect(result.daysUntilStockout).toBe(0)
  })

  it('should handle fractional days correctly', async () => {
    const { predictStockoutDate } = await import('@/lib/ai/inventory-math')

    // 15 units / 4 per day = 3.75 days
    const result = predictStockoutDate({
      currentStock: 15,
      dailyUsageRate: 4,
    })

    // Should round down (you run out during day 4, so 3 full days)
    expect(result.daysUntilStockout).toBe(3)
  })

  it('should classify urgency based on days until stockout', async () => {
    const { predictStockoutDate } = await import('@/lib/ai/inventory-math')

    const critical = predictStockoutDate({ currentStock: 5, dailyUsageRate: 5 })
    const warning = predictStockoutDate({ currentStock: 35, dailyUsageRate: 5 })
    const ok = predictStockoutDate({ currentStock: 150, dailyUsageRate: 5 })

    expect(critical.urgency).toBe('critical') // <= 3 days
    expect(warning.urgency).toBe('warning')   // <= 7 days
    expect(ok.urgency).toBe('ok')             // > 7 days
  })
})

// ============================================
// REORDER THRESHOLD CALCULATION
// ============================================

describe('Inventory Predictions — Reorder Threshold', () => {
  it('should calculate reorder point based on lead time and usage rate', async () => {
    const { calculateReorderPoint } = await import('@/lib/ai/inventory-math')

    // If it takes 5 days to restock and we use 10/day,
    // reorder point = 5 * 10 = 50 + safety stock
    const result = calculateReorderPoint({
      dailyUsageRate: 10,
      leadTimeDays: 5,
      safetyStockDays: 2, // Extra 2 days buffer
    })

    expect(result).toBeDefined()
    // Reorder when stock reaches 7 days worth (5 lead + 2 safety)
    expect(result.reorderPoint).toBe(70) // (5 + 2) * 10
    expect(result.safetyStock).toBe(20)  // 2 * 10
  })

  it('should default safety stock to 3 days if not specified', async () => {
    const { calculateReorderPoint } = await import('@/lib/ai/inventory-math')

    const result = calculateReorderPoint({
      dailyUsageRate: 10,
      leadTimeDays: 5,
    })

    // Default safety = 3 days, total = (5 + 3) * 10 = 80
    expect(result.reorderPoint).toBe(80)
    expect(result.safetyStock).toBe(30)
  })

  it('should handle zero usage rate', async () => {
    const { calculateReorderPoint } = await import('@/lib/ai/inventory-math')

    const result = calculateReorderPoint({
      dailyUsageRate: 0,
      leadTimeDays: 5,
    })

    expect(result.reorderPoint).toBe(0)
    expect(result.safetyStock).toBe(0)
  })

  it('should handle zero lead time', async () => {
    const { calculateReorderPoint } = await import('@/lib/ai/inventory-math')

    const result = calculateReorderPoint({
      dailyUsageRate: 10,
      leadTimeDays: 0,
      safetyStockDays: 2,
    })

    // Only safety stock remains
    expect(result.reorderPoint).toBe(20)
  })
})

// ============================================
// REORDER ALERTS (full feature)
// ============================================

describe('Inventory Predictions — Reorder Alerts', () => {
  it('should return list of items that need reordering', async () => {
    const { getReorderAlerts } = await import('@/lib/ai/inventory-predictions')

    const result = await getReorderAlerts('test-company')

    expect(result).toBeDefined()
    expect(Array.isArray(result)).toBe(true)
    result.forEach((alert: {
      itemId: string
      itemName: string
      currentStock: number
      reorderPoint: number
      urgency: string
    }) => {
      expect(alert).toHaveProperty('itemId')
      expect(alert).toHaveProperty('itemName')
      expect(alert).toHaveProperty('currentStock')
      expect(alert).toHaveProperty('reorderPoint')
      expect(alert).toHaveProperty('urgency')
      // Current stock should be below reorder point (that's why it's an alert)
      expect(alert.currentStock).toBeLessThanOrEqual(alert.reorderPoint)
    })
  })

  it('should return empty array when all items are well-stocked', async () => {
    const { getReorderAlerts } = await import('@/lib/ai/inventory-predictions')

    const result = await getReorderAlerts('test-company')
    // With empty mock data, no alerts expected
    expect(result).toEqual([])
  })

  it('should sort alerts by urgency (critical first)', async () => {
    const { getReorderAlerts } = await import('@/lib/ai/inventory-predictions')

    const result = await getReorderAlerts('test-company')

    if (result.length > 1) {
      const urgencyOrder = { critical: 0, warning: 1, ok: 2 }
      for (let i = 1; i < result.length; i++) {
        const prev = urgencyOrder[result[i - 1].urgency as keyof typeof urgencyOrder] ?? 2
        const curr = urgencyOrder[result[i].urgency as keyof typeof urgencyOrder] ?? 2
        expect(prev).toBeLessThanOrEqual(curr)
      }
    }
  })
})

// ============================================
// USAGE TREND ANALYSIS
// ============================================

describe('Inventory Predictions — Usage Trend', () => {
  it('should detect increasing usage trend', async () => {
    const { analyzeUsageTrend } = await import('@/lib/ai/inventory-math')

    // Weekly usage: 10, 15, 20, 25 — clearly increasing
    const result = analyzeUsageTrend([10, 15, 20, 25])

    expect(result.direction).toBe('increasing')
    expect(result.percentChange).toBeGreaterThan(0)
  })

  it('should detect decreasing usage trend', async () => {
    const { analyzeUsageTrend } = await import('@/lib/ai/inventory-math')

    // Weekly usage: 30, 25, 20, 15 — clearly decreasing
    const result = analyzeUsageTrend([30, 25, 20, 15])

    expect(result.direction).toBe('decreasing')
    expect(result.percentChange).toBeLessThan(0)
  })

  it('should detect stable usage', async () => {
    const { analyzeUsageTrend } = await import('@/lib/ai/inventory-math')

    // Weekly usage: 20, 21, 19, 20 — stable (within ~5% variance)
    const result = analyzeUsageTrend([20, 21, 19, 20])

    expect(result.direction).toBe('stable')
  })

  it('should handle empty data', async () => {
    const { analyzeUsageTrend } = await import('@/lib/ai/inventory-math')

    const result = analyzeUsageTrend([])

    expect(result.direction).toBe('stable')
    expect(result.percentChange).toBe(0)
  })

  it('should handle single data point', async () => {
    const { analyzeUsageTrend } = await import('@/lib/ai/inventory-math')

    const result = analyzeUsageTrend([50])

    expect(result.direction).toBe('stable')
    expect(result.percentChange).toBe(0)
  })
})

// ============================================
// INTEGRATION: FULL INVENTORY PREDICTION
// ============================================

describe('Inventory Predictions — Full Prediction', () => {
  it('should generate prediction for a single inventory item', async () => {
    const { getInventoryPrediction } = await import('@/lib/ai/inventory-predictions')

    const result = await getInventoryPrediction('test-company', 'item-1')

    expect(result).toBeDefined()
    expect(result).toHaveProperty('currentStock')
    expect(result).toHaveProperty('dailyUsageRate')
    expect(result).toHaveProperty('daysUntilStockout')
    expect(result).toHaveProperty('reorderPoint')
    expect(result).toHaveProperty('trend')
    expect(result).toHaveProperty('urgency')
  })

  it('should generate predictions for all low-stock items', async () => {
    const { getLowStockPredictions } = await import('@/lib/ai/inventory-predictions')

    const result = await getLowStockPredictions('test-company')

    expect(result).toBeDefined()
    expect(Array.isArray(result)).toBe(true)
    // Each prediction should have complete data
    result.forEach((pred: {
      itemId: string
      itemName: string
      currentStock: number
      daysUntilStockout: number
      urgency: string
    }) => {
      expect(pred).toHaveProperty('itemId')
      expect(pred).toHaveProperty('itemName')
      expect(pred).toHaveProperty('currentStock')
      expect(pred).toHaveProperty('daysUntilStockout')
      expect(pred).toHaveProperty('urgency')
    })
  })
})
