'use client'

import { useRouter, useSearchParams } from 'next/navigation'

interface CostFiltersProps {
  currentStatus: string
  currentProfitable: string
  currentDays: number
}

export default function CostFilters({ currentStatus, currentProfitable, currentDays }: CostFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const updateFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value === 'all' || value === '30') {
      params.delete(key)
    } else {
      params.set(key, value)
    }
    router.push(`/costs?${params.toString()}`)
  }

  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4 mb-6">
      <div className="flex flex-wrap gap-4 items-center">
        {/* Status Filter */}
        <div>
          <label className="text-slate-700 dark:text-slate-400 text-sm mr-2">Status:</label>
          <select
            value={currentStatus}
            onChange={(e) => updateFilter('status', e.target.value)}
            className="px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none"
          >
            <option value="all">Wszystkie</option>
            <option value="pending">Oczekujące</option>
            <option value="in_progress">W realizacji</option>
            <option value="completed">Ukończone</option>
            <option value="delayed">Opóźnione</option>
            <option value="cancelled">Anulowane</option>
          </select>
        </div>

        {/* Profitability Filter */}
        <div>
          <label className="text-slate-700 dark:text-slate-400 text-sm mr-2">Rentowność:</label>
          <select
            value={currentProfitable}
            onChange={(e) => updateFilter('profitable', e.target.value)}
            className="px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none"
          >
            <option value="all">Wszystkie</option>
            <option value="profitable">Rentowne</option>
            <option value="unprofitable">Nierentowne</option>
          </select>
        </div>

        {/* Days Filter */}
        <div>
          <label className="text-slate-700 dark:text-slate-400 text-sm mr-2">Okres:</label>
          <select
            value={currentDays}
            onChange={(e) => updateFilter('days', e.target.value)}
            className="px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none"
          >
            <option value="7">7 dni</option>
            <option value="14">14 dni</option>
            <option value="30">30 dni</option>
            <option value="60">60 dni</option>
            <option value="90">90 dni</option>
            <option value="365">Rok</option>
          </select>
        </div>

        {/* Reset */}
        {(currentStatus !== 'all' || currentProfitable !== 'all' || currentDays !== 30) && (
          <button
            onClick={() => router.push('/costs')}
            className="px-3 py-2 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition"
          >
            ✕ Wyczyść filtry
          </button>
        )}
      </div>
    </div>
  )
}
