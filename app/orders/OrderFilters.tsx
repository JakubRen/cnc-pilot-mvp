'use client'

import { useState } from 'react'
import { useTranslation } from '@/hooks/useTranslation'

export interface FilterState {
  status: string
  deadline: string
  search: string
  sortBy: string
}

interface OrderFiltersProps {
  onFilterChange: (filters: FilterState) => void
}

export default function OrderFilters({ onFilterChange }: OrderFiltersProps) {
  const { t } = useTranslation()

  const [filters, setFilters] = useState<FilterState>({
    status: 'all',
    deadline: 'all',
    search: '',
    sortBy: 'deadline',
  })

  const handleChange = (key: keyof FilterState, value: string) => {
    const newFilters = { ...filters, [key]: value }
    setFilters(newFilters)
    onFilterChange(newFilters)
  }

  const activeFiltersCount = [
    filters.status !== 'all',
    filters.deadline !== 'all',
    filters.search.length > 0,
    filters.sortBy !== 'deadline',
  ].filter(Boolean).length

  const handleClearAll = () => {
    const resetFilters = { status: 'all', deadline: 'all', search: '', sortBy: 'deadline' }
    setFilters(resetFilters)
    onFilterChange(resetFilters)
  }

  return (
    <div className="bg-slate-800 p-4 rounded-lg border border-slate-700 mb-4">
      {/* Single Row - All filters in one line */}
      <div className="flex gap-3 items-center flex-wrap">
        {/* Search - Smaller */}
        <input
          type="text"
          value={filters.search}
          onChange={(e) => handleChange('search', e.target.value)}
          placeholder={t('common', 'search')}
          className="flex-1 min-w-[150px] px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-sm placeholder-slate-500 focus:border-blue-500 focus:outline-none"
        />

        {/* Status Filter - Compact */}
        <select
          value={filters.status}
          onChange={(e) => handleChange('status', e.target.value)}
          className="px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-sm focus:border-blue-500 focus:outline-none"
        >
          <option value="all">{t('orderStatus', 'all')}</option>
          <option value="pending">{t('orderStatus', 'pending')}</option>
          <option value="in_progress">{t('orderStatus', 'in_progress')}</option>
          <option value="completed">{t('orderStatus', 'completed')}</option>
          <option value="delayed">{t('orderStatus', 'delayed')}</option>
          <option value="cancelled">{t('orderStatus', 'cancelled')}</option>
        </select>

        {/* Deadline Filter - Compact */}
        <select
          value={filters.deadline}
          onChange={(e) => handleChange('deadline', e.target.value)}
          className="px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-sm focus:border-blue-500 focus:outline-none"
        >
          <option value="all">{t('orderFilters', 'allDeadlines')}</option>
          <option value="urgent">{t('orderFilters', 'urgent')}</option>
          <option value="overdue">{t('orderFilters', 'overdue')}</option>
          <option value="today">{t('orderFilters', 'today')}</option>
          <option value="this_week">{t('orderFilters', 'thisWeek')}</option>
          <option value="this_month">{t('orderFilters', 'thisMonth')}</option>
          <option value="next_month">{t('orderFilters', 'nextMonth')}</option>
        </select>

        {/* Sort By - Compact */}
        <select
          value={filters.sortBy}
          onChange={(e) => handleChange('sortBy', e.target.value)}
          className="px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-sm focus:border-blue-500 focus:outline-none"
        >
          <option value="deadline">{t('orderFilters', 'sortDeadline')}</option>
          <option value="cost_desc">{t('orderFilters', 'sortCostHigh')}</option>
          <option value="cost_asc">{t('orderFilters', 'sortCostLow')}</option>
          <option value="created_desc">{t('orderFilters', 'sortNewest')}</option>
          <option value="created_asc">{t('orderFilters', 'sortOldest')}</option>
        </select>

        {/* Clear Filters Button - Compact */}
        {activeFiltersCount > 0 && (
          <button
            onClick={handleClearAll}
            className="px-4 py-2 bg-slate-700 text-white text-sm rounded-lg hover:bg-slate-600 transition whitespace-nowrap"
          >
            {t('common', 'clear')} ({activeFiltersCount})
          </button>
        )}
      </div>
    </div>
  )
}
