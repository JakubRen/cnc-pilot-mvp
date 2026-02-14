'use client'

import { useState, useEffect } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { useTheme } from '@/components/theme/ThemeProvider'
import { Skeleton } from '@/components/ui/Skeleton'

// ============================================
// TYPES
// ============================================

interface RevenueChartPoint {
  period: string
  revenue: number
  cost: number
  profit: number
}

interface CostOverrun {
  order_id: string
  order_number: string
  customer_name: string | null
  planned_cost: number
  actual_cost: number
  overrun_percent: number
}

interface OptimizationSuggestion {
  title: string
  description: string
  estimated_savings_pln: number
  priority: 'high' | 'medium' | 'low'
}

interface RevenueSummary {
  projected_revenue_30d: number
  projected_revenue_60d: number
  projected_revenue_90d: number
  projected_cost_30d: number
  projected_margin_percent: number
  revenue_trend: 'up' | 'down' | 'stable'
}

interface RevenueForecastResponse {
  success: boolean
  data: {
    chart_data: RevenueChartPoint[]
    summary: RevenueSummary
    cost_overruns: CostOverrun[]
    optimization_suggestions: OptimizationSuggestion[]
  }
}

type Horizon = 30 | 60 | 90

interface Props {
  companyId: string
}

// ============================================
// SUB-COMPONENTS
// ============================================

function SummaryCards({ summary, horizon }: { summary: RevenueSummary; horizon: Horizon }) {
  const revenueByHorizon: Record<Horizon, number> = {
    30: summary.projected_revenue_30d,
    60: summary.projected_revenue_60d,
    90: summary.projected_revenue_90d,
  }
  const revenue = revenueByHorizon[horizon]

  const trendStyles = {
    up: 'text-green-600 dark:text-green-400',
    down: 'text-red-600 dark:text-red-400',
    stable: 'text-muted-foreground',
  }
  const trendArrows = { up: '\u2191', down: '\u2193', stable: '\u2192' }

  return (
    <div className="grid grid-cols-3 gap-3 mb-4">
      <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700/30 rounded-lg p-3">
        <p className="text-xs text-muted-foreground">Prognoza przychodu</p>
        <p className="text-lg font-bold text-green-600 dark:text-green-400">
          {(revenue / 1000).toFixed(0)}k PLN
        </p>
        <span className={`text-[10px] ${trendStyles[summary.revenue_trend]}`}>
          {trendArrows[summary.revenue_trend]} {horizon}d
        </span>
      </div>
      <div className="bg-muted rounded-lg p-3">
        <p className="text-xs text-muted-foreground">Prognoza kosztow</p>
        <p className="text-lg font-bold text-foreground">
          {(summary.projected_cost_30d / 1000).toFixed(0)}k PLN
        </p>
        <p className="text-[10px] text-muted-foreground">30d</p>
      </div>
      <div className={`rounded-lg p-3 ${
        summary.projected_margin_percent >= 20
          ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700/30'
          : summary.projected_margin_percent >= 10
            ? 'bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/30'
            : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700/30'
      }`}>
        <p className="text-xs text-muted-foreground">Marza</p>
        <p className={`text-lg font-bold ${
          summary.projected_margin_percent >= 20
            ? 'text-green-600 dark:text-green-400'
            : summary.projected_margin_percent >= 10
              ? 'text-amber-600 dark:text-amber-400'
              : 'text-red-600 dark:text-red-400'
        }`}>
          {summary.projected_margin_percent.toFixed(1)}%
        </p>
        <p className="text-[10px] text-muted-foreground">prognoza</p>
      </div>
    </div>
  )
}

