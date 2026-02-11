/**
 * Pure utility functions for inventory calculations.
 * No server-only dependencies — safe to import in tests and server actions.
 */

// ============================================
// USAGE VELOCITY
// ============================================

export interface UsageVelocityInput {
  totalConsumed: number
  periodDays: number
}

export interface UsageVelocityResult {
  dailyRate: number
  weeklyRate: number
  monthlyRate: number
}

/**
 * Calculate usage velocity from consumption data.
 */
export function calculateUsageVelocity(input: UsageVelocityInput): UsageVelocityResult {
  const { totalConsumed, periodDays } = input

  if (periodDays <= 0 || totalConsumed <= 0) {
    return { dailyRate: 0, weeklyRate: 0, monthlyRate: 0 }
  }

  const dailyRate = totalConsumed / periodDays
  return {
    dailyRate: Math.round(dailyRate * 1000) / 1000,
    weeklyRate: Math.round(dailyRate * 7 * 100) / 100,
    monthlyRate: Math.round(dailyRate * 30 * 100) / 100,
  }
}

// ============================================
// STOCKOUT PREDICTION
// ============================================

export interface StockoutInput {
  currentStock: number
  dailyUsageRate: number
}

export interface StockoutResult {
  daysUntilStockout: number
  stockoutDate: string | null
  urgency: 'critical' | 'warning' | 'ok'
}

/**
 * Predict when stock will run out.
 */
export function predictStockoutDate(input: StockoutInput): StockoutResult {
  const { currentStock, dailyUsageRate } = input

  if (currentStock <= 0) {
    return {
      daysUntilStockout: 0,
      stockoutDate: new Date().toISOString(),
      urgency: 'critical',
    }
  }

  if (dailyUsageRate <= 0) {
    return {
      daysUntilStockout: Infinity,
      stockoutDate: null,
      urgency: 'ok',
    }
  }

  const daysUntilStockout = Math.floor(currentStock / dailyUsageRate)

  const stockoutDate = new Date()
  stockoutDate.setDate(stockoutDate.getDate() + daysUntilStockout)

  let urgency: StockoutResult['urgency'] = 'ok'
  if (daysUntilStockout <= 3) urgency = 'critical'
  else if (daysUntilStockout <= 7) urgency = 'warning'

  return {
    daysUntilStockout,
    stockoutDate: stockoutDate.toISOString(),
    urgency,
  }
}

// ============================================
// REORDER POINT
// ============================================

export interface ReorderPointInput {
  dailyUsageRate: number
  leadTimeDays: number
  safetyStockDays?: number
}

export interface ReorderPointResult {
  reorderPoint: number
  safetyStock: number
}

/**
 * Calculate reorder point based on lead time and usage rate.
 */
export function calculateReorderPoint(input: ReorderPointInput): ReorderPointResult {
  const { dailyUsageRate, leadTimeDays, safetyStockDays = 3 } = input

  const safetyStock = Math.round(dailyUsageRate * safetyStockDays)
  const reorderPoint = Math.round(dailyUsageRate * (leadTimeDays + safetyStockDays))

  return { reorderPoint, safetyStock }
}

// ============================================
// USAGE TREND
// ============================================

export interface UsageTrendResult {
  direction: 'increasing' | 'decreasing' | 'stable'
  percentChange: number
}

/**
 * Analyze usage trend from a series of data points (e.g. weekly usage).
 */
export function analyzeUsageTrend(dataPoints: number[]): UsageTrendResult {
  if (dataPoints.length <= 1) {
    return { direction: 'stable', percentChange: 0 }
  }

  const mid = Math.floor(dataPoints.length / 2)
  const firstHalf = dataPoints.slice(0, mid)
  const secondHalf = dataPoints.slice(mid)

  const avgFirst = firstHalf.reduce((s, v) => s + v, 0) / firstHalf.length
  const avgSecond = secondHalf.reduce((s, v) => s + v, 0) / secondHalf.length

  if (avgFirst === 0 && avgSecond === 0) {
    return { direction: 'stable', percentChange: 0 }
  }

  const percentChange = avgFirst > 0
    ? Math.round(((avgSecond - avgFirst) / avgFirst) * 100)
    : avgSecond > 0 ? 100 : 0

  let direction: UsageTrendResult['direction'] = 'stable'
  if (percentChange > 10) direction = 'increasing'
  else if (percentChange < -10) direction = 'decreasing'

  return { direction, percentChange }
}
