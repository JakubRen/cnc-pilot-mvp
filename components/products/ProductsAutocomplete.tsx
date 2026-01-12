'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

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

  // Fetch products on mount and when category changes
  useEffect(() => {
    async function fetchProducts() {
      setLoading(true)

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setLoading(false)
        return
      }

      const { data: userProfile } = await supabase
        .from('users')
        .select('company_id')
        .eq('auth_id', user.id)
        .single()

      if (!userProfile) {
        setLoading(false)
        return
      }

      let query = supabase
        .from('products')
        .select('id, sku, name, category, unit, description')
        .eq('company_id', userProfile.company_id)
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
  }, [categoryFilter])

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
          ) : filteredProducts.length === 0 ? (
            <div className="px-4 py-3 text-slate-500 dark:text-slate-400">
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
                className={`w-full px-4 py-3 text-left hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors ${
                  highlightedIndex === index
                    ? 'bg-blue-50 dark:bg-slate-700'
                    : ''
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-medium text-slate-900 dark:text-white">
                      📦 {product.name}
                    </div>
                    <div className="text-sm text-slate-500 dark:text-slate-400">
                      SKU: {product.sku}
                    </div>
                  </div>
                  <div className="text-xs text-slate-400 dark:text-slate-500">
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
