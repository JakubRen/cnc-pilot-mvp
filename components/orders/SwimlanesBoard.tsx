'use client'

import { useState, useMemo, useCallback } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  useDroppable,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core'
import { SortableContext, horizontalListSortingStrategy } from '@dnd-kit/sortable'
import { ORDER_STATUS_CONFIG, KANBAN_COLUMN_ORDER } from '@/lib/status-utils'
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

interface SwimlanesBoardProps {
  orders: Order[]
  onStatusChange: (orderId: string, newStatus: string) => void
  isPending: (orderId: string) => boolean
}

// Default collapsed: completed & cancelled
const DEFAULT_COLLAPSED = new Set(['completed', 'cancelled'])

function SwimlaneRow({
  status,
  label,
  icon,
  color,
  orders,
  isPending,
  isCollapsed,
  onToggleCollapse,
}: {
  status: string
  label: string
  icon: string
  color: string
  orders: Order[]
  isPending: (orderId: string) => boolean
  isCollapsed: boolean
  onToggleCollapse: () => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status })

  const totalValue = useMemo(
    () => orders.reduce((sum, o) => sum + (o.total_cost || 0), 0),
    [orders]
  )

  return (
    <div
      ref={setNodeRef}
      className={`
        bg-muted/50 border rounded-lg transition-colors duration-150
        ${isOver ? 'border-2 border-dashed border-violet-500 bg-violet-600/5' : 'border-border'}
      `}
    >
      {/* Header — always visible, clickable */}
      <button
        type="button"
        onClick={onToggleCollapse}
        className="w-full flex items-center gap-2.5 px-4 py-3 text-left hover:bg-accent/30 transition-colors rounded-lg"
      >
        <span
          className={`text-muted-foreground text-xs transition-transform duration-200 ${
            isCollapsed ? '-rotate-90' : ''
          }`}
        >
          &#9660;
        </span>
        <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${color}`} />
        <span className="text-sm">{icon}</span>
        <span className="text-sm font-semibold text-foreground">{label}</span>
        <span className="bg-muted text-muted-foreground text-xs font-medium px-2 py-0.5 rounded-full">
          {orders.length}
        </span>
        <span className="ml-auto text-muted-foreground text-xs tabular-nums">
          {totalValue > 0
            ? new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN' }).format(totalValue)
            : ''}
        </span>
      </button>

      {/* Cards row */}
      {!isCollapsed && (
        <SortableContext
          items={orders.map((o) => o.id)}
          strategy={horizontalListSortingStrategy}
        >
          <div className="flex gap-3 px-4 pb-3 overflow-x-auto scroll-smooth">
            {orders.length === 0 ? (
              <div className="text-muted-foreground text-xs py-2">Brak zleceń</div>
            ) : (
              orders.map((order) => (
                <div key={order.id} className="min-w-[220px] max-w-[260px] flex-shrink-0">
                  <KanbanCard
                    order={order}
                    isPending={isPending(order.id)}
                  />
                </div>
              ))
            )}
          </div>
        </SortableContext>
      )}
    </div>
  )
}

export function SwimlanesBoard({ orders, onStatusChange, isPending }: SwimlanesBoardProps) {
  const [activeOrder, setActiveOrder] = useState<Order | null>(null)
  const [collapsed, setCollapsed] = useState<Set<string>>(DEFAULT_COLLAPSED)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 5 },
    })
  )

  const ordersByStatus = useMemo(() => {
    const grouped: Record<string, Order[]> = {}
    for (const status of KANBAN_COLUMN_ORDER) {
      grouped[status] = []
    }
    for (const order of orders) {
      if (grouped[order.status]) {
        grouped[order.status].push(order)
      } else {
        grouped['pending'].push(order)
      }
    }
    return grouped
  }, [orders])

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const order = orders.find((o) => o.id === (event.active.id as string))
      if (order) setActiveOrder(order)
    },
    [orders]
  )

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveOrder(null)
      const { active, over } = event
      if (!over) return

      const orderId = active.id as string
      const targetStatus = over.id as string

      const sourceOrder = orders.find((o) => o.id === orderId)
      if (!sourceOrder || sourceOrder.status === targetStatus) return
      if (!KANBAN_COLUMN_ORDER.includes(targetStatus as keyof typeof ORDER_STATUS_CONFIG)) return

      // Auto-expand target swimlane if collapsed
      setCollapsed((prev) => {
        if (prev.has(targetStatus)) {
          const next = new Set(prev)
          next.delete(targetStatus)
          return next
        }
        return prev
      })

      onStatusChange(orderId, targetStatus)
    },
    [orders, onStatusChange]
  )

  const handleDragCancel = useCallback(() => {
    setActiveOrder(null)
  }, [])

  const toggleCollapse = useCallback((status: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(status)) {
        next.delete(status)
      } else {
        next.add(status)
      }
      return next
    })
  }, [])

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="flex flex-col gap-3">
        {KANBAN_COLUMN_ORDER.map((status) => {
          const config = ORDER_STATUS_CONFIG[status]
          return (
            <SwimlaneRow
              key={status}
              status={status}
              label={config.label}
              icon={config.icon}
              color={config.color}
              orders={ordersByStatus[status] || []}
              isPending={isPending}
              isCollapsed={collapsed.has(status)}
              onToggleCollapse={() => toggleCollapse(status)}
            />
          )
        })}
      </div>

      <DragOverlay dropAnimation={null}>
        {activeOrder && (
          <KanbanCard order={activeOrder} isPending={false} isDragOverlay />
        )}
      </DragOverlay>
    </DndContext>
  )
}
