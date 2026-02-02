'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Command } from 'cmdk'

interface CommandPaletteProps {
  userRole?: string
}

export default function CommandPalette({ userRole }: CommandPaletteProps) {
  const [open, setOpen] = useState(false)
  const router = useRouter()

  // Toggle command palette with Ctrl+K or Cmd+K
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((open) => !open)
      }
    }

    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [])

  const runCommand = (command: () => void) => {
    setOpen(false)
    command()
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/50 dark:bg-background/80 backdrop-blur-sm">
      <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl">
        <Command className="bg-card border border-border rounded-lg shadow-2xl overflow-hidden">
          <div className="flex items-center border-b border-border px-4">
            <svg
              className="w-5 h-5 text-muted-foreground mr-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <Command.Input
              placeholder="Wpisz komendę lub wyszukaj..."
              className="w-full bg-transparent border-0 py-4 text-foreground placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none text-sm"
              autoFocus
            />
            <kbd className="hidden sm:inline-flex items-center gap-1 rounded border border-border bg-muted px-2 py-1 font-mono text-xs text-muted-foreground">
              ESC
            </kbd>
          </div>

          <Command.List className="max-h-96 overflow-y-auto p-2">
            <Command.Empty className="py-6 text-center text-sm text-muted-foreground">
              Brak wyników
            </Command.Empty>

            {/* Navigation */}
            <Command.Group heading="Nawigacja" className="text-xs font-semibold text-muted-foreground px-2 pt-2 pb-1">
              <Command.Item
                onSelect={() => runCommand(() => router.push('/'))}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-foreground hover:bg-muted cursor-pointer transition"
              >
                <span className="text-lg">📊</span>
                <span>Dashboard</span>
              </Command.Item>
              <Command.Item
                onSelect={() => runCommand(() => router.push('/orders'))}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-foreground hover:bg-muted cursor-pointer transition"
              >
                <span className="text-lg">📦</span>
                <span>Zamówienia</span>
              </Command.Item>
              <Command.Item
                onSelect={() => runCommand(() => router.push('/inventory'))}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-foreground hover:bg-muted cursor-pointer transition"
              >
                <span className="text-lg">🏭</span>
                <span>Magazyn</span>
              </Command.Item>
              <Command.Item
                onSelect={() => runCommand(() => router.push('/documents'))}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-foreground hover:bg-muted cursor-pointer transition"
              >
                <span className="text-lg">📄</span>
                <span>Wydania</span>
              </Command.Item>
              <Command.Item
                onSelect={() => runCommand(() => router.push('/time-tracking'))}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-foreground hover:bg-muted cursor-pointer transition"
              >
                <span className="text-lg">⏱️</span>
                <span>Czas Pracy</span>
              </Command.Item>
              <Command.Item
                onSelect={() => runCommand(() => router.push('/reports'))}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-foreground hover:bg-muted cursor-pointer transition"
              >
                <span className="text-lg">📈</span>
                <span>Raporty</span>
              </Command.Item>
              {(userRole === 'owner' || userRole === 'admin') && (
                <Command.Item
                  onSelect={() => runCommand(() => router.push('/users'))}
                  className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-foreground hover:bg-muted cursor-pointer transition"
                >
                  <span className="text-lg">👥</span>
                  <span>Użytkownicy</span>
                </Command.Item>
              )}
            </Command.Group>

            {/* Quick Actions */}
            <Command.Group heading="Szybkie akcje" className="text-xs font-semibold text-muted-foreground px-2 pt-3 pb-1">
              <Command.Item
                onSelect={() => runCommand(() => router.push('/orders/add'))}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-foreground hover:bg-muted cursor-pointer transition"
              >
                <span className="text-lg">➕</span>
                <span>Nowe Zamówienie</span>
                <kbd className="ml-auto hidden sm:inline-flex items-center gap-1 rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground">
                  N
                </kbd>
              </Command.Item>
              <Command.Item
                onSelect={() => runCommand(() => router.push('/inventory/add'))}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-foreground hover:bg-muted cursor-pointer transition"
              >
                <span className="text-lg">📦</span>
                <span>Nowy Produkt</span>
                <kbd className="ml-auto hidden sm:inline-flex items-center gap-1 rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground">
                  P
                </kbd>
              </Command.Item>
              <Command.Item
                onSelect={() => runCommand(() => router.push('/documents/add'))}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-foreground hover:bg-muted cursor-pointer transition"
              >
                <span className="text-lg">📝</span>
                <span>Nowy Dokument</span>
                <kbd className="ml-auto hidden sm:inline-flex items-center gap-1 rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground">
                  D
                </kbd>
              </Command.Item>
            </Command.Group>

            {/* Settings */}
            <Command.Group heading="Ustawienia" className="text-xs font-semibold text-muted-foreground px-2 pt-3 pb-1">
              <Command.Item
                onSelect={() => runCommand(() => router.push('/profile'))}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-foreground hover:bg-muted cursor-pointer transition"
              >
                <span className="text-lg">👤</span>
                <span>Mój Profil</span>
              </Command.Item>
              {(userRole === 'owner' || userRole === 'admin') && (
                <Command.Item
                  onSelect={() => runCommand(() => router.push('/settings'))}
                  className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-foreground hover:bg-muted cursor-pointer transition"
                >
                  <span className="text-lg">⚙️</span>
                  <span>Ustawienia Firmy</span>
                </Command.Item>
              )}
              <Command.Item
                onSelect={() => runCommand(() => router.push('/notifications'))}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-foreground hover:bg-muted cursor-pointer transition"
              >
                <span className="text-lg">🔔</span>
                <span>Notyfikacje</span>
              </Command.Item>
            </Command.Group>
          </Command.List>

          <div className="border-t border-border p-2 text-xs text-muted-foreground flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <kbd className="rounded bg-secondary px-1.5 py-0.5 text-foreground">↑↓</kbd>
                <span>Nawigacja</span>
              </span>
              <span className="flex items-center gap-1">
                <kbd className="rounded bg-secondary px-1.5 py-0.5 text-foreground">↵</kbd>
                <span>Wybierz</span>
              </span>
              <span className="flex items-center gap-1">
                <kbd className="rounded bg-secondary px-1.5 py-0.5 text-foreground">ESC</kbd>
                <span>Zamknij</span>
              </span>
            </div>
          </div>
        </Command>
      </div>

      {/* Backdrop click to close */}
      <div
        className="fixed inset-0 -z-10"
        onClick={() => setOpen(false)}
      />
    </div>
  )
}
