'use client'

import { useEffect } from 'react'
import { formatShortcut } from '@/hooks/useKeyboardShortcuts'

interface KeyboardShortcutsHelpProps {
  isOpen: boolean
  onClose: () => void
}

interface Shortcut {
  keys: string
  description: string
  category: string
}

const SHORTCUTS: Shortcut[] = [
  // Navigation
  { keys: 'Ctrl+K', description: 'Szukaj zamówień', category: 'Nawigacja' },
  { keys: 'Ctrl+N', description: 'Nowe zamówienie', category: 'Nawigacja' },
  { keys: 'Ctrl+/', description: 'Pokaż skróty klawiszowe', category: 'Nawigacja' },

  // General
  { keys: 'Escape', description: 'Zamknij modalne okno', category: 'Ogólne' },

  // Future shortcuts (commented for now, can be enabled later)
  // { keys: 'Ctrl+S', description: 'Zapisz formularz', category: 'Formularze' },
  // { keys: 'Ctrl+E', description: 'Edytuj zamówienie', category: 'Akcje' },
]

export default function KeyboardShortcutsHelp({ isOpen, onClose }: KeyboardShortcutsHelpProps) {
  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  if (!isOpen) return null

  // Group shortcuts by category
  const categories = Array.from(new Set(SHORTCUTS.map(s => s.category)))

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        role="dialog"
        aria-labelledby="shortcuts-title"
        aria-modal="true"
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-2xl bg-slate-800 border border-slate-700 rounded-lg shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-700">
          <h2 id="shortcuts-title" className="text-2xl font-bold text-white flex items-center gap-2">
            <span>⌨️</span> Skróty klawiszowe
          </h2>
          <button
            onClick={onClose}
            aria-label="Close shortcuts help"
            className="text-slate-400 hover:text-white transition"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[70vh] overflow-y-auto">
          {categories.map((category) => (
            <div key={category} className="mb-6 last:mb-0">
              <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">
                {category}
              </h3>
              <div className="space-y-2">
                {SHORTCUTS.filter(s => s.category === category).map((shortcut, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-slate-900 rounded-lg border border-slate-700"
                  >
                    <span className="text-white">{shortcut.description}</span>
                    <kbd className="px-3 py-1.5 bg-slate-700 text-slate-200 rounded-md font-mono text-sm border border-slate-600">
                      {formatShortcut(shortcut.keys)}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-700 bg-slate-900/50 rounded-b-lg">
          <p className="text-sm text-slate-400 text-center">
            Naciśnij <kbd className="px-2 py-1 bg-slate-700 text-slate-200 rounded text-xs font-mono">Esc</kbd> aby zamknąć
          </p>
        </div>
      </div>
    </>
  )
}
