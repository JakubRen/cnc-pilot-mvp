import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { getUserProfile } from '@/lib/auth-server'
import AppLayout from '@/components/layout/AppLayout'
import LazyProductionCalendar from '@/components/calendar/LazyProductionCalendar'
import CalendarPageClient from './CalendarPageClient'

export default async function CalendarPage() {
  const user = await getUserProfile()

  if (!user || !user.company_id) {
    redirect('/login')
  }

  const supabase = await createClient()

  // Fetch orders with deadlines (last 3 months to next 3 months)
  const threeMonthsAgo = new Date()
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)

  const threeMonthsFromNow = new Date()
  threeMonthsFromNow.setMonth(threeMonthsFromNow.getMonth() + 3)

  const { data: orders } = await supabase
    .from('orders')
    .select(`
      id,
      order_number,
      customer_name,
      part_name,
      quantity,
      deadline,
      status,
      assigned_operator:users!orders_assigned_operator_id_fkey(name:full_name)
    `)
    .eq('company_id', user.company_id)
    .not('deadline', 'is', null)
    .gte('deadline', threeMonthsAgo.toISOString().split('T')[0])
    .lte('deadline', threeMonthsFromNow.toISOString().split('T')[0])
    .order('deadline', { ascending: true })

  // Transform data for calendar
  const calendarOrders = (orders || []).map(order => ({
    ...order,
    assigned_operator: Array.isArray(order.assigned_operator)
      ? order.assigned_operator[0]
      : order.assigned_operator,
  }))

  // Stats
  const totalOrders = calendarOrders.length
  const pendingCount = calendarOrders.filter(o => o.status === 'pending').length
  const inProgressCount = calendarOrders.filter(o => o.status === 'in_progress').length
  const delayedCount = calendarOrders.filter(o => o.status === 'delayed').length

  const stats = {
    totalOrders,
    pendingCount,
    inProgressCount,
    delayedCount,
  }

  return (
    <AppLayout>
      <div className="p-8">
        <div className="max-w-7xl mx-auto">
          <CalendarPageClient stats={stats}>
            <LazyProductionCalendar orders={calendarOrders} />
          </CalendarPageClient>
        </div>
      </div>
    </AppLayout>
  )
}
