/**
 * Unit Tests for Revenue Forecast (Phase 3 — Feature 3.4)
 *
 * Tests the revenue forecasting and cost optimization system.
 *
 * CONTRACT for backend-dev:
 * - forecastRevenue(companyId, options) -> RevenueForecast
 * - Revenue projections for 30/60/90 days
 * - Cost overrun identification (>10% threshold default) from order data
 * - Optimization suggestions generation
 * - Monthly aggregation from orders
 * - Trend calculation
 * - Handles zero-revenue periods gracefully
 */

import { describe, it, expect, vi } from 'vitest'

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}))

// ============================================
// CONTRACT TYPES
// ============================================

interface MonthlyRevenue {
  month: string // YYYY-MM
  revenue: number
  costs: number
  profit: number
  marginPercent: number
  orderCount: number
}

interface RevenueProjection {
  period: '30d' | '60d' | '90d'
  projectedRevenue: number
  projectedCosts: number
  projectedProfit: number
  confidence: number // 0-100
}

interface CostOverrun {
  orderId: string
  orderNumber: string
  partName: string
  estimatedCost: number
  actualCost: number
  overrunAmount: number
  overrunPercent: number
}

interface OptimizationSuggestion {
  type: 'cost_reduction' | 'pricing_increase' | 'volume_opportunity' | 'waste_reduction'
  title: string
  description: string
  estimatedImpactPln: number
  confidence: number // 0-100
}

interface RevenueTrend {
  direction: 'up' | 'down' | 'stable'
  percentChange: number
  avgMonthlyRevenue: number
  avgMonthlyProfit: number
  avgMarginPercent: number
}

interface RevenueForecast {
  monthlyData: MonthlyRevenue[]
  projections: RevenueProjection[]
  trend: RevenueTrend
  costOverruns: CostOverrun[]
  suggestions: OptimizationSuggestion[]
  dataMonths: number
  source: 'ai' | 'heuristic'
}

// ============================================
// REFERENCE: MONTHLY AGGREGATION
// ============================================

interface OrderRow {
  created_at: string
  total_cost: number | null
  material_cost: number | null
  labor_cost: number | null
  overhead_cost: number | null
}

function aggregateMonthly(orders: OrderRow[]): MonthlyRevenue[] {
  const map = new Map<string, { revenue: number; costs: number; count: number }>()

  for (const order of orders) {
    const month = order.created_at.split('T')[0].substring(0, 7) // YYYY-MM
    const revenue = order.total_cost || 0
    const costs = (order.material_cost || 0) + (order.labor_cost || 0) + (order.overhead_cost || 0)

    const existing = map.get(month) || { revenue: 0, costs: 0, count: 0 }
    existing.revenue += revenue
    existing.costs += costs
    existing.count += 1
    map.set(month, existing)
  }

  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, data]) => {
      const profit = data.revenue - data.costs
      const marginPercent = data.revenue > 0
        ? Math.round((profit / data.revenue) * 100 * 10) / 10
        : 0

      return {
        month,
        revenue: Math.round(data.revenue * 100) / 100,
        costs: Math.round(data.costs * 100) / 100,
        profit: Math.round(profit * 100) / 100,
        marginPercent,
        orderCount: data.count,
      }
    })
}

// ============================================
// REFERENCE: TREND CALCULATION
// ============================================

