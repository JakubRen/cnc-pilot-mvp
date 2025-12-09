import { createClient } from '@/lib/supabase-server'
import { getUserProfile } from '@/lib/auth-server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import KioskClient from './KioskClient'

export default async function KioskPage() {
  const userProfile = await getUserProfile()

  if (!userProfile) {
    redirect('/login')
  }

  // Operators and Owners should have access
  if (!['operator', 'owner', 'admin'].includes(userProfile.role)) {
    redirect('/no-access') // Or redirect to their regular dashboard
  }

  const supabase = await createClient()

  // Fetch the current active time log for this user
  const { data: activeTimeLog, error: timeLogError } = await supabase
    .from('time_logs')
    .select('*, orders(*)')
    .eq('user_id', userProfile.id)
    .eq('company_id', userProfile.company_id)
    .in('status', ['running', 'paused'])
    .order('start_time', { ascending: false })
    .limit(1)
    .single()

  if (timeLogError && timeLogError.code !== 'PGRST116') { // PGRST116 is 'No rows found'
    console.error('Error fetching active time log:', timeLogError.message)
    // Handle error gracefully
  }

  let currentOrder = null
  let currentOrderStatus: 'idle' | 'running' | 'paused' = 'idle'

  if (activeTimeLog && activeTimeLog.orders) {
    currentOrder = activeTimeLog.orders
    // Validate/cast status
    const status = activeTimeLog.status
    if (status === 'running' || status === 'paused') {
      currentOrderStatus = status
    }
  } else {
    // If no active time log, try to find the next pending order assigned to this operator
    const { data: nextOrder, error: nextOrderError } = await supabase
      .from('orders')
      .select('*')
      .eq('assigned_operator_id', userProfile.id)
      .eq('company_id', userProfile.company_id)
      .in('status', ['pending', 'in_progress']) // Look for pending or in_progress
      .order('deadline', { ascending: true }) // Prioritize by deadline
      .limit(1)
      .single()

    if (nextOrderError && nextOrderError.code !== 'PGRST116') {
      console.error('Error fetching next order:', nextOrderError.message)
    }

    if (nextOrder) {
      currentOrder = nextOrder
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white p-4">
      <div className="text-center mb-8">
        <h1 className="text-5xl font-extrabold mb-2 text-slate-900 dark:text-white">Tryb Kioskowy</h1>
        <p className="text-xl text-slate-500 dark:text-slate-400">Panel operatora {userProfile.full_name}</p>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-10 w-full max-w-2xl text-center border-4 border-blue-500 dark:border-blue-500">
        <KioskClient
          currentOrder={currentOrder}
          activeTimeLogId={activeTimeLog?.id || null}
          currentOrderStatus={currentOrderStatus}
        />
      </div>

      <p className="mt-8 text-slate-500 dark:text-slate-500 text-sm">Zalogowany jako: {userProfile.email} | <Link href="/logout" className="text-blue-400 hover:underline">Wyloguj</Link></p>
    </div>
  )
}
