'use client'

import { useIsMobile } from '@/hooks/useMediaQuery'
import { OrderCard } from './OrderCard'
import OrderList from '@/app/orders/OrderList'

interface OrderWithTags {
  id: string
  order_number: string
  customer_name: string
  quantity: number
  deadline: string
  status: string
  tags?: Array<{ id: string; name: string; color: string }>
  assigned_operator_name?: string | null
  total_cost?: number | null
  part_name?: string | null
  created_at?: string
  material?: string | null
  notes?: string | null
}

interface ResponsiveOrderListProps {
  orders: OrderWithTags[]
  currentUserRole: string
  selectedOrders: Set<string>
  onToggleSelect: (orderId: string) => void
  onSelectAll: () => void
  onDeselectAll: () => void
  isPending?: (orderId: string) => boolean
}

export function ResponsiveOrderList({
  orders,
  currentUserRole,
  selectedOrders,
  onToggleSelect,
  onSelectAll,
  onDeselectAll,
  isPending = () => false,
}: ResponsiveOrderListProps) {
  const isMobile = useIsMobile()

  // Mobile view: Card grid
  if (isMobile) {
    return (
      <div className="space-y-4">
        {/* Selection controls for mobile */}
        {orders.length > 0 && (
          <div className="flex gap-2 text-sm">
            <button
              onClick={onSelectAll}
              className="px-3 py-2 bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition"
            >
              Zaznacz wszystkie
            </button>
            {selectedOrders.size > 0 && (
              <button
                onClick={onDeselectAll}
                className="px-3 py-2 bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition"
              >
                Odznacz ({selectedOrders.size})
              </button>
            )}
          </div>
        )}

        {/* Card grid */}
        <div className="grid grid-cols-1 gap-4 stagger-fade-in">
          {orders.map((order) => {
            const pending = isPending(order.id)
            return (
              <div key={order.id} className={`relative ${pending ? 'opacity-60 pointer-events-none' : ''}`}>
                {/* Pending indicator overlay */}
                {pending && (
                  <div className="absolute inset-0 flex items-center justify-center z-20 bg-slate-900/20 dark:bg-slate-900/40 rounded-lg">
                    <div className="animate-spin h-8 w-8 border-3 border-blue-500 border-t-transparent rounded-full" />
                  </div>
                )}
                {/* Selection checkbox overlay */}
                {selectedOrders.size > 0 && !pending && (
                  <div className="absolute top-2 left-2 z-10">
                    <input
                      type="checkbox"
                      checked={selectedOrders.has(order.id)}
                      onChange={() => onToggleSelect(order.id)}
                      className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                  </div>
                )}
                <OrderCard order={order} />
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // Desktop view: Table
  return (
    <OrderList
      orders={orders}
      currentUserRole={currentUserRole}
      selectedOrders={selectedOrders}
      onToggleSelect={onToggleSelect}
      onSelectAll={onSelectAll}
      onDeselectAll={onDeselectAll}
      isPending={isPending}
    />
  )
}
