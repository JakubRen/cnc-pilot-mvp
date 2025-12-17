'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui/Button'
import AppLayout from '@/components/layout/AppLayout'

interface QuoteDetailsClientProps {
  quote: any
  userProfile: any
}

export default function QuoteDetailsClient({ quote, userProfile }: QuoteDetailsClientProps) {
  const router = useRouter()
  const [isCopying, setIsCopying] = useState(false)

  // Generate portal URL
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const portalUrl = `${baseUrl}/quotes/view/${quote.token}`

  // Generate mailto URL
  const subject = encodeURIComponent(`Oferta ${quote.quote_number}`)
  const emailBody = encodeURIComponent(
    `Dzień dobry,\n\n` +
    `Przesyłam ofertę na zlecenie: ${quote.part_name || 'zlecenie CNC'}\n\n` +
    `Szczegóły oferty:\n${portalUrl}\n\n` +
    `Oferta ważna przez 14 dni.\n\n` +
    `Pozdrawiam,\n${userProfile.full_name}`
  )
  const mailtoUrl = quote.customer_email
    ? `mailto:${quote.customer_email}?subject=${subject}&body=${emailBody}`
    : `mailto:?subject=${subject}&body=${emailBody}`

  // Copy portal link to clipboard
  const handleCopyLink = async () => {
    setIsCopying(true)
    try {
      await navigator.clipboard.writeText(portalUrl)
      toast.success('Link skopiowany do schowka!')
    } catch (error) {
      toast.error('Nie udało się skopiować linku')
    } finally {
      setIsCopying(false)
    }
  }

  // Status badge color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-slate-600'
      case 'sent': return 'bg-blue-600'
      case 'viewed': return 'bg-purple-600'
      case 'accepted': return 'bg-green-600'
      case 'rejected': return 'bg-red-600'
      case 'expired': return 'bg-gray-600'
      default: return 'bg-slate-600'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'draft': return 'Szkic'
      case 'sent': return 'Wysłana'
      case 'viewed': return 'Obejrzana'
      case 'accepted': return 'Zaakceptowana'
      case 'rejected': return 'Odrzucona'
      case 'expired': return 'Wygasła'
      default: return status
    }
  }

  return (
    <AppLayout>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 p-8">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <Link
                href="/quotes"
                className="text-blue-600 dark:text-blue-400 hover:underline mb-2 inline-block"
              >
                ← Wróć do listy ofert
              </Link>
              <h1 className="text-4xl font-bold text-slate-900 dark:text-white">
                {quote.quote_number}
              </h1>
              <p className="text-slate-500 dark:text-slate-400 mt-2">
                Utworzona {new Date(quote.created_at).toLocaleDateString('pl-PL')}
              </p>
            </div>
            <div className="text-right">
              <span className={`px-4 py-2 rounded-full text-white text-sm font-semibold ${getStatusColor(quote.status)}`}>
                {getStatusLabel(quote.status)}
              </span>
            </div>
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Quote Details */}
            <div className="lg:col-span-2 space-y-6">
              {/* Customer Info */}
              <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-6 shadow-lg">
                <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">
                  Informacje o kliencie
                </h2>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-slate-500 dark:text-slate-400 text-sm">Nazwa klienta</p>
                    <p className="text-slate-900 dark:text-white font-medium">{quote.customer_name}</p>
                  </div>
                  {quote.customer_email && (
                    <div>
                      <p className="text-slate-500 dark:text-slate-400 text-sm">Email</p>
                      <p className="text-slate-900 dark:text-white font-medium">{quote.customer_email}</p>
                    </div>
                  )}
                  {quote.customer_phone && (
                    <div>
                      <p className="text-slate-500 dark:text-slate-400 text-sm">Telefon</p>
                      <p className="text-slate-900 dark:text-white font-medium">{quote.customer_phone}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Product Details */}
              <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-6 shadow-lg">
                <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">
                  Szczegóły zlecenia
                </h2>
                <div className="grid grid-cols-2 gap-4">
                  {quote.part_name && (
                    <div>
                      <p className="text-slate-500 dark:text-slate-400 text-sm">Nazwa części</p>
                      <p className="text-slate-900 dark:text-white font-medium">{quote.part_name}</p>
                    </div>
                  )}
                  {quote.material && (
                    <div>
                      <p className="text-slate-500 dark:text-slate-400 text-sm">Materiał</p>
                      <p className="text-slate-900 dark:text-white font-medium">{quote.material}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-slate-500 dark:text-slate-400 text-sm">Ilość</p>
                    <p className="text-slate-900 dark:text-white font-medium">{quote.quantity} szt.</p>
                  </div>
                  {quote.deadline && (
                    <div>
                      <p className="text-slate-500 dark:text-slate-400 text-sm">Termin realizacji</p>
                      <p className="text-slate-900 dark:text-white font-medium">
                        {new Date(quote.deadline).toLocaleDateString('pl-PL')}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Pricing */}
              <div className="bg-gradient-to-br from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 border-2 border-green-500 rounded-lg p-6 shadow-xl">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6 text-center">
                  💰 Cena
                </h2>

                <div className="bg-white dark:bg-slate-800 rounded-lg p-6 mb-6">
                  <div className="text-center">
                    <div className="text-5xl font-bold text-green-600 dark:text-green-400 mb-2">
                      {quote.total_price.toFixed(2)} PLN
                    </div>
                    <div className="text-slate-500 dark:text-slate-400">
                      {quote.price_per_unit?.toFixed(2) || (quote.total_price / quote.quantity).toFixed(2)} PLN / szt.
                    </div>
                    <div className="mt-4 flex items-center justify-center gap-2">
                      <span className="px-3 py-1 bg-blue-600 text-white text-xs font-semibold rounded-full">
                        {quote.pricing_method === 'rule_based' ? 'Kalkulator' :
                         quote.pricing_method === 'historical' ? 'Historia' :
                         'Hybrid'}
                      </span>
                      {quote.confidence_score && (
                        <span className="px-3 py-1 bg-green-600 text-white text-xs font-semibold rounded-full">
                          Pewność: {quote.confidence_score}%
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Breakdown */}
                {quote.breakdown && (
                  <div className="grid grid-cols-2 gap-3 mb-6 text-sm">
                    <div className="bg-white dark:bg-slate-800 rounded p-3">
                      <p className="text-slate-500 dark:text-slate-400">Materiał</p>
                      <p className="text-slate-900 dark:text-white font-semibold">
                        {quote.breakdown.materialCost?.toFixed(2) || 0} PLN
                      </p>
                    </div>
                    <div className="bg-white dark:bg-slate-800 rounded p-3">
                      <p className="text-slate-500 dark:text-slate-400">Robocizna</p>
                      <p className="text-slate-900 dark:text-white font-semibold">
                        {quote.breakdown.laborCost?.toFixed(2) || 0} PLN
                      </p>
                    </div>
                    <div className="bg-white dark:bg-slate-800 rounded p-3">
                      <p className="text-slate-500 dark:text-slate-400">Setup</p>
                      <p className="text-slate-900 dark:text-white font-semibold">
                        {quote.breakdown.setupCost?.toFixed(2) || 0} PLN
                      </p>
                    </div>
                    <div className="bg-white dark:bg-slate-800 rounded p-3">
                      <p className="text-slate-500 dark:text-slate-400">Marża</p>
                      <p className="text-slate-900 dark:text-white font-semibold">
                        {quote.breakdown.marginPercentage || 0}%
                      </p>
                    </div>
                  </div>
                )}

                {/* Reasoning */}
                {quote.reasoning && (
                  <div className="bg-white/50 dark:bg-slate-900/50 rounded-lg p-4">
                    <p className="text-sm text-slate-700 dark:text-slate-300">
                      <strong>Uzasadnienie:</strong> {quote.reasoning}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column - Actions */}
            <div className="space-y-6">
              {/* Portal Link */}
              <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-6 shadow-lg">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                  🔗 Link do portalu klienta
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                  Wyślij ten link klientowi, aby mógł zobaczyć ofertę i ją zaakceptować.
                </p>
                <div className="bg-slate-50 dark:bg-slate-900 rounded p-3 mb-4 break-all text-sm text-slate-700 dark:text-slate-300">
                  {portalUrl}
                </div>
                <Button
                  onClick={handleCopyLink}
                  disabled={isCopying}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {isCopying ? 'Kopiowanie...' : '📋 Kopiuj link'}
                </Button>
              </div>

              {/* Email */}
              <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-6 shadow-lg">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                  📧 Wyślij email
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                  Otwórz Gmail/Outlook z gotowym mailem do klienta.
                </p>
                <a href={mailtoUrl}>
                  <Button className="w-full bg-green-600 hover:bg-green-700 text-white">
                    ✉️ Otwórz Gmail
                  </Button>
                </a>
              </div>

              {/* Print */}
              <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-6 shadow-lg">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                  🖨️ Drukuj ofertę
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                  Drukuj lub zapisz jako PDF (Ctrl+P).
                </p>
                <Button
                  onClick={() => window.print()}
                  className="w-full bg-slate-600 hover:bg-slate-700 text-white"
                >
                  📄 Drukuj
                </Button>
              </div>

              {/* Metadata */}
              <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-6 shadow-lg">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                  ℹ️ Informacje
                </h2>
                <div className="space-y-3 text-sm">
                  <div>
                    <p className="text-slate-500 dark:text-slate-400">Utworzył</p>
                    <p className="text-slate-900 dark:text-white font-medium">
                      {Array.isArray(quote.creator) ? quote.creator[0]?.full_name : quote.creator?.full_name}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-500 dark:text-slate-400">Data utworzenia</p>
                    <p className="text-slate-900 dark:text-white font-medium">
                      {new Date(quote.created_at).toLocaleString('pl-PL')}
                    </p>
                  </div>
                  {quote.expires_at && (
                    <div>
                      <p className="text-slate-500 dark:text-slate-400">Ważna do</p>
                      <p className="text-slate-900 dark:text-white font-medium">
                        {new Date(quote.expires_at).toLocaleDateString('pl-PL')}
                      </p>
                    </div>
                  )}
                  {quote.accepted_at && (
                    <div>
                      <p className="text-slate-500 dark:text-slate-400">Zaakceptowana</p>
                      <p className="text-slate-900 dark:text-white font-medium">
                        {new Date(quote.accepted_at).toLocaleString('pl-PL')}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
