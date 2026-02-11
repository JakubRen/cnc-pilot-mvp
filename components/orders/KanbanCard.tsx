'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import Link from 'next/link'

interface Order {
  id: string
  order_number: string
  customer_name: string
  status: string
  deadline: string
  part_name?: string | null
  total_cost?: number | null
}

interface KanbanCardProps {
  order: Order
  isPending: boolean
  isDragOverlay?: boolean
}

export function KanbanCard({ order, isPending, isDragOverlay }: KanbanCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: order.id,
    data: { status: order.status },
    disabled: isPending,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const isOverdue =
    order.deadline &&
    new Date(order.deadline) < new Date() &&
    !['completed', 'cancelled'].includes(order.status)

  if (isDragging && !isDragOverlay) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className="bg-muted/50 border-2 border-dashed border-border rounded-lg p-3 h-[120px]"
      />
    )
  }

  const cardContent = (
    <div
      ref={isDragOverlay ? undefined : setNodeRef}
      style={isDragOverlay ? undefined : style}
      {...(isDragOverlay ? {} : attributes)}
      {...(isDragOverlay ? {} : listeners)}
      className={`
        bg-card border rounded-lg p-3 cursor-grab active:cursor-grabbing
        transition-shadow
        ${isOverdue ? 'border-red-500 border-l-4' : 'border-border'}
        ${isPending ? 'opacity-60 pointer-events-none' : ''}
        ${isDragOverlay ? 'shadow-xl ring-2 ring-violet-500' : 'hover-lift'}
      `}
    >
      {/* Header: order number + overdue */}
      <div className="flex items-center justify-between mb-1.5">
        <Link
          href={`/orders/${order.id}`}
          onClick={(e) => e.stopPropagation()}
          className="font-semibold text-sm text-foreground hover:text-violet-600 dark:hover:text-violet-400 truncate"
        >
          {order.order_number}
        </Link>
        {isOverdue && <span className="text-red-500 text-xs flex-shrink-0">&#9888;&#65039;</span>}
        {isPending && (
          <span className="animate-spin text-xs flex-shrink-0">&#9881;&#65039;</span>
        )}
      </div>

      {/* Customer */}
      <p className="text-muted-foreground text-xs truncate mb-2">
        {order.customer_name}
      </p>

      {/* Details row */}
      <div className="space-y-1 text-xs">
        {order.part_name && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Detal:</span>
            <span className="text-foreground font-medium truncate ml-2 max-w-[140px] text-right">
              {order.part_name}
            </span>
          </div>
        )}
        {order.deadline && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Termin:</span>
            <span
              className={`font-medium ${isOverdue ? 'text-red-500 font-bold' : 'text-foreground'}`}
            >
              {new Date(order.deadline).toLocaleDateString('pl-PL')}
            </span>
          </div>
        )}
        {order.total_cost != null && order.total_cost > 0 && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Wartość:</span>
            <span className="text-foreground font-bold">
              {new Intl.NumberFormat('pl-PL', {
                style: 'currency',
                currency: 'PLN',
              }).format(order.total_cost)}
            </span>
          </div>
        )}
      </div>
    </div>
  )

  return cardContent
}
