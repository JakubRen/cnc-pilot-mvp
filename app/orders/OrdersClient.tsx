'use client'

import { useState } from 'react'
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
import { useOrderFiltering } from '@/hooks/useOrderFiltering'
import { useOrderSelection } from '@/hooks/useOrderSelection'

interface OrderWithTags {
  id: string
  order_number: string
  customer_name: string
  quantity: number
  deadline: string
  status: string
  tags: Array<{ id: string; name: string; color: string }>
  assigned_operator_name?: string | null
}

interface OrdersClientProps {
  orders: OrderWithTags[]
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
  
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([])
  const [tagLogic, setTagLogic] = useState<'AND' | 'OR'>('OR')

  // Custom Hooks
  const filteredOrders = useOrderFiltering(orders, filters, selectedTagIds, tagLogic)
  const {
    selectedOrders,
    setSelectedOrders,
    handleToggleSelect,
    handleSelectAll,
    handleDeselectAll
  } = useOrderSelection(filteredOrders.map(o => o.id))

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

  // Load saved filter
  const handleLoadSavedFilter = (config: { status?: string; deadline?: string; search?: string; sortBy?: string; tagIds?: string[]; tagLogic?: 'AND' | 'OR' }) => {
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
