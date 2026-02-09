'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/card'
import type { Customer, ContractorType } from '@/types/customers'
import AppLayout from '@/components/layout/AppLayout'

interface CustomerScoreInfo {
  tier: string
  label: string
  icon: string
  color: string
  orderCount: number
  totalRevenue: number
}

interface CustomersPageClientProps {
  customers: Customer[]
  currentUserRole: string
  customerScores: Record<string, CustomerScoreInfo>
}

const typeLabels: Record<ContractorType, { label: string; icon: string; color: string }> = {
  client: { label: 'Klient', icon: '👤', color: 'bg-violet-600' },
  supplier: { label: 'Sprzedawca', icon: '📦', color: 'bg-purple-600' },
  cooperator: { label: 'Kooperant', icon: '🤝', color: 'bg-green-600' },
}

export default function CustomersPageClient({ customers, currentUserRole, customerScores }: CustomersPageClientProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState<ContractorType | 'all'>('all')

  // Filter customers by search term and type
  const filteredCustomers = customers.filter(customer => {
    const matchesSearch = customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.nip?.includes(searchTerm) ||
      customer.phone?.includes(searchTerm)

    const matchesType = typeFilter === 'all' || customer.type === typeFilter

    return matchesSearch && matchesType
  })

  const canAdd = ['owner', 'admin', 'manager'].includes(currentUserRole)

  return (
    <AppLayout>
      <div className="min-h-screen bg-background p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-4xl font-bold text-foreground mb-2">
                👥 Kontrahenci
              </h1>
              <p className="text-muted-foreground">
                Zarządzaj bazą kontrahentów: klienci, sprzedawcy, kooperanci
              </p>
            </div>
            {canAdd && (
              <Link href="/customers/add">
                <Button className="bg-green-600 hover:bg-green-700">
                  + Dodaj kontrahenta
                </Button>
              </Link>
            )}
          </div>

          {/* Search & Filters */}
          <Card className="mb-6">
            <CardContent className="p-6 space-y-4">
              <input
                type="text"
                placeholder="Szukaj po nazwie, email, NIP, telefonie..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-3 rounded-lg bg-muted border border-border text-foreground focus:border-violet-500 focus:outline-none"
              />

              {/* Type Filter */}
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => setTypeFilter('all')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                    typeFilter === 'all'
                      ? 'bg-slate-900 dark:bg-muted text-white'
                      : 'bg-muted text-foreground hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  Wszystkie
                </button>
                <button
                  onClick={() => setTypeFilter('client')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                    typeFilter === 'client'
                      ? 'bg-violet-600 text-white'
                      : 'bg-muted text-foreground hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  👤 Klienci
                </button>
                <button
                  onClick={() => setTypeFilter('supplier')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                    typeFilter === 'supplier'
                      ? 'bg-purple-600 text-white'
                      : 'bg-muted text-foreground hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  📦 Sprzedawcy
                </button>
                <button
                  onClick={() => setTypeFilter('cooperator')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                    typeFilter === 'cooperator'
                      ? 'bg-green-600 text-white'
                      : 'bg-muted text-foreground hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  🤝 Kooperanci
                </button>
              </div>
            </CardContent>
          </Card>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardContent className="p-6">
                <div className="text-muted-foreground text-sm mb-1">
                  👤 Klienci
                </div>
                <div className="text-3xl font-bold text-primary">
                  {customers.filter(c => c.type === 'client').length}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="text-muted-foreground text-sm mb-1">
                  📦 Sprzedawcy
                </div>
                <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                  {customers.filter(c => c.type === 'supplier').length}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="text-muted-foreground text-sm mb-1">
                  🤝 Kooperanci
                </div>
                <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                  {customers.filter(c => c.type === 'cooperator').length}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="text-muted-foreground text-sm mb-1">
                  Wyniki
                </div>
                <div className="text-3xl font-bold text-foreground">
                  {filteredCustomers.length}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Customers List */}
          {filteredCustomers.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <div className="text-6xl mb-4">👥</div>
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  {searchTerm || typeFilter !== 'all' ? 'Brak wyników' : 'Brak kontrahentów'}
                </h3>
                <p className="text-muted-foreground mb-6">
                  {searchTerm || typeFilter !== 'all'
                    ? 'Spróbuj zmienić kryteria wyszukiwania lub filtry'
                    : 'Dodaj pierwszego kontrahenta aby rozpocząć'
                  }
                </p>
                {!searchTerm && typeFilter === 'all' && canAdd && (
                  <Link href="/customers/add">
                    <Button className="bg-green-600 hover:bg-green-700">
                      + Dodaj pierwszego kontrahenta
                    </Button>
                  </Link>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {filteredCustomers.map(customer => (
                <Link key={customer.id} href={`/customers/${customer.id}`}>
                  <Card className="hover:border-violet-500 dark:hover:border-violet-400 transition cursor-pointer">
                    <CardContent className="p-6">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-xl font-semibold text-foreground">
                              {customer.name}
                            </h3>
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold text-white ${typeLabels[customer.type].color}`}>
                              {typeLabels[customer.type].icon} {typeLabels[customer.type].label}
                            </span>
                            {customerScores[customer.id] && (
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${customerScores[customer.id].color}`}>
                                {customerScores[customer.id].icon} {customerScores[customer.id].label}
                              </span>
                            )}
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                            {customer.email && (
                              <div>
                                <span className="text-muted-foreground">Email:</span>
                                <span className="ml-2 text-foreground">
                                  {customer.email}
                                </span>
                              </div>
                            )}
                            {customer.phone && (
                              <div>
                                <span className="text-muted-foreground">Telefon:</span>
                                <span className="ml-2 text-foreground">
                                  {customer.phone}
                                </span>
                              </div>
                            )}
                            {customer.nip && (
                              <div>
                                <span className="text-muted-foreground">NIP:</span>
                                <span className="ml-2 text-foreground">
                                  {customer.nip}
                                </span>
                              </div>
                            )}
                          </div>
                          {customer.city && (
                            <div className="text-sm text-muted-foreground mt-2">
                              📍 {customer.city}
                              {customer.country && customer.country !== 'Polska' && `, ${customer.country}`}
                            </div>
                          )}
                        </div>
                        <div className="text-muted-foreground">
                          →
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  )
}
