import { createClient } from '@/lib/supabase-server'
import { getUserProfile } from '@/lib/auth-server'
import { redirect } from 'next/navigation'
import AppLayout from '@/components/layout/AppLayout'
import Link from 'next/link'
import CostFilters from './CostFilters'

export default async function CostsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const params = await searchParams
  const user = await getUserProfile()

  if (!user || !user.company_id) {
    redirect('/login')
  }

  const supabase = await createClient()

  // Parse filters
  const statusFilter = typeof params.status === 'string' ? params.status : 'all'
  const profitableFilter = typeof params.profitable === 'string' ? params.profitable : 'all'
  const days = typeof params.days === 'string' ? parseInt(params.days) : 30

  // Calculate date filter (extracted to avoid impure function call in query chain)
  const dateFilter = new Date()
  dateFilter.setDate(dateFilter.getDate() - days)
  const dateFilterISO = dateFilter.toISOString()

  // Build query
  let query = supabase
    .from('orders')
    .select('*')
    .eq('company_id', user.company_id)
    .gte('created_at', dateFilterISO)
    .order('created_at', { ascending: false })

  if (statusFilter !== 'all') {
    query = query.eq('status', statusFilter)
  }

  const { data: orders } = await query

  // Filter by profitability
  let filteredOrders = orders || []
  if (profitableFilter === 'profitable') {
    filteredOrders = filteredOrders.filter((o) => (o.selling_price || 0) > (o.total_cost || 0))
  } else if (profitableFilter === 'unprofitable') {
    filteredOrders = filteredOrders.filter((o) => o.selling_price && o.selling_price < (o.total_cost || 0))
  }

  // Calculate stats
  const totalOrders = filteredOrders.length
  const totalRevenue = filteredOrders.reduce((sum, o) => sum + (o.selling_price || 0), 0)
  const totalCost = filteredOrders.reduce((sum, o) => sum + (o.total_cost || 0), 0)
  const totalProfit = totalRevenue - totalCost
  const avgMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0

  const profitableOrders = filteredOrders.filter((o) => (o.selling_price || 0) > (o.total_cost || 0)).length
  const unprofitableOrders = filteredOrders.filter((o) => o.selling_price && o.selling_price < (o.total_cost || 0)).length
  const noSellingPrice = filteredOrders.filter((o) => !o.selling_price || o.selling_price === 0).length

  const totalLaborHours = filteredOrders.reduce((sum, o) => sum + (o.actual_labor_hours || 0), 0)
  const totalLaborCost = filteredOrders.reduce((sum, o) => sum + (o.actual_labor_cost || o.labor_cost || 0), 0)
  const avgLaborCostPerHour = totalLaborHours > 0 ? totalLaborCost / totalLaborHours : 0

  const totalMaterialCost = filteredOrders.reduce((sum, o) => sum + (o.material_cost || 0), 0)
  const totalOverheadCost = filteredOrders.reduce((sum, o) => sum + (o.overhead_cost || 0), 0)

  // Status colors
  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-600',
      in_progress: 'bg-blue-600',
      completed: 'bg-green-600',
      delayed: 'bg-red-600',
      cancelled: 'bg-gray-600',
    }
    const labels: Record<string, string> = {
      pending: 'Oczekujące',
      in_progress: 'W realizacji',
      completed: 'Ukończone',
      delayed: 'Opóźnione',
      cancelled: 'Anulowane',
    }
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-semibold text-white ${colors[status] || 'bg-gray-600'}`}>
        {labels[status] || status}
      </span>
    )
  }

  return (
    <AppLayout>
      <div className="p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-4xl font-bold text-slate-900 dark:text-white">Analiza Kosztów i Rentowności</h1>
              <p className="text-slate-700 dark:text-slate-400 mt-1">Ostatnie {days} dni • {totalOrders} zamówień</p>
            </div>
          </div>

          {/* Stats Overview */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8">
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4">
              <p className="text-slate-700 dark:text-slate-400 text-sm">Przychód</p>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{totalRevenue.toFixed(0)} PLN</p>
            </div>

            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4">
              <p className="text-slate-700 dark:text-slate-400 text-sm">Koszt całkowity</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{totalCost.toFixed(0)} PLN</p>
            </div>

            <div className={`rounded-lg p-4 ${totalProfit >= 0 ? 'bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700' : 'bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700'}`}>
              <p className="text-slate-700 dark:text-slate-400 text-sm">Zysk</p>
              <p className={`text-2xl font-bold ${totalProfit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                {totalProfit.toFixed(0)} PLN
              </p>
              <p className={`text-sm ${totalProfit >= 0 ? 'text-green-600 dark:text-green-500' : 'text-red-600 dark:text-red-500'}`}>
                {avgMargin.toFixed(1)}% marży
              </p>
            </div>

            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4">
              <p className="text-slate-700 dark:text-slate-400 text-sm">Rentowne</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">{profitableOrders}</p>
              <p className="text-slate-500 dark:text-slate-500 text-xs">{unprofitableOrders} nierentownych</p>
            </div>

            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4">
              <p className="text-slate-700 dark:text-slate-400 text-sm">Godziny pracy</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{totalLaborHours.toFixed(1)}h</p>
              <p className="text-slate-500 dark:text-slate-500 text-xs">{avgLaborCostPerHour.toFixed(0)} PLN/h śr.</p>
            </div>

            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4">
              <p className="text-slate-700 dark:text-slate-400 text-sm">Bez ceny</p>
              <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{noSellingPrice}</p>
              <p className="text-slate-500 dark:text-slate-500 text-xs">brak analizy</p>
            </div>
          </div>

          {/* Cost Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-slate-700 dark:text-slate-400">🔩 Materiały</span>
                <span className="text-slate-900 dark:text-white font-bold">{totalMaterialCost.toFixed(0)} PLN</span>
              </div>
              <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-orange-500"
                  style={{ width: `${totalCost > 0 ? (totalMaterialCost / totalCost) * 100 : 0}%` }}
                />
              </div>
              <p className="text-slate-500 dark:text-slate-500 text-xs mt-1">
                {totalCost > 0 ? ((totalMaterialCost / totalCost) * 100).toFixed(1) : 0}% kosztów
              </p>
            </div>

            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-slate-700 dark:text-slate-400">⏱️ Praca</span>
                <span className="text-slate-900 dark:text-white font-bold">{totalLaborCost.toFixed(0)} PLN</span>
              </div>
              <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500"
                  style={{ width: `${totalCost > 0 ? (totalLaborCost / totalCost) * 100 : 0}%` }}
                />
              </div>
              <p className="text-slate-500 dark:text-slate-500 text-xs mt-1">
                {totalCost > 0 ? ((totalLaborCost / totalCost) * 100).toFixed(1) : 0}% kosztów
              </p>
            </div>

            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-slate-700 dark:text-slate-400">🏭 Ogólne</span>
                <span className="text-slate-900 dark:text-white font-bold">{totalOverheadCost.toFixed(0)} PLN</span>
              </div>
              <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-purple-500"
                  style={{ width: `${totalCost > 0 ? (totalOverheadCost / totalCost) * 100 : 0}%` }}
                />
              </div>
              <p className="text-slate-500 dark:text-slate-500 text-xs mt-1">
                {totalCost > 0 ? ((totalOverheadCost / totalCost) * 100).toFixed(1) : 0}% kosztów
              </p>
            </div>
          </div>

          {/* Filters */}
          <CostFilters
            currentStatus={statusFilter}
            currentProfitable={profitableFilter}
            currentDays={days}
          />

          {/* Orders Table */}
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-100 dark:bg-slate-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase">Zamówienie</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase">Klient</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase">Status</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase">Koszt</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase">Cena</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase">Marża</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase">Godziny</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                  {filteredOrders.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-slate-500 dark:text-slate-500">
                        Brak zamówień spełniających kryteria
                      </td>
                    </tr>
                  ) : (
                    filteredOrders.map((order) => {
                      const profit = (order.selling_price || 0) - (order.total_cost || 0)
                      const margin = order.selling_price ? (profit / order.selling_price) * 100 : 0
                      const isProfitable = profit > 0
                      const hasPrice = order.selling_price && order.selling_price > 0

                      return (
                        <tr key={order.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                          <td className="px-4 py-3">
                            <Link href={`/orders/${order.id}`} className="hover:text-blue-600 dark:hover:text-blue-400 transition">
                              <span className="text-slate-900 dark:text-white font-medium">{order.order_number}</span>
                              {order.part_name && (
                                <span className="text-slate-500 dark:text-slate-500 text-sm block">{order.part_name}</span>
                              )}
                            </Link>
                          </td>
                          <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{order.customer_name}</td>
                          <td className="px-4 py-3">{getStatusBadge(order.status)}</td>
                          <td className="px-4 py-3 text-right">
                            <span className="text-slate-900 dark:text-white font-medium">{(order.total_cost || 0).toFixed(2)}</span>
                            <span className="text-slate-500 dark:text-slate-500 text-xs block">
                              M: {(order.material_cost || 0).toFixed(0)} | P: {(order.actual_labor_cost || order.labor_cost || 0).toFixed(0)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            {hasPrice ? (
                              <span className="text-blue-600 dark:text-blue-400 font-medium">{order.selling_price?.toFixed(2)}</span>
                            ) : (
                              <span className="text-slate-500 dark:text-slate-500">—</span>
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
                              <span className="text-slate-500 dark:text-slate-500">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right text-slate-700 dark:text-slate-400">
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
        </div>
      </div>
    </AppLayout>
  )
}
