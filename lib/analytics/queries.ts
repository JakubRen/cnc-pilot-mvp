// Analytics Queries - Server-side data fetching for charts & stats
import { createClient } from '@/lib/supabase-server'

// ============================================================================
// REVENUE ANALYTICS
// ============================================================================

export interface RevenueDataPoint {
  date: string
  revenue: number
}

export async function getRevenueOverTime(
  companyId: string,
  days: number = 30
): Promise<RevenueDataPoint[]> {
  const supabase = await createClient()

  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)

  const { data } = await supabase
    .from('orders')
    .select('created_at, total_cost')
    .eq('company_id', companyId)
    .gte('created_at', startDate.toISOString())
    .not('total_cost', 'is', null)
    .order('created_at', { ascending: true })

  if (!data || data.length === 0) return []

  // Group by date and sum revenue
  const grouped = data.reduce((acc, order) => {
    const date = order.created_at.split('T')[0]
    if (!acc[date]) acc[date] = 0
    acc[date] += order.total_cost || 0
    return acc
  }, {} as Record<string, number>)

  return Object.entries(grouped).map(([date, revenue]) => ({
    date,
    revenue: Math.round(revenue * 100) / 100
  }))
}

// ============================================================================
// CUSTOMER ANALYTICS
// ============================================================================

export interface CustomerData {
  customer: string
  revenue: number
  orders: number
}

export async function getTopCustomers(
  companyId: string,
  limit: number = 10
): Promise<CustomerData[]> {
  const supabase = await createClient()

  const { data } = await supabase
    .from('orders')
    .select('customer_name, total_cost')
    .eq('company_id', companyId)
    .not('total_cost', 'is', null)

  if (!data || data.length === 0) return []

  // Group by customer
  const grouped = data.reduce((acc, order) => {
    const customer = order.customer_name || 'Unknown'
    if (!acc[customer]) {
      acc[customer] = { revenue: 0, orders: 0 }
    }
    acc[customer].revenue += order.total_cost || 0
    acc[customer].orders += 1
    return acc
  }, {} as Record<string, { revenue: number; orders: number }>)

  return Object.entries(grouped)
    .map(([customer, data]) => ({
      customer,
      revenue: Math.round(data.revenue * 100) / 100,
      orders: data.orders
    }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, limit)
}

// ============================================================================
// EMPLOYEE PRODUCTIVITY
// ============================================================================

export interface ProductivityData {
  employee: string
  hours: number
  earnings: number
  ordersCompleted: number
}

export async function getEmployeeProductivity(
  companyId: string
): Promise<ProductivityData[]> {
  const supabase = await createClient()

  // Get completed time logs with user info
  const { data: timeLogs } = await supabase
    .from('time_logs')
    .select(`
      *,
      user:users!time_logs_user_id_fkey(id, full_name)
    `)
    .eq('company_id', companyId)
    .eq('status', 'completed')

  if (!timeLogs || timeLogs.length === 0) return []

  // Calculate hours and earnings per employee
  const productivity = timeLogs.reduce((acc, log) => {
    const employee = Array.isArray(log.user)
      ? log.user[0]?.full_name
      : log.user?.full_name

    if (!employee) return acc

    if (!acc[employee]) {
      acc[employee] = { hours: 0, earnings: 0, ordersCompleted: 0 }
    }

    const hours = log.end_time && log.start_time
      ? (new Date(log.end_time).getTime() - new Date(log.start_time).getTime()) / 3600000
      : 0

    acc[employee].hours += hours
    acc[employee].earnings += hours * (log.hourly_rate || 0)
    acc[employee].ordersCompleted += 1

    return acc
  }, {} as Record<string, { hours: number; earnings: number; ordersCompleted: number }>)

  return (Object.entries(productivity) as [string, { hours: number; earnings: number; ordersCompleted: number }][]).map(([employee, data]) => ({
    employee,
    hours: Math.round(data.hours * 10) / 10,
    earnings: Math.round(data.earnings * 100) / 100,
    ordersCompleted: data.ordersCompleted
  }))
}

// ============================================================================
// ORDER ANALYTICS
// ============================================================================

export interface OrdersByStatusData {
  status: string
  count: number
  value: number
}

export async function getOrdersByStatus(
  companyId: string
): Promise<OrdersByStatusData[]> {
  const supabase = await createClient()

  const { data } = await supabase
    .from('orders')
    .select('status, total_cost')
    .eq('company_id', companyId)

  if (!data || data.length === 0) return []

  const grouped = data.reduce((acc, order) => {
    const status = order.status || 'unknown'
    if (!acc[status]) {
      acc[status] = { count: 0, value: 0 }
    }
    acc[status].count += 1
    acc[status].value += order.total_cost || 0
    return acc
  }, {} as Record<string, { count: number; value: number }>)

  return Object.entries(grouped).map(([status, data]) => ({
    status,
    count: data.count,
    value: Math.round(data.value * 100) / 100
  }))
}

export interface OrdersTimelineData {
  date: string
  pending: number
  in_progress: number
  completed: number
  delayed: number
  cancelled: number
}

export async function getOrdersTimeline(
  companyId: string,
  days: number = 30
): Promise<OrdersTimelineData[]> {
  const supabase = await createClient()

  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)

  const { data } = await supabase
    .from('orders')
    .select('created_at, status')
    .eq('company_id', companyId)
    .gte('created_at', startDate.toISOString())
    .order('created_at', { ascending: true })

  if (!data || data.length === 0) return []

  // Group by date and status
  const grouped = data.reduce((acc, order) => {
    const date = order.created_at.split('T')[0]
    if (!acc[date]) {
      acc[date] = {
        pending: 0,
        in_progress: 0,
        completed: 0,
        delayed: 0,
        cancelled: 0
      }
    }
    const status = order.status as keyof typeof acc[typeof date]
    if (status in acc[date]) {
      acc[date][status] += 1
    }
    return acc
  }, {} as Record<string, Omit<OrdersTimelineData, 'date'>>)

  return Object.entries(grouped).map(([date, counts]) => ({
    date,
    ...counts
  }))
}

