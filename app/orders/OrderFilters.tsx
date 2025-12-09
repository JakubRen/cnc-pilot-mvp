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
  const { t } = useTranslation()

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
    { value: 'all', label: t('orderStatus', 'all') },
    { value: 'pending', label: t('orderStatus', 'pending') },
    { value: 'in_progress', label: t('orderStatus', 'in_progress') },
    { value: 'completed', label: t('orderStatus', 'completed') },
    { value: 'delayed', label: t('orderStatus', 'delayed') },
    { value: 'cancelled', label: t('orderStatus', 'cancelled') },
  ]

  const deadlineOptions = [
    { value: 'all', label: t('orderFilters', 'allDeadlines') },
    { value: 'urgent', label: t('orderFilters', 'urgent') },
    { value: 'overdue', label: t('orderFilters', 'overdue') },
    { value: 'today', label: t('orderFilters', 'today') },
    { value: 'this_week', label: t('orderFilters', 'thisWeek') },
    { value: 'this_month', label: t('orderFilters', 'thisMonth') },
    { value: 'next_month', label: t('orderFilters', 'nextMonth') },
  ]

  const sortOptions = [
    { value: 'deadline', label: t('orderFilters', 'sortDeadline') },
    { value: 'cost_desc', label: t('orderFilters', 'sortCostHigh') },
    { value: 'cost_asc', label: t('orderFilters', 'sortCostLow') },
    { value: 'created_desc', label: t('orderFilters', 'sortNewest') },
    { value: 'created_asc', label: t('orderFilters', 'sortOldest') },
  ]

  return (
    <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700 mb-4">
      {/* Single Row - All filters in one line */}
      <div className="flex gap-3 items-center flex-wrap">
        {/* Search - Smaller */}
        <Input
          type="text"
          value={filters.search}
          onChange={(e) => handleChange('search', e.target.value)}
          placeholder={t('common', 'search')}
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
            {t('common', 'clear')} ({activeFiltersCount})
          </Button>
        )}
      </div>
    </div>
  )
}