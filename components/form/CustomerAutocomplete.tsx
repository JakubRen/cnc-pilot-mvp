'use client'

import { useState, useRef, useEffect } from 'react'

interface Customer {
  id: string
  name: string
  type: 'client' | 'supplier' | 'cooperator'
}

interface CustomerAutocompleteProps {
  value: string
  onChange: (value: string) => void
  customers: Customer[]
  error?: string
  placeholder?: string
}

const typeLabels = {
  client: '👤 Klient',
  supplier: '📦 Sprzedawca',
  cooperator: '🤝 Kooperant'
}

export default function CustomerAutocomplete({
  value,
  onChange,
  customers,
  error,
  placeholder = 'Wpisz nazwę kontrahenta...',
}: CustomerAutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState(value)
  const wrapperRef = useRef<HTMLDivElement>(null)

  // Filter customers based on search term
  const filteredCustomers = customers.filter((customer) => {
    const search = searchTerm.toLowerCase()
    return customer.name.toLowerCase().includes(search)
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

  // Update search term when value changes externally
  useEffect(() => {
    setSearchTerm(value)
  }, [value])

  const handleSelect = (customerName: string) => {
    setSearchTerm(customerName)
    onChange(customerName)
    setIsOpen(false)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setSearchTerm(newValue)
    onChange(newValue)
    setIsOpen(true)
  }

  return (
    <div ref={wrapperRef} className="relative">
      <input
        type="text"
        value={searchTerm}
        onChange={handleInputChange}
        onFocus={() => setIsOpen(true)}
        placeholder={placeholder}
        className={`w-full px-4 py-3 rounded-lg bg-muted border ${
          error
            ? 'border-red-500 focus:border-red-500'
            : 'border-border focus:border-violet-500'
        } text-foreground focus:outline-none`}
        autoComplete="off"
      />

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 max-h-60 overflow-y-auto bg-card border border-border rounded-lg shadow-lg">
          {filteredCustomers.length > 0 ? (
            <>
              {filteredCustomers.map((customer) => (
                <button
                  key={customer.id}
                  type="button"
                  onClick={() => handleSelect(customer.name)}
                  className="w-full px-4 py-2 text-left hover:bg-muted transition"
                >
                  <div className="text-foreground font-medium">
                    {customer.name}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {typeLabels[customer.type]}
                  </div>
                </button>
              ))}
            </>
          ) : (
            <div className="px-4 py-3 text-sm text-muted-foreground">
              {searchTerm.length >= 2
                ? 'Nie znaleziono kontrahenta. Możesz wpisać własną nazwę.'
                : 'Wpisz przynajmniej 2 znaki aby wyszukać'}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
