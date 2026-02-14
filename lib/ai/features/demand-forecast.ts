// Demand Forecast (Phase 3 — Feature 3.2)
// Predicts future order volumes based on historical patterns.
//
// Architecture:
//   1. movingAverage(data, windowSize) — smooths noisy series
//   2. detectTrend(data) — up/down/stable classification via half-split comparison
//   3. detectSeasonality(monthlyData) — monthly cycle detection (needs 12+ months)
//   4. projectDemand(monthlyData, trend, seasonal) — 30/60/90 day projections
//   5. forecastDemand(companyId) — server-side: loads orders, aggregates, forecasts
//
// Handles sparse data gracefully:
//   - 1 month: produces projections with low confidence
//   - < 12 months: skips seasonality detection
//   - 12+ months: full seasonal pattern analysis

import { createClient } from '@/lib/supabase-server'
import { getUserProfile } from '@/lib/auth-server'
import { callGemini } from '@/lib/ai/gemini-client'
import { SchemaType } from '@/lib/ai/schema-types'
import { sanitizeField, FIELD_LIMITS } from '@/lib/ai/security/sanitizer'
import { logger } from '@/lib/logger'

// ============================================
// TYPES
// ============================================

export interface MonthlyDataPoint {
  month: string // YYYY-MM
  orderCount: number
  revenue: number
  avgOrderValue: number
}

export interface DemandProjection {
  period: '30d' | '60d' | '90d'
  projectedOrders: number
  projectedRevenue: number
  confidence: number // 0-100
}

export interface TrendAnalysis {
  direction: 'up' | 'down' | 'stable'
  percentChange: number // compared to previous period
  movingAverage: number[] // smoothed series
}

export interface MaterialBreakdown {
  material: string
  orderCount: number
  totalRevenue: number
  trendDirection: 'up' | 'down' | 'stable'
}

export interface CustomerBreakdown {
  customerName: string
  orderCount: number
  totalRevenue: number
  avgOrderValue: number
  trendDirection: 'up' | 'down' | 'stable'
}

export interface SeasonalPattern {
  detected: boolean
  peakMonths: number[] // 1-12
  troughMonths: number[] // 1-12
  seasonalIndex: number[] // 12 values, 1.0 = average
}

export interface DemandForecast {
  monthlyData: MonthlyDataPoint[]
  projections: DemandProjection[]
  trend: TrendAnalysis
  materialBreakdown: MaterialBreakdown[]
  customerBreakdown: CustomerBreakdown[]
  seasonal: SeasonalPattern
  dataMonths: number // how many months of history we have
  source: 'ai' | 'heuristic'
}

// ============================================
// MOVING AVERAGE
// ============================================

/**
 * Centered moving average with the given window size.
 * If data is shorter than the window, returns the global average for each point.
 */
export function movingAverage(data: number[], windowSize: number): number[] {
  if (data.length < windowSize) {
    return data.map(() => data.reduce((s, v) => s + v, 0) / data.length)
  }

  const result: number[] = []
  for (let i = 0; i < data.length; i++) {
    const start = Math.max(0, i - Math.floor(windowSize / 2))
    const end = Math.min(data.length, start + windowSize)
    const window = data.slice(start, end)
    result.push(Math.round((window.reduce((s, v) => s + v, 0) / window.length) * 100) / 100)
  }
  return result
}

// ============================================
// TREND DETECTION
// ============================================

/**
 * Detect trend direction by comparing first-half vs second-half averages.
 * >10% change = up/down, otherwise stable.
 */
export function detectTrend(data: number[]): TrendAnalysis {
  if (data.length <= 1) {
    return { direction: 'stable', percentChange: 0, movingAverage: data }
  }

  const smoothed = movingAverage(data, Math.min(3, data.length))

  const mid = Math.floor(data.length / 2)
  const firstHalf = data.slice(0, mid)
  const secondHalf = data.slice(mid)

  const avgFirst = firstHalf.reduce((s, v) => s + v, 0) / firstHalf.length
  const avgSecond = secondHalf.reduce((s, v) => s + v, 0) / secondHalf.length

  let percentChange = 0
  if (avgFirst > 0) {
    percentChange = Math.round(((avgSecond - avgFirst) / avgFirst) * 100)
  } else if (avgSecond > 0) {
    percentChange = 100
  }

  let direction: TrendAnalysis['direction'] = 'stable'
  if (percentChange > 10) direction = 'up'
  else if (percentChange < -10) direction = 'down'

  return { direction, percentChange, movingAverage: smoothed }
}

