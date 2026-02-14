import { NextRequest, NextResponse } from 'next/server'
import { getUserProfile } from '@/lib/auth-server'
import { forecastRevenue } from '@/lib/ai/features/revenue-forecast'

// =====================================================
// GET /api/agents/revenue-forecast?days=30|60|90
// Returns revenue forecast with chart data, projections,
// cost overruns, and optimization suggestions.
//
// Frontend contract:
//   Response: { success, data: { chart_data, summary, cost_overruns, optimization_suggestions } }
// =====================================================

export async function GET(request: NextRequest) {
  try {
    const userProfile = await getUserProfile()

    if (!userProfile?.company_id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const companyId = userProfile.company_id

    // Optional query param: days (converted to months for lookback)
    const { searchParams } = new URL(request.url)
    const days = Math.min(730, Math.max(30, Number(searchParams.get('days')) || 365))
    const months = Math.max(1, Math.round(days / 30))

    const forecast = await forecastRevenue(companyId, { months })

    // Extract projections for summary
    const proj30 = forecast.projections.find(p => p.period === '30d')
    const proj60 = forecast.projections.find(p => p.period === '60d')
    const proj90 = forecast.projections.find(p => p.period === '90d')

    // Transform to frontend contract
    const data = {
      chart_data: forecast.monthlyData.map(m => ({
        period: m.month,
        revenue: m.revenue,
        cost: m.costs,
        profit: m.profit,
      })),
      summary: {
        projected_revenue_30d: proj30?.projectedRevenue ?? 0,
        projected_revenue_60d: proj60?.projectedRevenue ?? 0,
        projected_revenue_90d: proj90?.projectedRevenue ?? 0,
        projected_cost_30d: proj30?.projectedCosts ?? 0,
        projected_margin_percent: forecast.trend.avgMarginPercent,
        revenue_trend: forecast.trend.direction,
        avg_monthly_revenue: forecast.trend.avgMonthlyRevenue,
        avg_monthly_profit: forecast.trend.avgMonthlyProfit,
        trend_percent_change: forecast.trend.percentChange,
      },
      cost_overruns: forecast.costOverruns.map(o => ({
        order_id: o.orderId,
        order_number: o.orderNumber,
        customer_name: null, // not available in current data model
        planned_cost: o.estimatedCost,
        actual_cost: o.actualCost,
        overrun_percent: o.overrunPercent,
        overrun_amount: o.overrunAmount,
        part_name: o.partName,
      })),
      optimization_suggestions: forecast.suggestions.map((s, i) => ({
        title: s.title,
        description: s.description,
        estimated_savings_pln: s.estimatedImpactPln,
        priority: i === 0 ? 'high' : i === 1 ? 'medium' : 'low',
        type: s.type,
        confidence: s.confidence,
      })),
      data_months: forecast.dataMonths,
      source: forecast.source,
    }

    return NextResponse.json({
      success: true,
      data,
    })
  } catch (error) {
    console.error('[revenue-forecast] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
