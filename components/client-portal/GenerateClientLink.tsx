'use client'

import { useState } from 'react'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui/Button'

interface GenerateClientLinkProps {
  customerName: string
}

export default function GenerateClientLink({ customerName }: GenerateClientLinkProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [portalUrl, setPortalUrl] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)

  const generateLink = async () => {
    setIsLoading(true)

    try {
      const response = await fetch('/api/client-portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customer_name: customerName }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate link')
      }

      setPortalUrl(data.url)
      setShowModal(true)

      if (data.existing) {
        toast.success('Link dla tego klienta już istnieje')
      } else {
        toast.success('Link wygenerowany pomyślnie!')
      }
    } catch (error) {
      console.error('Error generating link:', error)
      toast.error('Nie udało się wygenerować linku')
    } finally {
      setIsLoading(false)
    }
  }

  const copyToClipboard = async () => {
    if (!portalUrl) return

    try {
      await navigator.clipboard.writeText(portalUrl)
      toast.success('Link skopiowany do schowka!')
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement('textarea')
      textArea.value = portalUrl
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      toast.success('Link skopiowany do schowka!')
    }
  }

  return (
    <>
      <Button
        onClick={generateLink}
        disabled={isLoading}
        variant="primary"
        size="sm"
        className="flex items-center gap-2"
      >
        <span>🔗</span>
        {isLoading ? 'Generowanie...' : 'Link dla klienta'}
      </Button>

      {/* Modal */}
      {showModal && portalUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 max-w-lg w-full mx-4 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Link do portalu klienta</h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-white transition"
              >
                ✕
              </button>
            </div>

            <p className="text-slate-400 text-sm mb-4">
              Wyślij ten link do <span className="text-white font-medium">{customerName}</span>,
              aby mogli śledzić status swoich zamówień.
            </p>

            {/* Link Display */}
            <div className="bg-slate-900 border border-slate-600 rounded-lg p-3 mb-4">
              <code className="text-blue-400 text-sm break-all">{portalUrl}</code>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <Button
                onClick={copyToClipboard}
                variant="primary"
                className="flex-1 flex items-center justify-center gap-2"
              >
                <span>📋</span> Kopiuj link
              </Button>
              <Button
                onClick={() => setShowModal(false)}
                variant="ghost"
              >
                Zamknij
              </Button>
            </div>

            <p className="text-slate-500 text-xs mt-4 text-center">
              Link jest ważny przez 30 dni. Klient nie potrzebuje logowania.
            </p>
          </div>
        </div>
      )}
    </>
  )
}
