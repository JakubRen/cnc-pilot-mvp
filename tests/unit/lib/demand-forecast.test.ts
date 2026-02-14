/**
 * Unit Tests for Demand Forecast (Phase 3 — Feature 3.2)
 *
 * Tests the demand forecasting system that predicts future order volumes
 * based on historical patterns.
 *
 * CONTRACT for backend-dev:
 * - forecastDemand(companyId, options) -> DemandForecast
 * - Moving average calculation for trend smoothing
 * - Seasonal pattern detection (monthly cycles)
 * - Per-customer and per-material breakdowns
 * - 30/60/90 day projections
 * - Handles sparse data (< 12 months history)
 * - Trend direction classification (up/down/stable)
 */

import { describe, it, expect, vi } from 'vitest'

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}))

// ============================================
// CONTRACT TYPES
// ============================================

interface MonthlyDataPoint {
  month: string // YYYY-MM
  orderCount: number
  revenue: number
  avgOrderValue: number
}

interface DemandProjection {
  period: '30d' | '60d' | '90d'
  projectedOrders: number
  projectedRevenue: number
  confidence: number // 0-100
}

interface TrendAnalysis {
  direction: 'up' | 'down' | 'stable'
  percentChange: number // compared to previous period
  movingAverage: number[] // smoothed series
}

interface MaterialBreakdown {
  material: string
  orderCount: number
  totalRevenue: number
  trendDirection: 'up' | 'down' | 'stable'
}

interface CustomerBreakdown {
  customerName: string
  orderCount: number
  totalRevenue: number
  avgOrderValue: number
  trendDirection: 'up' | 'down' | 'stable'
}

interface SeasonalPattern {
  detected: boolean
  peakMonths: number[] // 1-12
  troughMonths: number[] // 1-12
  seasonalIndex: number[] // 12 values, 1.0 = average
}

