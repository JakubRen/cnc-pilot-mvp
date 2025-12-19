'use client'

import { SelectHTMLAttributes } from 'react'

interface TouchSelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  options: { value: string; label: string }[]
}

export function TouchSelect({
  label,
  error,
  options,
  className = '',
  ...props
}: TouchSelectProps) {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
          {label}
        </label>
      )}
      <select
        className={`
          w-full
          min-h-[48px]
          px-4
          py-3
          text-base
          bg-white dark:bg-slate-800
          border border-slate-300 dark:border-slate-600
          rounded-lg
          text-slate-900 dark:text-white
          focus:outline-none
          focus:ring-2
          focus:ring-blue-500
          focus:border-transparent
          disabled:opacity-50
          disabled:cursor-not-allowed
          appearance-none
          bg-no-repeat
          bg-right
          pr-10
          cursor-pointer
          ${error ? 'border-red-500 focus:ring-red-500' : ''}
          ${className}
        `}
        style={{
          backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
          backgroundPosition: 'right 0.75rem center',
          backgroundSize: '1.5em 1.5em',
        }}
        {...props}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && (
        <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  )
}