function calculateRevenueTrend(monthly: MonthlyRevenue[]): RevenueTrend {
  if (monthly.length <= 1) {
    const single = monthly[0]
    return {
      direction: 'stable',
      percentChange: 0,
      avgMonthlyRevenue: single?.revenue || 0,
      avgMonthlyProfit: single?.profit || 0,
      avgMarginPercent: single?.marginPercent || 0,
    }
  }

  const avgRevenue = monthly.reduce((s, m) => s + m.revenue, 0) / monthly.length
  const avgProfit = monthly.reduce((s, m) => s + m.profit, 0) / monthly.length
  const avgMargin = monthly.reduce((s, m) => s + m.marginPercent, 0) / monthly.length

  const mid = Math.floor(monthly.length / 2)
  const firstHalf = monthly.slice(0, mid)
  const secondHalf = monthly.slice(mid)

  const avgFirst = firstHalf.reduce((s, m) => s + m.revenue, 0) / firstHalf.length
  const avgSecond = secondHalf.reduce((s, m) => s + m.revenue, 0) / secondHalf.length

  let percentChange = 0
  if (avgFirst > 0) {
    percentChange = Math.round(((avgSecond - avgFirst) / avgFirst) * 100)
  } else if (avgSecond > 0) {
    percentChange = 100
  }

  let direction: RevenueTrend['direction'] = 'stable'
  if (percentChange > 10) direction = 'up'
  else if (percentChange < -10) direction = 'down'

  return {
    direction,
    percentChange,
    avgMonthlyRevenue: Math.round(avgRevenue * 100) / 100,
    avgMonthlyProfit: Math.round(avgProfit * 100) / 100,
    avgMarginPercent: Math.round(avgMargin * 10) / 10,
  }
}

// ============================================
// REFERENCE: COST OVERRUN DETECTION
// ============================================

interface OrderWithCosts {
  id: string
  order_number: string
  part_name: string
  total_cost: number
  material_cost: number
  labor_cost: number
  overhead_cost: number
}

function detectCostOverruns(orders: OrderWithCosts[], thresholdPercent: number = 10): CostOverrun[] {
  const overruns: CostOverrun[] = []

  for (const order of orders) {
    const actualCosts = order.material_cost + order.labor_cost + order.overhead_cost
    const revenue = order.total_cost

    // Cost overrun = costs exceed revenue (negative margin)
    if (actualCosts > revenue && revenue > 0) {
      const overrunAmount = Math.round((actualCosts - revenue) * 100) / 100
      const overrunPercent = Math.round((overrunAmount / revenue) * 100)

      if (overrunPercent >= thresholdPercent) {
        overruns.push({
          orderId: order.id,
          orderNumber: order.order_number,
          partName: order.part_name,
          estimatedCost: revenue, // original pricing assumed to cover costs
          actualCost: Math.round(actualCosts * 100) / 100,
          overrunAmount,
          overrunPercent,
        })
      }
    }
  }

  return overruns.sort((a, b) => b.overrunPercent - a.overrunPercent)
}

// ============================================
// REFERENCE: OPTIMIZATION SUGGESTIONS
// ============================================

function generateSuggestions(
  monthly: MonthlyRevenue[],
  overruns: CostOverrun[]
): OptimizationSuggestion[] {
  const suggestions: OptimizationSuggestion[] = []

  // Check for cost overruns pattern
  if (overruns.length > 0) {
    const totalOverrun = overruns.reduce((s, o) => s + o.overrunAmount, 0)
    suggestions.push({
      type: 'cost_reduction',
      title: 'Redukcja przekroczen kosztow',
      description: `${overruns.length} zlecen z przekroczeniem kosztow na laczna kwote ${totalOverrun.toFixed(0)} PLN. Przeanalizuj wyceny i procesy produkcji.`,
      estimatedImpactPln: Math.round(totalOverrun * 0.5), // assume 50% can be recovered
      confidence: 70,
    })
  }

  // Check for margin trend
  if (monthly.length >= 3) {
    const recent = monthly.slice(-3)
    const avgMargin = recent.reduce((s, m) => s + m.marginPercent, 0) / recent.length

    if (avgMargin < 15) {
      suggestions.push({
        type: 'pricing_increase',
        title: 'Podniesienie cen',
        description: `Srednia marza ostatnich 3 miesiecy: ${avgMargin.toFixed(1)}%. Rozważ podniesienie cen o 5-10%.`,
        estimatedImpactPln: Math.round(recent.reduce((s, m) => s + m.revenue, 0) / 3 * 0.05),
        confidence: 60,
      })
    }
  }

  // Check for revenue growth opportunity
  if (monthly.length >= 2) {
    const last = monthly[monthly.length - 1]
    const prev = monthly[monthly.length - 2]

    if (last.orderCount > prev.orderCount * 1.2) {
      suggestions.push({
        type: 'volume_opportunity',
        title: 'Rosnacy popyt — wykorzystaj okazje',
        description: `Wzrost liczby zlecen o ${Math.round((last.orderCount / prev.orderCount - 1) * 100)}%. Rozważ rozszerzenie mocy produkcyjnych.`,
        estimatedImpactPln: Math.round(last.revenue * 0.1),
        confidence: 50,
      })
    }
  }

  return suggestions
}

