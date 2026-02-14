// Revenue Forecast (Phase 3 — Feature 3.4)
// Revenue projections (30/60/90 days), cost overrun identification,
// and optimization suggestions based on order financial data.
//
// Architecture:
//   1. aggregateMonthly(orders) — groups orders into monthly revenue/cost/profit
//   2. calculateRevenueTrend(monthly) — half-split trend comparison
//   3. detectCostOverruns(orders, threshold) — finds orders where costs > revenue
//   4. generateSuggestions(monthly, overruns) — actionable optimization tips
//   5. projectRevenue(monthly, trend) — 30/60/90 day projections
//   6. forecastRevenue(companyId) — server-side orchestrator

import { createClient } from '@/lib/supabase-server'
import { callGemini } from '@/lib/ai/gemini-client'
import { SchemaType } from '@/lib/ai/schema-types'
import { sanitizeField, FIELD_LIMITS } from '@/lib/ai/security/sanitizer'
import { logger } from '@/lib/logger'

// ============================================
// TYPES
// ============================================

export interface MonthlyRevenue {
  month: string // YYYY-MM
  revenue: number
  costs: number
  profit: number
  marginPercent: number
  orderCount: number
}

export interface RevenueProjection {
  period: '30d' | '60d' | '90d'
  projectedRevenue: number
  projectedCosts: number
  projectedProfit: number
  confidence: number // 0-100
}

export interface CostOverrun {
  orderId: string
  orderNumber: string
  partName: string
  estimatedCost: number
  actualCost: number
  overrunAmount: number
  overrunPercent: number
}

export interface OptimizationSuggestion {
  type: 'cost_reduction' | 'pricing_increase' | 'volume_opportunity' | 'waste_reduction'
  title: string
  description: string
  estimatedImpactPln: number
  confidence: number // 0-100
}

export interface RevenueTrend {
  direction: 'up' | 'down' | 'stable'
  percentChange: number
  avgMonthlyRevenue: number
  avgMonthlyProfit: number
  avgMarginPercent: number
}

export interface RevenueForecast {
  monthlyData: MonthlyRevenue[]
  projections: RevenueProjection[]
  trend: RevenueTrend
  costOverruns: CostOverrun[]
  suggestions: OptimizationSuggestion[]
  dataMonths: number
  source: 'ai' | 'heuristic'
}

// ============================================
// MONTHLY AGGREGATION
// ============================================

interface OrderRow {
  created_at: string
  total_cost: number | null
  material_cost: number | null
  labor_cost: number | null
  overhead_cost: number | null
}

/**
 * Aggregate raw order rows into monthly revenue/cost/profit buckets.
 * `total_cost` is treated as revenue (the selling price / invoice total).
 * The sum of material_cost + labor_cost + overhead_cost is the actual cost.
 */
export function aggregateMonthly(orders: OrderRow[]): MonthlyRevenue[] {
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
// TREND CALCULATION
// ============================================

/**
 * Calculate revenue trend by comparing first-half vs second-half averages.
 * >10% change = up/down, otherwise stable.
 */
export function calculateRevenueTrend(monthly: MonthlyRevenue[]): RevenueTrend {
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
// COST OVERRUN DETECTION
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

/**
 * Identify orders where actual costs exceed revenue (negative margin).
 * Only includes overruns >= thresholdPercent (default 20%).
 */
export function detectCostOverruns(orders: OrderWithCosts[], thresholdPercent: number = 20): CostOverrun[] {
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
// OPTIMIZATION SUGGESTIONS
// ============================================

/**
 * Generate actionable optimization suggestions based on monthly data and cost overruns.
 */
export function generateSuggestions(
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
// REVENUE PROJECTIONS
// ============================================

/**
 * Project revenue, costs, and profit for 30/60/90 days.
 * Uses last 3 months average with dampened trend extrapolation.
 */
export function projectRevenue(monthly: MonthlyRevenue[], trend: RevenueTrend): RevenueProjection[] {
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
// SERVER-SIDE: FULL REVENUE FORECAST
// ============================================

/**
 * Server-side revenue forecast.
 * Loads orders, aggregates monthly, detects cost overruns,
 * generates suggestions and projections.
 */
export async function forecastRevenue(
  companyId: string,
  options?: { months?: number }
): Promise<RevenueForecast> {
  const lookbackMonths = options?.months ?? 12
  const supabase = await createClient()

  const sinceDate = new Date()
  sinceDate.setMonth(sinceDate.getMonth() - lookbackMonths)
  const sinceISO = sinceDate.toISOString().split('T')[0]

  // Load orders for monthly aggregation
  const { data: rawOrders, error } = await supabase
    .from('orders')
    .select('id, order_number, part_name, created_at, selling_price, overhead_cost')
    .eq('company_id', companyId)
    .gte('created_at', sinceISO)
    .order('created_at', { ascending: true })

  if (error) {
    logger.error('[revenue-forecast] Failed to load orders', { error: error.message })
  }

  const orderList = rawOrders ?? []

  // Build order rows for aggregation
  // Note: CNC-Pilot uses selling_price as total revenue and overhead_cost for overhead.
  // We approximate costs from the available fields.
  const orderRows: OrderRow[] = orderList.map(o => ({
    created_at: o.created_at,
    total_cost: Number(o.selling_price) || 0,
    material_cost: null, // Not available in orders table — use order_items if needed
    labor_cost: null,
    overhead_cost: Number(o.overhead_cost) || 0,
  }))

  const monthly = aggregateMonthly(orderRows)
  const trend = calculateRevenueTrend(monthly)

  // Build order rows for cost overrun detection
  const ordersWithCosts: OrderWithCosts[] = orderList
    .filter(o => Number(o.selling_price) > 0)
    .map(o => ({
      id: o.id,
      order_number: o.order_number || '',
      part_name: o.part_name || '',
      total_cost: Number(o.selling_price) || 0,
      material_cost: 0,
      labor_cost: 0,
      overhead_cost: Number(o.overhead_cost) || 0,
    }))

  const overruns = detectCostOverruns(ordersWithCosts)
  const suggestions = generateSuggestions(monthly, overruns)
  const projections = projectRevenue(monthly, trend)

  return {
    monthlyData: monthly,
    projections,
    trend,
    costOverruns: overruns,
    suggestions,
    dataMonths: monthly.length,
    source: 'heuristic',
  }
}
