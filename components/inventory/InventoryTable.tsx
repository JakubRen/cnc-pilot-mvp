'use client'

import { useState, useRef, useCallback, useMemo } from 'react'
import { useTableColumns } from '@/hooks/useTableColumns'
import TableColumnConfig from '@/components/table/TableColumnConfig'
import FilterDrawer from '@/components/ui/FilterDrawer'
import InventoryFilters, {
  InventoryFilterState,
  DEFAULT_INVENTORY_FILTERS,
  countActiveFilters,
  getActiveFilterLabels,
} from '@/components/inventory/InventoryFilters'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/badge'
import { productCategoryLabels } from '@/types/products'

interface InventoryItem {
  id: string
  sku: string
  name: string
  category: string | null
  quantity: number
  unit: string | null
  location: string | null
  batch_number: string | null
  low_stock_threshold: number | null
}

interface InventoryTableProps {
  items: InventoryItem[]
}

// Define default columns for inventory
const DEFAULT_COLUMNS = [
  { id: 'sku', label: 'SKU', visible: true },
  { id: 'name', label: 'Nazwa', visible: true },
  { id: 'category', label: 'Kategoria', visible: true },
  { id: 'quantity', label: 'Ilość', visible: true },
  { id: 'location', label: 'Lokalizacja', visible: true },
  { id: 'batch_number', label: 'Partia', visible: true },
  { id: 'status', label: 'Status', visible: true },
  { id: 'actions', label: 'Akcje', visible: true },
]

