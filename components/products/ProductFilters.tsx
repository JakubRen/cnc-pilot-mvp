'use client'

import { ProductCategory, ProductUnit, productCategoryLabels, productUnitLabels } from '@/types/products'

export interface ProductFilterState {
  search: string
  category: ProductCategory | 'all'
  unit: ProductUnit | 'all'
  sortBy: 'name_asc' | 'name_desc' | 'stock_asc' | 'stock_desc'
}

export const DEFAULT_PRODUCT_FILTERS: ProductFilterState = {
  search: '',
  category: 'all',
  unit: 'all',
  sortBy: 'name_asc',
}

interface ProductFiltersProps {
  filters: ProductFilterState
  onFiltersChange: (filters: ProductFilterState) => void
}

const SORT_OPTIONS = [
  { value: 'name_asc', label: 'Nazwa A-Z', icon: '↑' },
  { value: 'name_desc', label: 'Nazwa Z-A', icon: '↓' },
  { value: 'stock_desc', label: 'Stan malejąco', icon: '↓' },
  { value: 'stock_asc', label: 'Stan rosnąco', icon: '↑' },
] as const

export default function ProductFilters({ filters, onFiltersChange }: ProductFiltersProps) {
  const updateFilter = <K extends keyof ProductFilterState>(
    key: K,
    value: ProductFilterState[K]
  ) => {
    onFiltersChange({ ...filters, [key]: value })
  }

  return (
    <div className="space-y-6">
      {/* Search */}
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
          🔍 Szukaj
        </label>
        <div className="relative">
          <input
            type="text"
            value={filters.search}
            onChange={(e) => updateFilter('search', e.target.value)}
            placeholder="Nazwa lub SKU..."
            className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          {filters.search && (
            <button
              onClick={() => updateFilter('search', '')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Category */}
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
          📁 Kategoria
        </label>
        <select
          value={filters.category}
          onChange={(e) => updateFilter('category', e.target.value as ProductCategory | 'all')}
          className="w-full px-4 py-2.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="all">Wszystkie kategorie</option>
          {Object.entries(productCategoryLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {/* Unit */}
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
          📏 Jednostka
        </label>
        <select
          value={filters.unit}
          onChange={(e) => updateFilter('unit', e.target.value as ProductUnit | 'all')}
          className="w-full px-4 py-2.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="all">Wszystkie jednostki</option>
          {Object.entries(productUnitLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {/* Sort */}
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
          ↕️ Sortowanie
        </label>
        <div className="space-y-2">
          {SORT_OPTIONS.map((option) => (
            <label
              key={option.value}
              className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition ${
                filters.sortBy === option.value
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50'
              }`}
            >
              <input
                type="radio"
                name="sortBy"
                value={option.value}
                checked={filters.sortBy === option.value}
                onChange={(e) => updateFilter('sortBy', e.target.value as ProductFilterState['sortBy'])}
                className="w-4 h-4 text-blue-600 focus:ring-blue-500"
              />
              <span className="flex-1 text-slate-700 dark:text-slate-300">
                {option.label}
              </span>
              <span className="text-slate-400 text-lg">{option.icon}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  )
}

// Helper to count active filters
export function countActiveFilters(filters: ProductFilterState): number {
  let count = 0
  if (filters.search) count++
  if (filters.category !== 'all') count++
  if (filters.unit !== 'all') count++
  if (filters.sortBy !== 'name_asc') count++ // default is name_asc
  return count
}

// Helper to get active filter labels for badges
export function getActiveFilterLabels(filters: ProductFilterState): { key: keyof ProductFilterState; label: string }[] {
  const labels: { key: keyof ProductFilterState; label: string }[] = []

  if (filters.search) {
    labels.push({ key: 'search', label: `"${filters.search}"` })
  }
  if (filters.category !== 'all') {
    labels.push({ key: 'category', label: productCategoryLabels[filters.category] })
  }
  if (filters.unit !== 'all') {
    labels.push({ key: 'unit', label: productUnitLabels[filters.unit] })
  }
  if (filters.sortBy !== 'name_asc') {
    const sortOption = SORT_OPTIONS.find(o => o.value === filters.sortBy)
    if (sortOption) {
      labels.push({ key: 'sortBy', label: sortOption.label })
    }
  }

  return labels
}
