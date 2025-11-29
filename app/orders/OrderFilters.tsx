'use client'

import { useState } from 'react'
import { useTranslation } from '@/hooks/useTranslation'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'

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
  const { t, lang } = useTranslation() // Add lang for translations

  const [filters, setFilters] = useState<FilterState>({
    status: 'all',
    deadline: 'all',
    search: '',
    sortBy: 'deadline',
  })

  const handleChange = (key: keyof FilterState, value: string | number) => {
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

  const statusOptions = [
    { value: 'all', label: t('orderStatus', 'all', lang) },
    { value: 'pending', label: t('orderStatus', 'pending', lang) },
    { value: 'in_progress', label: t('orderStatus', 'in_progress', lang) },
    { value: 'completed', label: t('orderStatus', 'completed', lang) },
    { value: 'delayed', label: t('orderStatus', 'delayed', lang) },
    { value: 'cancelled', label: t('orderStatus', 'cancelled', lang) },
  ]

  const deadlineOptions = [
    { value: 'all', label: t('orderFilters', 'allDeadlines', lang) },
    { value: 'urgent', label: t('orderFilters', 'urgent', lang) },
    { value: 'overdue', label: t('orderFilters', 'overdue', lang) },
    { value: 'today', label: t('orderFilters', 'today', lang) },
    { value: 'this_week', label: t('orderFilters', 'thisWeek', lang) },
    { value: 'this_month', label: t('orderFilters', 'thisMonth', lang) },
    { value: 'next_month', label: t('orderFilters', 'nextMonth', lang) },
  ]

  const sortOptions = [
    { value: 'deadline', label: t('orderFilters', 'sortDeadline', lang) },
    { value: 'cost_desc', label: t('orderFilters', 'sortCostHigh', lang) },
    { value: 'cost_asc', label: t('orderFilters', 'sortCostLow', lang) },
    { value: 'created_desc', label: t('orderFilters', 'sortNewest', lang) },
    { value: 'created_asc', label: t('orderFilters', 'sortOldest', lang) },
  ]

  return (
    <div className="bg-slate-800 p-4 rounded-lg border border-slate-700 mb-4">
      {/* Single Row - All filters in one line */}
      <div className="flex gap-3 items-center flex-wrap">
        {/* Search - Smaller */}
        <Input
          type="text"
          value={filters.search}
          onChange={(e) => handleChange('search', e.target.value)}
          placeholder={t('common', 'search', lang)}
          className="flex-1 min-w-[150px]"
        />

        {/* Status Filter - Compact */}
        <div className="w-[180px]">
          <Select
            options={statusOptions}
            value={filters.status}
            onChange={(value) => handleChange('status', value)}
          />
        </div>

        {/* Deadline Filter - Compact */}
        <div className="w-[180px]">
          <Select
            options={deadlineOptions}
            value={filters.deadline}
            onChange={(value) => handleChange('deadline', value)}
          />
        </div>

        {/* Sort By - Compact */}
        <div className="w-[180px]">
          <Select
            options={sortOptions}
            value={filters.sortBy}
            onChange={(value) => handleChange('sortBy', value)}
          />
        </div>

        {/* Clear Filters Button - Compact */}
        {activeFiltersCount > 0 && (
          <Button
            onClick={handleClearAll}
            variant="secondary"
            className="whitespace-nowrap"
          >
            {t('common', 'clear', lang)} ({activeFiltersCount})
          </Button>
        )}
      </div>
    </div>
  )
}