import { describe, it, expect } from 'vitest'
import {
  calculateUsageVelocity,
  predictStockoutDate,
  calculateReorderPoint,
  analyzeUsageTrend,
} from '@/lib/ai/inventory-math'

// ============================================
// calculateUsageVelocity
// ============================================
describe('calculateUsageVelocity', () => {
  it('should calculate daily/weekly/monthly rates for CNC material', () => {
    // 300 units consumed over 30 days (e.g. steel rods)
    const result = calculateUsageVelocity({ totalConsumed: 300, periodDays: 30 })
    expect(result.dailyRate).toBe(10)
    expect(result.weeklyRate).toBe(70)
    expect(result.monthlyRate).toBe(300)
  })

  it('should handle fractional daily rates', () => {
    // 7 units over 30 days → ~0.233/day
    const result = calculateUsageVelocity({ totalConsumed: 7, periodDays: 30 })
    expect(result.dailyRate).toBeCloseTo(0.233, 2)
    expect(result.weeklyRate).toBeCloseTo(1.63, 1)
  })

  it('should return all zeros for zero consumption', () => {
    const result = calculateUsageVelocity({ totalConsumed: 0, periodDays: 30 })
    expect(result.dailyRate).toBe(0)
    expect(result.weeklyRate).toBe(0)
    expect(result.monthlyRate).toBe(0)
  })

  it('should return all zeros for zero period', () => {
    const result = calculateUsageVelocity({ totalConsumed: 100, periodDays: 0 })
    expect(result.dailyRate).toBe(0)
    expect(result.weeklyRate).toBe(0)
    expect(result.monthlyRate).toBe(0)
  })

  it('should return all zeros for negative period', () => {
    const result = calculateUsageVelocity({ totalConsumed: 100, periodDays: -5 })
    expect(result.dailyRate).toBe(0)
  })

  it('should handle single day period', () => {
    const result = calculateUsageVelocity({ totalConsumed: 50, periodDays: 1 })
    expect(result.dailyRate).toBe(50)
    expect(result.weeklyRate).toBe(350)
    expect(result.monthlyRate).toBe(1500)
  })
})

// ============================================
// predictStockoutDate
// ============================================
describe('predictStockoutDate', () => {
  it('should predict stockout for steady consumption', () => {
    // 100 units in stock, using 10/day → 10 days
    const result = predictStockoutDate({ currentStock: 100, dailyUsageRate: 10 })
    expect(result.daysUntilStockout).toBe(10)
    expect(result.urgency).toBe('ok')
    expect(result.stockoutDate).not.toBeNull()
  })

  it('should flag critical urgency for 3 days or less', () => {
    const result = predictStockoutDate({ currentStock: 15, dailyUsageRate: 10 })
    expect(result.daysUntilStockout).toBe(1)
    expect(result.urgency).toBe('critical')
  })

  it('should flag warning urgency for 4-7 days', () => {
    const result = predictStockoutDate({ currentStock: 50, dailyUsageRate: 10 })
    expect(result.daysUntilStockout).toBe(5)
    expect(result.urgency).toBe('warning')
  })

  it('should return critical with 0 days for zero stock', () => {
    const result = predictStockoutDate({ currentStock: 0, dailyUsageRate: 10 })
    expect(result.daysUntilStockout).toBe(0)
    expect(result.urgency).toBe('critical')
  })

  it('should return critical for negative stock', () => {
    const result = predictStockoutDate({ currentStock: -5, dailyUsageRate: 10 })
    expect(result.daysUntilStockout).toBe(0)
    expect(result.urgency).toBe('critical')
  })

  it('should return Infinity for zero usage rate', () => {
    const result = predictStockoutDate({ currentStock: 100, dailyUsageRate: 0 })
    expect(result.daysUntilStockout).toBe(Infinity)
    expect(result.stockoutDate).toBeNull()
    expect(result.urgency).toBe('ok')
  })

  it('should return Infinity for negative usage rate', () => {
    const result = predictStockoutDate({ currentStock: 100, dailyUsageRate: -5 })
    expect(result.daysUntilStockout).toBe(Infinity)
    expect(result.urgency).toBe('ok')
  })

  it('should handle fractional daily usage', () => {
    // 10 units, 0.5/day → 20 days
    const result = predictStockoutDate({ currentStock: 10, dailyUsageRate: 0.5 })
    expect(result.daysUntilStockout).toBe(20)
    expect(result.urgency).toBe('ok')
  })
})

