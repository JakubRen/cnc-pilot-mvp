import { createClient } from '@/lib/supabase-server'
import { getUserProfile } from '@/lib/auth-server'
import { redirect } from 'next/navigation'
import AppLayout from '@/components/layout/AppLayout'
import CostFilters from './CostFilters'
import CostsPageClient from './CostsPageClient'

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

  const stats = {
    totalOrders,
    totalRevenue,
    totalCost,
    totalProfit,
    avgMargin,
    profitableOrders,
    unprofitableOrders,
    noSellingPrice,
    totalLaborHours,
    totalLaborCost,
    avgLaborCostPerHour,
    totalMaterialCost,
    totalOverheadCost,
    days,
  }

  return (
    <AppLayout>
      <div className="p-8">
        <div className="max-w-7xl mx-auto">
          <CostsPageClient stats={stats} orders={filteredOrders}>
            <CostFilters
              currentStatus={statusFilter}
              currentProfitable={profitableFilter}
              currentDays={days}
            />
          </CostsPageClient>
        </div>
      </div>
    </AppLayout>
  )
}