// ============================================
// REFERENCE: PROJECTIONS
// ============================================

function projectRevenue(monthly: MonthlyRevenue[], trend: RevenueTrend): RevenueProjection[] {
  if (monthly.length === 0) {
    return [
      { period: '30d', projectedRevenue: 0, projectedCosts: 0, projectedProfit: 0, confidence: 0 },
      { period: '60d', projectedRevenue: 0, projectedCosts: 0, projectedProfit: 0, confidence: 0 },
      { period: '90d', projectedRevenue: 0, projectedCosts: 0, projectedProfit: 0, confidence: 0 },
    ]
  }

  const recent = monthly.slice(-3)
  const avgRevenue = recent.reduce((s, m) => s + m.revenue, 0) / recent.length
  const avgCosts = recent.reduce((s, m) => s + m.costs, 0) / recent.length

  const trendMultiplier = 1 + (trend.percentChange / 100) * 0.1

  const baseConfidence = Math.min(80, monthly.length * 5)

  return [
    {
      period: '30d',
      projectedRevenue: Math.round(avgRevenue * trendMultiplier * 100) / 100,
      projectedCosts: Math.round(avgCosts * trendMultiplier * 100) / 100,
      projectedProfit: Math.round((avgRevenue - avgCosts) * trendMultiplier * 100) / 100,
      confidence: Math.min(100, baseConfidence + 10),
    },
    {
      period: '60d',
      projectedRevenue: Math.round(avgRevenue * trendMultiplier * 2 * 100) / 100,
      projectedCosts: Math.round(avgCosts * trendMultiplier * 2 * 100) / 100,
      projectedProfit: Math.round((avgRevenue - avgCosts) * trendMultiplier * 2 * 100) / 100,
      confidence: Math.min(100, baseConfidence),
    },
    {
      period: '90d',
      projectedRevenue: Math.round(avgRevenue * trendMultiplier * 3 * 100) / 100,
      projectedCosts: Math.round(avgCosts * trendMultiplier * 3 * 100) / 100,
      projectedProfit: Math.round((avgRevenue - avgCosts) * trendMultiplier * 3 * 100) / 100,
      confidence: Math.max(10, baseConfidence - 10),
    },
  ]
}

// ============================================
// MONTHLY AGGREGATION
// ============================================

