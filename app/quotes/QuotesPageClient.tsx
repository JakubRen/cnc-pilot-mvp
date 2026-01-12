'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import AppLayout from '@/components/layout/AppLayout'
import { Button } from '@/components/ui/Button'

interface QuotesPageClientProps {
  quotes: any[]
  userProfile: any
}

export default function QuotesPageClient({ quotes, userProfile }: QuotesPageClientProps) {
  const [statusFilter, setStatusFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')

  // Filter quotes
  const filteredQuotes = useMemo(() => {
    return quotes.filter((quote) => {
      // Status filter
      if (statusFilter !== 'all' && quote.status !== statusFilter) {
        return false
      }

      // Search filter (customer name, quote number, part name)
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        const matchesCustomer = quote.customer_name?.toLowerCase().includes(query)
        const matchesNumber = quote.quote_number?.toLowerCase().includes(query)
        const matchesPart = quote.part_name?.toLowerCase().includes(query)
        if (!matchesCustomer && !matchesNumber && !matchesPart) {
          return false
        }
      }

      return true
    })
  }, [quotes, statusFilter, searchQuery])

  // Calculate stats
  const stats = useMemo(() => {
    const total = quotes.length
    const draft = quotes.filter(q => q.status === 'draft').length
    const sent = quotes.filter(q => q.status === 'sent' || q.status === 'viewed').length
    const accepted = quotes.filter(q => q.status === 'accepted').length
    const expired = quotes.filter(q => q.status === 'expired').length

    const totalValue = quotes.reduce((sum, q) => sum + (q.total_price || 0), 0)
    const acceptedValue = quotes.filter(q => q.status === 'accepted').reduce((sum, q) => sum + (q.total_price || 0), 0)

    const sentCount = quotes.filter(q => ['sent', 'viewed', 'accepted', 'rejected'].includes(q.status)).length
    const acceptanceRate = sentCount > 0 ? Math.round((accepted / sentCount) * 100) : 0

    return {
      total,
      draft,
      sent,
      accepted,
      expired,
      totalValue,
      acceptedValue,
      acceptanceRate
    }
  }, [quotes])

  // Status badge
  const getStatusBadge = (status: string) => {
    const badges = {
      draft: { label: 'Szkic', color: 'bg-slate-600' },
      sent: { label: 'Wysłana', color: 'bg-blue-600' },
      viewed: { label: 'Obejrzana', color: 'bg-purple-600' },
      accepted: { label: 'Zaakceptowana', color: 'bg-green-600' },
      rejected: { label: 'Odrzucona', color: 'bg-red-600' },
      expired: { label: 'Wygasła', color: 'bg-gray-600' },
    }
    const badge = badges[status as keyof typeof badges] || { label: status, color: 'bg-slate-600' }
    return (
      <span className={`px-3 py-1 rounded-full text-white text-xs font-semibold ${badge.color}`}>
        {badge.label}
      </span>
    )
  }

  return (
    <AppLayout>
      <div className="p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">📋 Oferty</h1>
              <p className="text-slate-400">Zarządzaj ofertami cenowymi</p>
            </div>
            <Link href="/quotes/add">
              <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                + Nowa Oferta
              </Button>
            </Link>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
              <div className="text-slate-400 text-sm mb-2">Wszystkie oferty</div>
              <div className="text-3xl font-bold text-white">{stats.total}</div>
            </div>
            <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
              <div className="text-slate-400 text-sm mb-2">Wysłane/Obejrzane</div>
              <div className="text-3xl font-bold text-blue-400">{stats.sent}</div>
            </div>
            <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
              <div className="text-slate-400 text-sm mb-2">Zaakceptowane</div>
              <div className="text-3xl font-bold text-green-400">{stats.accepted}</div>
              <div className="text-slate-500 text-xs mt-2">
                {stats.acceptanceRate}% acceptance rate
              </div>
            </div>
            <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
              <div className="text-slate-400 text-sm mb-2">Wartość zaakceptowanych</div>
              <div className="text-2xl font-bold text-green-400">
                {stats.acceptedValue.toFixed(0)} PLN
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Search */}
              <div>
                <label className="block text-slate-300 text-sm mb-2">Szukaj</label>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Klient, numer oferty, część..."
                  className="w-full px-4 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white focus:border-blue-500 focus:outline-none"
                />
              </div>

              {/* Status filter */}
              <div>
                <label className="block text-slate-300 text-sm mb-2">Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white focus:border-blue-500 focus:outline-none"
                >
                  <option value="all">Wszystkie statusy</option>
                  <option value="draft">Szkic</option>
                  <option value="sent">Wysłana</option>
                  <option value="viewed">Obejrzana</option>
                  <option value="accepted">Zaakceptowana</option>
                  <option value="rejected">Odrzucona</option>
                  <option value="expired">Wygasła</option>
                </select>
              </div>
            </div>

            <div className="mt-4 text-slate-400 text-sm">
              Wyświetlanie {filteredQuotes.length} z {quotes.length} ofert
            </div>
          </div>

          {/* Quotes Table */}
          {filteredQuotes.length === 0 ? (
            <div className="bg-slate-800 border border-slate-700 rounded-lg p-12 text-center">
              <div className="text-6xl mb-4">📋</div>
              <h2 className="text-2xl font-bold text-white mb-2">Brak ofert</h2>
              <p className="text-slate-400 mb-6">
                {quotes.length === 0
                  ? 'Nie masz jeszcze żadnych ofert. Utwórz pierwszą!'
                  : 'Brak ofert spełniających kryteria filtrowania.'}
              </p>
              {quotes.length === 0 && (
                <Link href="/quotes/add">
                  <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                    + Utwórz pierwszą ofertę
                  </Button>
                </Link>
              )}
            </div>
          ) : (
            <div className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-900 border-b border-slate-700">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase">
                        Numer
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase">
                        Klient
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase">
                        Część
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase">
                        Cena
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase">
                        Status
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase">
                        Data
                      </th>
                      <th className="px-6 py-4 text-right text-xs font-semibold text-slate-400 uppercase">
                        Akcje
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700">
                    {filteredQuotes.map((quote) => (
                      <tr
                        key={quote.id}
                        className="hover:bg-slate-700/50 transition-colors"
                      >
                        <td className="px-6 py-4">
                          <Link
                            href={`/quotes/${quote.id}`}
                            className="text-blue-400 hover:text-blue-300 font-medium"
                          >
                            {quote.quote_number}
                          </Link>
                        </td>
                        <td className="px-6 py-4 text-white">
                          {quote.customer_name}
                        </td>
                        <td className="px-6 py-4 text-slate-300">
                          {quote.part_name || '-'}
                        </td>
                        <td className="px-6 py-4 text-white font-semibold">
                          {quote.total_price.toFixed(2)} PLN
                        </td>
                        <td className="px-6 py-4">
                          {getStatusBadge(quote.status)}
                        </td>
                        <td className="px-6 py-4 text-slate-300 text-sm">
                          {new Date(quote.created_at).toLocaleDateString('pl-PL')}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Link href={`/quotes/${quote.id}`}>
                            <Button
                              variant="secondary"
                              className="text-sm px-4 py-2"
                            >
                              Zobacz
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  )
}
