'use client'

import { useState } from 'react'

export type ExportFormat = 'pdf' | 'excel' | 'csv'

interface ExportButtonProps {
  onExport: (format: ExportFormat) => void | Promise<void>
  disabled?: boolean
  className?: string
}

export default function ExportButton({ onExport, disabled, className = '' }: ExportButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [exporting, setExporting] = useState(false)

  const handleExport = async (format: ExportFormat) => {
    setExporting(true)
    setIsOpen(false)
    try {
      await onExport(format)
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled || exporting}
        className={`px-4 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-900 dark:text-white rounded-lg transition flex items-center gap-2 disabled:opacity-50 ${className}`}
      >
        {exporting ? (
          <>
            <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            Eksportowanie...
          </>
        ) : (
          <>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            Eksportuj
          </>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />

          {/* Menu */}
          <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl z-20 overflow-hidden">
            <button
              onClick={() => handleExport('pdf')}
              className="w-full px-4 py-3 text-left text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-700 transition flex items-center gap-3"
            >
              <span className="text-red-400">📄</span>
              <div>
                <p className="font-medium">PDF</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Dokument do druku</p>
              </div>
            </button>
            <button
              onClick={() => handleExport('excel')}
              className="w-full px-4 py-3 text-left text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-700 transition flex items-center gap-3 border-t border-slate-200 dark:border-slate-700"
            >
              <span className="text-green-400">📊</span>
              <div>
                <p className="font-medium">Excel (.xlsx)</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Arkusz kalkulacyjny</p>
              </div>
            </button>
            <button
              onClick={() => handleExport('csv')}
              className="w-full px-4 py-3 text-left text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-700 transition flex items-center gap-3 border-t border-slate-200 dark:border-slate-700"
            >
              <span className="text-blue-400">📋</span>
              <div>
                <p className="font-medium">CSV</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Format tekstowy</p>
              </div>
            </button>
          </div>
        </>
      )}
    </div>
  )
}
