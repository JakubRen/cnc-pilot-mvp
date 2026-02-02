'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/card'
import AppLayout from '@/components/layout/AppLayout'
import type { Customer, ContractorType } from '@/types/customers'
import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/logger'
import toast from 'react-hot-toast'
import { useConfirmation } from '@/components/ui/ConfirmationDialog'
import { Breadcrumbs } from '@/components/ui/Breadcrumbs'

interface CustomerDetailsClientProps {
  customer: Customer
  quotes: any[]
  orders: any[]
  currentUserRole: string
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
    <AppLayout>
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
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
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column - Customer Details */}
            <div className="lg:col-span-1 space-y-6">
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
                  </div>
                </CardContent>
              </Card>

              {/* Address */}
              {(customer.street || customer.city || customer.postal_code || customer.country) && (
                <Card>
                  <CardContent className="p-6">
                    <h2 className="text-xl font-semibold text-foreground mb-4 border-b border-border pb-2">
                      Adres
                    </h2>
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
                  </CardContent>
                </Card>
              )}

              {/* Notes */}
              {customer.notes && (
                <Card>
                  <CardContent className="p-6">
                    <h2 className="text-xl font-semibold text-foreground mb-4 border-b border-border pb-2">
                      Notatki
                    </h2>
                    <p className="text-foreground whitespace-pre-wrap">
                      {customer.notes}
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Right Column - Related Data */}
            <div className="lg:col-span-2 space-y-6">
              {/* Quotes */}
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

              {/* Orders */}
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
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
