'use client'

import { useState, useMemo } from 'react'
import toast from 'react-hot-toast'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { exportOrdersToCSV } from '@/lib/csv-export'
import OrderStats from './OrderStats'
import OrderFilters, { FilterState } from './OrderFilters'
import OrderList from './OrderList'
import EmptyState from '@/components/ui/EmptyState'

interface OrdersClientProps {
  orders: any[]
  currentUserRole: string
}

export default function OrdersClient({ orders, currentUserRole }: OrdersClientProps) {
  const router = useRouter()
  const [filters, setFilters] = useState<FilterState>({
    status: 'all',
    deadline: 'all',
    search: '',
    sortBy: 'deadline',
  })
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set())

  // Handle CSV export
  const handleExportCSV = () => {
    if (filteredOrders.length === 0) {
      toast.error('Brak zamówień do eksportu')
      return
    }

    try {
      exportOrdersToCSV(filteredOrders)
      toast.success(`Wyeksportowano ${filteredOrders.length} zamówień do CSV`)
    } catch (error) {
      toast.error('Błąd podczas eksportu CSV')
      console.error('Export error:', error)
    }
  }

  // Selection handlers
  const handleToggleSelect = (orderId: string) => {
    setSelectedOrders(prev => {
      const newSet = new Set(prev)
      if (newSet.has(orderId)) {
        newSet.delete(orderId)
      } else {
        newSet.add(orderId)
      }
      return newSet
    })
  }

  const handleSelectAll = () => {
    setSelectedOrders(new Set(filteredOrders.map(order => order.id)))
  }

  const handleDeselectAll = () => {
    setSelectedOrders(new Set())
  }

  // Bulk status change
  const handleBulkStatusChange = async (newStatus: string) => {
    if (selectedOrders.size === 0) return

    const confirmed = confirm(
      `Czy na pewno chcesz zmienić status ${selectedOrders.size} zamówień na "${newStatus}"?`
    )
    if (!confirmed) return

    const loadingToast = toast.loading(`Updating ${selectedOrders.size} orders...`)

    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .in('id', Array.from(selectedOrders))

      toast.dismiss(loadingToast)

      if (error) {
        toast.error('Failed to update orders: ' + error.message)
        return
      }

      toast.success(`Successfully updated ${selectedOrders.size} orders`)
      setSelectedOrders(new Set()) // Clear selection
      router.refresh() // Refresh data
    } catch (error) {
      toast.dismiss(loadingToast)
      toast.error('Error updating orders')
      console.error('Bulk update error:', error)
    }
  }

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

    // Sort orders
    result = [...result].sort((a, b) => {
      switch (filters.sortBy) {
        case 'cost_desc':
          return (b.total_cost || 0) - (a.total_cost || 0)
        case 'cost_asc':
          return (a.total_cost || 0) - (b.total_cost || 0)
        case 'created_desc':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        case 'created_asc':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        case 'deadline':
        default:
          return new Date(a.deadline).getTime() - new Date(b.deadline).getTime()
      }
    })

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

        {/* Results Count & Export Button */}
        <div className="flex justify-between items-center mb-4">
          <div className="text-slate-400 text-sm">
            {filteredOrders.length !== orders.length && (
              <span>Showing {filteredOrders.length} of {orders.length} orders</span>
            )}
          </div>
          <button
            onClick={handleExportCSV}
            disabled={filteredOrders.length === 0}
            className="px-4 py-2 bg-green-600 text-white text-sm font-semibold rounded-lg hover:bg-green-700 transition disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <span>📥</span>
            Export CSV ({filteredOrders.length})
          </button>
        </div>

        {/* Bulk Actions Bar */}
        {selectedOrders.size > 0 && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-20 bg-slate-800 border-2 border-blue-500 rounded-lg shadow-2xl p-4 flex items-center gap-4">
            <span className="text-white font-semibold">
              {selectedOrders.size} selected
            </span>
            <div className="h-6 w-px bg-slate-600" />
            <div className="flex gap-2">
              <button
                onClick={() => handleBulkStatusChange('in_progress')}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition"
              >
                Mark In Progress
              </button>
              <button
                onClick={() => handleBulkStatusChange('completed')}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-lg transition"
              >
                Mark Completed
              </button>
              <button
                onClick={() => handleBulkStatusChange('delayed')}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-lg transition"
              >
                Mark Delayed
              </button>
            </div>
            <div className="h-6 w-px bg-slate-600" />
            <button
              onClick={handleDeselectAll}
              className="text-slate-400 hover:text-white text-sm"
            >
              Cancel
            </button>
          </div>
        )}

        {/* Orders List or Empty State */}
        {filteredOrders.length === 0 ? (
          <div className="bg-slate-800 rounded-lg border border-slate-700 p-8">
            <EmptyState
              icon="📦"
              title="Brak zamówień"
              description="Nie masz jeszcze żadnych zamówień. Dodaj swoje pierwsze zamówienie żeby zacząć planowanie produkcji!"
              actionLabel="+ Dodaj Zamówienie"
              actionHref="/orders/add"
            />
          </div>
        ) : (
          <OrderList
            orders={filteredOrders}
            currentUserRole={currentUserRole}
            selectedOrders={selectedOrders}
            onToggleSelect={handleToggleSelect}
            onSelectAll={handleSelectAll}
            onDeselectAll={handleDeselectAll}
          />
        )}
      </div>
    </div>
  )
}
