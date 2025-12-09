'use client'

import { useState, useRef, useEffect } from 'react'
import { InventoryItem } from '@/hooks/useInventoryItems'

interface InventorySelectProps {
  items: InventoryItem[]
  loading: boolean
  value: string
  onChange: (value: string, item?: InventoryItem) => void
  placeholder?: string
  label?: string
  required?: boolean
  error?: string
  allowCustom?: boolean // Allow typing custom value not in list
  emptyMessage?: string
}

export default function InventorySelect({
  items,
  loading,
  value,
  onChange,
  placeholder = 'Wybierz...',
  label,
  required,
  error,
  allowCustom = false,
  emptyMessage = 'Brak pozycji w magazynie',
}: InventorySelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [inputValue, setInputValue] = useState(value)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Sync input value with external value
  useEffect(() => {
    setInputValue(value)
  }, [value])

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        // Reset search when closing
        setSearch('')
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Filter items based on search
  const filteredItems = items.filter((item) =>
    item.name.toLowerCase().includes(search.toLowerCase()) ||
    item.sku.toLowerCase().includes(search.toLowerCase())
  )

  const handleSelect = (item: InventoryItem) => {
    setInputValue(item.name)
    onChange(item.name, item)
    setIsOpen(false)
    setSearch('')
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setInputValue(newValue)
    setSearch(newValue)

    if (allowCustom) {
      onChange(newValue)
    }

    if (!isOpen) {
      setIsOpen(true)
    }
  }

  const handleInputFocus = () => {
    setIsOpen(true)
  }

  const handleInputBlur = () => {
    // Small delay to allow click on dropdown item
    setTimeout(() => {
      if (allowCustom && inputValue) {
        onChange(inputValue)
      }
    }, 150)
  }

  return (
    <div ref={wrapperRef} className="relative">
      {label && (
        <label className="block text-slate-600 dark:text-slate-300 mb-2">
          {label} {required && '*'}
        </label>
      )}

      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          placeholder={loading ? 'Ładowanie...' : placeholder}
          disabled={loading}
          className={`w-full px-4 py-3 rounded-lg bg-slate-50 dark:bg-slate-900 border text-slate-900 dark:text-white focus:outline-none transition ${
            error
              ? 'border-red-500 focus:border-red-500'
              : 'border-slate-200 dark:border-slate-700 focus:border-blue-500'
          } ${loading ? 'opacity-50 cursor-wait' : ''}`}
        />

        {/* Dropdown arrow */}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
        >
          <svg
            className={`w-5 h-5 transition-transform ${isOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {error && <p className="text-red-400 text-sm mt-1">{error}</p>}

      {/* Dropdown */}
      {isOpen && !loading && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl max-h-60 overflow-y-auto">
          {filteredItems.length === 0 ? (
            <div className="p-4 text-slate-500 dark:text-slate-400 text-center">
              {search ? (
                <>
                  Nie znaleziono &quot;{search}&quot;
                  {allowCustom && (
                    <p className="text-xs mt-1 text-blue-400">
                      Możesz użyć tej nazwy jako nowej
                    </p>
                  )}
                </>
              ) : (
                emptyMessage
              )}
            </div>
          ) : (
            <ul>
              {filteredItems.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => handleSelect(item)}
                    className={`w-full px-4 py-3 text-left hover:bg-slate-100 dark:hover:bg-slate-700 transition flex justify-between items-center ${
                      inputValue === item.name ? 'bg-blue-600/20 text-blue-400' : 'text-slate-900 dark:text-white'
                    }`}
                  >
                    <div>
                      <div className="font-medium">{item.name}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        SKU: {item.sku} | Stan: {item.quantity} {item.unit}
                      </div>
                    </div>
                    {inputValue === item.name && (
                      <svg className="w-5 h-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
