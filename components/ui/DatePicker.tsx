'use client'

import { useState, useRef, useEffect } from 'react'
import { DayPicker } from 'react-day-picker'
import { format, parse, isValid } from 'date-fns'
import { pl } from 'date-fns/locale'
import './datepicker.css'

interface DatePickerProps {
  value: string // ISO date string (YYYY-MM-DD)
  onChange: (value: string) => void
  label?: string
  placeholder?: string
  error?: string
  required?: boolean
  minDate?: Date
  maxDate?: Date
}

export default function DatePicker({
  value,
  onChange,
  label,
  placeholder = 'Wybierz datę...',
  error,
  required = false,
  minDate,
  maxDate,
}: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)

  // Parse the value to Date object
  const selectedDate = value ? parse(value, 'yyyy-MM-dd', new Date()) : undefined
  const isSelectedValid = selectedDate && isValid(selectedDate)

  // Sync input value with prop
  useEffect(() => {
    if (isSelectedValid) {
      setInputValue(format(selectedDate, 'dd.MM.yyyy'))
    } else {
      setInputValue('')
    }
  }, [value, isSelectedValid, selectedDate])

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Handle date selection from calendar
  const handleSelect = (date: Date | undefined) => {
    if (date) {
      onChange(format(date, 'yyyy-MM-dd'))
      setIsOpen(false)
    }
  }

  // Handle manual input
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setInputValue(val)

    // Try to parse date in Polish format (dd.MM.yyyy)
    if (val.length === 10) {
      const parsed = parse(val, 'dd.MM.yyyy', new Date())
      if (isValid(parsed)) {
        onChange(format(parsed, 'yyyy-MM-dd'))
      }
    }
  }

  // Clear date
  const handleClear = () => {
    onChange('')
    setInputValue('')
  }

  return (
    <div ref={containerRef} className="relative">
      {label && (
        <label className="block text-slate-700 dark:text-slate-300 mb-2 font-medium">
          {label} {required && '*'}
        </label>
      )}

      <div className="relative">
        <input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          className={`w-full px-4 py-3 pr-20 rounded-lg bg-slate-50 dark:bg-slate-900 border ${
            error
              ? 'border-red-500'
              : 'border-slate-200 dark:border-slate-700'
          } text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none`}
        />

        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {value && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              title="Wyczyść"
            >
              ✕
            </button>
          )}
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="p-1.5 text-slate-400 hover:text-blue-500"
            title="Otwórz kalendarz"
          >
            📅
          </button>
        </div>
      </div>

      {error && (
        <p className="text-red-400 text-sm mt-1">{error}</p>
      )}

      {/* Calendar Dropdown */}
      {isOpen && (
        <div className="absolute z-50 mt-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl p-4">
          <DayPicker
            mode="single"
            selected={isSelectedValid ? selectedDate : undefined}
            onSelect={handleSelect}
            locale={pl}
            disabled={[
              ...(minDate ? [{ before: minDate }] : []),
              ...(maxDate ? [{ after: maxDate }] : []),
            ]}
          />

          {/* Quick select buttons */}
          <div className="flex gap-2 mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => handleSelect(new Date())}
              className="flex-1 px-3 py-2 text-sm bg-slate-100 dark:bg-slate-700 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
            >
              Dziś
            </button>
            <button
              type="button"
              onClick={() => {
                const date = new Date()
                date.setDate(date.getDate() + 7)
                handleSelect(date)
              }}
              className="flex-1 px-3 py-2 text-sm bg-slate-100 dark:bg-slate-700 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
            >
              +7 dni
            </button>
            <button
              type="button"
              onClick={() => {
                const date = new Date()
                date.setDate(date.getDate() + 14)
                handleSelect(date)
              }}
              className="flex-1 px-3 py-2 text-sm bg-slate-100 dark:bg-slate-700 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
            >
              +14 dni
            </button>
            <button
              type="button"
              onClick={() => {
                const date = new Date()
                date.setMonth(date.getMonth() + 1)
                handleSelect(date)
              }}
              className="flex-1 px-3 py-2 text-sm bg-slate-100 dark:bg-slate-700 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
            >
              +1 mies.
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
