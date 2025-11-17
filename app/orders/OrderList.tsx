'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'

interface OrderListProps {
  orders: any[]
  currentUserRole: string
  selectedOrders: Set<string>
  onToggleSelect: (orderId: string) => void
  onSelectAll: () => void
  onDeselectAll: () => void
}

export default function OrderList({
  orders,
  currentUserRole,
  selectedOrders,
  onToggleSelect,
  onSelectAll,
  onDeselectAll,
}: OrderListProps) {
  const router = useRouter()
  const allSelected = orders.length > 0 && orders.every(order => selectedOrders.has(order.id))

  // Check if order is overdue
  const isOrderOverdue = (deadline: string, status: string) => {
    const deadlineDate = new Date(deadline)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return deadlineDate <= today && status !== 'completed' && status !== 'cancelled'
  }

  const handleDelete = async (orderId: string, orderNumber: string) => {
    const confirmed = confirm(
      `Are you sure you want to delete order #${orderNumber}?\n\nThis action cannot be undone.`
    )

    if (!confirmed) return

    const loadingToast = toast.loading('Deleting order...')

    const { error } = await supabase
      .from('orders')
      .delete()
      .eq('id', orderId)

    toast.dismiss(loadingToast)

    if (error) {
      toast.error('Failed to delete order: ' + error.message)
      return
    }

    toast.success(`Order #${orderNumber} deleted successfully`)
    router.refresh()
  }

  if (!orders || orders.length === 0) {
    return (
      <div className="text-center py-16 text-slate-400 bg-slate-800 border border-slate-700 rounded-lg">
        <div className="text-6xl mb-4">📦</div>
        <h3 className="text-xl font-semibold text-white mb-2">No orders yet</h3>
        <p className="text-slate-400 mb-6">Get started by creating your first order</p>
        <Link
          href="/orders/add"
          className="inline-block px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-semibold"
        >
          + Create First Order
        </Link>
      </div>
    )
  }

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden">
      <table className="w-full">
        <thead className="bg-slate-700">
          <tr>
            <th className="px-4 py-3 text-left">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={() => allSelected ? onDeselectAll() : onSelectAll()}
                className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-blue-600 focus:ring-blue-500 focus:ring-offset-slate-800 cursor-pointer"
                title={allSelected ? 'Deselect all' : 'Select all'}
              />
            </th>
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
              Koszt
            </th>
            <th className="px-6 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-700">
          {orders.map((order: any) => (
            <tr
              key={order.id}
              className={`hover:bg-slate-700/50 transition ${selectedOrders.has(order.id) ? 'bg-blue-900/20' : ''}`}
            >
              <td className="px-4 py-4">
                <input
                  type="checkbox"
                  checked={selectedOrders.has(order.id)}
                  onChange={() => onToggleSelect(order.id)}
                  className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-blue-600 focus:ring-blue-500 focus:ring-offset-slate-800 cursor-pointer"
                  onClick={(e) => e.stopPropagation()}
                />
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <Link
                  href={`/orders/${order.id}`}
                  className="text-blue-400 hover:text-blue-300 font-semibold"
                >
                  {order.order_number}
                </Link>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                {order.customer_name}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                {order.quantity}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm">
                <div className="flex flex-col gap-1">
                  <span className={isOrderOverdue(order.deadline, order.status) ? 'text-red-400 font-semibold' : 'text-slate-300'}>
                    {new Date(order.deadline).toLocaleDateString()}
                  </span>
                  {isOrderOverdue(order.deadline, order.status) && (
                    <span className="text-xs text-red-400">⚠️ Overdue</span>
                  )}
                </div>
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
                {order.total_cost && order.total_cost > 0 ? (
                  <span className={`font-semibold ${
                    order.total_cost > 5000 ? 'text-red-400' :
                    order.total_cost > 2000 ? 'text-yellow-400' :
                    'text-green-400'
                  }`}>
                    {order.total_cost.toFixed(2)} PLN
                  </span>
                ) : (
                  <span className="text-slate-500 text-xs">-</span>
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm">
                <Link
                  href={`/orders/${order.id}`}
                  className="text-slate-300 hover:text-white mr-4 font-medium"
                >
                  View
                </Link>
                <Link
                  href={`/orders/${order.id}/edit`}
                  className="text-blue-400 hover:text-blue-300 mr-4 font-medium"
                >
                  Edit
                </Link>
                {currentUserRole === 'owner' && (
                  <button
                    onClick={() => handleDelete(order.id, order.order_number)}
                    className="text-red-400 hover:text-red-300 font-medium"
                  >
                    Delete
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
