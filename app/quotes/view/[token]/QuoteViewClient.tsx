'use client'

import { useState } from 'react'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui/Button'

interface QuoteViewClientProps {
  quote: any
  isExpired: boolean
}

export default function QuoteViewClient({ quote, isExpired }: QuoteViewClientProps) {
  const [isAccepting, setIsAccepting] = useState(false)
  const [acceptedLocally, setAcceptedLocally] = useState(false)

  const handleAccept = async () => {
    setIsAccepting(true)
    const loadingToast = toast.loading('Akceptuję ofertę...')

    try {
      const response = await fetch('/api/quotes/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: quote.token })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Nie udało się zaakceptować oferty')
      }

      toast.dismiss(loadingToast)
      toast.success('Oferta zaakceptowana! Dziękujemy.')
      setAcceptedLocally(true)

      // Refresh page to show updated status
      setTimeout(() => {
        window.location.reload()
      }, 1500)
    } catch (error) {
      toast.dismiss(loadingToast)
      toast.error(error instanceof Error ? error.message : 'Błąd akceptacji')
    } finally {
      setIsAccepting(false)
    }
  }

  const isAccepted = quote.status === 'accepted' || acceptedLocally

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-block mb-4">
            <div className="text-6xl mb-2">📋</div>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-2">
            Oferta {quote.quote_number}
          </h1>
          <p className="text-slate-500">
            od <strong>{quote.companies?.name || 'Firma CNC'}</strong>
          </p>
        </div>

        {/* Status Badges */}
        {isExpired && (
          <div className="bg-red-50 border-2 border-red-500 rounded-lg p-4 mb-6 text-center">
            <p className="text-red-600 font-semibold">
              ⚠️ Ta oferta wygasła {new Date(quote.expires_at).toLocaleDateString('pl-PL')}
            </p>
            <p className="text-red-500 text-sm mt-2">
              Skontaktuj się z firmą, aby otrzymać nową ofertę.
            </p>
          </div>
        )}

        {isAccepted && (
          <div className="bg-green-50 border-2 border-green-500 rounded-lg p-4 mb-6 text-center">
            <p className="text-green-600 font-semibold text-lg">
              ✅ Oferta zaakceptowana!
            </p>
            <p className="text-green-600 text-sm mt-2">
              Dziękujemy za akceptację. Wkrótce skontaktujemy się w sprawie realizacji.
            </p>
            {quote.accepted_at && (
              <p className="text-green-500 text-xs mt-2">
                Zaakceptowano: {new Date(quote.accepted_at).toLocaleString('pl-PL')}
              </p>
            )}
          </div>
        )}

        {/* Quote Details Card */}
        <div className="bg-white border border-slate-200 rounded-lg shadow-xl mb-6">
          {/* Customer Info */}
          <div className="p-6 border-b border-slate-200">
            <h2 className="text-xl font-semibold text-slate-900 mb-4">Dla klienta</h2>
            <p className="text-2xl font-bold text-slate-900">{quote.customer_name}</p>
          </div>

          {/* Product Details */}
          <div className="p-6 border-b border-slate-200">
            <h2 className="text-xl font-semibold text-slate-900 mb-4">Szczegóły zlecenia</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {quote.part_name && (
                <div>
                  <p className="text-slate-500 text-sm">Nazwa części</p>
                  <p className="text-slate-900 font-medium">{quote.part_name}</p>
                </div>
              )}
              {quote.material && (
                <div>
                  <p className="text-slate-500 text-sm">Materiał</p>
                  <p className="text-slate-900 font-medium">{quote.material}</p>
                </div>
              )}
              <div>
                <p className="text-slate-500 text-sm">Ilość</p>
                <p className="text-slate-900 font-medium">{quote.quantity} szt.</p>
              </div>
              {quote.deadline && (
                <div>
                  <p className="text-slate-500 text-sm">Termin realizacji</p>
                  <p className="text-slate-900 font-medium">
                    {new Date(quote.deadline).toLocaleDateString('pl-PL')}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Price - BIG */}
          <div className="p-8 bg-gradient-to-br from-green-50 to-blue-50">
            <div className="text-center mb-6">
              <p className="text-slate-500 text-sm mb-2">Cena całkowita</p>
              <p className="text-5xl md:text-6xl font-bold text-green-600 mb-2">
                {quote.total_price.toFixed(2)} PLN
              </p>
              <p className="text-slate-500">
                {quote.price_per_unit?.toFixed(2) || (quote.total_price / quote.quantity).toFixed(2)} PLN / szt.
              </p>
            </div>

            {/* Breakdown */}
            {quote.breakdown && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                <div className="bg-white rounded p-3 text-center">
                  <p className="text-slate-500 text-xs mb-1">Materiał</p>
                  <p className="text-slate-900 font-semibold text-sm">
                    {quote.breakdown.materialCost?.toFixed(2) || 0} PLN
                  </p>
                </div>
                <div className="bg-white rounded p-3 text-center">
                  <p className="text-slate-500 text-xs mb-1">Robocizna</p>
                  <p className="text-slate-900 font-semibold text-sm">
                    {quote.breakdown.laborCost?.toFixed(2) || 0} PLN
                  </p>
                </div>
                <div className="bg-white rounded p-3 text-center">
                  <p className="text-slate-500 text-xs mb-1">Setup</p>
                  <p className="text-slate-900 font-semibold text-sm">
                    {quote.breakdown.setupCost?.toFixed(2) || 0} PLN
                  </p>
                </div>
                <div className="bg-white rounded p-3 text-center">
                  <p className="text-slate-500 text-xs mb-1">Marża</p>
                  <p className="text-slate-900 font-semibold text-sm">
                    {quote.breakdown.marginPercentage || 0}%
                  </p>
                </div>
              </div>
            )}

            {/* Reasoning */}
            {quote.reasoning && (
              <div className="bg-white/70 rounded-lg p-4">
                <p className="text-sm text-slate-700">
                  <strong className="text-slate-900">Uzasadnienie wyceny:</strong>
                  <br />
                  {quote.reasoning}
                </p>
              </div>
            )}
          </div>

          {/* Footer Info */}
          <div className="p-6 bg-slate-50 text-center text-sm text-slate-600">
            <p className="mb-2">
              <strong>Oferta ważna do:</strong>{' '}
              {quote.expires_at ? new Date(quote.expires_at).toLocaleDateString('pl-PL') : 'Bez terminu'}
            </p>
            <p className="text-xs text-slate-500">
              Wygenerowano: {new Date(quote.created_at).toLocaleDateString('pl-PL')}
            </p>
          </div>
        </div>

        {/* Actions */}
        {!isExpired && !isAccepted && (
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <Button
              onClick={handleAccept}
              disabled={isAccepting}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-4 text-lg"
            >
              {isAccepting ? 'Akceptuję...' : '✅ Akceptuję ofertę'}
            </Button>
            <Button
              onClick={() => window.print()}
              variant="secondary"
              className="px-8 py-4"
            >
              📄 Drukuj
            </Button>
          </div>
        )}

        {(isExpired || isAccepted) && (
          <div className="text-center mb-6">
            <Button
              onClick={() => window.print()}
              variant="secondary"
              className="px-8 py-4"
            >
              📄 Drukuj ofertę
            </Button>
          </div>
        )}

        {/* Footer */}
        <div className="text-center text-slate-500 text-sm space-y-2">
          <p>
            Pytania? Skontaktuj się z firmą:{' '}
            <a
              href={`mailto:${quote.customer_email || 'kontakt@firma.pl'}`}
              className="text-blue-600 hover:underline"
            >
              {quote.customer_email || 'kontakt@firma.pl'}
            </a>
          </p>
          <p className="text-xs text-slate-400">
            Portal klienta • {quote.companies?.name || 'CNC-Pilot'}
          </p>
        </div>

        {/* Print-only footer */}
        <div className="hidden print:block mt-8 pt-4 border-t border-slate-200 text-xs text-slate-500">
          <p>Wygenerowano automatycznie przez CNC-Pilot</p>
          <p>Data wydruku: {new Date().toLocaleString('pl-PL')}</p>
        </div>
      </div>
    </div>
  )
}
