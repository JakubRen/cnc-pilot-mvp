// Analytics Queries - Server-side data fetching for charts & stats
import { createClient } from '@/lib/supabase-server'
import { TIME } from '@/lib/constants/time'

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
      ? (new Date(log.end_time).getTime() - new Date(log.start_time).getTime()) / TIME.MS_PER_HOUR
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
