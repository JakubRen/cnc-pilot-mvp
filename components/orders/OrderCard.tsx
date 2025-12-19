'use client'

import Link from 'next/link'

interface Order {
  id: string
  order_number: string
  customer_name: string
  quantity: number
  deadline: string
  status: string
  total_cost?: number | null
  part_name?: string | null
}

interface OrderCardProps {
  order: Order
}

export function OrderCard({ order }: OrderCardProps) {
  const isOverdue = order.deadline && new Date(order.deadline) < new Date() &&
    !['completed', 'cancelled'].includes(order.status)

  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-800',
    in_progress: 'bg-blue-100 text-blue-800',
    completed: 'bg-green-100 text-green-800',
    delayed: 'bg-red-100 text-red-800',
    cancelled: 'bg-gray-100 text-gray-800',
  }

  const statusLabels = {
    pending: 'Oczekujące',
    in_progress: 'W Realizacji',
    completed: 'Ukończone',
    delayed: 'Opóźnione',
    cancelled: 'Anulowane',
  }

  return (
    <div className={`bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700 ${isOverdue ? 'border-l-4 border-l-red-500' : ''}`}>
      {/* Header */}
      <div className="flex justify-between items-start mb-3">
        <div>
          <Link
            href={`/orders/${order.id}`}
            className="font-bold text-slate-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 text-lg"
          >
            {order.order_number}
          </Link>
          <p className="text-slate-600 dark:text-slate-400 text-sm">{order.customer_name}</p>
        </div>
        <span className={`px-3 py-1 ${statusColors[order.status as keyof typeof statusColors]} text-xs font-semibold rounded-full`}>
          {statusLabels[order.status as keyof typeof statusLabels]}
        </span>
      </div>

      {/* Details */}
      <div className="space-y-2 text-sm">
        {order.part_name && (
          <div className="flex justify-between">
            <span className="text-slate-500 dark:text-slate-400">Detal:</span>
            <span className="text-slate-900 dark:text-white font-medium">{order.part_name}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span className="text-slate-500 dark:text-slate-400">Ilość:</span>
          <span className="text-slate-900 dark:text-white font-medium">{order.quantity} szt.</span>
        </div>
        {order.deadline && (
          <div className="flex justify-between">
            <span className="text-slate-500 dark:text-slate-400">Termin:</span>
            <span className={isOverdue ? 'text-red-600 font-bold' : 'text-slate-900 dark:text-white font-medium'}>
              {new Date(order.deadline).toLocaleDateString('pl-PL')}
              {isOverdue && ' ⚠️'}
            </span>
          </div>
        )}
        {order.total_cost && (
          <div className="flex justify-between">
            <span className="text-slate-500 dark:text-slate-400">Wartość:</span>
            <span className="text-slate-900 dark:text-white font-bold">
              {new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN' })
                .format(order.total_cost)}
            </span>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="mt-4 flex gap-2">
        <Link
          href={`/orders/${order.id}`}
          className="flex-1 px-3 py-3 bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white text-center rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 text-sm font-medium transition min-h-[48px] flex items-center justify-center"
        >
          Szczegóły
        </Link>
        <Link
          href={`/orders/${order.id}/edit`}
          className="flex-1 px-3 py-3 bg-blue-600 text-white text-center rounded-lg hover:bg-blue-700 text-sm font-medium transition min-h-[48px] flex items-center justify-center"
        >
          Edytuj
        </Link>
      </div>
    </div>
  )
}
