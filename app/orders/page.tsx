import { createClient } from '@/lib/supabase-server'
import { getUserProfile } from '@/lib/auth-server'
import { redirect } from 'next/navigation'
import Navbar from '@/components/layout/Navbar'
import Link from 'next/link'

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
      <div className="max-w-6xl mx-auto">
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

        {orders && orders.length > 0 ? (
          <div className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-slate-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Order #
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Quantity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Deadline
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {orders.map((order: any) => (
                  <tr key={order.id} className="hover:bg-slate-700/50 transition">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">
                      {order.order_number}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                      {order.customer_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                      {order.quantity}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                      {new Date(order.deadline).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        order.status === 'completed' ? 'bg-green-600 text-white' :
                        order.status === 'in_progress' ? 'bg-blue-600 text-white' :
                        order.status === 'delayed' ? 'bg-red-600 text-white' :
                        order.status === 'cancelled' ? 'bg-gray-600 text-white' :
                        'bg-yellow-600 text-white'
                      }`}>
                        {order.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <Link
                        href={`/orders/${order.id}/edit`}
                        className="text-blue-400 hover:text-blue-300 mr-4"
                      >
                        Edit
                      </Link>
                      {userProfile.role === 'owner' && (
                        <button className="text-red-400 hover:text-red-300">
                          Delete
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12 text-slate-400 bg-slate-800 border border-slate-700 rounded-lg">
            No orders yet. Create your first order!
          </div>
        )}

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
