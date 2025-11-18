'use client'

import { useState } from 'react'

interface DateRangeFilterProps {
  onFilterChange: (startDate: string, endDate: string) => void
  label?: string
}

export default function DateRangeFilter({ onFilterChange, label = 'Zakres dat' }: DateRangeFilterProps) {
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const handleStartDateChange = (value: string) => {
    setStartDate(value)
    onFilterChange(value, endDate)
  }

  const handleEndDateChange = (value: string) => {
    setEndDate(value)
    onFilterChange(startDate, value)
  }

  const handleClear = () => {
    setStartDate('')
    setEndDate('')
    onFilterChange('', '')
  }

  const handleQuickFilter = (days: number) => {
    const today = new Date()
    const start = new Date()
    start.setDate(today.getDate() - days)

    const startStr = start.toISOString().split('T')[0]
    const endStr = today.toISOString().split('T')[0]

    setStartDate(startStr)
    setEndDate(endStr)
    onFilterChange(startStr, endStr)
  }

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <label className="text-sm font-semibold text-slate-300">{label}</label>
        {(startDate || endDate) && (
          <button
            onClick={handleClear}
            className="text-xs text-slate-400 hover:text-white transition"
          >
            Wyczyść
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <label className="text-xs text-slate-400 mb-1 block">Od</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => handleStartDateChange(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-600 text-white text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="text-xs text-slate-400 mb-1 block">Do</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => handleEndDateChange(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-600 text-white text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>
      </div>

      <div className="border-t border-slate-700 pt-3">
        <p className="text-xs text-slate-400 mb-2">Szybki wybór:</p>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => handleQuickFilter(7)}
            className="px-3 py-1 bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs rounded-lg transition"
          >
            Ostatnie 7 dni
          </button>
          <button
            onClick={() => handleQuickFilter(30)}
            className="px-3 py-1 bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs rounded-lg transition"
          >
            Ostatnie 30 dni
          </button>
          <button
            onClick={() => handleQuickFilter(90)}
            className="px-3 py-1 bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs rounded-lg transition"
          >
            Ostatnie 90 dni
          </button>
        </div>
      </div>
    </div>
  )
}
