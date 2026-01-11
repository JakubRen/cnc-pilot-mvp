'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useInventoryItems, type InventoryItem } from '@/hooks/useInventoryItems'

interface InventoryAutocompleteProps {
  value: string
  onChange: (value: string, item?: InventoryItem) => void
  categoryFilter: 'raw_material' | 'part' | 'finished_good' | 'all' | ('raw_material' | 'part' | 'finished_good')[]
  placeholder?: string
  error?: string
  label?: string
  required?: boolean
  allowCustom?: boolean // Allow typing custom value not in list
}

export default function InventoryAutocomplete({
  value,
  onChange,
  categoryFilter,
  placeholder = 'Wpisz nazwę...',
  error,
  label,
  required = false,
  allowCustom = true,
}: InventoryAutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState(value)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const { items, loading } = useInventoryItems(categoryFilter)

  // Filter items based on search query
  const filteredItems = items.filter(item => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      item.name.toLowerCase().includes(query) ||
      item.sku.toLowerCase().includes(query)
    )
  }).slice(0, 10) // Limit to 10 results

  // Sync external value with internal state
  useEffect(() => {
    setSearchQuery(value)
  }, [value])

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setSearchQuery(newValue)
    setIsOpen(true)
    setHighlightedIndex(-1)

    if (allowCustom) {
      onChange(newValue, undefined)
    }
  }

  // Handle item selection
  const handleSelect = useCallback((item: InventoryItem) => {
    setSearchQuery(item.name)
    onChange(item.name, item)
    setIsOpen(false)
    setHighlightedIndex(-1)
  }, [onChange])

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setIsOpen(true)
        e.preventDefault()
      }
      return
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setHighlightedIndex(prev =>
          prev < filteredItems.length - 1 ? prev + 1 : prev
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setHighlightedIndex(prev => (prev > 0 ? prev - 1 : -1))
        break
      case 'Enter':
        e.preventDefault()
        if (highlightedIndex >= 0 && filteredItems[highlightedIndex]) {
          handleSelect(filteredItems[highlightedIndex])
        } else if (allowCustom && searchQuery) {
          setIsOpen(false)
        }
        break
      case 'Escape':
        setIsOpen(false)
        setHighlightedIndex(-1)
        break
    }
  }

  // Format quantity display
  const formatQuantity = (item: InventoryItem) => {
    if (item.quantity <= 0) {
      return <span className="text-red-400">⚠️ BRAK</span>
    }
    if (item.quantity < 10) {
      return <span className="text-yellow-400">📦 {item.quantity} {item.unit}</span>
    }
    return <span className="text-green-400">📦 {item.quantity} {item.unit}</span>
  }

  return (
    <div className="relative">
      {label && (
        <label className="block text-slate-700 dark:text-slate-300 mb-2 font-medium">
          {label} {required && '*'}
        </label>
      )}

      <input
        ref={inputRef}
        type="text"
        value={searchQuery}
        onChange={handleInputChange}
        onFocus={() => setIsOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={`w-full px-4 py-3 rounded-lg bg-slate-50 dark:bg-slate-900 border ${
          error
            ? 'border-red-500'
            : 'border-slate-200 dark:border-slate-700'
        } text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none`}
        autoComplete="off"
      />

      {error && (
        <p className="text-red-400 text-sm mt-1">{error}</p>
      )}

      {/* Dropdown */}
      {isOpen && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl max-h-64 overflow-y-auto"
        >
          {loading ? (
            <div className="px-4 py-3 text-slate-500 dark:text-slate-400">
              Ładowanie...
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="px-4 py-3 text-slate-500 dark:text-slate-400">
              {searchQuery ? (
                allowCustom ? (
                  <>Brak wyników. Możesz użyć: &quot;{searchQuery}&quot;</>
                ) : (
                  'Brak wyników'
                )
              ) : (
                'Wpisz aby wyszukać...'
              )}
            </div>
          ) : (
            filteredItems.map((item, index) => (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelect(item)}
                className={`w-full px-4 py-3 text-left hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors ${
                  highlightedIndex === index
                    ? 'bg-blue-50 dark:bg-slate-700'
                    : ''
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-medium text-slate-900 dark:text-white">
                      🔍 {item.name}
                    </div>
                    <div className="text-sm text-slate-500 dark:text-slate-400">
                      SKU: {item.sku}
                    </div>
                  </div>
                  <div className="text-sm">
                    {formatQuantity(item)}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}
