'use client'

import { useState, useEffect, useCallback } from 'react'

export interface ColumnConfig {
  id: string
  label: string
  visible: boolean
  order: number
}

interface UseTableColumnsOptions {
  tableId: string // Unique ID for localStorage key
  defaultColumns: Omit<ColumnConfig, 'order'>[]
}

export function useTableColumns({ tableId, defaultColumns }: UseTableColumnsOptions) {
  const storageKey = `table-columns-${tableId}`

  // Initialize columns with order
  const getInitialColumns = useCallback((): ColumnConfig[] => {
    if (typeof window === 'undefined') {
      return defaultColumns.map((col, index) => ({ ...col, order: index }))
    }

    const saved = localStorage.getItem(storageKey)
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as ColumnConfig[]
        // Merge with defaults in case new columns were added
        const savedIds = new Set(parsed.map(c => c.id))
        const merged = [...parsed]

        defaultColumns.forEach((col, index) => {
          if (!savedIds.has(col.id)) {
            merged.push({ ...col, order: merged.length })
          }
        })

        return merged.sort((a, b) => a.order - b.order)
      } catch {
        return defaultColumns.map((col, index) => ({ ...col, order: index }))
      }
    }

    return defaultColumns.map((col, index) => ({ ...col, order: index }))
  }, [defaultColumns, storageKey])

  const [columns, setColumns] = useState<ColumnConfig[]>(getInitialColumns)

  // Save to localStorage whenever columns change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(storageKey, JSON.stringify(columns))
    }
  }, [columns, storageKey])

  // Toggle column visibility
  const toggleColumn = useCallback((columnId: string) => {
    setColumns(prev =>
      prev.map(col =>
        col.id === columnId ? { ...col, visible: !col.visible } : col
      )
    )
  }, [])

  // Reorder columns (drag & drop)
  const reorderColumns = useCallback((fromIndex: number, toIndex: number) => {
    setColumns(prev => {
      const newColumns = [...prev]
      const [removed] = newColumns.splice(fromIndex, 1)
      newColumns.splice(toIndex, 0, removed)
      // Update order values
      return newColumns.map((col, index) => ({ ...col, order: index }))
    })
  }, [])

  // Reset to defaults
  const resetColumns = useCallback(() => {
    const reset = defaultColumns.map((col, index) => ({ ...col, order: index }))
    setColumns(reset)
  }, [defaultColumns])

  // Get visible columns in order
  const visibleColumns = columns.filter(col => col.visible)

  return {
    columns,
    visibleColumns,
    toggleColumn,
    reorderColumns,
    resetColumns,
  }
}
