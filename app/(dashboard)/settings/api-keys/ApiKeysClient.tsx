'use client'

import { useState, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { ConfirmationDialog } from '@/components/ui/ConfirmationDialog'
import { formatDatePL } from '@/lib/pdf/styles'
import type { ApiKey, CreateApiKeyResponse } from '@/lib/mcp/types'

const MAX_KEYS = 5

export default function ApiKeysClient() {
  const [keys, setKeys] = useState<ApiKey[]>([])
  const [loading, setLoading] = useState(true)

  // Generate flow
  const [showGenerateModal, setShowGenerateModal] = useState(false)
  const [keyName, setKeyName] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedKey, setGeneratedKey] = useState<CreateApiKeyResponse | null>(null)
  const [keyCopied, setKeyCopied] = useState(false)
  const [keyConfirmed, setKeyConfirmed] = useState(false)

  // Revoke flow
  const [revokeTarget, setRevokeTarget] = useState<ApiKey | null>(null)
  const [isRevoking, setIsRevoking] = useState(false)

  // Setup guide
  const [showGuide, setShowGuide] = useState(false)

  const fetchKeys = useCallback(async () => {
    try {
      const res = await fetch('/api/settings/api-keys')
      if (!res.ok) throw new Error('Fetch error')
      const data = await res.json()
      setKeys(data)
    } catch {
      toast.error('Nie udalo sie pobrac kluczy API')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchKeys()
  }, [fetchKeys])

  const activeKeyCount = keys.filter((k) => k.is_active).length
  const atLimit = activeKeyCount >= MAX_KEYS

  // --------------------------------------------------
  // Generate new key
  // --------------------------------------------------
  const handleGenerate = async () => {
    if (!keyName.trim()) {
      toast.error('Podaj nazwe klucza')
      return
    }
    setIsGenerating(true)
    try {
      const res = await fetch('/api/settings/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: keyName.trim() }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Blad generowania klucza')
      }
      const result: { key: string; apiKey: ApiKey } = await res.json()
      setGeneratedKey({
        id: result.apiKey.id,
        key: result.key,
        key_prefix: result.apiKey.key_prefix,
        name: result.apiKey.name,
      })
      // Add to list
      setKeys((prev) => [result.apiKey, ...prev])
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Blad generowania klucza')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleCopyKey = async () => {
    if (!generatedKey) return
    try {
      await navigator.clipboard.writeText(generatedKey.key)
      setKeyCopied(true)
      toast.success('Klucz skopiowany do schowka!')
    } catch {
      toast.error('Nie udalo sie skopiowac')
    }
  }

  const closeGenerateModal = () => {
    setShowGenerateModal(false)
    setKeyName('')
    setGeneratedKey(null)
    setKeyCopied(false)
    setKeyConfirmed(false)
  }

  // --------------------------------------------------
  // Revoke key
  // --------------------------------------------------
  const handleRevoke = async () => {
    if (!revokeTarget) return
    setIsRevoking(true)
    try {
      const res = await fetch('/api/settings/api-keys', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: revokeTarget.id }),
      })
      if (!res.ok) throw new Error('Blad uniewaznania klucza')
      setKeys((prev) =>
        prev.map((k) => (k.id === revokeTarget.id ? { ...k, is_active: false } : k))
      )
      toast.success('Klucz uniewazniony')
    } catch {
      toast.error('Nie udalo sie uniewazniac klucza')
    } finally {
      setIsRevoking(false)
      setRevokeTarget(null)
    }
  }

  // --------------------------------------------------
  // Render
  // --------------------------------------------------
  return (
    <div className="space-y-6">
      {/* Header + Generate Button */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-muted-foreground text-sm">
            Klucze API pozwalaja zewnetrznym agentom AI (Claude Desktop, Cursor, itp.)
            laczyc sie z Twoim CNC-Pilotem.
          </p>
        </div>
        <div className="relative group">
          <Button
            onClick={() => setShowGenerateModal(true)}
            disabled={atLimit}
            className="whitespace-nowrap"
          >
            + Wygeneruj nowy klucz API
          </Button>
          {atLimit && (
            <div className="absolute right-0 top-full mt-2 w-56 p-2 bg-card border border-border rounded-lg shadow-lg text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition pointer-events-none z-10">
              Osiagnieto limit {MAX_KEYS} kluczy. Uniewaznij nieuzywany klucz aby wygenerowac nowy.
            </div>
          )}
        </div>
      </div>

      {/* Key List */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">Ladowanie...</div>
        ) : keys.length === 0 ? (
          /* Empty state */
          <div className="p-12 text-center">
            <div className="text-5xl mb-4">🔑</div>
            <h3 className="text-lg font-bold text-foreground mb-2">
              Nie masz jeszcze kluczy API
            </h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Wygeneruj pierwszy klucz aby podlaczyc zewnetrznych agentow AI do CNC-Pilota.
            </p>
            <Button onClick={() => setShowGenerateModal(true)}>
              + Wygeneruj pierwszy klucz
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase">
                    Nazwa
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase">
                    Prefiks klucza
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase">
                    Utworzony
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase">
                    Ostatnio uzyty
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase">
                    Status
                  </th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-muted-foreground uppercase">
                    Akcje
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {keys.map((apiKey) => (
                  <tr key={apiKey.id} className="hover:bg-muted/30 transition">
                    <td className="py-3 px-4 text-foreground font-medium">{apiKey.name}</td>
                    <td className="py-3 px-4">
                      <code className="text-xs bg-muted px-2 py-1 rounded font-mono text-foreground">
                        {apiKey.key_prefix}...
                      </code>
                    </td>
                    <td className="py-3 px-4 text-muted-foreground">
                      {formatDatePL(apiKey.created_at)}
                    </td>
                    <td className="py-3 px-4 text-muted-foreground">
                      {apiKey.last_used_at ? formatDatePL(apiKey.last_used_at) : 'Nigdy'}
                    </td>
                    <td className="py-3 px-4">
                      {apiKey.is_active ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                          Aktywny
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                          Uniewazniony
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {apiKey.is_active && (
                        <button
                          onClick={() => setRevokeTarget(apiKey)}
                          className="text-xs text-red-500 hover:text-red-400 font-medium transition"
                        >
                          Uniewaznij
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Quick Setup Guide (collapsible) */}
      <div className="bg-card rounded-lg border border-border">
        <button
          onClick={() => setShowGuide(!showGuide)}
          className="w-full flex items-center justify-between p-6 text-left"
        >
          <div>
            <h3 className="text-lg font-semibold text-foreground">Jak podlaczyc?</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Instrukcja konfiguracji Claude Desktop i testowania polaczenia
            </p>
          </div>
          <svg
            className={`w-5 h-5 text-muted-foreground transition-transform ${showGuide ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {showGuide && (
          <div className="px-6 pb-6 space-y-6 border-t border-border pt-4">
            {/* Claude Desktop config */}
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-2">
                1. Konfiguracja Claude Desktop
              </h4>
              <p className="text-xs text-muted-foreground mb-2">
                Dodaj do pliku <code className="bg-muted px-1 rounded">claude_desktop_config.json</code>:
              </p>
              <pre className="bg-muted rounded-lg p-4 text-xs text-foreground overflow-x-auto font-mono">
{`{
  "mcpServers": {
    "cnc-pilot": {
      "url": "https://twoja-domena.pl/api/mcp",
      "headers": {
        "Authorization": "Bearer TWOJ_KLUCZ_API"
      }
    }
  }
}`}
              </pre>
            </div>

            {/* Curl test */}
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-2">
                2. Test polaczenia (curl)
              </h4>
              <pre className="bg-muted rounded-lg p-4 text-xs text-foreground overflow-x-auto font-mono">
{`curl -X POST https://twoja-domena.pl/api/mcp \\
  -H "Authorization: Bearer TWOJ_KLUCZ_API" \\
  -H "Content-Type: application/json" \\
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'`}
              </pre>
            </div>

            <div className="p-3 bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-700/30 rounded-lg">
              <p className="text-xs text-violet-700 dark:text-violet-300">
                Zamien <code className="bg-violet-100 dark:bg-violet-800/30 px-1 rounded">TWOJ_KLUCZ_API</code> na
                wygenerowany klucz oraz <code className="bg-violet-100 dark:bg-violet-800/30 px-1 rounded">twoja-domena.pl</code> na
                adres Twojej instancji CNC-Pilot.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ================================================= */}
      {/* Generate Key Modal */}
      {/* ================================================= */}
      <Dialog
        isOpen={showGenerateModal}
        onClose={generatedKey ? () => {} : closeGenerateModal}
        title={generatedKey ? 'Klucz wygenerowany' : 'Wygeneruj nowy klucz API'}
        panelClassName="max-w-lg"
      >
        {!generatedKey ? (
          /* Step 1: Name input */
          <div className="mt-4">
            <label className="block text-foreground text-sm font-semibold mb-2">
              Nazwa klucza
            </label>
            <input
              type="text"
              value={keyName}
              onChange={(e) => setKeyName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
              className="w-full px-4 py-2 bg-card border border-border rounded-lg text-foreground placeholder-slate-400 dark:placeholder-slate-500 focus:border-violet-500 focus:outline-none"
              placeholder="np. Claude Desktop, Automatyzacja"
              autoFocus
              maxLength={100}
            />
            <div className="mt-4 flex justify-end gap-3">
              <Button variant="secondary" onClick={closeGenerateModal}>
                Anuluj
              </Button>
              <Button
                onClick={handleGenerate}
                isLoading={isGenerating}
                loadingText="Generowanie..."
                disabled={!keyName.trim()}
              >
                Wygeneruj
              </Button>
            </div>
          </div>
        ) : (
          /* Step 2: Key display (CRITICAL) */
          <div className="mt-4 space-y-4">
            {/* Warning */}
            <div className="flex items-start gap-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-300 dark:border-yellow-700/50 rounded-lg">
              <svg className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                Zapisz ten klucz teraz! Po zamknieciu tego okna nie bedzie mozna go ponownie wyswietlic.
              </p>
            </div>

            {/* Key display */}
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Twoj klucz API</label>
              <div className="relative">
                <code className="block w-full p-3 bg-muted rounded-lg text-sm font-mono text-foreground break-all select-all border border-border">
                  {generatedKey.key}
                </code>
              </div>
            </div>

            {/* Copy button */}
            <Button
              onClick={handleCopyKey}
              className="w-full"
              variant={keyCopied ? 'secondary' : 'primary'}
            >
              {keyCopied ? 'Skopiowano!' : 'Kopiuj do schowka'}
            </Button>

            {/* Confirmation checkbox */}
            <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg hover:bg-muted/50 transition">
              <input
                type="checkbox"
                checked={keyConfirmed}
                onChange={(e) => setKeyConfirmed(e.target.checked)}
                className="w-4 h-4 rounded border-border text-violet-600 focus:ring-violet-500"
              />
              <span className="text-sm text-foreground">
                Potwierdzam, ze zapisalem klucz
              </span>
            </label>

            {/* Close */}
            <div className="flex justify-end">
              <Button
                variant="secondary"
                onClick={closeGenerateModal}
                disabled={!keyConfirmed}
              >
                Zamknij
              </Button>
            </div>
          </div>
        )}
      </Dialog>

      {/* ================================================= */}
      {/* Revoke Confirmation Dialog */}
      {/* ================================================= */}
      <ConfirmationDialog
        isOpen={!!revokeTarget}
        onClose={() => setRevokeTarget(null)}
        onConfirm={handleRevoke}
        title="Uniewaznij klucz API"
        description={`Czy na pewno chcesz uniewazniac klucz "${revokeTarget?.name}"? Wszystkie polaczenia uzywajace tego klucza przestana dzialac.`}
        confirmText="Uniewaznij"
        cancelText="Anuluj"
        variant="danger"
        isLoading={isRevoking}
      />
    </div>
  )
}
