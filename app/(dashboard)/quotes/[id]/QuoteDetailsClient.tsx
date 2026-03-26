'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { saveAs } from 'file-saver'
import { Button } from '@/components/ui/Button'
import { sanitizeFileName } from '@/lib/pdf/styles'

interface QuoteItem {
  id: string
  part_name: string
  material: string
  quantity: number
  unit_price: number
  total_price: number
  complexity: string
  notes: string | null
}

interface QuoteDetailsClientProps {
  quote: any
  quoteItems: QuoteItem[]
  userProfile: any
}

export default function QuoteDetailsClient({ quote, quoteItems, userProfile }: QuoteDetailsClientProps) {
  const router = useRouter()
  const [isCopying, setIsCopying] = useState(false)
  const [isConverting, setIsConverting] = useState(false)
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false)

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

  // Convert quote to order
  const handleConvertToOrder = async () => {
    if (quote.converted_order_id) {
      toast.error('Ta oferta została już przekonwertowana na zamówienie')
      return
    }

    setIsConverting(true)
    const loadingToast = toast.loading('Tworzenie zamówienia...')

    try {
      const response = await fetch('/api/quotes/convert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quote_id: quote.id })
      })

      const result = await response.json()

      toast.dismiss(loadingToast)

      if (!response.ok) {
        toast.error(result.error || 'Nie udało się utworzyć zamówienia')
        return
      }

      toast.success(`Zamówienie ${result.order.order_number} utworzone!`)
      router.push(`/orders/${result.order.id}`)
      router.refresh()
    } catch (error) {
      toast.dismiss(loadingToast)
      toast.error('Błąd połączenia z serwerem')
    } finally {
      setIsConverting(false)
    }
  }

  // Download PDF
  const handleDownloadPdf = async () => {
    setIsDownloadingPdf(true)
    try {
      const response = await fetch(`/api/pdf/quote/${quote.id}`)
      if (!response.ok) throw new Error('Nie udalo sie wygenerowac PDF')
      const blob = await response.blob()
      const fileName = `Wycena_${quote.quote_number}_${sanitizeFileName(quote.customer_name)}.pdf`
      saveAs(blob, fileName)
      toast.success('PDF pobrany!')
    } catch (error) {
      toast.error('Blad generowania PDF')
    } finally {
      setIsDownloadingPdf(false)
    }
  }

  // Status badge color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-slate-600'
      case 'sent': return 'bg-violet-600'
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
<div className="min-h-screen bg-background p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link
              href="/quotes"
              className="text-primary hover:underline mb-2 inline-block"
            >
              ← Wróć do listy ofert
            </Link>
            <h1 className="text-4xl font-bold text-foreground">
              {quote.quote_number}
            </h1>
            <p className="text-muted-foreground mt-2">
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
            <div className="bg-card border border-border rounded-lg p-6 shadow-lg">
              <h2 className="text-xl font-semibold text-foreground mb-4">
                Informacje o kliencie
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-muted-foreground text-sm">Nazwa klienta</p>
                  <p className="text-foreground font-medium">{quote.customer_name}</p>
                </div>
                {quote.customer_email && (
                  <div>
                    <p className="text-muted-foreground text-sm">Email</p>
                    <p className="text-foreground font-medium">{quote.customer_email}</p>
                  </div>
                )}
                {quote.customer_phone && (
                  <div>
                    <p className="text-muted-foreground text-sm">Telefon</p>
                    <p className="text-foreground font-medium">{quote.customer_phone}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Product Details */}
            <div className="bg-card border border-border rounded-lg p-6 shadow-lg">
              <h2 className="text-xl font-semibold text-foreground mb-4">
                {quoteItems.length > 0 ? `Pozycje oferty (${quoteItems.length})` : 'Szczegóły zlecenia'}
              </h2>

              {/* Multi-item view */}
              {quoteItems.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-muted border-b border-border">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Nazwa</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Materiał</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Ilość</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase">Cena/szt.</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase">Suma</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                      {quoteItems.map((item) => (
                        <tr key={item.id} className="hover:bg-muted dark:hover:bg-slate-700/50">
                          <td className="px-4 py-3 text-foreground font-medium">{item.part_name}</td>
                          <td className="px-4 py-3 text-muted-foreground">{item.material || '-'}</td>
                          <td className="px-4 py-3 text-muted-foreground">{item.quantity} szt.</td>
                          <td className="px-4 py-3 text-right text-muted-foreground">{item.unit_price?.toFixed(2)} PLN</td>
                          <td className="px-4 py-3 text-right text-foreground font-semibold">{item.total_price?.toFixed(2)} PLN</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                /* Single item view (Express Quote) */
                <div className="grid grid-cols-2 gap-4">
                  {quote.part_name && (
                    <div>
                      <p className="text-muted-foreground text-sm">Nazwa części</p>
                      <p className="text-foreground font-medium">{quote.part_name}</p>
                    </div>
                  )}
                  {quote.material && (
                    <div>
                      <p className="text-muted-foreground text-sm">Materiał</p>
                      <p className="text-foreground font-medium">{quote.material}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-muted-foreground text-sm">Ilość</p>
                    <p className="text-foreground font-medium">{quote.quantity} szt.</p>
                  </div>
                  {quote.deadline && (
                    <div>
                      <p className="text-muted-foreground text-sm">Termin realizacji</p>
                      <p className="text-foreground font-medium">
                        {new Date(quote.deadline).toLocaleDateString('pl-PL')}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Deadline (if multi-item and has deadline) */}
              {quoteItems.length > 0 && quote.deadline && (
                <div className="mt-4 pt-4 border-t border-border">
                  <p className="text-muted-foreground text-sm">Termin realizacji</p>
                  <p className="text-foreground font-medium">
                    {new Date(quote.deadline).toLocaleDateString('pl-PL')}
                  </p>
                </div>
              )}
            </div>

            {/* Pricing */}
            <div className="bg-gradient-to-br from-green-50 to-violet-50 dark:from-green-900/20 dark:to-violet-900/20 border-2 border-green-500 rounded-lg p-6 shadow-xl">
              <h2 className="text-2xl font-bold text-foreground mb-6 text-center">
                💰 Cena
              </h2>

              <div className="bg-card rounded-lg p-6 mb-6">
                <div className="text-center">
                  <div className="text-5xl font-bold text-green-600 dark:text-green-400 mb-2">
                    {quote.total_price.toFixed(2)} PLN
                  </div>
                  <div className="text-muted-foreground">
                    {quote.price_per_unit?.toFixed(2) || (quote.total_price / quote.quantity).toFixed(2)} PLN / szt.
                  </div>
                  <div className="mt-4 flex items-center justify-center gap-2">
                    <span className="px-3 py-1 bg-violet-600 text-white text-xs font-semibold rounded-full">
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
                  <div className="bg-card rounded p-3">
                    <p className="text-muted-foreground">Materiał</p>
                    <p className="text-foreground font-semibold">
                      {quote.breakdown.materialCost?.toFixed(2) || 0} PLN
                    </p>
                  </div>
                  <div className="bg-card rounded p-3">
                    <p className="text-muted-foreground">Robocizna</p>
                    <p className="text-foreground font-semibold">
                      {quote.breakdown.laborCost?.toFixed(2) || 0} PLN
                    </p>
                  </div>
                  <div className="bg-card rounded p-3">
                    <p className="text-muted-foreground">Setup</p>
                    <p className="text-foreground font-semibold">
                      {quote.breakdown.setupCost?.toFixed(2) || 0} PLN
                    </p>
                  </div>
                  <div className="bg-card rounded p-3">
                    <p className="text-muted-foreground">Marża</p>
                    <p className="text-foreground font-semibold">
                      {quote.breakdown.marginPercentage || 0}%
                    </p>
                  </div>
                </div>
              )}

              {/* Reasoning */}
              {quote.reasoning && (
                <div className="bg-white/50/50 rounded-lg p-4">
                  <p className="text-sm text-foreground">
                    <strong>Uzasadnienie:</strong> {quote.reasoning}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Actions */}
          <div className="space-y-6">
            {/* Convert to Order */}
            <div className="bg-card border border-border rounded-lg p-6 shadow-lg">
              <h2 className="text-lg font-semibold text-foreground mb-4">
                📦 Zamówienie
              </h2>
              {quote.converted_order_id ? (
                <div>
                  <p className="text-sm text-green-600 dark:text-green-400 mb-4">
                    ✅ Zamówienie zostało utworzone
                  </p>
                  <Link href={`/orders/${quote.converted_order_id}`}>
                    <Button className="w-full bg-green-600 hover:bg-green-700 text-white">
                      Zobacz zamówienie →
                    </Button>
                  </Link>
                </div>
              ) : (
                <div>
                  <p className="text-sm text-muted-foreground mb-4">
                    Utwórz zamówienie na podstawie tej oferty.
                  </p>
                  <Button
                    onClick={handleConvertToOrder}
                    disabled={isConverting}
                    className="w-full bg-violet-600 hover:bg-violet-700 text-white"
                  >
                    {isConverting ? 'Tworzenie...' : '➕ Utwórz zamówienie'}
                  </Button>
                </div>
              )}
            </div>

            {/* Portal Link */}
            <div className="bg-card border border-border rounded-lg p-6 shadow-lg">
              <h2 className="text-lg font-semibold text-foreground mb-4">
                🔗 Link do portalu klienta
              </h2>
              <p className="text-sm text-muted-foreground mb-4">
                Wyślij ten link klientowi, aby mógł zobaczyć ofertę i ją zaakceptować.
              </p>
              <div className="bg-muted rounded p-3 mb-4 break-all text-sm text-foreground">
                {portalUrl}
              </div>
              <Button
                onClick={handleCopyLink}
                disabled={isCopying}
                className="w-full bg-violet-600 hover:bg-violet-700 text-white"
              >
                {isCopying ? 'Kopiowanie...' : '📋 Kopiuj link'}
              </Button>
            </div>

            {/* Email */}
            <div className="bg-card border border-border rounded-lg p-6 shadow-lg">
              <h2 className="text-lg font-semibold text-foreground mb-4">
                📧 Wyślij email
              </h2>
              <p className="text-sm text-muted-foreground mb-4">
                Otwórz Gmail/Outlook z gotowym mailem do klienta.
              </p>
              <a href={mailtoUrl}>
                <Button className="w-full bg-green-600 hover:bg-green-700 text-white">
                  ✉️ Otwórz Gmail
                </Button>
              </a>
            </div>

            {/* PDF Download */}
            <div className="bg-card border border-border rounded-lg p-6 shadow-lg">
              <h2 className="text-lg font-semibold text-foreground mb-4">
                📄 Pobierz PDF
              </h2>
              <p className="text-sm text-muted-foreground mb-4">
                Pobierz profesjonalny dokument PDF z logo firmy.
              </p>
              <Button
                onClick={handleDownloadPdf}
                disabled={isDownloadingPdf}
                isLoading={isDownloadingPdf}
                loadingText="Generowanie..."
                className="w-full bg-violet-600 hover:bg-violet-700 text-white mb-2"
              >
                📄 Pobierz PDF
              </Button>
              <Button
                onClick={() => window.print()}
                variant="outline"
                className="w-full"
              >
                🖨️ Drukuj
              </Button>
            </div>

            {/* Metadata */}
            <div className="bg-card border border-border rounded-lg p-6 shadow-lg">
              <h2 className="text-lg font-semibold text-foreground mb-4">
                ℹ️ Informacje
              </h2>
              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-muted-foreground">Utworzył</p>
                  <p className="text-foreground font-medium">
                    {Array.isArray(quote.creator) ? quote.creator[0]?.full_name : quote.creator?.full_name}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Data utworzenia</p>
                  <p className="text-foreground font-medium">
                    {new Date(quote.created_at).toLocaleString('pl-PL')}
                  </p>
                </div>
                {quote.expires_at && (
                  <div>
                    <p className="text-muted-foreground">Ważna do</p>
                    <p className="text-foreground font-medium">
                      {new Date(quote.expires_at).toLocaleDateString('pl-PL')}
                    </p>
                  </div>
                )}
                {quote.accepted_at && (
                  <div>
                    <p className="text-muted-foreground">Zaakceptowana</p>
                    <p className="text-foreground font-medium">
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
)
}