describe('Revenue Forecast — Monthly Aggregation', () => {
  it('should aggregate orders into monthly buckets', () => {
    const orders: OrderRow[] = [
      { created_at: '2026-01-05T10:00:00Z', total_cost: 5000, material_cost: 1000, labor_cost: 2000, overhead_cost: 500 },
      { created_at: '2026-01-15T10:00:00Z', total_cost: 3000, material_cost: 600, labor_cost: 1200, overhead_cost: 300 },
      { created_at: '2026-02-10T10:00:00Z', total_cost: 4000, material_cost: 800, labor_cost: 1600, overhead_cost: 400 },
    ]

    const monthly = aggregateMonthly(orders)

    expect(monthly.length).toBe(2)
    expect(monthly[0].month).toBe('2026-01')
    expect(monthly[0].revenue).toBe(8000)
    expect(monthly[0].orderCount).toBe(2)
    expect(monthly[1].month).toBe('2026-02')
    expect(monthly[1].orderCount).toBe(1)
  })

  it('should calculate profit and margin correctly', () => {
    const orders: OrderRow[] = [
      { created_at: '2026-01-10T10:00:00Z', total_cost: 10000, material_cost: 2000, labor_cost: 3000, overhead_cost: 1000 },
    ]

    const monthly = aggregateMonthly(orders)

    expect(monthly[0].revenue).toBe(10000)
    expect(monthly[0].costs).toBe(6000)
    expect(monthly[0].profit).toBe(4000)
    expect(monthly[0].marginPercent).toBe(40)
  })

  it('should handle orders with null costs', () => {
    const orders: OrderRow[] = [
      { created_at: '2026-01-10T10:00:00Z', total_cost: 5000, material_cost: null, labor_cost: null, overhead_cost: null },
    ]

    const monthly = aggregateMonthly(orders)

    expect(monthly[0].revenue).toBe(5000)
    expect(monthly[0].costs).toBe(0)
    expect(monthly[0].profit).toBe(5000)
  })

  it('should sort months chronologically', () => {
    const orders: OrderRow[] = [
      { created_at: '2026-03-01T10:00:00Z', total_cost: 3000, material_cost: 500, labor_cost: 500, overhead_cost: 200 },
      { created_at: '2026-01-01T10:00:00Z', total_cost: 1000, material_cost: 200, labor_cost: 300, overhead_cost: 100 },
      { created_at: '2026-02-01T10:00:00Z', total_cost: 2000, material_cost: 400, labor_cost: 600, overhead_cost: 200 },
    ]

    const monthly = aggregateMonthly(orders)

    expect(monthly.map(m => m.month)).toEqual(['2026-01', '2026-02', '2026-03'])
  })

  it('should return empty array for no orders', () => {
    expect(aggregateMonthly([])).toEqual([])
  })
})

// ============================================
// TREND CALCULATION
// ============================================

describe('Revenue Forecast — Trend Calculation', () => {
  it('should detect upward revenue trend', () => {
    const monthly: MonthlyRevenue[] = [
      { month: '2025-10', revenue: 10000, costs: 5000, profit: 5000, marginPercent: 50, orderCount: 10 },
      { month: '2025-11', revenue: 12000, costs: 6000, profit: 6000, marginPercent: 50, orderCount: 12 },
      { month: '2025-12', revenue: 15000, costs: 7000, profit: 8000, marginPercent: 53, orderCount: 15 },
      { month: '2026-01', revenue: 18000, costs: 8000, profit: 10000, marginPercent: 56, orderCount: 18 },
    ]

    const trend = calculateRevenueTrend(monthly)
    expect(trend.direction).toBe('up')
    expect(trend.percentChange).toBeGreaterThan(10)
  })

  it('should detect downward revenue trend', () => {
    const monthly: MonthlyRevenue[] = [
      { month: '2025-10', revenue: 20000, costs: 8000, profit: 12000, marginPercent: 60, orderCount: 20 },
      { month: '2025-11', revenue: 15000, costs: 7000, profit: 8000, marginPercent: 53, orderCount: 15 },
      { month: '2025-12', revenue: 10000, costs: 6000, profit: 4000, marginPercent: 40, orderCount: 10 },
      { month: '2026-01', revenue: 8000, costs: 5000, profit: 3000, marginPercent: 38, orderCount: 8 },
    ]

    const trend = calculateRevenueTrend(monthly)
    expect(trend.direction).toBe('down')
    expect(trend.percentChange).toBeLessThan(-10)
  })

  it('should detect stable trend for flat data', () => {
    const monthly: MonthlyRevenue[] = [
      { month: '2025-10', revenue: 15000, costs: 7000, profit: 8000, marginPercent: 53, orderCount: 15 },
      { month: '2025-11', revenue: 14500, costs: 6800, profit: 7700, marginPercent: 53, orderCount: 14 },
      { month: '2025-12', revenue: 15500, costs: 7200, profit: 8300, marginPercent: 54, orderCount: 16 },
      { month: '2026-01', revenue: 15000, costs: 7000, profit: 8000, marginPercent: 53, orderCount: 15 },
    ]

    const trend = calculateRevenueTrend(monthly)
    expect(trend.direction).toBe('stable')
  })

  it('should calculate average values', () => {
    const monthly: MonthlyRevenue[] = [
      { month: '2026-01', revenue: 10000, costs: 4000, profit: 6000, marginPercent: 60, orderCount: 10 },
      { month: '2026-02', revenue: 20000, costs: 8000, profit: 12000, marginPercent: 60, orderCount: 20 },
    ]

    const trend = calculateRevenueTrend(monthly)
    expect(trend.avgMonthlyRevenue).toBe(15000)
    expect(trend.avgMonthlyProfit).toBe(9000)
  })

  it('should handle single month', () => {
    const monthly: MonthlyRevenue[] = [
      { month: '2026-01', revenue: 10000, costs: 5000, profit: 5000, marginPercent: 50, orderCount: 10 },
    ]

    const trend = calculateRevenueTrend(monthly)
    expect(trend.direction).toBe('stable')
    expect(trend.avgMonthlyRevenue).toBe(10000)
  })
})