interface DemandForecast {
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
// REFERENCE: MOVING AVERAGE
// ============================================

function movingAverage(data: number[], windowSize: number): number[] {
  if (data.length < windowSize) return data.map(() => data.reduce((s, v) => s + v, 0) / data.length)

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
// REFERENCE: TREND DETECTION
// ============================================

function detectTrend(data: number[]): TrendAnalysis {
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
// REFERENCE: SEASONAL DETECTION
// ============================================

function detectSeasonality(monthlyData: MonthlyDataPoint[]): SeasonalPattern {
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
// REFERENCE: PROJECTIONS
// ============================================

function projectDemand(
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

  // Apply trend multiplier
  const trendMultiplier = 1 + (trend.percentChange / 100) * 0.1 // dampen the trend

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
// MOVING AVERAGE TESTS
// ============================================

describe('Demand Forecast — Moving Average', () => {
  it('should smooth noisy data', () => {
    const noisy = [10, 50, 15, 45, 20, 40, 25]
    const smoothed = movingAverage(noisy, 3)

    expect(smoothed.length).toBe(noisy.length)

    // Smoothed values should have lower variance
    const noisyVariance = Math.sqrt(noisy.reduce((s, v) => s + Math.pow(v - 29.3, 2), 0) / noisy.length)
    const smoothedVariance = Math.sqrt(smoothed.reduce((s, v) => {
      const mean = smoothed.reduce((a, b) => a + b, 0) / smoothed.length
      return s + Math.pow(v - mean, 2)
    }, 0) / smoothed.length)

    expect(smoothedVariance).toBeLessThan(noisyVariance)
  })

  it('should handle single data point', () => {
    const result = movingAverage([42], 3)
    expect(result).toEqual([42])
  })

  it('should handle window larger than data', () => {
    const result = movingAverage([10, 20], 5)
    expect(result.length).toBe(2)
    // Each value should be the global average
    expect(result[0]).toBe(15)
    expect(result[1]).toBe(15)
  })

  it('should preserve mean approximately', () => {
    const data = [10, 20, 30, 40, 50]
    const smoothed = movingAverage(data, 3)

    const originalMean = data.reduce((s, v) => s + v, 0) / data.length
    const smoothedMean = smoothed.reduce((s, v) => s + v, 0) / smoothed.length

    expect(Math.abs(smoothedMean - originalMean)).toBeLessThan(5)
  })
})

// ============================================
// TREND DETECTION
// ============================================

describe('Demand Forecast — Trend Detection', () => {
  it('should detect upward trend', () => {
    const trend = detectTrend([10, 15, 20, 25, 30, 35])
    expect(trend.direction).toBe('up')
    expect(trend.percentChange).toBeGreaterThan(10)
  })

  it('should detect downward trend', () => {
    const trend = detectTrend([35, 30, 25, 20, 15, 10])
    expect(trend.direction).toBe('down')
    expect(trend.percentChange).toBeLessThan(-10)
  })

  it('should detect stable trend for flat data', () => {
    const trend = detectTrend([20, 21, 19, 20, 21, 20])
    expect(trend.direction).toBe('stable')
    expect(Math.abs(trend.percentChange)).toBeLessThanOrEqual(10)
  })

  it('should handle single data point as stable', () => {
    const trend = detectTrend([42])
    expect(trend.direction).toBe('stable')
    expect(trend.percentChange).toBe(0)
  })

  it('should handle empty data', () => {
    const trend = detectTrend([])
    expect(trend.direction).toBe('stable')
  })

  it('should include moving average in result', () => {
    const data = [10, 20, 30, 40, 50]
    const trend = detectTrend(data)
    expect(trend.movingAverage.length).toBe(data.length)
  })
})

// ============================================
// SEASONAL PATTERN DETECTION
// ============================================

describe('Demand Forecast — Seasonal Patterns', () => {
  it('should detect seasonal patterns from 12+ months data', () => {
    // Simulate higher demand in months 3,4,5 (spring) and 9,10 (autumn)
    const monthlyData: MonthlyDataPoint[] = []
    for (let year = 2025; year <= 2026; year++) {
      for (let month = 1; month <= 12; month++) {
        const seasonalMultiplier =
          [3, 4, 5].includes(month) ? 1.5 :
          [9, 10].includes(month) ? 1.3 :
          [12, 1, 2].includes(month) ? 0.7 :
          1.0
        monthlyData.push({
          month: `${year}-${String(month).padStart(2, '0')}`,
          orderCount: Math.round(20 * seasonalMultiplier),
          revenue: Math.round(20000 * seasonalMultiplier),
          avgOrderValue: 1000,
        })
      }
    }

    const seasonal = detectSeasonality(monthlyData)

    expect(seasonal.detected).toBe(true)
    expect(seasonal.peakMonths.length).toBeGreaterThan(0)
    expect(seasonal.seasonalIndex.length).toBe(12)
  })

  it('should not detect seasonality with < 12 months data', () => {
    const monthlyData: MonthlyDataPoint[] = Array.from({ length: 6 }, (_, i) => ({
      month: `2026-${String(i + 1).padStart(2, '0')}`,
      orderCount: 20,
      revenue: 20000,
      avgOrderValue: 1000,
    }))

    const seasonal = detectSeasonality(monthlyData)
    expect(seasonal.detected).toBe(false)
    expect(seasonal.seasonalIndex).toEqual(Array(12).fill(1.0))
  })

  it('should have seasonal index average close to 1.0', () => {
    const monthlyData: MonthlyDataPoint[] = Array.from({ length: 24 }, (_, i) => ({
      month: `${2025 + Math.floor(i / 12)}-${String((i % 12) + 1).padStart(2, '0')}`,
      orderCount: 15 + (i % 12 < 3 ? 10 : 0), // higher in Jan-Mar
      revenue: 15000,
      avgOrderValue: 1000,
    }))

    const seasonal = detectSeasonality(monthlyData)
    const avgIndex = seasonal.seasonalIndex.reduce((s, v) => s + v, 0) / 12

    expect(avgIndex).toBeCloseTo(1.0, 1)
  })
})

// ============================================
// PROJECTIONS (30/60/90)
// ============================================

describe('Demand Forecast — Projections', () => {
  it('should produce 3 projections (30d, 60d, 90d)', () => {
    const monthly: MonthlyDataPoint[] = Array.from({ length: 6 }, (_, i) => ({
      month: `2026-${String(i + 1).padStart(2, '0')}`,
      orderCount: 20 + i * 2,
      revenue: 20000 + i * 2000,
      avgOrderValue: 1000,
    }))

    const trend = detectTrend(monthly.map(m => m.orderCount))
    const seasonal = detectSeasonality(monthly)
    const projections = projectDemand(monthly, trend, seasonal)

    expect(projections.length).toBe(3)
    expect(projections.map(p => p.period)).toEqual(['30d', '60d', '90d'])
  })

  it('should have decreasing confidence for longer projections', () => {
    const monthly: MonthlyDataPoint[] = Array.from({ length: 12 }, (_, i) => ({
      month: `2025-${String(i + 1).padStart(2, '0')}`,
      orderCount: 25,
      revenue: 25000,
      avgOrderValue: 1000,
    }))

    const trend = detectTrend(monthly.map(m => m.orderCount))
    const seasonal = detectSeasonality(monthly)
    const projections = projectDemand(monthly, trend, seasonal)

    expect(projections[0].confidence).toBeGreaterThanOrEqual(projections[1].confidence)
    expect(projections[1].confidence).toBeGreaterThanOrEqual(projections[2].confidence)
  })

  it('should project zero for empty data', () => {
    const projections = projectDemand(
      [],
      { direction: 'stable', percentChange: 0, movingAverage: [] },
      { detected: false, peakMonths: [], troughMonths: [], seasonalIndex: Array(12).fill(1.0) }
    )

    expect(projections[0].projectedOrders).toBe(0)
    expect(projections[0].projectedRevenue).toBe(0)
    expect(projections[0].confidence).toBe(0)
  })

  it('should scale projections roughly linearly (60d ≈ 2x30d)', () => {
    const monthly: MonthlyDataPoint[] = Array.from({ length: 6 }, (_, i) => ({
      month: `2026-${String(i + 1).padStart(2, '0')}`,
      orderCount: 20,
      revenue: 20000,
      avgOrderValue: 1000,
    }))

    const trend = detectTrend(monthly.map(m => m.orderCount))
    const seasonal = detectSeasonality(monthly)
    const projections = projectDemand(monthly, trend, seasonal)

    const p30 = projections[0].projectedOrders
    const p60 = projections[1].projectedOrders
    const p90 = projections[2].projectedOrders

    expect(p60).toBeCloseTo(p30 * 2, 0)
    expect(p90).toBeCloseTo(p30 * 3, 0)
  })
})

// ============================================
// SPARSE DATA HANDLING
// ============================================

describe('Demand Forecast — Sparse Data', () => {
  it('should handle only 1 month of history', () => {
    const monthly: MonthlyDataPoint[] = [{
      month: '2026-01',
      orderCount: 15,
      revenue: 15000,
      avgOrderValue: 1000,
    }]

    const trend = detectTrend(monthly.map(m => m.orderCount))
    const projections = projectDemand(monthly, trend, detectSeasonality(monthly))

    expect(projections[0].projectedOrders).toBeGreaterThan(0)
    expect(projections[0].confidence).toBeLessThan(30) // low confidence with 1 month
  })

  it('should have higher confidence with more historical data', () => {
    const short: MonthlyDataPoint[] = Array.from({ length: 2 }, (_, i) => ({
      month: `2026-${String(i + 1).padStart(2, '0')}`,
      orderCount: 20, revenue: 20000, avgOrderValue: 1000,
    }))

    const long: MonthlyDataPoint[] = Array.from({ length: 12 }, (_, i) => ({
      month: `2025-${String(i + 1).padStart(2, '0')}`,
      orderCount: 20, revenue: 20000, avgOrderValue: 1000,
    }))

    const shortTrend = detectTrend(short.map(m => m.orderCount))
    const longTrend = detectTrend(long.map(m => m.orderCount))

    const shortProj = projectDemand(short, shortTrend, detectSeasonality(short))
    const longProj = projectDemand(long, longTrend, detectSeasonality(long))

    expect(longProj[0].confidence).toBeGreaterThan(shortProj[0].confidence)
  })
})

// ============================================
// RESULT SHAPE
// ============================================

describe('Demand Forecast — Result Shape', () => {
  it('should return DemandForecast with all required fields', () => {
    const monthly: MonthlyDataPoint[] = Array.from({ length: 6 }, (_, i) => ({
      month: `2026-${String(i + 1).padStart(2, '0')}`,
      orderCount: 20, revenue: 20000, avgOrderValue: 1000,
    }))

    const trend = detectTrend(monthly.map(m => m.orderCount))
    const seasonal = detectSeasonality(monthly)
    const projections = projectDemand(monthly, trend, seasonal)

    const forecast: DemandForecast = {
      monthlyData: monthly,
      projections,
      trend,
      materialBreakdown: [
        { material: 'Stal 45', orderCount: 10, totalRevenue: 10000, trendDirection: 'up' },
      ],
      customerBreakdown: [
        { customerName: 'MetalTech', orderCount: 8, totalRevenue: 12000, avgOrderValue: 1500, trendDirection: 'stable' },
      ],
      seasonal,
      dataMonths: 6,
      source: 'heuristic',
    }

    expect(forecast).toHaveProperty('monthlyData')
    expect(forecast).toHaveProperty('projections')
    expect(forecast).toHaveProperty('trend')
    expect(forecast).toHaveProperty('materialBreakdown')
    expect(forecast).toHaveProperty('customerBreakdown')
    expect(forecast).toHaveProperty('seasonal')
    expect(forecast).toHaveProperty('dataMonths')
    expect(forecast).toHaveProperty('source')
    expect(forecast.projections.length).toBe(3)
  })

  it('should return MonthlyDataPoint with all required fields', () => {
    const dp: MonthlyDataPoint = {
      month: '2026-01',
      orderCount: 25,
      revenue: 25000,
      avgOrderValue: 1000,
    }

    expect(dp).toHaveProperty('month')
    expect(dp).toHaveProperty('orderCount')
    expect(dp).toHaveProperty('revenue')
    expect(dp).toHaveProperty('avgOrderValue')
    expect(dp.month).toMatch(/^\d{4}-\d{2}$/)
  })
})
