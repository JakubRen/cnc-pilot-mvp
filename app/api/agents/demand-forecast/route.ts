import { NextRequest, NextResponse } from 'next/server'
import { getUserProfile } from '@/lib/auth-server'
import { forecastDemand } from '@/lib/ai/features/demand-forecast'

// =====================================================
// GET /api/agents/demand-forecast?days=30|60|90
// Returns demand forecast with chart data, trend, and breakdowns.
//
// Frontend contract:
//   Response: { success, data: { chart_data, trend, top_customers, top_materials, total_forecast_orders, avg_daily_orders } }
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

    const forecast = await forecastDemand(companyId, { months })

    // Find the matching projection for the requested period
    const targetPeriod = days <= 30 ? '30d' : days <= 60 ? '60d' : '90d'
    const projection = forecast.projections.find(p => p.period === targetPeriod) ?? forecast.projections[0]

    // Transform to frontend contract
    const data = {
      chart_data: forecast.monthlyData.map(m => ({
        date: m.month,
        actual: m.orderCount,
        forecast: null as number | null, // historical months have no forecast
      })),
      trend: {
        direction: forecast.trend.direction,
        percentage: forecast.trend.percentChange,
      },
      top_customers: forecast.customerBreakdown.slice(0, 5).map(c => ({
        name: c.customerName,
        count: c.orderCount,
        trend: c.trendDirection,
      })),
      top_materials: forecast.materialBreakdown.slice(0, 5).map(m => ({
        name: m.material,
        count: m.orderCount,
        trend: m.trendDirection,
      })),
      total_forecast_orders: projection?.projectedOrders ?? 0,
      avg_daily_orders: projection ? Math.round((projection.projectedOrders / (targetPeriod === '30d' ? 30 : targetPeriod === '60d' ? 60 : 90)) * 100) / 100 : 0,
      projections: forecast.projections.map(p => ({
        period: p.period,
        projected_orders: p.projectedOrders,
        projected_revenue: p.projectedRevenue,
        confidence: p.confidence,
      })),
      seasonal: forecast.seasonal,
      data_months: forecast.dataMonths,
      source: forecast.source,
    }

    return NextResponse.json({
      success: true,
      data,
    })
  } catch (error) {
    console.error('[demand-forecast] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
