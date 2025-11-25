'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'

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
      `Czy na pewno chcesz usunąć zamówienie #${orderNumber}?\n\nTej operacji nie można cofnąć.`
    )

    if (!confirmed) return

    const loadingToast = toast.loading('Usuwanie zamówienia...')

    const { error } = await supabase
      .from('orders')
      .delete()
      .eq('id', orderId)

    toast.dismiss(loadingToast)

    if (error) {
      toast.error('Nie udało się usunąć zamówienia: ' + error.message)
      return
    }

    toast.success(`Zamówienie #${orderNumber} zostało usunięte`)
    router.refresh()
  }

  if (!orders || orders.length === 0) {
    return (
      <div className="text-center py-16 text-slate-400 bg-slate-800 border border-slate-700 rounded-lg">
        <div className="text-6xl mb-4">📦</div>
        <h3 className="text-xl font-semibold text-white mb-2">Brak zamówień</h3>
        <p className="text-slate-400 mb-6">Rozpocznij od utworzenia pierwszego zamówienia</p>
        <Button
          href="/orders/add"
          variant="primary"
        >
          + Utwórz pierwsze zamówienie
        </Button>
      </div>
    )
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed': return <Badge variant="success">Zakończone</Badge>
      case 'in_progress': return <Badge variant="default">W toku</Badge>
      case 'delayed': return <Badge variant="warning">Opóźnione</Badge>
      case 'cancelled': return <Badge variant="secondary">Anulowane</Badge>
      default: return <Badge variant="outline">Oczekujące</Badge>
    }
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
                title={allSelected ? 'Odznacz wszystkie' : 'Zaznacz wszystkie'}
              />
            </th>
            <th className="px-6 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Nr Zam.
            </th>
            <th className="px-6 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Klient
            </th>
            <th className="px-6 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Ilość
            </th>
            <th className="px-6 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Termin
            </th>
            <th className="px-6 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Status
            </th>
            <th className="px-6 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Koszt
            </th>
            <th className="px-6 py-3 text-right text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Akcje
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
                  className="text-blue-400 hover:text-blue-300 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                    <Badge variant="danger">PO TERMINIE</Badge>
                  )}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                {getStatusBadge(order.status)}
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
              <td className="px-6 py-4 whitespace-nowrap text-sm text-right space-x-2">
                <Button href={`/orders/${order.id}`} variant="ghost" size="sm">
                  Podgląd
                </Button>
                <Button href={`/orders/${order.id}/edit`} variant="ghost" size="sm" className="text-blue-400 hover:text-blue-300">
                  Edytuj
                </Button>
                {currentUserRole === 'owner' && (
                  <Button
                    onClick={() => handleDelete(order.id, order.order_number)}
                    variant="ghost"
                    size="sm"
                    className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                  >
                    Usuń
                  </Button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
