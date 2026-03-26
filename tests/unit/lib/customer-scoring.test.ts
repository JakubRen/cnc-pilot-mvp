import { describe, it, expect } from 'vitest'
import { calculateChurnScore } from '@/lib/ai/customer-scoring'
import type { ChurnScoreInput } from '@/lib/ai/customer-scoring'

// ============================================
// calculateChurnScore — pure churn scoring
// ============================================
describe('calculateChurnScore', () => {
  describe('new customer (no history)', () => {
    it('should return low risk with score 0 for brand new customer', () => {
      const result = calculateChurnScore({
        daysSinceLastOrder: 0,
        totalOrders: 0,
        averageOrderFrequencyDays: 0,
        recentOrderTrend: 'stable',
      })
      expect(result.risk).toBe('low')
      expect(result.score).toBe(0)
    })
  })

  describe('active customer (recent orders)', () => {
    it('should return low risk for customer who ordered recently', () => {
      const result = calculateChurnScore({
        daysSinceLastOrder: 5,
        totalOrders: 10,
        averageOrderFrequencyDays: 14,
        recentOrderTrend: 'stable',
      })
      expect(result.risk).toBe('low')
      expect(result.score).toBeLessThan(30)
    })

    it('should reduce score for growing trend', () => {
      const stableResult = calculateChurnScore({
        daysSinceLastOrder: 20,
        totalOrders: 5,
        averageOrderFrequencyDays: 14,
        recentOrderTrend: 'stable',
      })

      const growingResult = calculateChurnScore({
        daysSinceLastOrder: 20,
        totalOrders: 5,
        averageOrderFrequencyDays: 14,
        recentOrderTrend: 'growing',
      })

      expect(growingResult.score).toBeLessThan(stableResult.score)
    })
  })

  describe('at-risk customer (30-60 days)', () => {
    it('should return medium risk for 35 days since last order', () => {
      const result = calculateChurnScore({
        daysSinceLastOrder: 35,
        totalOrders: 3,
        averageOrderFrequencyDays: 20,
        recentOrderTrend: 'stable',
      })
      expect(result.risk).toBe('medium')
      expect(result.score).toBeGreaterThanOrEqual(30)
    })

    it('should increase score for declining trend', () => {
      const stableResult = calculateChurnScore({
        daysSinceLastOrder: 35,
        totalOrders: 3,
        averageOrderFrequencyDays: 20,
        recentOrderTrend: 'stable',
      })

      const decliningResult = calculateChurnScore({
        daysSinceLastOrder: 35,
        totalOrders: 3,
        averageOrderFrequencyDays: 20,
        recentOrderTrend: 'declining',
      })

      expect(decliningResult.score).toBeGreaterThan(stableResult.score)
    })
  })

  describe('high-risk customer (60+ days)', () => {
    it('should return high risk for 90 days with declining trend', () => {
      const result = calculateChurnScore({
        daysSinceLastOrder: 90,
        totalOrders: 5,
        averageOrderFrequencyDays: 14,
        recentOrderTrend: 'declining',
      })
      expect(result.risk).toBe('high')
      expect(result.score).toBeGreaterThanOrEqual(70)
    })

    it('should return high risk for 70 days overdue relative to frequency', () => {
      const result = calculateChurnScore({
        daysSinceLastOrder: 70,
        totalOrders: 8,
        averageOrderFrequencyDays: 7,
        recentOrderTrend: 'declining',
      })
      expect(result.risk).toBe('high')
      expect(result.score).toBeGreaterThanOrEqual(70)
    })
  })

  describe('overdue relative to pattern', () => {
    it('should increase score when days since order exceeds average frequency', () => {
      const onTimeResult = calculateChurnScore({
        daysSinceLastOrder: 10,
        totalOrders: 5,
        averageOrderFrequencyDays: 14,
        recentOrderTrend: 'stable',
      })

      const overdueResult = calculateChurnScore({
        daysSinceLastOrder: 40,
        totalOrders: 5,
        averageOrderFrequencyDays: 14,
        recentOrderTrend: 'stable',
      })

      expect(overdueResult.score).toBeGreaterThan(onTimeResult.score)
    })

    it('should not add overdue factor when within normal frequency', () => {
      const result = calculateChurnScore({
        daysSinceLastOrder: 10,
        totalOrders: 5,
        averageOrderFrequencyDays: 30,
        recentOrderTrend: 'stable',
      })
      // 10 days < 30 day frequency, so no overdue factor
      expect(result.score).toBeLessThan(30)
    })
  })

  describe('edge cases', () => {
    it('should cap score at 100', () => {
      const result = calculateChurnScore({
        daysSinceLastOrder: 365,
        totalOrders: 1,
        averageOrderFrequencyDays: 7,
        recentOrderTrend: 'declining',
      })
      expect(result.score).toBeLessThanOrEqual(100)
    })

    it('should never return negative score', () => {
      const result = calculateChurnScore({
        daysSinceLastOrder: 1,
        totalOrders: 100,
        averageOrderFrequencyDays: 3,
        recentOrderTrend: 'growing',
      })
      expect(result.score).toBeGreaterThanOrEqual(0)
    })

    it('should handle zero average frequency', () => {
      const result = calculateChurnScore({
        daysSinceLastOrder: 5,
        totalOrders: 1,
        averageOrderFrequencyDays: 0,
        recentOrderTrend: 'stable',
      })
      // No overdue factor when averageOrderFrequencyDays=0
      expect(result).toBeDefined()
      expect(result.score).toBeGreaterThanOrEqual(0)
    })
  })
})
