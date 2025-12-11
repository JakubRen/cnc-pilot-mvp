'use client'

import { useState, useRef, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'
import { DashboardPreferences, DASHBOARD_WIDGETS, DEFAULT_DASHBOARD_PREFERENCES } from '@/types/dashboard'
import { useEscapeKey } from '@/hooks/useKeyboardShortcut'
import { logger } from '@/lib/logger'

interface Props {
  isOpen: boolean
  onClose: () => void
  currentPreferences: DashboardPreferences
  userId: number
  onSave: (preferences: DashboardPreferences) => void
}

export default function PersonalizationModal({
  isOpen,
  onClose,
  currentPreferences,
  userId,
  onSave,
}: Props) {
  const [preferences, setPreferences] = useState<DashboardPreferences>(currentPreferences)
  const [isSaving, setIsSaving] = useState(false)
  const modalRef = useRef<HTMLDivElement>(null)
  const saveButtonRef = useRef<HTMLButtonElement>(null)

  // Close modal on Escape key
  useEscapeKey(onClose, isOpen)

  // Focus trap - focus on modal when opened
  useEffect(() => {
    if (isOpen && saveButtonRef.current) {
      saveButtonRef.current.focus()
    }
  }, [isOpen])

  // Handle Enter key to save (when not in checkbox)
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && e.target instanceof HTMLElement && e.target.tagName !== 'INPUT') {
        e.preventDefault()
        handleSave()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, isSaving, preferences])

  if (!isOpen) return null

  const toggleWidget = (key: keyof DashboardPreferences) => {
    setPreferences((prev) => ({
      ...prev,
      [key]: !prev[key],
    }))
  }

  const handleSave = async () => {
    setIsSaving(true)
    const loadingToast = toast.loading('Zapisuję preferencje...')

    try {
      const { error } = await supabase
        .from('users')
        .update({ dashboard_preferences: preferences })
        .eq('id', userId)

      if (error) throw error

      toast.dismiss(loadingToast)
      toast.success('Preferencje zapisane!')
      onSave(preferences)
      onClose()
    } catch (error) {
      toast.dismiss(loadingToast)
      toast.error('Błąd zapisu: ' + (error as Error).message)
      logger.error('Error saving dashboard preferences', { error })
    } finally {
      setIsSaving(false)
    }
  }

  const handleReset = () => {
    setPreferences(DEFAULT_DASHBOARD_PREFERENCES)
    toast.success('Preferencje zresetowane do domyślnych')
  }

  const enabledCount = Object.values(preferences).filter(Boolean).length

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
        onClick={onClose}
      ></div>

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="p-6 border-b border-slate-200 dark:border-slate-700">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                  ⚙️ Personalizuj Dashboard
                </h2>
                <p className="text-slate-500 dark:text-slate-400 text-sm">
                  Wybierz, które widgety mają być widoczne na dashboardzie
                </p>
              </div>
              <button
                onClick={onClose}
                className="text-slate-400 hover:text-slate-900 dark:hover:text-white transition p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            <div className="mt-4 flex items-center gap-2">
              <div className="text-sm text-slate-500 dark:text-slate-400">
                Włączone widgety: <span className="text-slate-900 dark:text-white font-semibold">{enabledCount}</span> / {DASHBOARD_WIDGETS.length}
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-240px)]">
            <div className="space-y-3">
              {DASHBOARD_WIDGETS.map((widget) => (
                <label
                  key={widget.key}
                  className={`flex items-start gap-4 p-4 rounded-lg border-2 cursor-pointer transition ${
                    preferences[widget.key]
                      ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-500 dark:border-blue-600 hover:border-blue-400 dark:hover:border-blue-500'
                      : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={preferences[widget.key]}
                    onChange={() => toggleWidget(widget.key)}
                    className="mt-1 w-5 h-5 rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-600 focus:ring-offset-white dark:focus:ring-offset-slate-800"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-2xl">{widget.icon}</span>
                      <span className="text-slate-900 dark:text-white font-semibold">{widget.label}</span>
                    </div>
                    <p className="text-slate-500 dark:text-slate-400 text-sm">{widget.description}</p>
                  </div>
                </label>
              ))}
            </div>

            {/* Info */}
            <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700/50 rounded-lg p-4">
              <p className="text-blue-700 dark:text-blue-200 text-sm">
                ℹ️ <strong>Wskazówka:</strong> Możesz ukryć widgety, które nie są Ci potrzebne, aby dashboard był bardziej przejrzysty.
                Preferencje są zapisywane w bazie danych i będą synchronizowane między urządzeniami.
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-slate-200 dark:border-slate-700 flex gap-3">
            <button
              ref={saveButtonRef}
              onClick={handleSave}
              disabled={isSaving}
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold transition shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-slate-800"
            >
              {isSaving ? 'Zapisuję...' : '✓ Zapisz Preferencje'}
            </button>
            <button
              onClick={handleReset}
              disabled={isSaving}
              className="px-6 py-3 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-white rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed font-semibold transition"
            >
              Resetuj
            </button>
            <button
              onClick={onClose}
              className="px-6 py-3 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-white rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 font-semibold transition"
            >
              Anuluj
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
