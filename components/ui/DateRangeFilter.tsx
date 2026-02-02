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
    <div className="bg-card border border-border rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <label className="text-sm font-semibold text-muted-foreground">{label}</label>
        {(startDate || endDate) && (
          <button
            onClick={handleClear}
            className="text-xs text-muted-foreground hover:text-foreground transition"
          >
            Wyczyść
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Od</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => handleStartDateChange(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-foreground text-sm focus:border-violet-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Do</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => handleEndDateChange(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-foreground text-sm focus:border-violet-500 focus:outline-none"
          />
        </div>
      </div>

      <div className="border-t border-border pt-3">
        <p className="text-xs text-muted-foreground mb-2">Szybki wybór:</p>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => handleQuickFilter(7)}
            className="px-3 py-1 bg-muted hover:bg-accent text-muted-foreground text-xs rounded-lg transition"
          >
            Ostatnie 7 dni
          </button>
          <button
            onClick={() => handleQuickFilter(30)}
            className="px-3 py-1 bg-muted hover:bg-accent text-muted-foreground text-xs rounded-lg transition"
          >
            Ostatnie 30 dni
          </button>
          <button
            onClick={() => handleQuickFilter(90)}
            className="px-3 py-1 bg-muted hover:bg-accent text-muted-foreground text-xs rounded-lg transition"
          >
            Ostatnie 90 dni
          </button>
        </div>
      </div>
    </div>
  )
}
