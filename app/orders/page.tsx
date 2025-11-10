import { createClient } from '@/lib/supabase-server'
import { getUserProfile } from '@/lib/auth-server'
import { redirect } from 'next/navigation'
import Navbar from '@/components/layout/Navbar'
import Link from 'next/link'
import OrdersClient from './OrdersClient'

export default async function OrdersPage() {
  const userProfile = await getUserProfile()

  if (!userProfile) {
    redirect('/login')
  }

  const supabase = await createClient()

  const { data: orders, error } = await supabase
    .from('orders')
    .select('*')
    .order('deadline', { ascending: true })

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h2 className="text-xl font-bold text-red-800 mb-2">Error</h2>
          <p className="text-red-600">{error.message}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8">
      <div className="max-w-7xl mx-auto">
        <Navbar user={userProfile} />

        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-white">Orders</h1>
          <Link
            href="/orders/add"
            className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-semibold shadow-lg"
          >
            + Add New Order
          </Link>
        </div>

        <OrdersClient orders={orders || []} currentUserRole={userProfile.role} />

        <div className="mt-8 text-center">
          <Link
            href="/"
            className="inline-block px-6 py-3 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition"
          >
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  )
}
