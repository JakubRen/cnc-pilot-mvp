'use client'

import { useState } from 'react'
import { useKeyboardShortcut, useEscapeKey } from '@/hooks/useKeyboardShortcut'

interface Shortcut {
  keys: string[]
  description: string
  category: string
}

const SHORTCUTS: Shortcut[] = [
  // Navigation
  { keys: ['Ctrl', 'K'], description: 'Otwórz wyszukiwarkę globalną', category: 'Nawigacja' },
  { keys: ['Shift', '?'], description: 'Pokaż skróty klawiszowe', category: 'Nawigacja' },
  { keys: ['Tab'], description: 'Nawigacja między polami', category: 'Nawigacja' },

  // General
  { keys: ['Esc'], description: 'Zamknij modal/dialog', category: 'Ogólne' },
  { keys: ['Enter'], description: 'Wyślij formularz / Zapisz', category: 'Formularze' },

  // Search
  { keys: ['↑', '↓'], description: 'Nawigacja w wyszukiwarce', category: 'Wyszukiwarka' },
  { keys: ['Enter'], description: 'Przejdź do wyniku', category: 'Wyszukiwarka' },
]

export default function KeyboardShortcutsHelp() {
  const [isOpen, setIsOpen] = useState(false)

  // Open with Shift + ? (which is Shift + /)
  useKeyboardShortcut(
    { key: '?', shiftKey: true },
    () => setIsOpen(true)
  )

  // Close with Escape
  useEscapeKey(() => setIsOpen(false), isOpen)

  if (!isOpen) return null

  // Group shortcuts by category
  const categories = Array.from(new Set(SHORTCUTS.map(s => s.category)))

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
        onClick={() => setIsOpen(false)}
      />

      {/* Modal */}
      <div
        role="dialog"
        aria-labelledby="shortcuts-title"
        aria-modal="true"
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-2xl glass-panel border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
          <div>
            <h2 id="shortcuts-title" className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              ⌨️ Skróty Klawiszowe
            </h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
              Używaj skrótów aby szybciej poruszać się po aplikacji
            </p>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            aria-label="Close shortcuts help"
            className="text-slate-400 hover:text-slate-900 dark:hover:text-white transition p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">
                {category}
              </h3>
              <div className="space-y-2">
                {SHORTCUTS.filter(s => s.category === category).map((shortcut, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700"
                  >
                    <span className="text-slate-700 dark:text-slate-300 text-sm">{shortcut.description}</span>
                    <div className="flex items-center gap-1">
                      {shortcut.keys.map((key, keyIdx) => (
                        <kbd
                          key={keyIdx}
                          className="px-3 py-1.5 text-xs font-semibold text-slate-900 dark:text-white bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded shadow-sm"
                        >
                          {key}
                        </kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-200 dark:border-slate-700 bg-blue-50 dark:bg-blue-900/20 rounded-b-xl">
          <p className="text-blue-700 dark:text-blue-200 text-sm">
            💡 <strong>Wskazówka:</strong> Naciśnij <kbd className="px-2 py-1 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded">Shift</kbd> + <kbd className="px-2 py-1 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded">?</kbd> aby otworzyć tę pomoc w dowolnym momencie.
          </p>
        </div>
      </div>
    </>
  )
}
