'use client'

import { useState, useRef } from 'react'
import { useTableColumns } from '@/hooks/useTableColumns'
import TableColumnConfig from '@/components/table/TableColumnConfig'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'

interface InventoryItem {
  id: string
  sku: string
  name: string
  category: string
  quantity: number
  unit: string
  location: string | null
  batch_number: string | null
  low_stock_threshold: number
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

  // Track dragging state for header drag-to-hide
  const [draggingHeader, setDraggingHeader] = useState<string | null>(null)
  const [showDropZone, setShowDropZone] = useState(false)
  const tableRef = useRef<HTMLDivElement>(null)

  // Handle header drag start
  const handleHeaderDragStart = (e: React.DragEvent, columnId: string) => {
    setDraggingHeader(columnId)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', columnId)
    // Show drop zone after a small delay
    setTimeout(() => setShowDropZone(true), 50)
  }

  // Handle header drag end
  const handleHeaderDragEnd = () => {
    setDraggingHeader(null)
    setShowDropZone(false)
  }

  // Handle drop on hide zone (above table)
  const handleDropToHide = (e: React.DragEvent) => {
    e.preventDefault()
    if (draggingHeader) {
      toggleColumn(draggingHeader)
    }
    setDraggingHeader(null)
    setShowDropZone(false)
  }

  // Render cell content based on column id
  const renderCell = (item: InventoryItem, columnId: string) => {
    const isLowStock = Number(item.quantity) <= Number(item.low_stock_threshold)
    const isOutOfStock = Number(item.quantity) === 0

    let statusVariant: 'success' | 'warning' | 'danger' | 'secondary' = 'success'
    let statusText = 'OK'

    if (isOutOfStock) {
      statusVariant = 'secondary'
      statusText = 'BRAK'
    } else if (isLowStock) {
      statusVariant = 'warning'
      statusText = 'NISKI STAN'
    }

    switch (columnId) {
      case 'sku':
        return <span className="font-medium text-white font-mono">{item.sku}</span>
      case 'name':
        return <span className="text-slate-300">{item.name}</span>
      case 'category':
        return (
          <Badge variant="outline">
            {item.category.replace(/_/g, ' ')}
          </Badge>
        )
      case 'quantity':
        return <span className="text-white font-semibold">{item.quantity} {item.unit}</span>
      case 'location':
        return <span className="text-slate-300">{item.location || '-'}</span>
      case 'batch_number':
        return <span className="text-slate-400 font-mono">{item.batch_number || '-'}</span>
      case 'status':
        return <Badge variant={statusVariant}>{statusText}</Badge>
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

  return (
    <div ref={tableRef}>
      {/* Header with buttons: Edycja tabeli + Dodaj przedmiot */}
      <div className="flex justify-end items-center gap-3 mb-4">
        <TableColumnConfig
          columns={columns}
          onToggle={toggleColumn}
          onReorder={reorderColumns}
          onReset={resetColumns}
        />
        <Button href="/inventory/add" variant="primary">
          + Dodaj przedmiot
        </Button>
      </div>

      {/* Drop zone to hide columns - appears when dragging */}
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
      <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-x-auto">
        <table className="w-full min-w-max">
          <thead className="bg-slate-700">
            <tr>
              {visibleColumns.map((column) => (
                <th
                  key={column.id}
                  draggable
                  onDragStart={(e) => handleHeaderDragStart(e, column.id)}
                  onDragEnd={handleHeaderDragEnd}
                  className={`px-6 py-3 text-xs font-semibold text-slate-300 uppercase tracking-wider cursor-grab active:cursor-grabbing select-none hover:bg-slate-600/50 transition ${
                    column.id === 'actions' ? 'text-right' : 'text-left'
                  } ${draggingHeader === column.id ? 'opacity-50' : ''}`}
                  title="Przeciągnij w górę aby ukryć"
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
          <tbody className="divide-y divide-slate-700">
            {items.map((item) => (
              <tr key={item.id} className="hover:bg-slate-700/50 transition">
                {visibleColumns.map((column) => (
                  <td
                    key={column.id}
                    className="px-6 py-4 whitespace-nowrap text-sm"
                  >
                    {renderCell(item, column.id)}
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
