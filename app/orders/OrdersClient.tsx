'use client'

import { useState, useMemo } from 'react'
import OrderStats from './OrderStats'
import OrderFilters, { FilterState } from './OrderFilters'
import OrderList from './OrderList'

interface OrdersClientProps {
  orders: any[]
  currentUserRole: string
}

export default function OrdersClient({ orders, currentUserRole }: OrdersClientProps) {
  const [filters, setFilters] = useState<FilterState>({
    status: 'all',
    deadline: 'all',
    search: '',
  })

  // Filter orders based on current filters
  const filteredOrders = useMemo(() => {
    let result = orders

    // Filter by status
    if (filters.status !== 'all') {
      result = result.filter(order => order.status === filters.status)
    }

    // Filter by deadline
    if (filters.deadline !== 'all') {
      const now = new Date()
      now.setHours(0, 0, 0, 0)

      result = result.filter(order => {
        const deadline = new Date(order.deadline)
        deadline.setHours(0, 0, 0, 0)

        if (filters.deadline === 'urgent') {
          // Urgent: deadline within 3 days (including today), not completed/cancelled
          const daysUntilDeadline = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
          return daysUntilDeadline <= 3 && daysUntilDeadline >= 0 && order.status !== 'completed' && order.status !== 'cancelled'
        }
        if (filters.deadline === 'overdue') {
          return deadline < now && order.status !== 'completed' && order.status !== 'cancelled'
        }
        if (filters.deadline === 'today') {
          return deadline.getTime() === now.getTime()
        }
        if (filters.deadline === 'this_week') {
          const nextWeek = new Date(now)
          nextWeek.setDate(nextWeek.getDate() + 7)
          return deadline >= now && deadline < nextWeek
        }
        if (filters.deadline === 'this_month') {
          const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
          endOfMonth.setHours(23, 59, 59, 999)
          return deadline >= now && deadline <= endOfMonth
        }
        if (filters.deadline === 'next_month') {
          const startNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)
          startNextMonth.setHours(0, 0, 0, 0)
          const endNextMonth = new Date(now.getFullYear(), now.getMonth() + 2, 0)
          endNextMonth.setHours(23, 59, 59, 999)
          return deadline >= startNextMonth && deadline <= endNextMonth
        }

        return true
      })
    }

    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase()
      result = result.filter(order =>
        order.order_number.toLowerCase().includes(searchLower) ||
        order.customer_name.toLowerCase().includes(searchLower) ||
        (order.part_name && order.part_name.toLowerCase().includes(searchLower))
      )
    }

    return result
  }, [orders, filters])

  return (
    <div className="grid grid-cols-[350px_1fr] gap-6">
      {/* LEFT COLUMN - Statistics */}
      <div>
        <OrderStats orders={filteredOrders} onFilterClick={setFilters} />
      </div>

      {/* RIGHT COLUMN - Filters + Orders */}
      <div>
        {/* Filters - One line */}
        <OrderFilters onFilterChange={setFilters} />

        {/* Results Count */}
        {filteredOrders.length !== orders.length && (
          <div className="mb-4 text-slate-400 text-sm">
            Showing {filteredOrders.length} of {orders.length} orders
          </div>
        )}

        {/* Orders List */}
        <OrderList orders={filteredOrders} currentUserRole={currentUserRole} />
      </div>
    </div>
  )
}
