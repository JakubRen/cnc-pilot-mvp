'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import type { Customer, ContractorType } from '@/types/customers'
import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/logger'
import toast from 'react-hot-toast'
import { useConfirmation } from '@/components/ui/ConfirmationDialog'
import { Breadcrumbs } from '@/components/ui/Breadcrumbs'

interface CustomerScoreInfo {
  tier: string
  label: string
  icon: string
  color: string
  orderCount: number
  totalRevenue: number
}

interface CustomerDetailsClientProps {
  customer: Customer
  quotes: any[]
  orders: any[]
  currentUserRole: string
  customerScore: CustomerScoreInfo
}

const typeLabels: Record<ContractorType, { label: string; icon: string; color: string }> = {
  client: { label: 'Klient', icon: '👤', color: 'bg-violet-600' },
  supplier: { label: 'Sprzedawca', icon: '📦', color: 'bg-purple-600' },
  cooperator: { label: 'Kooperant', icon: '🤝', color: 'bg-green-600' },
}

export default function CustomerDetailsClient({
  customer,
  quotes,
  orders,
  currentUserRole,
  customerScore,
}: CustomerDetailsClientProps) {
  const router = useRouter()
  const [isDeleting, setIsDeleting] = useState(false)
  const { confirm, ConfirmDialog } = useConfirmation()

  const canEdit = ['owner', 'admin', 'manager'].includes(currentUserRole)
  const canDelete = currentUserRole === 'owner'

  const handleDelete = async () => {
    const confirmed = await confirm({
      title: 'Usunąć kontrahenta?',
      description: `Czy na pewno chcesz usunąć kontrahenta "${customer.name}"? Ta operacja jest nieodwracalna.`,
      confirmText: 'Usuń',
      cancelText: 'Anuluj',
      variant: 'danger',
    })
    if (!confirmed) return

    setIsDeleting(true)
    const loadingToast = toast.loading('Usuwanie kontrahenta...')

    try {
      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', customer.id)

      toast.dismiss(loadingToast)

      if (error) {
        toast.error(`Nie udało się usunąć kontrahenta: ${error.message}`)
        setIsDeleting(false)
        return
      }

      toast.success('Kontrahent usunięty pomyślnie')
      router.push('/customers')
      router.refresh()
    } catch (error) {
      toast.dismiss(loadingToast)
      toast.error('Wystąpił błąd podczas usuwania kontrahenta')
      setIsDeleting(false)
      logger.error('Error deleting customer', { error })
    }
  }

  const totalQuotesValue = quotes.reduce((sum, q) => sum + (q.total_price || 0), 0)

  return (
    <>
    <ConfirmDialog />
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto">
        {/* Breadcrumbs */}
        <Breadcrumbs
          items={[
            { label: 'Dashboard', href: '/' },
            { label: 'Kontrahenci', href: '/customers' },
            { label: customer.name },
          ]}
          className="mb-6"
        />

        {/* Header */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-4xl font-bold text-foreground">
                {customer.name}
              </h1>
              <span className={`px-3 py-1 rounded-full text-sm font-semibold text-white ${typeLabels[customer.type].color}`}>
                {typeLabels[customer.type].icon} {typeLabels[customer.type].label}
              </span>
              <span className={`px-3 py-1 rounded-full text-sm font-bold ${customerScore.color}`}>
                {customerScore.icon} {customerScore.label}
              </span>
            </div>
            <p className="text-muted-foreground">
              Szczegóły kontrahenta
            </p>
          </div>
          {canEdit && (
            <div className="flex gap-3">
              <Link href={`/customers/${customer.id}/edit`}>
                <Button className="bg-violet-600 hover:bg-violet-700">
                  ✏️ Edytuj
                </Button>
              </Link>
              {canDelete && (
                <Button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  variant="secondary"
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  🗑️ Usuń
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="text-muted-foreground text-sm mb-1">
                Liczba ofert
              </div>
              <div className="text-3xl font-bold text-foreground">
                {quotes.length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="text-muted-foreground text-sm mb-1">
                Wartość ofert
              </div>
              <div className="text-3xl font-bold text-foreground">
                {totalQuotesValue.toFixed(2)} PLN
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="text-muted-foreground text-sm mb-1">
                Liczba zamówień
              </div>
              <div className="text-3xl font-bold text-foreground">
                {orders.length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="text-muted-foreground text-sm mb-1">
                Przychód z zamówień
              </div>
              <div className="text-3xl font-bold text-foreground">
                {customerScore.totalRevenue.toFixed(0)} PLN
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="ogolne" className="w-full">
          <TabsList className="mb-6 bg-muted/50 p-1 gap-1">
            <TabsTrigger value="ogolne" className="px-4 py-2">
              📋 Ogólne
            </TabsTrigger>
            <TabsTrigger value="oferty" className="px-4 py-2">
              📝 Oferty ({quotes.length})
            </TabsTrigger>
            <TabsTrigger value="zamowienia" className="px-4 py-2">
              📦 Zamówienia ({orders.length})
            </TabsTrigger>
            <TabsTrigger value="predykcje" className="px-4 py-2">
              🔮 Predykcje
            </TabsTrigger>
          </TabsList>

          {/* TAB: Ogólne */}
          <TabsContent value="ogolne" className="animate-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Contact Info */}
              <Card>
                <CardContent className="p-6">
                  <h2 className="text-xl font-semibold text-foreground mb-4 border-b border-border pb-2">
                    Dane kontaktowe
                  </h2>
                  <div className="space-y-3">
                    {customer.email && (
                      <div>
                        <div className="text-sm text-muted-foreground">Email</div>
                        <a
                          href={`mailto:${customer.email}`}
                          className="text-primary hover:underline"
                        >
                          {customer.email}
                        </a>
                      </div>
                    )}
                    {customer.phone && (
                      <div>
                        <div className="text-sm text-muted-foreground">Telefon</div>
                        <a
                          href={`tel:${customer.phone}`}
                          className="text-foreground"
                        >
                          {customer.phone}
                        </a>
                      </div>
                    )}
                    {customer.nip && (
                      <div>
                        <div className="text-sm text-muted-foreground">NIP</div>
                        <div className="text-foreground">{customer.nip}</div>
                      </div>
                    )}
                    {!customer.email && !customer.phone && !customer.nip && (
                      <div className="text-muted-foreground">Brak danych kontaktowych</div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Address */}
              <Card>
                <CardContent className="p-6">
                  <h2 className="text-xl font-semibold text-foreground mb-4 border-b border-border pb-2">
                    Adres
                  </h2>
                  {(customer.street || customer.city || customer.postal_code || customer.country) ? (
                    <div className="text-foreground space-y-1">
                      {customer.street && <div>{customer.street}</div>}
                      {(customer.postal_code || customer.city) && (
                        <div>
                          {customer.postal_code && `${customer.postal_code} `}
                          {customer.city}
                        </div>
                      )}
                      {customer.country && customer.country !== 'Polska' && (
                        <div>{customer.country}</div>
                      )}
                    </div>
                  ) : (
                    <div className="text-muted-foreground">Brak adresu</div>
                  )}
                </CardContent>
              </Card>

              {/* Notes - full width */}
              <div className="md:col-span-2">
                <Card>
                  <CardContent className="p-6">
                    <h2 className="text-xl font-semibold text-foreground mb-4 border-b border-border pb-2">
                      Notatki
                    </h2>
                    {customer.notes ? (
                      <p className="text-foreground whitespace-pre-wrap">
                        {customer.notes}
                      </p>
                    ) : (
                      <div className="text-muted-foreground">Brak notatek</div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* TAB: Oferty */}
          <TabsContent value="oferty" className="animate-fade-in">
            <Card>
              <CardContent className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold text-foreground">
                    Oferty ({quotes.length})
                  </h2>
                  <Link href={`/quotes/add?customer_id=${customer.id}`}>
                    <Button className="bg-green-600 hover:bg-green-700">
                      + Nowa oferta
                    </Button>
                  </Link>
                </div>
                {quotes.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Brak ofert dla tego klienta
                  </div>
                ) : (
                  <div className="space-y-3">
                    {quotes.map((quote) => (
                      <Link key={quote.id} href={`/quotes/${quote.id}`}>
                        <div className="border border-border rounded-lg p-4 hover:border-violet-500 dark:hover:border-violet-400 transition cursor-pointer">
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="font-semibold text-foreground">
                                {quote.quote_number}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {new Date(quote.created_at).toLocaleDateString('pl-PL')}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-bold text-foreground">
                                {quote.total_price?.toFixed(2)} PLN
                              </div>
                              <div className={`text-xs px-2 py-1 rounded mt-1 inline-block ${
                                quote.status === 'sent' ? 'bg-violet-600' :
                                quote.status === 'accepted' ? 'bg-green-600' :
                                quote.status === 'rejected' ? 'bg-red-600' :
                                'bg-slate-600'
                              } text-white`}>
                                {quote.status}
                              </div>
                            </div>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB: Zamówienia */}
          <TabsContent value="zamowienia" className="animate-fade-in">
            <div className="space-y-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold text-foreground">
                      Zamówienia ({orders.length})
                    </h2>
                    <Link href={`/orders/add?customer_id=${customer.id}`}>
                      <Button className="bg-green-600 hover:bg-green-700">
                        + Nowe zamówienie
                      </Button>
                    </Link>
                  </div>
                  {orders.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      Brak zamówień dla tego klienta
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {orders.map((order) => (
                        <Link key={order.id} href={`/orders/${order.id}`}>
                          <div className="border border-border rounded-lg p-4 hover:border-violet-500 dark:hover:border-violet-400 transition cursor-pointer">
                            <div className="flex justify-between items-start">
                              <div>
                                <div className="font-semibold text-foreground">
                                  {order.order_number}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  {new Date(order.created_at).toLocaleDateString('pl-PL')}
                                </div>
                              </div>
                              <div className="text-right">
                                {order.deadline && (
                                  <div className="text-sm text-muted-foreground">
                                    Termin: {new Date(order.deadline).toLocaleDateString('pl-PL')}
                                  </div>
                                )}
                                <div className={`text-xs px-2 py-1 rounded mt-1 inline-block ${
                                  order.status === 'pending' ? 'bg-yellow-600' :
                                  order.status === 'in_progress' ? 'bg-violet-600' :
                                  order.status === 'completed' ? 'bg-green-600' :
                                  order.status === 'delayed' ? 'bg-red-600' :
                                  'bg-slate-600'
                                } text-white`}>
                                  {order.status}
                                </div>
                              </div>
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* TAB: Predykcje */}
          <TabsContent value="predykcje" className="animate-fade-in">
            {orders.length > 0 ? (
              <PredictionsPanel orders={orders} />
            ) : (
              <Card>
                <CardContent className="p-6">
                  <div className="text-center py-8 text-muted-foreground">
                    Brak zamówień — predykcje wymagają co najmniej 1 zamówienia
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
    </>
  )
}

const MONTH_NAMES = ['Sty', 'Lut', 'Mar', 'Kwi', 'Maj', 'Cze', 'Lip', 'Sie', 'Wrz', 'Paź', 'Lis', 'Gru']

function PredictionsPanel({ orders }: { orders: any[] }) {
  const metrics = useMemo(() => {
    const totalRevenue = orders.reduce((sum, o) => sum + (o.selling_price || 0), 0)
    const dates = orders.map(o => new Date(o.created_at).getTime())
    const firstOrder = Math.min(...dates)
    const lastOrder = Math.max(...dates)
    const now = Date.now()

    // === CLV ===
    const monthsActive = Math.max((now - firstOrder) / (1000 * 60 * 60 * 24 * 30), 1)
    const yearsActive = Math.max(monthsActive / 12, 0.25)
    const daysSinceLastOrder = (now - lastOrder) / (1000 * 60 * 60 * 24)

    const annualValue = totalRevenue / yearsActive
    const churnFactor = daysSinceLastOrder > 90 ? 0.5 : daysSinceLastOrder > 60 ? 0.7 : 1.0
    const lifetimeValue = annualValue * 2.5 * churnFactor
    const clvConfidence: 'high' | 'medium' | 'low' =
      orders.length >= 5 ? 'high' : orders.length >= 2 ? 'medium' : 'low'

    // === Trend ===
    const sixMonthsAgo = now - 1000 * 60 * 60 * 24 * 180
    const twelveMonthsAgo = now - 1000 * 60 * 60 * 24 * 360
    const recentOrders = orders.filter(o => new Date(o.created_at).getTime() >= sixMonthsAgo)
    const olderOrders = orders.filter(o => {
      const t = new Date(o.created_at).getTime()
      return t >= twelveMonthsAgo && t < sixMonthsAgo
    })
    const recentRevenue = recentOrders.reduce((s, o) => s + (o.selling_price || 0), 0)
    const olderRevenue = olderOrders.reduce((s, o) => s + (o.selling_price || 0), 0)
    const trend: 'up' | 'down' | 'stable' =
      olderRevenue === 0 ? 'stable' :
      recentRevenue > olderRevenue * 1.1 ? 'up' :
      recentRevenue < olderRevenue * 0.9 ? 'down' : 'stable'

    // === Średnia wartość zamówienia ===
    const avgOrderValue = totalRevenue / orders.length

    // === Częstotliwość ===
    let avgGapDays = 0
    let frequencyLabel = 'Jednorazowy'
    if (orders.length >= 2) {
      const sorted = [...dates].sort((a, b) => a - b)
      const gaps: number[] = []
      for (let i = 1; i < sorted.length; i++) {
        gaps.push((sorted[i] - sorted[i - 1]) / (1000 * 60 * 60 * 24))
      }
      avgGapDays = gaps.reduce((s, g) => s + g, 0) / gaps.length
      if (avgGapDays <= 2) frequencyLabel = 'Codziennie'
      else if (avgGapDays <= 10) frequencyLabel = 'Co tydzień'
      else if (avgGapDays <= 20) frequencyLabel = 'Co 2 tygodnie'
      else if (avgGapDays <= 45) frequencyLabel = 'Co miesiąc'
      else if (avgGapDays <= 120) frequencyLabel = 'Co kwartał'
      else frequencyLabel = 'Nieregularnie'
    }

    // === Ryzyko churnu ===
    const churnRisk: 'high' | 'medium' | 'low' =
      daysSinceLastOrder > 60 ? 'high' : daysSinceLastOrder > 30 ? 'medium' : 'low'

    // === Rozkład statusów ===
    const statusCounts: Record<string, number> = {}
    for (const o of orders) {
      statusCounts[o.status] = (statusCounts[o.status] || 0) + 1
    }

    // === Sezonowość ===
    const monthCounts = new Array(12).fill(0)
    for (const o of orders) {
      const month = new Date(o.created_at).getMonth()
      monthCounts[month]++
    }
    const maxMonthCount = Math.max(...monthCounts, 1)

    // === Preferowane materiały ===
    const materialCounts: Record<string, number> = {}
    for (const o of orders) {
      if (o.material) {
        materialCounts[o.material] = (materialCounts[o.material] || 0) + 1
      }
    }
    const topMaterials = Object.entries(materialCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)

    // === Średnia ilość sztuk ===
    const quantities = orders.map(o => o.quantity || 0).filter((q: number) => q > 0)
    const avgQuantity = quantities.length > 0
      ? quantities.reduce((s: number, q: number) => s + q, 0) / quantities.length
      : 0
    const productionType = avgQuantity >= 100 ? 'Seryjny' : avgQuantity >= 10 ? 'Małoseria' : 'Prototypy/jednostki'

    // === Marża ===
    const margins = orders.map((o: any) => o.margin_percent).filter((m: any) => m != null && m !== 0)
    const avgMargin = margins.length > 0
      ? margins.reduce((s: number, m: number) => s + m, 0) / margins.length
      : null

    return {
      annualValue, lifetimeValue, clvConfidence, trend, daysSinceLastOrder,
      avgOrderValue, avgGapDays, frequencyLabel,
      churnRisk,
      statusCounts,
      monthCounts, maxMonthCount,
      topMaterials,
      avgQuantity, productionType,
      avgMargin,
    }
  }, [orders])

  const confidenceConfig = {
    high: { label: 'Wysoka', color: 'bg-green-600' },
    medium: { label: 'Średnia', color: 'bg-amber-600' },
    low: { label: 'Niska', color: 'bg-slate-500' },
  }

  const trendConfig = {
    up: { label: 'Rosnący', icon: '📈' },
    down: { label: 'Malejący', icon: '📉' },
    stable: { label: 'Stabilny', icon: '➡️' },
  }

  const churnConfig = {
    high: { label: 'Wysokie', color: 'bg-red-600', desc: 'Nieaktywny >60 dni' },
    medium: { label: 'Średnie', color: 'bg-amber-600', desc: 'Nieaktywny 30-60 dni' },
    low: { label: 'Niskie', color: 'bg-green-600', desc: 'Aktywny <30 dni' },
  }

  const statusLabels: Record<string, { label: string; color: string }> = {
    pending: { label: 'Oczekujące', color: 'bg-yellow-600' },
    in_progress: { label: 'W realizacji', color: 'bg-violet-600' },
    completed: { label: 'Zakończone', color: 'bg-green-600' },
    delayed: { label: 'Opóźnione', color: 'bg-red-600' },
    cancelled: { label: 'Anulowane', color: 'bg-slate-600' },
  }

  return (
    <div className="space-y-6">
      {/* Sekcja 1: CLV */}
      <Card>
        <CardContent className="p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4 border-b border-border pb-2">
            Wartość klienta (CLV)
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-sm text-muted-foreground mb-1">Wartość roczna</div>
              <div className="text-xl font-bold text-foreground">
                {metrics.annualValue.toLocaleString('pl-PL', { maximumFractionDigits: 0 })} PLN
              </div>
              <div className="text-xs text-muted-foreground">/rok</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground mb-1">Wartość życiowa</div>
              <div className="text-xl font-bold text-foreground">
                {metrics.lifetimeValue.toLocaleString('pl-PL', { maximumFractionDigits: 0 })} PLN
              </div>
              <div className="text-xs text-muted-foreground">prognoza 2.5 lat</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground mb-1">Pewność</div>
              <div className="flex items-center gap-2 mt-1">
                <span className={`text-xs px-2 py-1 rounded text-white ${confidenceConfig[metrics.clvConfidence].color}`}>
                  {confidenceConfig[metrics.clvConfidence].label}
                </span>
              </div>
              <div className="text-xs text-muted-foreground mt-1">{orders.length} zamówień</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground mb-1">Trend</div>
              <div className="text-lg">
                {trendConfig[metrics.trend].icon} {trendConfig[metrics.trend].label}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {metrics.daysSinceLastOrder < 1
                  ? 'Dzisiaj'
                  : `${Math.floor(metrics.daysSinceLastOrder)} dni temu`}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sekcja 2: Zachowania zakupowe + Churn */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4 border-b border-border pb-2">
              Zachowania zakupowe
            </h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Śr. wartość zamówienia</span>
                <span className="font-semibold text-foreground">
                  {metrics.avgOrderValue.toLocaleString('pl-PL', { maximumFractionDigits: 0 })} PLN
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Częstotliwość</span>
                <span className="font-semibold text-foreground">
                  {metrics.frequencyLabel}
                  {metrics.avgGapDays > 0 && (
                    <span className="text-xs text-muted-foreground ml-1">
                      (~{Math.round(metrics.avgGapDays)} dni)
                    </span>
                  )}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Typ produkcji</span>
                <span className="font-semibold text-foreground">
                  {metrics.productionType}
                  <span className="text-xs text-muted-foreground ml-1">
                    (~{Math.round(metrics.avgQuantity)} szt)
                  </span>
                </span>
              </div>
              {metrics.avgMargin !== null && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Śr. marża</span>
                  <span className={`font-semibold ${metrics.avgMargin >= 20 ? 'text-green-500' : metrics.avgMargin >= 10 ? 'text-amber-500' : 'text-red-500'}`}>
                    {metrics.avgMargin.toFixed(1)}%
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4 border-b border-border pb-2">
              Ryzyko odejścia
            </h2>
            <div className="flex items-center gap-3 mb-4">
              <span className={`text-sm px-3 py-1.5 rounded text-white font-semibold ${churnConfig[metrics.churnRisk].color}`}>
                {churnConfig[metrics.churnRisk].label}
              </span>
              <span className="text-sm text-muted-foreground">
                {churnConfig[metrics.churnRisk].desc}
              </span>
            </div>
            <div className="text-sm text-muted-foreground space-y-2">
              <div className="flex justify-between">
                <span>Ostatnie zamówienie</span>
                <span className="text-foreground font-medium">
                  {metrics.daysSinceLastOrder < 1
                    ? 'Dzisiaj'
                    : `${Math.floor(metrics.daysSinceLastOrder)} dni temu`}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Współczynnik retencji</span>
                <span className="text-foreground font-medium">
                  {metrics.daysSinceLastOrder > 90 ? '50%' : metrics.daysSinceLastOrder > 60 ? '70%' : '100%'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sekcja 3: Statusy + Materiały */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4 border-b border-border pb-2">
              Rozkład statusów
            </h2>
            <div className="space-y-2">
              {Object.entries(metrics.statusCounts).map(([status, count]) => {
                const config = statusLabels[status] || { label: status, color: 'bg-slate-600' }
                const pct = Math.round((count / orders.length) * 100)
                return (
                  <div key={status}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm text-foreground">{config.label}</span>
                      <span className="text-sm text-muted-foreground">{count} ({pct}%)</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${config.color}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4 border-b border-border pb-2">
              Preferowane materiały
            </h2>
            {metrics.topMaterials.length > 0 ? (
              <div className="space-y-2">
                {metrics.topMaterials.map(([material, count]) => {
                  const pct = Math.round((count / orders.length) * 100)
                  return (
                    <div key={material}>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm text-foreground">{material}</span>
                        <span className="text-sm text-muted-foreground">{count}x ({pct}%)</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div
                          className="h-2 rounded-full bg-violet-600"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-muted-foreground text-sm">Brak danych o materiałach</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Sekcja 4: Sezonowość */}
      <Card>
        <CardContent className="p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4 border-b border-border pb-2">
            Sezonowość zamówień
          </h2>
          <div className="flex items-end gap-1 h-24">
            {metrics.monthCounts.map((count: number, i: number) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full flex items-end justify-center" style={{ height: '64px' }}>
                  <div
                    className={`w-full max-w-[32px] rounded-t ${count > 0 ? 'bg-violet-600' : 'bg-muted'}`}
                    style={{ height: `${Math.max((count / metrics.maxMonthCount) * 64, count > 0 ? 4 : 2)}px` }}
                  />
                </div>
                <span className="text-[10px] text-muted-foreground">{MONTH_NAMES[i]}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
