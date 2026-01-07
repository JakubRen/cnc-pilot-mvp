'use client'

import { useState, useRef, useCallback } from 'react'
import { useTableColumns } from '@/hooks/useTableColumns'
import TableColumnConfig from '@/components/table/TableColumnConfig'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/badge'
import { productCategoryLabels, productUnitLabels } from '@/types/products'

interface ProductLocation {
  id: string
  location_code: string
  available_quantity: number
}

interface Product {
  id: string
  name: string
  sku: string
  category: string | null
  unit: string | null
  description: string | null
  locations?: ProductLocation[]
}

interface ProductsTableProps {
  products: Product[]
}

// Define default columns for products
const DEFAULT_COLUMNS = [
  { id: 'name', label: 'Nazwa', visible: true },
  { id: 'sku', label: 'SKU', visible: true },
  { id: 'category', label: 'Kategoria', visible: true },
  { id: 'unit', label: 'Jednostka', visible: true },
  { id: 'stock', label: 'Stan', visible: true },
  { id: 'locations', label: 'Lokalizacje', visible: true },
  { id: 'actions', label: 'Akcje', visible: true },
]

export default function ProductsTable({ products }: ProductsTableProps) {
  const {
    columns,
    visibleColumns,
    toggleColumn,
    reorderColumns,
    resetColumns,
  } = useTableColumns({
    tableId: 'products',
    defaultColumns: DEFAULT_COLUMNS,
  })

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
      // Find indices in visibleColumns
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

  // Calculate total stock for a product
  const getTotalStock = (product: Product): number => {
    return product.locations?.reduce(
      (sum, loc) => sum + (loc.available_quantity || 0),
      0
    ) || 0
  }

  // Render cell content based on column id
  const renderCell = (product: Product, columnId: string) => {
    const totalStock = getTotalStock(product)

    switch (columnId) {
      case 'name':
        return (
          <span className="font-semibold text-slate-900 dark:text-white">
            {product.name}
          </span>
        )
      case 'sku':
        return (
          <code className="px-2 py-1 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-sm rounded font-mono">
            {product.sku}
          </code>
        )
      case 'category':
        return product.category ? (
          <Badge variant="outline">
            {productCategoryLabels[product.category as keyof typeof productCategoryLabels] || product.category}
          </Badge>
        ) : (
          <span className="text-slate-400">-</span>
        )
      case 'unit':
        return (
          <span className="text-slate-600 dark:text-slate-300">
            {product.unit
              ? (productUnitLabels[product.unit as keyof typeof productUnitLabels] || product.unit)
              : '-'
            }
          </span>
        )
      case 'stock':
        return (
          <span className="font-semibold text-slate-900 dark:text-white">
            {totalStock.toFixed(0)}
          </span>
        )
      case 'locations':
        return (
          <span className="text-slate-600 dark:text-slate-300">
            {product.locations?.length || 0}
          </span>
        )
      case 'actions':
        return (
          <div className="text-right space-x-2">
            <Button href={`/products/${product.id}`} variant="ghost" size="sm">
              Podgląd
            </Button>
            <Button href={`/products/${product.id}/edit`} variant="ghost" size="sm" className="text-blue-400 hover:text-blue-300">
              Edytuj
            </Button>
          </div>
        )
      default:
        return null
    }
  }

  return (
    <div ref={tableRef}>
      {/* Header with buttons */}
      <div className="flex justify-end items-center gap-3 mb-4">
        <TableColumnConfig
          columns={columns}
          onToggle={toggleColumn}
          onReorder={reorderColumns}
          onReset={resetColumns}
        />
        <Button href="/products/add" variant="primary">
          + Dodaj Towar
        </Button>
      </div>

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
                    column.id === 'actions' ? 'text-right' : 'text-left'
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
            {products.map((product) => (
              <tr key={product.id} className="hover:bg-slate-100 dark:hover:bg-slate-700/50 transition">
                {visibleColumns.map((column) => (
                  <td
                    key={column.id}
                    className="px-6 py-4 whitespace-nowrap text-sm"
                  >
                    {renderCell(product, column.id)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
