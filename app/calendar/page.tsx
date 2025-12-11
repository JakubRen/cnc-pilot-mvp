import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { getUserProfile } from '@/lib/auth-server'
import AppLayout from '@/components/layout/AppLayout'
import LazyProductionCalendar from '@/components/calendar/LazyProductionCalendar'
import Link from 'next/link'

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

  return (
    <AppLayout>
      <div className="p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex justify-between items-start mb-8">
            <div>
              <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-2">Kalendarz Produkcji</h1>
              <p className="text-slate-500 dark:text-slate-400">
                Wizualizacja terminów realizacji zamówień
              </p>
            </div>
            <Link
              href="/orders/add"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition flex items-center gap-2"
            >
              <span>+</span> Nowe zamówienie
            </Link>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4">
              <p className="text-slate-500 dark:text-slate-400 text-sm">Wszystkie zamówienia</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{totalOrders}</p>
            </div>
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4">
              <p className="text-slate-500 dark:text-slate-400 text-sm">Oczekujące</p>
              <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{pendingCount}</p>
            </div>
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4">
              <p className="text-slate-500 dark:text-slate-400 text-sm">W realizacji</p>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{inProgressCount}</p>
            </div>
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4">
              <p className="text-slate-500 dark:text-slate-400 text-sm">Opóźnione</p>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">{delayedCount}</p>
            </div>
          </div>

          {/* Calendar */}
          <LazyProductionCalendar orders={calendarOrders} />
        </div>
      </div>
    </AppLayout>
  )
}
