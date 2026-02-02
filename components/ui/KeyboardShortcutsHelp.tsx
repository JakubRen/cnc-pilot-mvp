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

interface KeyboardShortcutsHelpProps {
  isOpen?: boolean
  onClose?: () => void
}

export default function KeyboardShortcutsHelp({
  isOpen: externalIsOpen,
  onClose: externalOnClose
}: KeyboardShortcutsHelpProps = {}) {
  const [internalIsOpen, setInternalIsOpen] = useState(false)

  const isOpen = externalIsOpen !== undefined ? externalIsOpen : internalIsOpen
  const handleClose = externalOnClose || (() => setInternalIsOpen(false))

  // Open with Shift + ? (which is Shift + /)
  useKeyboardShortcut(
    { key: '?', shiftKey: true },
    () => externalIsOpen === undefined ? setInternalIsOpen(true) : undefined
  )

  // Close with Escape
  useEscapeKey(handleClose, isOpen)

  if (!isOpen) return null

  // Group shortcuts by category
  const categories = Array.from(new Set(SHORTCUTS.map(s => s.category)))

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
        onClick={handleClose}
      />

      {/* Modal */}
      <div
        role="dialog"
        aria-labelledby="shortcuts-title"
        aria-modal="true"
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-2xl bg-card border border-border rounded-lg shadow-md"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div>
            <h2 id="shortcuts-title" className="text-2xl font-bold text-foreground flex items-center gap-2">
              Skróty Klawiszowe
            </h2>
            <p className="text-muted-foreground text-sm mt-1">
              Używaj skrótów aby szybciej poruszać się po aplikacji
            </p>
          </div>
          <button
            onClick={handleClose}
            aria-label="Close shortcuts help"
            className="text-muted-foreground hover:text-foreground transition p-2 hover:bg-muted rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
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
              <h3 className="text-lg font-semibold text-foreground mb-3">
                {category}
              </h3>
              <div className="space-y-2">
                {SHORTCUTS.filter(s => s.category === category).map((shortcut, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-muted rounded-lg border border-border"
                  >
                    <span className="text-foreground text-sm">{shortcut.description}</span>
                    <div className="flex items-center gap-1">
                      {shortcut.keys.map((key, keyIdx) => (
                        <kbd
                          key={keyIdx}
                          className="px-3 py-1.5 text-xs font-semibold text-foreground bg-card border border-border rounded shadow-sm"
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
        <div className="p-6 border-t border-border bg-accent rounded-b-lg">
          <p className="text-accent-foreground text-sm">
            <strong>Wskazówka:</strong> Naciśnij <kbd className="px-2 py-1 text-xs bg-card border border-border rounded">Shift</kbd> + <kbd className="px-2 py-1 text-xs bg-card border border-border rounded">?</kbd> aby otworzyć tę pomoc w dowolnym momencie.
          </p>
        </div>
      </div>
    </>
  )
}