function CostOverrunTable({ overruns }: { overruns: CostOverrun[] }) {
  if (overruns.length === 0) return null

  return (
    <div className="border-t border-border pt-4">
      <h4 className="text-xs font-semibold text-red-600 dark:text-red-400 uppercase mb-2">
        Przekroczenia kosztow ({overruns.length})
      </h4>
      <div className="space-y-1.5">
        {overruns.slice(0, 5).map((o) => (
          <div key={o.order_id} className="flex items-center justify-between text-xs bg-red-50 dark:bg-red-900/10 rounded px-3 py-1.5">
            <div className="flex items-center gap-2 min-w-0">
              <span className="font-medium text-foreground">{o.order_number}</span>
              <span className="text-muted-foreground truncate">{o.customer_name}</span>
            </div>
            <span className="text-red-600 dark:text-red-400 font-semibold flex-shrink-0">
              +{o.overrun_percent.toFixed(0)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function OptimizationList({ suggestions }: { suggestions: OptimizationSuggestion[] }) {
  if (suggestions.length === 0) return null

  const priorityStyles = {
    high: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
    medium: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300',
    low: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
  }

  return (
    <div className="border-t border-border pt-4">
      <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2">
        Sugestie optymalizacji
      </h4>
      <div className="space-y-2">
        {suggestions.slice(0, 3).map((s, i) => (
          <div key={i} className="bg-muted rounded-lg p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">{s.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{s.description}</p>
              </div>
              <div className="flex-shrink-0 text-right">
                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${priorityStyles[s.priority]}`}>
                  {s.priority === 'high' ? 'Pilne' : s.priority === 'medium' ? 'Srednie' : 'Niskie'}
                </span>
                {s.estimated_savings_pln > 0 && (
                  <p className="text-xs text-green-600 dark:text-green-400 font-semibold mt-1">
                    ~{s.estimated_savings_pln.toFixed(0)} PLN
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function RevenueForecastWidget({ companyId }: Props) {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'

  const [horizon, setHorizon] = useState<Horizon>(30)
  const [data, setData] = useState<RevenueForecastResponse['data'] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function fetchForecast() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`/api/agents/revenue-forecast?days=${horizon}`)
        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: 'Blad serwera' }))
          throw new Error(err.error || `HTTP ${res.status}`)
        }
        const json: RevenueForecastResponse = await res.json()
        if (!cancelled) setData(json.data)
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Blad ladowania prognozy')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchForecast()
    return () => { cancelled = true }
  }, [horizon, companyId])

  // Chart colors
  const gridColor = isDark ? '#475569' : '#e2e8f0'
  const textColor = isDark ? '#94a3b8' : '#64748b'
  const tooltipBg = isDark ? '#1e293b' : '#ffffff'
  const tooltipBorder = isDark ? '#475569' : '#e2e8f0'

  return (
    <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-lg">&#x1F4B0;</span>
          <h3 className="text-lg font-semibold text-foreground">Prognoza przychodow</h3>
        </div>

        {/* Horizon toggle */}
        <div className="flex items-center gap-1 bg-muted rounded-lg p-0.5">
          {([30, 60, 90] as Horizon[]).map((h) => (
            <button
              key={h}
              type="button"
              onClick={() => setHorizon(h)}
              className={`px-3 py-1 text-xs font-medium rounded-md transition ${
                horizon === h
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {h}d
            </button>
          ))}
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
          <Skeleton className="h-[220px] w-full rounded-lg" />
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="text-center py-8">
          <p className="text-sm text-red-500">{error}</p>
          <button
            type="button"
            onClick={() => setHorizon(horizon)}
            className="mt-2 text-xs text-primary hover:underline"
          >
            Sprobuj ponownie
          </button>
        </div>
      )}

      {/* Content */}
      {data && !loading && (
        <>
          {/* Summary cards */}
          <SummaryCards summary={data.summary} horizon={horizon} />

          {/* Bar chart — revenue vs cost */}
          <div className="h-[220px] w-full mb-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data.chart_data}
                margin={{ top: 5, right: 10, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
                <XAxis
                  dataKey="period"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: textColor, fontSize: 11 }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: textColor, fontSize: 11 }}
                  tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: tooltipBg,
                    border: `1px solid ${tooltipBorder}`,
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                  formatter={(value: number, name: string) => [
                    `${value.toFixed(0)} PLN`,
                    name === 'revenue' ? 'Przychod' : name === 'cost' ? 'Koszt' : 'Zysk',
                  ]}
                />
                <Legend
                  formatter={(value) =>
                    value === 'revenue' ? 'Przychod' : value === 'cost' ? 'Koszt' : 'Zysk'
                  }
                  wrapperStyle={{ fontSize: '11px' }}
                />
                <Bar dataKey="revenue" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="cost" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Cost overruns */}
          <CostOverrunTable overruns={data.cost_overruns} />

          {/* Optimization suggestions */}
          <OptimizationList suggestions={data.optimization_suggestions} />
        </>
      )}
    </div>
  )
}
