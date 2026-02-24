'use client'

import { useTranslation } from '@/hooks/useTranslation'
import Link from 'next/link'

interface Order {
  id: string
  order_number: string
  customer_name: string
  part_name?: string
  status: string
  total_cost?: number
  selling_price?: number
  material_cost?: number
  labor_cost?: number
  actual_labor_cost?: number
  overhead_cost?: number
  actual_labor_hours?: number
}

interface Stats {
  totalOrders: number
  totalRevenue: number
  totalCost: number
  totalProfit: number
  avgMargin: number
  profitableOrders: number
  unprofitableOrders: number
  noSellingPrice: number
  totalLaborHours: number
  totalLaborCost: number
  avgLaborCostPerHour: number
  totalMaterialCost: number
  totalOverheadCost: number
  days: number
}

interface CostsReportClientProps {
  stats: Stats
  orders: Order[]
  children?: React.ReactNode
}

export default function CostsReportClient({ stats, orders, children }: CostsReportClientProps) {
  const { t } = useTranslation()

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-600',
      in_progress: 'bg-violet-600',
      completed: 'bg-green-600',
      delayed: 'bg-red-600',
      cancelled: 'bg-gray-600',
    }

    const statusLabels: Record<string, string> = {
      pending: t('orderStatus', 'pending'),
      in_progress: t('orderStatus', 'in_progress'),
      completed: t('orderStatus', 'completed'),
      delayed: t('orderStatus', 'delayed'),
      cancelled: t('orderStatus', 'cancelled'),
    }

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-semibold text-white ${colors[status] || 'bg-gray-600'}`}>
        {statusLabels[status] || status}
      </span>
    )
  }

  return (
    <>
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Link href="/reports" className="text-muted-foreground hover:text-foreground text-sm">
              ← Raporty
            </Link>
          </div>
          <h1 className="text-4xl font-bold text-foreground">{t('costs', 'title')}</h1>
          <p className="text-slate-700 dark:text-muted-foreground mt-1">
            {t('costs', 'lastNDays', { days: stats.days })} • {stats.totalOrders} {t('costs', 'orders')}
          </p>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8">
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-slate-700 dark:text-muted-foreground text-sm">{t('costs', 'revenue')}</p>
          <p className="text-2xl font-bold text-primary">{stats.totalRevenue.toFixed(0)} PLN</p>
        </div>

        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-slate-700 dark:text-muted-foreground text-sm">{t('costs', 'totalCost')}</p>
          <p className="text-2xl font-bold text-foreground">{stats.totalCost.toFixed(0)} PLN</p>
        </div>

        <div className={`rounded-lg p-4 ${stats.totalProfit >= 0 ? 'bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700' : 'bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700'}`}>
          <p className="text-slate-700 dark:text-muted-foreground text-sm">{t('costs', 'profit')}</p>
          <p className={`text-2xl font-bold ${stats.totalProfit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
            {stats.totalProfit.toFixed(0)} PLN
          </p>
          <p className={`text-sm ${stats.totalProfit >= 0 ? 'text-green-600 dark:text-green-500' : 'text-red-600 dark:text-red-500'}`}>
            {stats.avgMargin.toFixed(1)}% {t('costs', 'margin')}
          </p>
        </div>

        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-slate-700 dark:text-muted-foreground text-sm">{t('costs', 'profitable')}</p>
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.profitableOrders}</p>
          <p className="text-slate-500 dark:text-muted-foreground text-xs">{stats.unprofitableOrders} {t('costs', 'unprofitableCount')}</p>
        </div>

        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-slate-700 dark:text-muted-foreground text-sm">{t('costs', 'laborHours')}</p>
          <p className="text-2xl font-bold text-foreground">{stats.totalLaborHours.toFixed(1)}h</p>
          <p className="text-slate-500 dark:text-muted-foreground text-xs">{stats.avgLaborCostPerHour.toFixed(0)} PLN/h {t('costs', 'avg')}</p>
        </div>

        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-slate-700 dark:text-muted-foreground text-sm">{t('costs', 'noPrice')}</p>
          <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{stats.noSellingPrice}</p>
          <p className="text-slate-500 dark:text-muted-foreground text-xs">{t('costs', 'noAnalysis')}</p>
        </div>
      </div>

      {/* Cost Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-slate-700 dark:text-muted-foreground">🔩 {t('costs', 'materials')}</span>
            <span className="text-foreground font-bold">{stats.totalMaterialCost.toFixed(0)} PLN</span>
          </div>
          <div className="h-2 bg-secondary rounded-full overflow-hidden">
            <div
              className="h-full bg-orange-500"
              style={{ width: `${stats.totalCost > 0 ? (stats.totalMaterialCost / stats.totalCost) * 100 : 0}%` }}
            />
          </div>
          <p className="text-slate-500 dark:text-muted-foreground text-xs mt-1">
            {stats.totalCost > 0 ? ((stats.totalMaterialCost / stats.totalCost) * 100).toFixed(1) : 0}% {t('costs', 'ofCosts')}
          </p>
        </div>

        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-slate-700 dark:text-muted-foreground">⏱️ {t('costs', 'labor')}</span>
            <span className="text-foreground font-bold">{stats.totalLaborCost.toFixed(0)} PLN</span>
          </div>
          <div className="h-2 bg-secondary rounded-full overflow-hidden">
            <div
              className="h-full bg-violet-500"
              style={{ width: `${stats.totalCost > 0 ? (stats.totalLaborCost / stats.totalCost) * 100 : 0}%` }}
            />
          </div>
          <p className="text-slate-500 dark:text-muted-foreground text-xs mt-1">
            {stats.totalCost > 0 ? ((stats.totalLaborCost / stats.totalCost) * 100).toFixed(1) : 0}% {t('costs', 'ofCosts')}
          </p>
        </div>

        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-slate-700 dark:text-muted-foreground">🏭 {t('costs', 'overhead')}</span>
            <span className="text-foreground font-bold">{stats.totalOverheadCost.toFixed(0)} PLN</span>
          </div>
          <div className="h-2 bg-secondary rounded-full overflow-hidden">
            <div
              className="h-full bg-purple-500"
              style={{ width: `${stats.totalCost > 0 ? (stats.totalOverheadCost / stats.totalCost) * 100 : 0}%` }}
            />
          </div>
          <p className="text-slate-500 dark:text-muted-foreground text-xs mt-1">
            {stats.totalCost > 0 ? ((stats.totalOverheadCost / stats.totalCost) * 100).toFixed(1) : 0}% {t('costs', 'ofCosts')}
          </p>
        </div>
      </div>

      {/* Render filters (passed as children) */}
      {children}

      {/* Orders Table */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-foreground uppercase">{t('costs', 'order')}</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-foreground uppercase">{t('costs', 'customer')}</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-foreground uppercase">{t('common', 'status')}</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-foreground uppercase">{t('costs', 'cost')}</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-foreground uppercase">{t('costs', 'price')}</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-foreground uppercase">{t('costs', 'margin')}</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-foreground uppercase">{t('costs', 'hours')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-500 dark:text-muted-foreground">
                    {t('costs', 'noOrders')}
                  </td>
                </tr>
              ) : (
                orders.map((order) => {
                  const profit = (order.selling_price || 0) - (order.total_cost || 0)
                  const margin = order.selling_price ? (profit / order.selling_price) * 100 : 0
                  const isProfitable = profit > 0
                  const hasPrice = order.selling_price && order.selling_price > 0

                  return (
                    <tr key={order.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                      <td className="px-4 py-3">
                        <Link href={`/orders/${order.id}`} className="hover:text-violet-600 dark:hover:text-violet-400 transition">
                          <span className="text-foreground font-medium">{order.order_number}</span>
                          {order.part_name && (
                            <span className="text-slate-500 dark:text-muted-foreground text-sm block">{order.part_name}</span>
                          )}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-foreground">{order.customer_name}</td>
                      <td className="px-4 py-3">{getStatusBadge(order.status)}</td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-foreground font-medium">{(order.total_cost || 0).toFixed(2)}</span>
                        <span className="text-slate-500 dark:text-muted-foreground text-xs block">
                          M: {(order.material_cost || 0).toFixed(0)} | P: {(order.actual_labor_cost || order.labor_cost || 0).toFixed(0)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {hasPrice ? (
                          <span className="text-primary font-medium">{order.selling_price?.toFixed(2)}</span>
                        ) : (
                          <span className="text-slate-500 dark:text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {hasPrice ? (
                          <div>
                            <span className={`font-semibold ${isProfitable ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                              {profit.toFixed(2)} PLN
                            </span>
                            <span className={`text-xs block ${isProfitable ? 'text-green-600 dark:text-green-500' : 'text-red-600 dark:text-red-500'}`}>
                              {margin.toFixed(1)}%
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-500 dark:text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-700 dark:text-muted-foreground">
                        {order.actual_labor_hours ? `${order.actual_labor_hours.toFixed(1)}h` : '—'}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}
