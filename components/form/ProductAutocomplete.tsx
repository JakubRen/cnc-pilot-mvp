'use client'

import { useState, useRef, useEffect } from 'react'

interface Product {
  id: string
  sku: string
  name: string
  category: string | null
  unit: string | null
}

interface ProductAutocompleteProps {
  value: string
  onChange: (value: string) => void
  products: Product[]
  error?: string
  placeholder?: string
}

export default function ProductAutocomplete({
  value,
  onChange,
  products,
  error,
  placeholder = 'Wybierz produkt...',
}: ProductAutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const wrapperRef = useRef<HTMLDivElement>(null)

  // Find selected product
  const selectedProduct = products.find(p => p.id === value)

  // Filter products based on search term
  const filteredProducts = products.filter((product) => {
    const search = searchTerm.toLowerCase()
    return (
      product.sku.toLowerCase().includes(search) ||
      product.name.toLowerCase().includes(search)
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

  const handleSelect = (product: Product) => {
    onChange(product.id)
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
      {/* Display selected product or search input */}
      {selectedProduct && !isOpen ? (
        <div className="flex items-center justify-between w-full px-4 py-2 rounded-lg bg-card border border-border">
          <div className="flex-1">
            <div className="text-foreground font-medium">
              {selectedProduct.sku} - {selectedProduct.name}
            </div>
            <div className="text-xs text-muted-foreground">
              {selectedProduct.unit || 'szt'}
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setIsOpen(true)}
              className="text-violet-500 hover:text-violet-400 text-sm font-medium"
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
          className={`w-full px-4 py-2 rounded-lg bg-card border ${
            error
              ? 'border-red-500 focus:border-red-500'
              : 'border-border focus:border-violet-500'
          } text-foreground focus:outline-none`}
          autoComplete="off"
        />
      )}

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 max-h-60 overflow-y-auto bg-card border border-border rounded-lg shadow-lg">
          {filteredProducts.length > 0 ? (
            <>
              {filteredProducts.map((product) => (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => handleSelect(product)}
                  className="w-full px-4 py-2 text-left hover:bg-muted transition"
                >
                  <div className="text-foreground font-medium">
                    {product.sku} - {product.name}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {product.unit || 'szt'}
                  </div>
                </button>
              ))}
            </>
          ) : (
            <div className="px-4 py-3 text-sm text-muted-foreground">
              Nie znaleziono produktów
            </div>
          )}
        </div>
      )}
    </div>
  )
}
