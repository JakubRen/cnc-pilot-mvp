'use client'

import { productCategoryLabels } from '@/types/products'

export interface InventoryFilterState {
  search: string
  category: string
  status: 'all' | 'ok' | 'low' | 'out'
  sortBy: 'name_asc' | 'name_desc' | 'quantity_asc' | 'quantity_desc' | 'sku_asc'
}

export const DEFAULT_INVENTORY_FILTERS: InventoryFilterState = {
  search: '',
  category: 'all',
  status: 'all',
  sortBy: 'name_asc',
}

export function countActiveFilters(filters: InventoryFilterState): number {
  let count = 0
  if (filters.search) count++
  if (filters.category !== 'all') count++
  if (filters.status !== 'all') count++
  if (filters.sortBy !== 'name_asc') count++
  return count
}

export function getActiveFilterLabels(filters: InventoryFilterState): string[] {
  const labels: string[] = []
  if (filters.search) labels.push(`"${filters.search}"`)
  if (filters.category !== 'all') {
    const categoryLabel = productCategoryLabels[filters.category as keyof typeof productCategoryLabels]
    labels.push(categoryLabel || filters.category)
  }
  if (filters.status === 'ok') labels.push('W normie')
  if (filters.status === 'low') labels.push('Niski stan')
  if (filters.status === 'out') labels.push('Brak')
  return labels
}

// Inventory categories - using same categories as Products
const INVENTORY_CATEGORIES = [
  { value: 'all', label: 'Wszystkie' },
  ...Object.entries(productCategoryLabels).map(([value, label]) => ({ value, label })),
]

interface InventoryFiltersProps {
  filters: InventoryFilterState
  onFiltersChange: (filters: InventoryFilterState) => void
  onReset: () => void
}

export default function InventoryFilters({
  filters,
  onFiltersChange,
  onReset,
}: InventoryFiltersProps) {
  const updateFilter = <K extends keyof InventoryFilterState>(
    key: K,
    value: InventoryFilterState[K]
  ) => {
    onFiltersChange({ ...filters, [key]: value })
  }

  return (
    <div className="space-y-6">
      {/* Search */}
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
          Szukaj
        </label>
        <input
          type="text"
          value={filters.search}
          onChange={(e) => updateFilter('search', e.target.value)}
          placeholder="Nazwa lub SKU..."
          className="w-full px-4 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none"
        />
      </div>

      {/* Category */}
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
          Kategoria
        </label>
        <select
          value={filters.category}
          onChange={(e) => updateFilter('category', e.target.value)}
          className="w-full px-4 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none"
        >
          {INVENTORY_CATEGORIES.map((cat) => (
            <option key={cat.value} value={cat.value}>
              {cat.label}
            </option>
          ))}
        </select>
      </div>

      {/* Status */}
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
          Status stanu
        </label>
        <select
          value={filters.status}
          onChange={(e) => updateFilter('status', e.target.value as InventoryFilterState['status'])}
          className="w-full px-4 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none"
        >
          <option value="all">Wszystkie</option>
          <option value="ok">W normie</option>
          <option value="low">Niski stan</option>
          <option value="out">Brak</option>
        </select>
      </div>

      {/* Sort */}
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
          Sortowanie
        </label>
        <div className="space-y-2">
          {[
            { value: 'name_asc', label: 'Nazwa A-Z' },
            { value: 'name_desc', label: 'Nazwa Z-A' },
            { value: 'quantity_asc', label: 'Ilość rosnąco' },
            { value: 'quantity_desc', label: 'Ilość malejąco' },
            { value: 'sku_asc', label: 'SKU A-Z' },
          ].map((option) => (
            <label key={option.value} className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="sortBy"
                value={option.value}
                checked={filters.sortBy === option.value}
                onChange={(e) => updateFilter('sortBy', e.target.value as InventoryFilterState['sortBy'])}
                className="text-blue-600"
              />
              <span className="text-sm text-slate-700 dark:text-slate-300">{option.label}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  )
}