// ============================================
// COST OVERRUN IDENTIFICATION
// ============================================

describe('Revenue Forecast — Cost Overruns', () => {
  it('should identify orders where costs exceed revenue', () => {
    const orders: OrderWithCosts[] = [
      { id: 'o1', order_number: 'ORD-001', part_name: 'A', total_cost: 1000, material_cost: 500, labor_cost: 400, overhead_cost: 300 },
      { id: 'o2', order_number: 'ORD-002', part_name: 'B', total_cost: 5000, material_cost: 1000, labor_cost: 2000, overhead_cost: 500 },
    ]

    const overruns = detectCostOverruns(orders)

    // o1: costs=1200, revenue=1000 → overrun 200 (20%)
    expect(overruns.length).toBe(1)
    expect(overruns[0].orderId).toBe('o1')
    expect(overruns[0].overrunAmount).toBe(200)
    expect(overruns[0].overrunPercent).toBe(20)
  })

  it('should sort overruns by severity (highest percent first)', () => {
    const orders: OrderWithCosts[] = [
      { id: 'o1', order_number: 'ORD-001', part_name: 'A', total_cost: 1000, material_cost: 600, labor_cost: 500, overhead_cost: 200 },
      { id: 'o2', order_number: 'ORD-002', part_name: 'B', total_cost: 1000, material_cost: 1000, labor_cost: 800, overhead_cost: 500 },
    ]

    const overruns = detectCostOverruns(orders)

    if (overruns.length >= 2) {
      expect(overruns[0].overrunPercent).toBeGreaterThanOrEqual(overruns[1].overrunPercent)
    }
  })

  it('should respect minimum threshold (default 10%)', () => {
    const orders: OrderWithCosts[] = [
      // 5% overrun — below default 10% threshold
      { id: 'o1', order_number: 'ORD-001', part_name: 'A', total_cost: 10000, material_cost: 4000, labor_cost: 5000, overhead_cost: 1500 },
    ]

    const overruns = detectCostOverruns(orders) // uses default 10% threshold
    expect(overruns.length).toBe(0)
  })

  it('should allow custom threshold override', () => {
    const orders: OrderWithCosts[] = [
      // 20% overrun — above 10% default but test with 25% custom threshold
      { id: 'o1', order_number: 'ORD-001', part_name: 'A', total_cost: 1000, material_cost: 500, labor_cost: 400, overhead_cost: 300 },
    ]

    const withDefault = detectCostOverruns(orders) // 10% default → should find it (20% overrun)
    const withHigh = detectCostOverruns(orders, 25) // 25% custom → should NOT find it
    expect(withDefault.length).toBe(1)
    expect(withHigh.length).toBe(0)
  })

  it('should handle profitable orders (no overrun)', () => {
    const orders: OrderWithCosts[] = [
      { id: 'o1', order_number: 'ORD-001', part_name: 'A', total_cost: 10000, material_cost: 2000, labor_cost: 3000, overhead_cost: 1000 },
    ]

    const overruns = detectCostOverruns(orders)
    expect(overruns).toEqual([])
  })

  it('should return empty for no orders', () => {
    expect(detectCostOverruns([])).toEqual([])
  })
})