export default function InventoryTable({ items }: InventoryTableProps) {
  const {
    columns,
    visibleColumns,
    toggleColumn,
    reorderColumns,
    resetColumns,
  } = useTableColumns({
    tableId: 'inventory',
    defaultColumns: DEFAULT_COLUMNS,
  })

  // Filter Drawer state
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [filters, setFilters] = useState<InventoryFilterState>(DEFAULT_INVENTORY_FILTERS)

  // Get stock status for an item
  const getStockStatus = (item: InventoryItem): 'ok' | 'low' | 'out' => {
    if (item.quantity <= 0) return 'out'
    if (item.low_stock_threshold && item.quantity <= item.low_stock_threshold) return 'low'
    return 'ok'
  }

  // Filtered and sorted items (memoized for performance)
  const filteredItems = useMemo(() => {
    let result = [...items]

    // 1. Search filter
    if (filters.search) {
      const query = filters.search.toLowerCase()
      result = result.filter(item =>
        item.name.toLowerCase().includes(query) ||
        item.sku.toLowerCase().includes(query)
      )
    }

    // 2. Category filter
    if (filters.category !== 'all') {
      result = result.filter(item => item.category === filters.category)
    }

    // 3. Status filter
    if (filters.status !== 'all') {
      result = result.filter(item => getStockStatus(item) === filters.status)
    }

    // 4. Sort
    result.sort((a, b) => {
      switch (filters.sortBy) {
        case 'name_asc':
          return a.name.localeCompare(b.name, 'pl')
        case 'name_desc':
          return b.name.localeCompare(a.name, 'pl')
        case 'quantity_asc':
          return a.quantity - b.quantity
        case 'quantity_desc':
          return b.quantity - a.quantity
        case 'sku_asc':
          return a.sku.localeCompare(b.sku, 'pl')
        default:
          return 0
      }
    })

    return result
  }, [items, filters])

  // Remove single filter
  const removeFilter = (key: keyof InventoryFilterState) => {
    setFilters(prev => ({
      ...prev,
      [key]: DEFAULT_INVENTORY_FILTERS[key],
    }))
  }

  // Reset all filters
  const resetFilters = () => {
    setFilters(DEFAULT_INVENTORY_FILTERS)
  }

  // Track dragging state for header drag
  const [draggingHeader, setDraggingHeader] = useState<string | null>(null)
  const [dragOverHeader, setDragOverHeader] = useState<string | null>(null)
  const [showDropZone, setShowDropZone] = useState(false)
  const tableRef = useRef<HTMLDivElement>(null)

  // Handle header drag start
  const handleHeaderDragStart = useCallback((e: React.DragEvent, columnId: string) => {
    setDraggingHeader(columnId)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', columnId)
    setTimeout(() => setShowDropZone(true), 50)
  }, [])

  // Handle header drag over another header (for reordering)
  const handleHeaderDragOver = useCallback((e: React.DragEvent, columnId: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (draggingHeader && draggingHeader !== columnId) {
      setDragOverHeader(columnId)
    }
  }, [draggingHeader])

  // Handle header drag leave
  const handleHeaderDragLeave = useCallback(() => {
    setDragOverHeader(null)
  }, [])

  // Handle drop on another header (reorder)
  const handleHeaderDrop = useCallback((e: React.DragEvent, targetColumnId: string) => {
    e.preventDefault()
    if (draggingHeader && draggingHeader !== targetColumnId) {
      const fromIndex = visibleColumns.findIndex(c => c.id === draggingHeader)
      const toIndex = visibleColumns.findIndex(c => c.id === targetColumnId)
      if (fromIndex !== -1 && toIndex !== -1) {
        reorderColumns(fromIndex, toIndex)
      }
    }
    setDraggingHeader(null)
    setDragOverHeader(null)
    setShowDropZone(false)
  }, [draggingHeader, visibleColumns, reorderColumns])

  // Handle header drag end
  const handleHeaderDragEnd = useCallback(() => {
    setDraggingHeader(null)
    setDragOverHeader(null)
    setShowDropZone(false)
  }, [])

  // Handle drop on hide zone
  const handleDropToHide = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    if (draggingHeader) {
      toggleColumn(draggingHeader)
    }
    setDraggingHeader(null)
    setDragOverHeader(null)
    setShowDropZone(false)
  }, [draggingHeader, toggleColumn])

  // Render cell content based on column id
  const renderCell = (item: InventoryItem, columnId: string) => {
    const status = getStockStatus(item)

    switch (columnId) {
      case 'sku':
        return (
          <code className="px-2 py-1 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-sm rounded font-mono">
            {item.sku}
          </code>
        )
      case 'name':
        return (
          <span className="font-semibold text-slate-900 dark:text-white">
            {item.name}
          </span>
        )
      case 'category':
        return item.category ? (
          <Badge variant="outline">
            {productCategoryLabels[item.category as keyof typeof productCategoryLabels] || item.category}
          </Badge>
        ) : (
          <span className="text-slate-400">-</span>
        )
      case 'quantity':
        return (
          <span className={`text-lg font-bold ${
            status === 'out' ? 'text-red-600' :
            status === 'low' ? 'text-yellow-600' :
            'text-green-600'
          }`}>
            {item.quantity}
          </span>
        )
      case 'location':
        return <span className="text-slate-600 dark:text-slate-300">{item.location || '-'}</span>
      case 'batch_number':
        return <span className="text-slate-500 dark:text-slate-400 font-mono">{item.batch_number || '-'}</span>
      case 'status':
        if (status === 'out') {
          return <Badge variant="danger">Brak</Badge>
        } else if (status === 'low') {
          return <Badge variant="warning">Niski</Badge>
        } else {
          return <Badge variant="success">OK</Badge>
        }
      case 'actions':
        return (
          <div className="text-right space-x-2">
            <Button href={`/inventory/${item.id}`} variant="ghost" size="sm">
              Podgląd
            </Button>
            <Button href={`/inventory/${item.id}/edit`} variant="ghost" size="sm" className="text-blue-400 hover:text-blue-300">
              Edytuj
            </Button>
          </div>
        )
      default:
        return null
    }
  }

  const activeFilterCount = countActiveFilters(filters)
  const filterLabels = getActiveFilterLabels(filters)

  // Convert to label objects for display
  const activeFilterLabels = filterLabels.map((label) => {
    let key: keyof InventoryFilterState = 'search'
    if (label.includes('Część') || label.includes('Materiał') || label.includes('Narzędzie')) {
      key = 'category'
    } else if (label.includes('normie') || label.includes('Niski') || label.includes('Brak')) {
      key = 'status'
    } else if (label.startsWith('"')) {
      key = 'search'
    }
    return { key, label }
  })

  return (
    <div ref={tableRef}>
      {/* Header with Filter Button */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-3">
          {/* Filter Button */}
          <button
            onClick={() => setIsFilterOpen(true)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition ${
              activeFilterCount > 0
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            Filtry
            {activeFilterCount > 0 && (
              <span className="ml-1 px-2 py-0.5 text-xs bg-white/20 rounded-full">
                {activeFilterCount}
              </span>
            )}
          </button>

          {/* Results count */}
          <span className="text-sm text-slate-500 dark:text-slate-400">
            {filteredItems.length === items.length
              ? `${items.length} pozycji`
              : `${filteredItems.length} z ${items.length} pozycji`}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <TableColumnConfig
            columns={columns}
            onToggle={toggleColumn}
            onReorder={reorderColumns}
            onReset={resetColumns}
          />
          <Button href="/documents/add" variant="primary">
            + Nowy Dokument
          </Button>
        </div>
      </div>

      {/* Active Filter Badges */}
      {activeFilterLabels.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {activeFilterLabels.map(({ key, label }) => (
            <span
              key={key}
              className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-sm"
            >
              {label}
              <button
                onClick={() => removeFilter(key)}
                className="ml-1 hover:text-blue-900 dark:hover:text-blue-100"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </span>
          ))}
          <button
            onClick={resetFilters}
            className="text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
          >
            Wyczyść wszystkie
          </button>
        </div>
      )}

      {/* Filter Drawer */}
      <FilterDrawer
        isOpen={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        title="Filtry magazynu"
        onReset={resetFilters}
        onApply={() => {}}
      >
        <InventoryFilters filters={filters} onFiltersChange={setFilters} onReset={resetFilters} />
      </FilterDrawer>

      {/* Drop zone to hide columns */}
      {showDropZone && (
        <div
          onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move' }}
          onDrop={handleDropToHide}
          className="mb-3 h-14 bg-red-500/20 border-2 border-dashed border-red-500 rounded-lg flex items-center justify-center transition-all animate-pulse"
        >
          <span className="text-red-400 font-medium flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
            </svg>
            Upuść tutaj aby ukryć kolumnę
          </span>
        </div>
      )}

      {/* Table */}
      <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 overflow-x-auto">
        <table className="w-full min-w-max">
          <thead className="bg-slate-100 dark:bg-slate-700">
            <tr>
              {visibleColumns.map((column) => (
                <th
                  key={column.id}
                  draggable
                  onDragStart={(e) => handleHeaderDragStart(e, column.id)}
                  onDragOver={(e) => handleHeaderDragOver(e, column.id)}
                  onDragLeave={handleHeaderDragLeave}
                  onDrop={(e) => handleHeaderDrop(e, column.id)}
                  onDragEnd={handleHeaderDragEnd}
                  className={`px-6 py-3 text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider cursor-grab active:cursor-grabbing select-none hover:bg-slate-200 dark:hover:bg-slate-600/50 transition ${
                    column.id === 'actions' ? 'text-right' : column.id === 'quantity' ? 'text-right' : column.id === 'status' ? 'text-center' : 'text-left'
                  } ${draggingHeader === column.id ? 'opacity-50' : ''} ${
                    dragOverHeader === column.id ? 'bg-blue-100 dark:bg-blue-900/30 border-l-2 border-blue-500' : ''
                  }`}
                  title="Przeciągnij aby zmienić kolejność lub w górę aby ukryć"
                >
                  <span className="flex items-center gap-1">
                    <svg className="w-3 h-3 text-slate-500" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 6a2 2 0 11-4 0 2 2 0 014 0zm0 6a2 2 0 11-4 0 2 2 0 014 0zm0 6a2 2 0 11-4 0 2 2 0 014 0zm8-12a2 2 0 11-4 0 2 2 0 014 0zm0 6a2 2 0 11-4 0 2 2 0 014 0zm0 6a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    {column.label}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
            {filteredItems.length === 0 ? (
              <tr>
                <td colSpan={visibleColumns.length} className="px-6 py-12 text-center">
                  <div className="text-slate-400 dark:text-slate-500">
                    <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <p className="text-lg font-medium">Brak wyników</p>
                    <p className="text-sm mt-1">Zmień kryteria filtrowania</p>
                    {activeFilterCount > 0 && (
                      <button
                        onClick={resetFilters}
                        className="mt-3 text-blue-500 hover:text-blue-400 text-sm font-medium"
                      >
                        Wyczyść filtry
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              filteredItems.map((item) => (
                <tr key={item.id} className="hover:bg-slate-100 dark:hover:bg-slate-700/50 transition">
                  {visibleColumns.map((column) => (
                    <td
                      key={column.id}
                      className={`px-6 py-4 whitespace-nowrap text-sm ${
                        column.id === 'quantity' ? 'text-right' : column.id === 'status' ? 'text-center' : ''
                      }`}
                    >
                      {renderCell(item, column.id)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
