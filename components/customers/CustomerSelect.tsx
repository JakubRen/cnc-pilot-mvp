'use client'

import { useState, useEffect, useRef } from 'react'
import { useCustomerSearch } from '@/hooks/useCustomers'
import type { Customer } from '@/types/customers'

interface CustomerSelectProps {
  value: string | null  // customer_id
  onChange: (customerId: string | null, customerName: string) => void
  onCreateNew: (name: string) => void  // Callback to open quick add modal
  disabled?: boolean
  error?: string
}

export default function CustomerSelect({
  value,
  onChange,
  onCreateNew,
  disabled = false,
  error,
}: CustomerSelectProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const { results, loading } = useCustomerSearch(searchTerm, 300)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setSearchTerm(value)
    setIsOpen(true)

    // Clear selection if user is typing
    if (selectedCustomer) {
      setSelectedCustomer(null)
      onChange(null, value)
    }
  }

  const handleSelectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer)
    setSearchTerm(customer.name)
    setIsOpen(false)
    onChange(customer.id, customer.name)
  }

  const handleCreateNew = () => {
    setIsOpen(false)
    onCreateNew(searchTerm)
  }

  const handleInputFocus = () => {
    setIsOpen(true)
  }

  const handleClear = () => {
    setSearchTerm('')
    setSelectedCustomer(null)
    onChange(null, '')
    setIsOpen(false)
  }

  const showCreateOption = searchTerm.trim().length >= 2 &&
                           results.length === 0 &&
                           !loading &&
                           !selectedCustomer

  return (
    <div className="relative" ref={dropdownRef}>
      <div className="relative">
        <input
          type="text"
          value={searchTerm}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          disabled={disabled}
          placeholder="Wyszukaj klienta po nazwie, email lub NIP..."
          className={`w-full px-4 py-3 pr-10 rounded-lg bg-slate-50 dark:bg-slate-900 border ${
            error
              ? 'border-red-500'
              : 'border-slate-200 dark:border-slate-700'
          } text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none ${
            disabled ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        />

        {/* Clear button */}
        {searchTerm && !disabled && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            ✕
          </button>
        )}

        {/* Selected indicator */}
        {selectedCustomer && (
          <div className="absolute right-10 top-1/2 -translate-y-1/2 text-green-500">
            ✓
          </div>
        )}
      </div>

      {/* Error message */}
      {error && (
        <p className="mt-1 text-sm text-red-500">{error}</p>
      )}

      {/* Dropdown */}
      {isOpen && !disabled && (
        <div className="absolute z-50 w-full mt-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl max-h-64 overflow-y-auto">
          {loading && (
            <div className="p-4 text-center text-slate-500 dark:text-slate-400">
              Wyszukiwanie...
            </div>
          )}

          {!loading && results.length === 0 && searchTerm.trim().length < 2 && (
            <div className="p-4 text-center text-slate-500 dark:text-slate-400 text-sm">
              Wpisz przynajmniej 2 znaki aby wyszukać klienta
            </div>
          )}

          {!loading && results.length > 0 && (
            <div>
              <div className="px-3 py-2 text-xs text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                Znaleziono {results.length} klientów
              </div>
              {results.map((customer) => (
                <button
                  key={customer.id}
                  type="button"
                  onClick={() => handleSelectCustomer(customer)}
                  className="w-full px-4 py-3 text-left hover:bg-slate-100 dark:hover:bg-slate-700 border-b border-slate-100 dark:border-slate-700 last:border-b-0 transition"
                >
                  <div className="font-semibold text-slate-900 dark:text-white">
                    {customer.name}
                  </div>
                  <div className="text-sm text-slate-500 dark:text-slate-400 mt-1 space-x-3">
                    {customer.email && <span>📧 {customer.email}</span>}
                    {customer.phone && <span>📞 {customer.phone}</span>}
                    {customer.nip && <span>NIP: {customer.nip}</span>}
                  </div>
                </button>
              ))}
            </div>
          )}

          {showCreateOption && (
            <div className="border-t-2 border-blue-500 dark:border-blue-400">
              <button
                type="button"
                onClick={handleCreateNew}
                className="w-full px-4 py-3 text-left bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition"
              >
                <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-semibold">
                  <span className="text-xl">+</span>
                  <span>Dodaj nowego klienta: "{searchTerm}"</span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 ml-7">
                  Bez wprowadzenia do systemu nie będzie możliwe utworzenie oferty/zamówienia
                </p>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Selected customer info */}
      {selectedCustomer && (
        <div className="mt-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-500 dark:border-green-400 rounded-lg">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-sm font-semibold text-green-900 dark:text-green-100">
                Wybrany klient:
              </div>
              <div className="text-sm text-green-800 dark:text-green-200 mt-1">
                {selectedCustomer.name}
              </div>
              {(selectedCustomer.email || selectedCustomer.phone) && (
                <div className="text-xs text-green-700 dark:text-green-300 mt-1 space-x-2">
                  {selectedCustomer.email && <span>{selectedCustomer.email}</span>}
                  {selectedCustomer.phone && <span>{selectedCustomer.phone}</span>}
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={handleClear}
              className="text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-200 text-sm"
            >
              Zmień
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