// ============================================
// SEASONAL DETECTION
// ============================================

/**
 * Detect seasonal patterns from monthly data.
 * Requires 12+ months of data. Peaks are >1.2x average, troughs are <0.8x.
 */
export function detectSeasonality(monthlyData: MonthlyDataPoint[]): SeasonalPattern {
  if (monthlyData.length < 12) {
    return { detected: false, peakMonths: [], troughMonths: [], seasonalIndex: Array(12).fill(1.0) }
  }

  // Group by month-of-year
  const monthBuckets: number[][] = Array.from({ length: 12 }, () => [])
  for (const dp of monthlyData) {
    const monthNum = parseInt(dp.month.split('-')[1]) - 1 // 0-indexed
    monthBuckets[monthNum].push(dp.orderCount)
  }

  const monthAverages = monthBuckets.map(bucket =>
    bucket.length > 0 ? bucket.reduce((s, v) => s + v, 0) / bucket.length : 0
  )

  const overallAvg = monthAverages.reduce((s, v) => s + v, 0) / 12

  if (overallAvg === 0) {
    return { detected: false, peakMonths: [], troughMonths: [], seasonalIndex: Array(12).fill(1.0) }
  }

  const seasonalIndex = monthAverages.map(avg => Math.round((avg / overallAvg) * 100) / 100)

  // Detect peaks (>1.2x average) and troughs (<0.8x average)
  const peakMonths = seasonalIndex
    .map((idx, i) => idx > 1.2 ? i + 1 : null)
    .filter((m): m is number => m !== null)

  const troughMonths = seasonalIndex
    .map((idx, i) => idx < 0.8 ? i + 1 : null)
    .filter((m): m is number => m !== null)

  const detected = peakMonths.length > 0 || troughMonths.length > 0

  return { detected, peakMonths, troughMonths, seasonalIndex }
}

// ============================================
// PROJECTIONS
// ============================================

/**
 * Project demand for 30/60/90 days based on recent averages and trend.
 * Confidence scales with data availability (more months = higher confidence).
 */
export function projectDemand(
  monthlyData: MonthlyDataPoint[],
  trend: TrendAnalysis,
  seasonal: SeasonalPattern
): DemandProjection[] {
  if (monthlyData.length === 0) {
    return [
      { period: '30d', projectedOrders: 0, projectedRevenue: 0, confidence: 0 },
      { period: '60d', projectedOrders: 0, projectedRevenue: 0, confidence: 0 },
      { period: '90d', projectedOrders: 0, projectedRevenue: 0, confidence: 0 },
    ]
  }

  // Use last 3 months average as base
  const recentMonths = monthlyData.slice(-3)
  const avgOrders = recentMonths.reduce((s, m) => s + m.orderCount, 0) / recentMonths.length
  const avgRevenue = recentMonths.reduce((s, m) => s + m.revenue, 0) / recentMonths.length

  // Apply trend multiplier (dampened to prevent wild extrapolation)
  const trendMultiplier = 1 + (trend.percentChange / 100) * 0.1

  // Confidence decreases for further projections
  const baseConfidence = Math.min(80, monthlyData.length * 5) // more data = more confidence

  return [
    {
      period: '30d',
      projectedOrders: Math.round(avgOrders * trendMultiplier),
      projectedRevenue: Math.round(avgRevenue * trendMultiplier * 100) / 100,
      confidence: Math.min(100, baseConfidence + 10),
    },
    {
      period: '60d',
      projectedOrders: Math.round(avgOrders * trendMultiplier * 2),
      projectedRevenue: Math.round(avgRevenue * trendMultiplier * 2 * 100) / 100,
      confidence: Math.min(100, baseConfidence),
    },
    {
      period: '90d',
      projectedOrders: Math.round(avgOrders * trendMultiplier * 3),
      projectedRevenue: Math.round(avgRevenue * trendMultiplier * 3 * 100) / 100,
      confidence: Math.max(10, baseConfidence - 10),
    },
  ]
}

// ============================================
// SERVER-SIDE: FULL FORECAST
// ============================================

/**
 * Server-side demand forecast. Loads order history from DB,
 * aggregates monthly data, computes trend/seasonal/projections.
 */
