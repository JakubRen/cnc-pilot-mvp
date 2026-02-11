'use client'

import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { KanbanCard } from './KanbanCard'

interface Order {
  id: string
  order_number: string
  customer_name: string
  status: string
  deadline: string
  part_name?: string | null
  total_cost?: number | null
}

interface KanbanColumnProps {
  status: string
  label: string
  icon: string
  color: string
  orders: Order[]
  isPending: (orderId: string) => boolean
}

export function KanbanColumn({
  status,
  label,
  icon,
  color,
  orders,
  isPending,
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: status })

  return (
    <div
      ref={setNodeRef}
      className={`
        bg-muted/50 border rounded-lg p-3 flex flex-col
        transition-colors duration-150
        ${
          isOver
            ? 'border-2 border-dashed border-violet-500 bg-violet-600/5'
            : 'border-border'
        }
      `}
    >
      {/* Column Header */}
      <div className="flex items-center gap-2 mb-3 px-1">
        <span
          className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${color}`}
        />
        <span className="text-sm">{icon}</span>
        <span className="text-sm font-semibold text-foreground truncate">
          {label}
        </span>
        <span className="ml-auto bg-muted text-muted-foreground text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0">
          {orders.length}
        </span>
      </div>

      {/* Cards */}
      <SortableContext
        items={orders.map((o) => o.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="flex flex-col gap-2 overflow-y-auto max-h-[calc(100vh-280px)] min-h-[60px]">
          {orders.length === 0 && (
            <div className="text-muted-foreground text-xs text-center py-6">
              Brak zleceń
            </div>
          )}
          {orders.map((order) => (
            <KanbanCard
              key={order.id}
              order={order}
              isPending={isPending(order.id)}
            />
          ))}
        </div>
      </SortableContext>
    </div>
  )
}
