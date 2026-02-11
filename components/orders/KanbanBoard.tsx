'use client'

import { useState, useMemo, useCallback } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core'
import { ORDER_STATUS_CONFIG, KANBAN_COLUMN_ORDER } from '@/lib/status-utils'
import { KanbanColumn } from './KanbanColumn'
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

interface KanbanBoardProps {
  orders: Order[]
  onStatusChange: (orderId: string, newStatus: string) => void
  isPending: (orderId: string) => boolean
}

export function KanbanBoard({ orders, onStatusChange, isPending }: KanbanBoardProps) {
  const [activeOrder, setActiveOrder] = useState<Order | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 5 },
    })
  )

  // Group orders by status
  const ordersByStatus = useMemo(() => {
    const grouped: Record<string, Order[]> = {}
    for (const status of KANBAN_COLUMN_ORDER) {
      grouped[status] = []
    }
    for (const order of orders) {
      const status = order.status as keyof typeof ORDER_STATUS_CONFIG
      if (grouped[status]) {
        grouped[status].push(order)
      } else {
        // Fallback: put unknown statuses into pending
        grouped['pending'].push(order)
      }
    }
    return grouped
  }, [orders])

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const orderId = event.active.id as string
      const order = orders.find((o) => o.id === orderId)
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

      // Only trigger if dropped on a different status column
      const sourceOrder = orders.find((o) => o.id === orderId)
      if (!sourceOrder || sourceOrder.status === targetStatus) return

      // Verify target is a valid status column
      if (!KANBAN_COLUMN_ORDER.includes(targetStatus as keyof typeof ORDER_STATUS_CONFIG)) return

      onStatusChange(orderId, targetStatus)
    },
    [orders, onStatusChange]
  )

  const handleDragCancel = useCallback(() => {
    setActiveOrder(null)
  }, [])

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-4">
        {KANBAN_COLUMN_ORDER.map((status) => {
          const config = ORDER_STATUS_CONFIG[status]
          return (
            <KanbanColumn
              key={status}
              status={status}
              label={config.label}
              icon={config.icon}
              color={config.color}
              orders={ordersByStatus[status] || []}
              isPending={isPending}
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