// ============================================
// OPTIMIZATION SUGGESTIONS
// ============================================

describe('Revenue Forecast — Optimization Suggestions', () => {
  it('should suggest cost reduction when overruns exist', () => {
    const overruns: CostOverrun[] = [
      { orderId: 'o1', orderNumber: 'ORD-001', partName: 'A', estimatedCost: 1000, actualCost: 1500, overrunAmount: 500, overrunPercent: 50 },
    ]

    const suggestions = generateSuggestions([], overruns)

    expect(suggestions.some(s => s.type === 'cost_reduction')).toBe(true)
  })

  it('should suggest pricing increase for low margins', () => {
    const monthly: MonthlyRevenue[] = [
      { month: '2025-12', revenue: 10000, costs: 9000, profit: 1000, marginPercent: 10, orderCount: 10 },
      { month: '2026-01', revenue: 12000, costs: 10500, profit: 1500, marginPercent: 12.5, orderCount: 12 },
      { month: '2026-02', revenue: 11000, costs: 9800, profit: 1200, marginPercent: 10.9, orderCount: 11 },
    ]

    const suggestions = generateSuggestions(monthly, [])

    expect(suggestions.some(s => s.type === 'pricing_increase')).toBe(true)
  })

  it('should not suggest pricing increase for healthy margins', () => {
    const monthly: MonthlyRevenue[] = [
      { month: '2025-12', revenue: 10000, costs: 5000, profit: 5000, marginPercent: 50, orderCount: 10 },
      { month: '2026-01', revenue: 12000, costs: 6000, profit: 6000, marginPercent: 50, orderCount: 12 },
      { month: '2026-02', revenue: 11000, costs: 5500, profit: 5500, marginPercent: 50, orderCount: 11 },
    ]

    const suggestions = generateSuggestions(monthly, [])

    expect(suggestions.some(s => s.type === 'pricing_increase')).toBe(false)
  })

  it('should include estimated impact for each suggestion', () => {
    const suggestions = generateSuggestions([], [
      { orderId: 'o1', orderNumber: 'ORD-001', partName: 'A', estimatedCost: 1000, actualCost: 1500, overrunAmount: 500, overrunPercent: 50 },
    ])

    for (const suggestion of suggestions) {
      expect(suggestion).toHaveProperty('estimatedImpactPln')
      expect(typeof suggestion.estimatedImpactPln).toBe('number')
      expect(suggestion.estimatedImpactPln).toBeGreaterThanOrEqual(0)
    }
  })
})

// ============================================
// PROJECTIONS
// ============================================