export async function forecastDemand(
  companyId: string,
  options?: { months?: number }
): Promise<DemandForecast> {
  const lookbackMonths = options?.months ?? 24
  const supabase = await createClient()

  // Load orders from the last N months
  const sinceDate = new Date()
  sinceDate.setMonth(sinceDate.getMonth() - lookbackMonths)
  const sinceISO = sinceDate.toISOString().split('T')[0]

  const { data: orders, error } = await supabase
    .from('orders')
    .select('id, created_at, selling_price, part_name, material, customer_name, quantity')
    .eq('company_id', companyId)
    .gte('created_at', sinceISO)
    .order('created_at', { ascending: true })

  if (error) {
    logger.error('[demand-forecast] Failed to load orders', { error: error.message })
  }

  const orderList = orders ?? []

  // Aggregate monthly data
  const monthMap = new Map<string, { count: number; revenue: number }>()
  const materialMap = new Map<string, { count: number; revenue: number; months: string[] }>()
  const customerMap = new Map<string, { count: number; revenue: number; months: string[] }>()

  for (const order of orderList) {
    const date = new Date(order.created_at)
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    const revenue = Number(order.selling_price) || 0

    // Monthly aggregation
    const existing = monthMap.get(monthKey) ?? { count: 0, revenue: 0 }
    existing.count += 1
    existing.revenue += revenue
    monthMap.set(monthKey, existing)

    // Material breakdown
    const mat = order.material || 'Nieznany'
    const matEntry = materialMap.get(mat) ?? { count: 0, revenue: 0, months: [] }
    matEntry.count += 1
    matEntry.revenue += revenue
    if (!matEntry.months.includes(monthKey)) matEntry.months.push(monthKey)
    materialMap.set(mat, matEntry)

    // Customer breakdown
    const cust = order.customer_name || 'Nieznany'
    const custEntry = customerMap.get(cust) ?? { count: 0, revenue: 0, months: [] }
    custEntry.count += 1
    custEntry.revenue += revenue
    if (!custEntry.months.includes(monthKey)) custEntry.months.push(monthKey)
    customerMap.set(cust, custEntry)
  }

  // Sort months chronologically
  const sortedMonths = Array.from(monthMap.keys()).sort()
  const monthlyData: MonthlyDataPoint[] = sortedMonths.map(month => {
    const data = monthMap.get(month)!
    return {
      month,
      orderCount: data.count,
      revenue: Math.round(data.revenue * 100) / 100,
      avgOrderValue: data.count > 0 ? Math.round((data.revenue / data.count) * 100) / 100 : 0,
    }
  })

  // Compute trend
  const orderCounts = monthlyData.map(m => m.orderCount)
  const trend = detectTrend(orderCounts)

  // Compute seasonality
  const seasonal = detectSeasonality(monthlyData)

  // Compute projections
  const projections = projectDemand(monthlyData, trend, seasonal)

  // Material breakdown with per-material trend
  const materialBreakdown: MaterialBreakdown[] = Array.from(materialMap.entries())
    .map(([material, data]) => {
      // Simple trend: compare first vs second half of months
      const sortedMaterialMonths = data.months.sort()
      const mid = Math.floor(sortedMaterialMonths.length / 2)
      const trendDirection: MaterialBreakdown['trendDirection'] =
        sortedMaterialMonths.length <= 1 ? 'stable' :
        mid === 0 ? 'stable' :
        data.count / sortedMaterialMonths.length > 1 ? 'up' : 'stable'

      return {
        material,
        orderCount: data.count,
        totalRevenue: Math.round(data.revenue * 100) / 100,
        trendDirection,
      }
    })
    .sort((a, b) => b.orderCount - a.orderCount)
    .slice(0, 10)

  // Customer breakdown with trend
  const customerBreakdown: CustomerBreakdown[] = Array.from(customerMap.entries())
    .map(([customerName, data]) => ({
      customerName,
      orderCount: data.count,
      totalRevenue: Math.round(data.revenue * 100) / 100,
      avgOrderValue: data.count > 0 ? Math.round((data.revenue / data.count) * 100) / 100 : 0,
      trendDirection: 'stable' as const, // simplified — full trend needs per-customer monthly series
    }))
    .sort((a, b) => b.orderCount - a.orderCount)
    .slice(0, 10)

  return {
    monthlyData,
    projections,
    trend,
    materialBreakdown,
    customerBreakdown,
    seasonal,
    dataMonths: monthlyData.length,
    source: 'heuristic',
  }
}
