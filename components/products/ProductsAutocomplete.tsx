'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useUserProfile } from '@/hooks/useUserProfile'

interface Product {
  id: string
  sku: string
  name: string
  category: string
  unit: string
  description: string | null
}

interface ProductsAutocompleteProps {
  value: string
  onChange: (value: string, product?: Product) => void
  categoryFilter?: 'raw_material' | 'finished_good' | 'semi_finished' | 'tool' | 'consumable' | 'all'
  placeholder?: string
  error?: string
  label?: string
  required?: boolean
  allowCustom?: boolean
}

export default function ProductsAutocomplete({
  value,
  onChange,
  categoryFilter = 'all',
  placeholder = 'Wpisz nazwę produktu...',
  error,
  label,
  required = false,
  allowCustom = true,
}: ProductsAutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState(value)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const { profile } = useUserProfile()

  // Fetch products when profile/category changes
  useEffect(() => {
    async function fetchProducts() {
      if (!profile?.company_id) return
      setLoading(true)

      let query = supabase
        .from('products')
        .select('id, sku, name, category, unit, description')
        .eq('company_id', profile.company_id)
        .eq('is_active', true)
        .order('name')

      if (categoryFilter !== 'all') {
        query = query.eq('category', categoryFilter)
      }

      const { data } = await query
      setProducts(data || [])
      setLoading(false)
    }

    fetchProducts()
  }, [categoryFilter, profile?.company_id])

  // Filter products based on search query
  const filteredProducts = products.filter(product => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      product.name.toLowerCase().includes(query) ||
      product.sku.toLowerCase().includes(query)
    )
  }).slice(0, 10)

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

  // Handle product selection
  const handleSelect = useCallback((product: Product) => {
    setSearchQuery(product.name)
    onChange(product.name, product)
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
          prev < filteredProducts.length - 1 ? prev + 1 : prev
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setHighlightedIndex(prev => (prev > 0 ? prev - 1 : -1))
        break
      case 'Enter':
        e.preventDefault()
        if (highlightedIndex >= 0 && filteredProducts[highlightedIndex]) {
          handleSelect(filteredProducts[highlightedIndex])
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

  // Category labels
  const categoryLabels: Record<string, string> = {
    raw_material: 'Surowiec',
    finished_good: 'Wyrób gotowy',
    semi_finished: 'Półprodukt',
    tool: 'Narzędzie',
    consumable: 'Materiał eksploatacyjny',
  }

  return (
    <div className="relative">
      {label && (
        <label className="block text-foreground mb-2 font-medium">
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
        className={`w-full px-4 py-3 rounded-lg bg-muted border ${
          error
            ? 'border-red-500'
            : 'border-border'
        } text-foreground focus:border-violet-500 focus:outline-none`}
        autoComplete="off"
      />

      {error && (
        <p className="text-red-400 text-sm mt-1">{error}</p>
      )}

      {/* Dropdown */}
      {isOpen && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-1 bg-card border border-border rounded-lg shadow-xl max-h-64 overflow-y-auto"
        >
          {loading ? (
            <div className="px-4 py-3 text-muted-foreground">
              Ładowanie...
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="px-4 py-3 text-muted-foreground">
              {searchQuery ? (
                allowCustom ? (
                  <>Brak wyników. Możesz użyć: &quot;{searchQuery}&quot;</>
                ) : (
                  'Brak wyników w katalogu produktów'
                )
              ) : (
                'Wpisz aby wyszukać...'
              )}
            </div>
          ) : (
            filteredProducts.map((product, index) => (
              <button
                key={product.id}
                type="button"
                onClick={() => handleSelect(product)}
                className={`w-full px-4 py-3 text-left hover:bg-muted transition-colors ${
                  highlightedIndex === index
                    ? 'bg-violet-50 dark:bg-muted'
                    : ''
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-medium text-foreground">
                      📦 {product.name}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      SKU: {product.sku}
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {categoryLabels[product.category] || product.category}
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