describe('Revenue Forecast — Projections', () => {
  it('should produce 3 projections (30d, 60d, 90d)', () => {
    const monthly: MonthlyRevenue[] = [
      { month: '2025-12', revenue: 15000, costs: 7000, profit: 8000, marginPercent: 53, orderCount: 15 },
      { month: '2026-01', revenue: 16000, costs: 7500, profit: 8500, marginPercent: 53, orderCount: 16 },
      { month: '2026-02', revenue: 17000, costs: 8000, profit: 9000, marginPercent: 53, orderCount: 17 },
    ]

    const trend = calculateRevenueTrend(monthly)
    const projections = projectRevenue(monthly, trend)

    expect(projections.length).toBe(3)
    expect(projections.map(p => p.period)).toEqual(['30d', '60d', '90d'])
  })

  it('should project both revenue and costs', () => {
    const monthly: MonthlyRevenue[] = [
      { month: '2026-01', revenue: 20000, costs: 10000, profit: 10000, marginPercent: 50, orderCount: 20 },
    ]

    const trend = calculateRevenueTrend(monthly)
    const projections = projectRevenue(monthly, trend)

    expect(projections[0].projectedRevenue).toBeGreaterThan(0)
    expect(projections[0].projectedCosts).toBeGreaterThan(0)
    expect(projections[0].projectedProfit).toBe(
      Math.round((projections[0].projectedRevenue - projections[0].projectedCosts) * 100) / 100
    )
  })

  it('should have decreasing confidence for longer horizons', () => {
    const monthly: MonthlyRevenue[] = Array.from({ length: 6 }, (_, i) => ({
      month: `2025-${String(7 + i).padStart(2, '0')}`,
      revenue: 15000, costs: 7000, profit: 8000, marginPercent: 53, orderCount: 15,
    }))

    const trend = calculateRevenueTrend(monthly)
    const projections = projectRevenue(monthly, trend)

    expect(projections[0].confidence).toBeGreaterThanOrEqual(projections[1].confidence)
    expect(projections[1].confidence).toBeGreaterThanOrEqual(projections[2].confidence)
  })

  it('should return zero projections for empty data', () => {
    const projections = projectRevenue(
      [],
      { direction: 'stable', percentChange: 0, avgMonthlyRevenue: 0, avgMonthlyProfit: 0, avgMarginPercent: 0 }
    )

    expect(projections[0].projectedRevenue).toBe(0)
    expect(projections[0].confidence).toBe(0)
  })
})

// ============================================
// ZERO-REVENUE HANDLING
// ============================================

describe('Revenue Forecast — Zero Revenue Periods', () => {
  it('should handle months with zero revenue', () => {
    const orders: OrderRow[] = [
      { created_at: '2026-01-10T10:00:00Z', total_cost: 0, material_cost: 0, labor_cost: 0, overhead_cost: 0 },
    ]

    const monthly = aggregateMonthly(orders)
    expect(monthly[0].revenue).toBe(0)
    expect(monthly[0].marginPercent).toBe(0)
  })

  it('should handle transition from zero to positive revenue', () => {
    const monthly: MonthlyRevenue[] = [
      { month: '2025-10', revenue: 0, costs: 0, profit: 0, marginPercent: 0, orderCount: 0 },
      { month: '2025-11', revenue: 0, costs: 0, profit: 0, marginPercent: 0, orderCount: 0 },
      { month: '2025-12', revenue: 5000, costs: 2000, profit: 3000, marginPercent: 60, orderCount: 5 },
      { month: '2026-01', revenue: 10000, costs: 4000, profit: 6000, marginPercent: 60, orderCount: 10 },
    ]

    const trend = calculateRevenueTrend(monthly)
    expect(trend.direction).toBe('up')
  })
})

// ============================================
// RESULT SHAPE
// ============================================

describe('Revenue Forecast — Result Shape', () => {
  it('should return RevenueForecast with all required fields', () => {
    const monthly: MonthlyRevenue[] = [
      { month: '2026-01', revenue: 20000, costs: 10000, profit: 10000, marginPercent: 50, orderCount: 20 },
    ]

    const trend = calculateRevenueTrend(monthly)
    const projections = projectRevenue(monthly, trend)
    const overruns: CostOverrun[] = []
    const suggestions = generateSuggestions(monthly, overruns)

    const forecast: RevenueForecast = {
      monthlyData: monthly,
      projections,
      trend,
      costOverruns: overruns,
      suggestions,
      dataMonths: 1,
      source: 'heuristic',
    }

    expect(forecast).toHaveProperty('monthlyData')
    expect(forecast).toHaveProperty('projections')
    expect(forecast).toHaveProperty('trend')
    expect(forecast).toHaveProperty('costOverruns')
    expect(forecast).toHaveProperty('suggestions')
    expect(forecast).toHaveProperty('dataMonths')
    expect(forecast).toHaveProperty('source')
    expect(forecast.projections.length).toBe(3)
  })
})
