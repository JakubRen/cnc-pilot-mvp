'use client'

import { useState } from 'react'

export interface FilterState {
  status: string
  deadline: string
  search: string
}

interface OrderFiltersProps {
  onFilterChange: (filters: FilterState) => void
}

export default function OrderFilters({ onFilterChange }: OrderFiltersProps) {
  const [filters, setFilters] = useState<FilterState>({
    status: 'all',
    deadline: 'all',
    search: '',
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
  ].filter(Boolean).length

  const handleClearAll = () => {
    const resetFilters = { status: 'all', deadline: 'all', search: '' }
    setFilters(resetFilters)
    onFilterChange(resetFilters)
  }

  return (
    <div className="bg-slate-800 p-4 rounded-lg border border-slate-700 mb-4">
      {/* Single Row - All filters in one line */}
      <div className="flex gap-3 items-center">
        {/* Search - Smaller */}
        <input
          type="text"
          value={filters.search}
          onChange={(e) => handleChange('search', e.target.value)}
          placeholder="Search..."
          className="flex-1 px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-sm placeholder-slate-500 focus:border-blue-500 focus:outline-none"
        />

        {/* Status Filter - Compact */}
        <select
          value={filters.status}
          onChange={(e) => handleChange('status', e.target.value)}
          className="px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-sm focus:border-blue-500 focus:outline-none"
        >
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="delayed">Delayed</option>
          <option value="cancelled">Cancelled</option>
        </select>

        {/* Deadline Filter - Compact */}
        <select
          value={filters.deadline}
          onChange={(e) => handleChange('deadline', e.target.value)}
          className="px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-sm focus:border-blue-500 focus:outline-none"
        >
          <option value="all">All Deadlines</option>
          <option value="urgent">Urgent (≤ 3 days)</option>
          <option value="overdue">Overdue</option>
          <option value="today">Today</option>
          <option value="this_week">This Week</option>
          <option value="this_month">This Month</option>
          <option value="next_month">Next Month</option>
        </select>

        {/* Clear Filters Button - Compact */}
        {activeFiltersCount > 0 && (
          <button
            onClick={handleClearAll}
            className="px-4 py-2 bg-slate-700 text-white text-sm rounded-lg hover:bg-slate-600 transition whitespace-nowrap"
          >
            Clear ({activeFiltersCount})
          </button>
        )}
      </div>
    </div>
  )
}
