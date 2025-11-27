'use client'

import { useState, useRef } from 'react'
import { ColumnConfig } from '@/hooks/useTableColumns'

interface TableColumnConfigProps {
  columns: ColumnConfig[]
  onToggle: (columnId: string) => void
  onReorder: (fromIndex: number, toIndex: number) => void
  onReset: () => void
}

export default function TableColumnConfig({
  columns,
  onToggle,
  onReorder,
  onReset,
}: TableColumnConfigProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', index.toString())
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverIndex(index)
  }

  const handleDragLeave = () => {
    setDragOverIndex(null)
  }

  const handleDrop = (e: React.DragEvent, toIndex: number) => {
    e.preventDefault()
    const fromIndex = draggedIndex
    if (fromIndex !== null && fromIndex !== toIndex) {
      onReorder(fromIndex, toIndex)
    }
    setDraggedIndex(null)
    setDragOverIndex(null)
  }

  const handleDragEnd = () => {
    setDraggedIndex(null)
    setDragOverIndex(null)
  }

  return (
    <div className="relative">
      {/* Toggle Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition flex items-center gap-2"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
        </svg>
        Edycja tabeli
      </button>

      {/* Config Panel */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Panel */}
          <div
            ref={panelRef}
            className="absolute right-0 top-12 z-50 w-72 bg-slate-800 border border-slate-700 rounded-lg shadow-xl p-4"
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-white font-semibold">Widoczne kolumny</h3>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <p className="text-xs text-slate-400 mb-3">
              Przeciągnij aby zmienić kolejność
            </p>

            {/* Column List */}
            <ul className="space-y-1 max-h-80 overflow-y-auto">
              {columns.map((column, index) => (
                <li
                  key={column.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, index)}
                  onDragEnd={handleDragEnd}
                  className={`
                    flex items-center gap-3 p-2 rounded cursor-move transition
                    ${draggedIndex === index ? 'opacity-50 bg-slate-700' : 'bg-slate-900/50 hover:bg-slate-700/50'}
                    ${dragOverIndex === index ? 'border-t-2 border-blue-500' : ''}
                  `}
                >
                  {/* Drag Handle */}
                  <span className="text-slate-500 flex-shrink-0">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 6a2 2 0 11-4 0 2 2 0 014 0zm0 6a2 2 0 11-4 0 2 2 0 014 0zm0 6a2 2 0 11-4 0 2 2 0 014 0zm8-12a2 2 0 11-4 0 2 2 0 014 0zm0 6a2 2 0 11-4 0 2 2 0 014 0zm0 6a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </span>

                  {/* Checkbox */}
                  <label className="flex items-center gap-2 flex-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={column.visible}
                      onChange={() => onToggle(column.id)}
                      className="w-4 h-4 rounded border-slate-600 bg-slate-900 text-blue-500 focus:ring-blue-500 focus:ring-offset-0"
                    />
                    <span className={`text-sm ${column.visible ? 'text-white' : 'text-slate-500'}`}>
                      {column.label}
                    </span>
                  </label>
                </li>
              ))}
            </ul>

            {/* Reset Button */}
            <div className="mt-4 pt-3 border-t border-slate-700">
              <button
                type="button"
                onClick={onReset}
                className="w-full px-3 py-2 text-sm text-slate-400 hover:text-white hover:bg-slate-700 rounded transition"
              >
                Przywróć domyślne
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
