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
import TagFilter from '@/components/tags/TagFilter'
import SavedFilters from '@/components/filters/SavedFilters'
import { Button } from '@/components/ui/Button'

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
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([])
  const [tagLogic, setTagLogic] = useState<'AND' | 'OR'>('OR')

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

  // Load saved filter
  const handleLoadSavedFilter = (config: any) => {
    if (config.status !== undefined || config.deadline !== undefined || config.search !== undefined || config.sortBy !== undefined) {
      setFilters({
        status: config.status || 'all',
        deadline: config.deadline || 'all',
        search: config.search || '',
        sortBy: config.sortBy || 'deadline',
      })
    }
    if (config.tagIds !== undefined) {
      setSelectedTagIds(config.tagIds || [])
    }
    if (config.tagLogic !== undefined) {
      setTagLogic(config.tagLogic || 'OR')
    }
  }

  // Bulk status change
  const handleBulkStatusChange = async (newStatus: string) => {
    if (selectedOrders.size === 0) return

    const confirmed = confirm(
      `Czy na pewno chcesz zmienić status ${selectedOrders.size} zamówień na "${newStatus}"?`
    )
    if (!confirmed) return

    const loadingToast = toast.loading(`Aktualizacja ${selectedOrders.size} zamówień...`)

    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .in('id', Array.from(selectedOrders))

      toast.dismiss(loadingToast)

      if (error) {
        toast.error('Nie udało się zaktualizować zamówień: ' + error.message)
        return
      }

      toast.success(`Pomyślnie zaktualizowano ${selectedOrders.size} zamówień`)
      setSelectedOrders(new Set()) // Clear selection
      router.refresh() // Refresh data
    } catch (error) {
      toast.dismiss(loadingToast)
      toast.error('Błąd aktualizacji zamówień')
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

    // Tag filter
    if (selectedTagIds.length > 0) {
      result = result.filter(order => {
        const orderTagIds = (order.tags || []).map((tag: any) => tag.id)

        if (tagLogic === 'AND') {
          // Order must have ALL selected tags
          return selectedTagIds.every(tagId => orderTagIds.includes(tagId))
        } else {
          // Order must have AT LEAST ONE selected tag
          return selectedTagIds.some(tagId => orderTagIds.includes(tagId))
        }
      })
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
  }, [orders, filters, selectedTagIds, tagLogic])

  return (
    <div className="grid grid-cols-[350px_1fr] gap-6">
      {/* LEFT COLUMN - Statistics, Saved Filters & Tags */}
      <div className="space-y-6">
        <OrderStats orders={filteredOrders} onFilterClick={setFilters} />
        <SavedFilters
          filterType="order"
          currentFilters={{
            ...filters,
            tagIds: selectedTagIds,
            tagLogic: tagLogic,
          }}
          onLoadFilter={handleLoadSavedFilter}
        />
        <TagFilter
          onFilterChange={(tagIds, logic) => {
            setSelectedTagIds(tagIds)
            setTagLogic(logic)
          }}
        />
      </div>

      {/* RIGHT COLUMN - Filters + Orders */}
      <div>
        {/* Filters - One line */}
        <OrderFilters onFilterChange={setFilters} />

        {/* Results Count & Export Button */}
        <div className="flex justify-between items-center mb-4">
          <div className="text-slate-400 text-sm">
            {filteredOrders.length !== orders.length && (
              <span>Wyświetlanie {filteredOrders.length} z {orders.length} zamówień</span>
            )}
          </div>
          <Button
            onClick={handleExportCSV}
            disabled={filteredOrders.length === 0}
            variant="primary"
            size="sm"
            className="flex items-center gap-2"
          >
            <span>📥</span>
            Eksportuj CSV ({filteredOrders.length})
          </Button>
        </div>

        {/* Bulk Actions Bar */}
        {selectedOrders.size > 0 && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-20 bg-slate-800 border-2 border-blue-500 rounded-lg shadow-2xl p-4 flex items-center gap-4 animate-in slide-in-from-bottom-4 fade-in duration-200">
            <span className="text-white font-semibold">
              {selectedOrders.size} zaznaczono
            </span>
            <div className="h-6 w-px bg-slate-600" />
            <div className="flex gap-2">
              <Button
                onClick={() => handleBulkStatusChange('in_progress')}
                variant="primary"
                size="sm"
              >
                Oznacz w toku
              </Button>
              <Button
                onClick={() => handleBulkStatusChange('completed')}
                variant="primary"
                size="sm"
                className="bg-green-600 hover:bg-green-700 shadow-green-900/20"
              >
                Oznacz jako zakończone
              </Button>
              <Button
                onClick={() => handleBulkStatusChange('delayed')}
                variant="danger"
                size="sm"
              >
                Oznacz jako opóźnione
              </Button>
            </div>
            <div className="h-6 w-px bg-slate-600" />
            <Button
              onClick={handleDeselectAll}
              variant="ghost"
              size="sm"
            >
              Anuluj
            </Button>
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
