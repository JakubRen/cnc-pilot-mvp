'use client'

import { useState, useRef, useEffect } from 'react'

interface InventoryItem {
  id: string
  sku: string
  name: string
  quantity: number
  unit: string
}

interface InventoryAutocompleteProps {
  value: string
  onChange: (value: string) => void
  items: InventoryItem[]
  error?: string
  placeholder?: string
}

export default function InventoryAutocomplete({
  value,
  onChange,
  items,
  error,
  placeholder = 'Wybierz komponent...',
}: InventoryAutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const wrapperRef = useRef<HTMLDivElement>(null)

  // Find selected item
  const selectedItem = items.find(item => item.id === value)

  // Filter items based on search term
  const filteredItems = items.filter((item) => {
    const search = searchTerm.toLowerCase()
    return (
      item.sku.toLowerCase().includes(search) ||
      item.name.toLowerCase().includes(search)
    )
  })

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSelect = (item: InventoryItem) => {
    onChange(item.id)
    setSearchTerm('')
    setIsOpen(false)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value)
    setIsOpen(true)
  }

  const handleClear = () => {
    onChange('')
    setSearchTerm('')
    setIsOpen(false)
  }

  return (
    <div ref={wrapperRef} className="relative">
      {/* Display selected item or search input */}
      {selectedItem && !isOpen ? (
        <div className="flex items-center justify-between w-full px-4 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600">
          <div className="flex-1">
            <div className="text-slate-900 dark:text-white font-medium">
              {selectedItem.sku} - {selectedItem.name}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Dostępne: {selectedItem.quantity} {selectedItem.unit}
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setIsOpen(true)}
              className="text-blue-500 hover:text-blue-400 text-sm font-medium"
            >
              Zmień
            </button>
            <button
              type="button"
              onClick={handleClear}
              className="text-red-500 hover:text-red-400 text-sm font-medium"
            >
              Wyczyść
            </button>
          </div>
        </div>
      ) : (
        <input
          type="text"
          value={searchTerm}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          className={`w-full px-4 py-2 rounded-lg bg-white dark:bg-slate-800 border ${
            error
              ? 'border-red-500 focus:border-red-500'
              : 'border-slate-200 dark:border-slate-600 focus:border-blue-500'
          } text-slate-900 dark:text-white focus:outline-none`}
          autoComplete="off"
        />
      )}

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 max-h-60 overflow-y-auto bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg">
          {filteredItems.length > 0 ? (
            <>
              {filteredItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelect(item)}
                  className="w-full px-4 py-2 text-left hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                >
                  <div className="text-slate-900 dark:text-white font-medium">
                    {item.sku} - {item.name}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    Dostępne: {item.quantity} {item.unit}
                  </div>
                </button>
              ))}
            </>
          ) : (
            <div className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400">
              Nie znaleziono komponentów
            </div>
          )}
        </div>
      )}
    </div>
  )
}