// ============================================
// calculateReorderPoint
// ============================================
describe('calculateReorderPoint', () => {
  it('should calculate reorder point with default safety stock (3 days)', () => {
    // 10 units/day, 5 day lead time, 3 day safety → reorder at (5+3)*10 = 80
    const result = calculateReorderPoint({ dailyUsageRate: 10, leadTimeDays: 5 })
    expect(result.reorderPoint).toBe(80)
    expect(result.safetyStock).toBe(30) // 10 * 3
  })

  it('should use custom safety stock days', () => {
    // 10 units/day, 5 day lead time, 7 day safety → reorder at (5+7)*10 = 120
    const result = calculateReorderPoint({ dailyUsageRate: 10, leadTimeDays: 5, safetyStockDays: 7 })
    expect(result.reorderPoint).toBe(120)
    expect(result.safetyStock).toBe(70)
  })

  it('should handle zero usage', () => {
    const result = calculateReorderPoint({ dailyUsageRate: 0, leadTimeDays: 5 })
    expect(result.reorderPoint).toBe(0)
    expect(result.safetyStock).toBe(0)
  })

  it('should handle zero lead time', () => {
    const result = calculateReorderPoint({ dailyUsageRate: 10, leadTimeDays: 0 })
    expect(result.reorderPoint).toBe(30) // safety stock only
    expect(result.safetyStock).toBe(30)
  })

  it('should round to nearest integer', () => {
    // 3.3 units/day, 5 day lead, 3 day safety → (5+3)*3.3 = 26.4 → 26
    const result = calculateReorderPoint({ dailyUsageRate: 3.3, leadTimeDays: 5 })
    expect(result.reorderPoint).toBe(26)
    expect(result.safetyStock).toBe(10) // 3.3*3 = 9.9 → 10
  })
})

// ============================================
// analyzeUsageTrend
// ============================================
describe('analyzeUsageTrend', () => {
  it('should detect increasing trend', () => {
    // First half avg: (10+12)/2=11, Second half avg: (18+20)/2=19
    const result = analyzeUsageTrend([10, 12, 18, 20])
    expect(result.direction).toBe('increasing')
    expect(result.percentChange).toBeGreaterThan(10)
  })

  it('should detect decreasing trend', () => {
    // First half avg: (50+45)/2=47.5, Second half avg: (20+15)/2=17.5
    const result = analyzeUsageTrend([50, 45, 20, 15])
    expect(result.direction).toBe('decreasing')
    expect(result.percentChange).toBeLessThan(-10)
  })

  it('should detect stable trend for flat data', () => {
    const result = analyzeUsageTrend([10, 11, 10, 11])
    expect(result.direction).toBe('stable')
    expect(Math.abs(result.percentChange)).toBeLessThanOrEqual(10)
  })

  it('should return stable for single data point', () => {
    const result = analyzeUsageTrend([42])
    expect(result.direction).toBe('stable')
    expect(result.percentChange).toBe(0)
  })

  it('should return stable for empty array', () => {
    const result = analyzeUsageTrend([])
    expect(result.direction).toBe('stable')
    expect(result.percentChange).toBe(0)
  })

  it('should handle all zeros', () => {
    const result = analyzeUsageTrend([0, 0, 0, 0])
    expect(result.direction).toBe('stable')
    expect(result.percentChange).toBe(0)
  })

  it('should handle transition from zero to positive', () => {
    const result = analyzeUsageTrend([0, 0, 10, 20])
    expect(result.direction).toBe('increasing')
    expect(result.percentChange).toBe(100)
  })

  it('should handle 6 data points (realistic weekly data)', () => {
    // 6 weeks of steel rod consumption
    const result = analyzeUsageTrend([100, 110, 105, 130, 140, 145])
    expect(result.direction).toBe('increasing')
  })
})