// ============================================================================
// INVENTORY ANALYTICS
// ============================================================================

export interface InventoryValueData {
  date: string
  value: number
}

export async function getInventoryValue(
  companyId: string
): Promise<number> {
  const supabase = await createClient()

  // Assuming we have a 'unit_price' column (if not, this is simplified)
  const { data } = await supabase
    .from('inventory')
    .select('quantity')
    .eq('company_id', companyId)

  if (!data || data.length === 0) return 0

  // Simplified: just count total items
  // In real scenario, you'd have unit_price and calculate value
  const totalItems = data.reduce((sum, item) => sum + (item.quantity || 0), 0)

  return Math.round(totalItems * 100) / 100
}

export interface InventoryCategoryData {
  category: string
  count: number
  totalQuantity: number
}

export async function getInventoryByCategory(
  companyId: string
): Promise<InventoryCategoryData[]> {
  const supabase = await createClient()

  const { data } = await supabase
    .from('inventory')
    .select('category, quantity')
    .eq('company_id', companyId)

  if (!data || data.length === 0) return []

  const grouped = data.reduce((acc, item) => {
    const category = item.category || 'Uncategorized'
    if (!acc[category]) {
      acc[category] = { count: 0, totalQuantity: 0 }
    }
    acc[category].count += 1
    acc[category].totalQuantity += item.quantity || 0
    return acc
  }, {} as Record<string, { count: number; totalQuantity: number }>)

  return Object.entries(grouped).map(([category, data]) => ({
    category,
    count: data.count,
    totalQuantity: Math.round(data.totalQuantity * 10) / 10
  }))
}

// ============================================================================
// TIME ANALYTICS
// ============================================================================

export interface TimeDistributionData {
  hour: number
  sessions: number
  totalHours: number
}

