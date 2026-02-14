'use client'

import { useState, useEffect } from 'react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'
import { useTheme } from '@/components/theme/ThemeProvider'
import { Skeleton } from '@/components/ui/Skeleton'

// ============================================
// TYPES
// ============================================

interface ForecastDataPoint {
  date: string
  actual: number | null
  forecast: number | null
}

interface DemandTrend {
  direction: 'up' | 'down' | 'stable'
  percentage: number
}

interface TopItem {
  name: string
  count: number
  trend: 'up' | 'down' | 'stable'
}

interface DemandForecastResponse {
  success: boolean
  data: {
    chart_data: ForecastDataPoint[]
    trend: DemandTrend
    top_customers: TopItem[]
    top_materials: TopItem[]
    total_forecast_orders: number
    avg_daily_orders: number
  }
}

type Horizon = 30 | 60 | 90

interface Props {
  companyId: string
}

// ============================================
// TREND BADGE
// ============================================

function TrendBadge({ direction, percentage }: DemandTrend) {
  const styles = {
    up: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
    down: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
    stable: 'bg-gray-100 dark:bg-gray-800/50 text-gray-700 dark:text-gray-300',
  }
  const arrows = { up: '\u2191', down: '\u2193', stable: '\u2192' }
  const labels = { up: 'Wzrost', down: 'Spadek', stable: 'Stabilnie' }

  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${styles[direction]}`}>
      {arrows[direction]} {labels[direction]} {percentage > 0 ? `${percentage}%` : ''}
    </span>
  )
}

// ============================================
// MINI TABLE
// ============================================

function TopItemsTable({ title, items }: { title: string; items: TopItem[] }) {
  if (items.length === 0) return null

  const trendArrows = { up: '\u2191', down: '\u2193', stable: '-' }
  const trendColors = {
    up: 'text-green-600 dark:text-green-400',
    down: 'text-red-600 dark:text-red-400',
    stable: 'text-muted-foreground',
  }

  return (
    <div>
      <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2">{title}</h4>
      <div className="space-y-1">
        {items.slice(0, 5).map((item, i) => (
          <div key={i} className="flex items-center justify-between text-xs">
            <span className="text-foreground truncate flex-1">{item.name}</span>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="text-muted-foreground">{item.count} szt.</span>
              <span className={trendColors[item.trend]}>{trendArrows[item.trend]}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ============================================
// COMPONENT
// ============================================

export default function DemandForecastWidget({ companyId }: Props) {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'

  const [horizon, setHorizon] = useState<Horizon>(30)
  const [data, setData] = useState<DemandForecastResponse['data'] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function fetchForecast() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`/api/agents/demand-forecast?days=${horizon}`)
        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: 'Blad serwera' }))
          throw new Error(err.error || `HTTP ${res.status}`)
        }
        const json: DemandForecastResponse = await res.json()
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
  const actualColor = '#10b981' // green
  const forecastColor = '#8b5cf6' // violet

  return (
    <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-lg">&#x1F4CA;</span>
          <h3 className="text-lg font-semibold text-foreground">Prognoza popytu</h3>
          {data?.trend && <TrendBadge {...data.trend} />}
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
          <Skeleton className="h-[250px] w-full rounded-lg" />
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
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

      {/* Chart + data */}
      {data && !loading && (
        <>
          {/* Summary metrics */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-muted rounded-lg p-3">
              <p className="text-xs text-muted-foreground">Prognoza zamowien</p>
              <p className="text-xl font-bold text-foreground">{data.total_forecast_orders}</p>
              <p className="text-[10px] text-muted-foreground">na {horizon} dni</p>
            </div>
            <div className="bg-muted rounded-lg p-3">
              <p className="text-xs text-muted-foreground">Sr. dziennie</p>
              <p className="text-xl font-bold text-foreground">{data.avg_daily_orders.toFixed(1)}</p>
              <p className="text-[10px] text-muted-foreground">zamowien/dzien</p>
            </div>
          </div>

          {/* Area chart */}
          <div className="h-[250px] w-full mb-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={data.chart_data}
                margin={{ top: 5, right: 10, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="gradActual" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={actualColor} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={actualColor} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradForecast" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={forecastColor} stopOpacity={0.2} />
                    <stop offset="95%" stopColor={forecastColor} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
                <XAxis
                  dataKey="date"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: textColor, fontSize: 11 }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: textColor, fontSize: 11 }}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: tooltipBg,
                    border: `1px solid ${tooltipBorder}`,
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                  formatter={(value: number, name: string) => [
                    value,
                    name === 'actual' ? 'Rzeczywiste' : 'Prognoza',
                  ]}
                  labelFormatter={(label) => `Data: ${label}`}
                />
                <ReferenceLine
                  x={data.chart_data.find(p => p.forecast !== null && p.actual !== null)?.date}
                  stroke={isDark ? '#475569' : '#cbd5e1'}
                  strokeDasharray="4 4"
                  label={{ value: 'Dzis', fill: textColor, fontSize: 10 }}
                />
                <Area
                  type="monotone"
                  dataKey="actual"
                  stroke={actualColor}
                  strokeWidth={2}
                  fill="url(#gradActual)"
                  connectNulls={false}
                />
                <Area
                  type="monotone"
                  dataKey="forecast"
                  stroke={forecastColor}
                  strokeWidth={2}
                  strokeDasharray="6 3"
                  fill="url(#gradForecast)"
                  connectNulls={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 mb-4 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="inline-block w-4 h-0.5 bg-green-500 rounded" />
              <span className="text-muted-foreground">Rzeczywiste</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="inline-block w-4 h-0.5 border-t-2 border-dashed border-violet-500" />
              <span className="text-muted-foreground">Prognoza</span>
            </div>
          </div>

          {/* Top customers and materials */}
          <div className="grid grid-cols-2 gap-4 border-t border-border pt-4">
            <TopItemsTable title="Top klienci" items={data.top_customers} />
            <TopItemsTable title="Top materialy" items={data.top_materials} />
          </div>
        </>
      )}
    </div>
  )
}
