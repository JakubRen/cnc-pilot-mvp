/**
 * Pure utility functions for customer churn scoring.
 * No server-only dependencies — safe to import in tests and server actions.
 */

export type ChurnRisk = 'high' | 'medium' | 'low'

export interface ChurnScoreInput {
  daysSinceLastOrder: number
  totalOrders: number
  averageOrderFrequencyDays: number
  recentOrderTrend: 'growing' | 'stable' | 'declining'
}

export interface ChurnScoreResult {
  risk: ChurnRisk
  score: number // 0-100, higher = more likely to churn
}

/**
 * Calculate a numeric churn score for a customer.
 * Exported for use in tests and direct consumption.
 */
export function calculateChurnScore(input: ChurnScoreInput): ChurnScoreResult {
  const { daysSinceLastOrder, totalOrders, averageOrderFrequencyDays, recentOrderTrend } = input

  // No history = no churn risk
  if (totalOrders === 0 && daysSinceLastOrder === 0) {
    return { risk: 'low', score: 0 }
  }

  let score = 0

  // Base score from days since last order
  if (daysSinceLastOrder > 60) {
    score += 50
  } else if (daysSinceLastOrder > 30) {
    score += 30
  } else if (daysSinceLastOrder > 14) {
    score += 15
  }

  // Factor in order frequency — if overdue relative to their pattern, higher risk
  if (averageOrderFrequencyDays > 0 && daysSinceLastOrder > averageOrderFrequencyDays) {
    const overdueRatio = daysSinceLastOrder / averageOrderFrequencyDays
    score += Math.min(30, Math.round(overdueRatio * 10))
  }

  // Trend factor
  if (recentOrderTrend === 'declining') {
    score += 15
  } else if (recentOrderTrend === 'growing') {
    score = Math.max(0, score - 10)
  }

  // Cap at 100
  score = Math.min(100, Math.max(0, score))

  let risk: ChurnRisk = 'low'
  if (score >= 70) risk = 'high'
  else if (score >= 30) risk = 'medium'

  return { risk, score }
}