export async function getTimeDistribution(
  companyId: string
): Promise<TimeDistributionData[]> {
  const supabase = await createClient()

  const { data } = await supabase
    .from('time_logs')
    .select('start_time, end_time')
    .eq('company_id', companyId)
    .eq('status', 'completed')

  if (!data || data.length === 0) return []

  // Group by hour of day (0-23)
  const grouped = Array.from({ length: 24 }, (_, i) => ({
    hour: i,
    sessions: 0,
    totalHours: 0
  }))

  data.forEach(log => {
    const startHour = new Date(log.start_time).getHours()
    const hours = log.end_time && log.start_time
      ? (new Date(log.end_time).getTime() - new Date(log.start_time).getTime()) / 3600000
      : 0

    grouped[startHour].sessions += 1
    grouped[startHour].totalHours += hours
  })

  return grouped.map(item => ({
    ...item,
    totalHours: Math.round(item.totalHours * 10) / 10
  }))
}

// ============================================================================
// KPI CALCULATIONS
// ============================================================================

export interface DashboardKPIs {
  totalRevenue: number
  averageOrderValue: number
  completionRate: number
  activeTimers: number
  lowStockItems: number
  overdueOrders: number
}

export async function getDashboardKPIs(
  companyId: string
): Promise<DashboardKPIs> {
  const supabase = await createClient()

  // Parallel fetch all data
  const [
    ordersResult,
    timersResult,
    inventoryResult
  ] = await Promise.all([
    supabase
      .from('orders')
      .select('status, total_cost, deadline')
      .eq('company_id', companyId),
    supabase
      .from('time_logs')
      .select('id')
      .eq('company_id', companyId)
      .eq('status', 'running'),
    supabase
      .from('inventory')
      .select('quantity, low_stock_threshold')
      .eq('company_id', companyId)
  ])

  const orders = ordersResult.data || []
  const timers = timersResult.data || []
  const inventory = inventoryResult.data || []

  // Calculate KPIs
  const totalRevenue = orders.reduce((sum, o) => sum + (o.total_cost || 0), 0)
  const completedOrders = orders.filter(o => o.status === 'completed')
  const averageOrderValue = orders.length > 0 ? totalRevenue / orders.length : 0
  const completionRate = orders.length > 0 ? (completedOrders.length / orders.length) * 100 : 0

  const now = new Date()
  const overdueOrders = orders.filter(o =>
    o.status !== 'completed' &&
    o.status !== 'cancelled' &&
    new Date(o.deadline) < now
  ).length

  const lowStockItems = inventory.filter(i =>
    i.quantity < i.low_stock_threshold
  ).length

  return {
    totalRevenue: Math.round(totalRevenue * 100) / 100,
    averageOrderValue: Math.round(averageOrderValue * 100) / 100,
    completionRate: Math.round(completionRate * 10) / 10,
    activeTimers: timers.length,
    lowStockItems,
    overdueOrders
  }
}

// ============================================================================
// TREND CALCULATIONS (compare to previous period)
// ============================================================================

export interface TrendData {
  current: number
  previous: number
  change: number
  percentChange: number
}

export async function getRevenueTrend(
  companyId: string,
  days: number = 30
): Promise<TrendData> {
  const supabase = await createClient()

  const currentEnd = new Date()
  const currentStart = new Date()
  currentStart.setDate(currentEnd.getDate() - days)

  const previousStart = new Date(currentStart)
  previousStart.setDate(previousStart.getDate() - days)

  // Fetch current period
  const { data: currentData } = await supabase
    .from('orders')
    .select('total_cost')
    .eq('company_id', companyId)
    .gte('created_at', currentStart.toISOString())
    .lte('created_at', currentEnd.toISOString())
    .not('total_cost', 'is', null)

  // Fetch previous period
  const { data: previousData } = await supabase
    .from('orders')
    .select('total_cost')
    .eq('company_id', companyId)
    .gte('created_at', previousStart.toISOString())
    .lt('created_at', currentStart.toISOString())
    .not('total_cost', 'is', null)

  const current = (currentData || []).reduce((sum, o) => sum + (o.total_cost || 0), 0)
  const previous = (previousData || []).reduce((sum, o) => sum + (o.total_cost || 0), 0)

  const change = current - previous
  const percentChange = previous > 0 ? (change / previous) * 100 : 0

  return {
    current: Math.round(current * 100) / 100,
    previous: Math.round(previous * 100) / 100,
    change: Math.round(change * 100) / 100,
    percentChange: Math.round(percentChange * 10) / 10
  }
}
