'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/card'
import type { Customer, ContractorType } from '@/types/customers'
import AppLayout from '@/components/layout/AppLayout'

interface CustomersPageClientProps {
  customers: Customer[]
  currentUserRole: string
}

const typeLabels: Record<ContractorType, { label: string; icon: string; color: string }> = {
  client: { label: 'Klient', icon: '👤', color: 'bg-blue-600' },
  supplier: { label: 'Sprzedawca', icon: '📦', color: 'bg-purple-600' },
  cooperator: { label: 'Kooperant', icon: '🤝', color: 'bg-green-600' },
}

export default function CustomersPageClient({ customers, currentUserRole }: CustomersPageClientProps) {
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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-2">
                👥 Kontrahenci
              </h1>
              <p className="text-slate-500 dark:text-slate-400">
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
                className="w-full px-4 py-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none"
              />

              {/* Type Filter */}
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => setTypeFilter('all')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                    typeFilter === 'all'
                      ? 'bg-slate-900 dark:bg-slate-700 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  Wszystkie
                </button>
                <button
                  onClick={() => setTypeFilter('client')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                    typeFilter === 'client'
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  👤 Klienci
                </button>
                <button
                  onClick={() => setTypeFilter('supplier')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                    typeFilter === 'supplier'
                      ? 'bg-purple-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  📦 Sprzedawcy
                </button>
                <button
                  onClick={() => setTypeFilter('cooperator')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                    typeFilter === 'cooperator'
                      ? 'bg-green-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
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
                <div className="text-slate-500 dark:text-slate-400 text-sm mb-1">
                  👤 Klienci
                </div>
                <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                  {customers.filter(c => c.type === 'client').length}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="text-slate-500 dark:text-slate-400 text-sm mb-1">
                  📦 Sprzedawcy
                </div>
                <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                  {customers.filter(c => c.type === 'supplier').length}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="text-slate-500 dark:text-slate-400 text-sm mb-1">
                  🤝 Kooperanci
                </div>
                <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                  {customers.filter(c => c.type === 'cooperator').length}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="text-slate-500 dark:text-slate-400 text-sm mb-1">
                  Wyniki
                </div>
                <div className="text-3xl font-bold text-slate-900 dark:text-white">
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
                <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
                  {searchTerm || typeFilter !== 'all' ? 'Brak wyników' : 'Brak kontrahentów'}
                </h3>
                <p className="text-slate-500 dark:text-slate-400 mb-6">
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
                  <Card className="hover:border-blue-500 dark:hover:border-blue-400 transition cursor-pointer">
                    <CardContent className="p-6">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-xl font-semibold text-slate-900 dark:text-white">
                              {customer.name}
                            </h3>
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold text-white ${typeLabels[customer.type].color}`}>
                              {typeLabels[customer.type].icon} {typeLabels[customer.type].label}
                            </span>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                            {customer.email && (
                              <div>
                                <span className="text-slate-500 dark:text-slate-400">Email:</span>
                                <span className="ml-2 text-slate-900 dark:text-white">
                                  {customer.email}
                                </span>
                              </div>
                            )}
                            {customer.phone && (
                              <div>
                                <span className="text-slate-500 dark:text-slate-400">Telefon:</span>
                                <span className="ml-2 text-slate-900 dark:text-white">
                                  {customer.phone}
                                </span>
                              </div>
                            )}
                            {customer.nip && (
                              <div>
                                <span className="text-slate-500 dark:text-slate-400">NIP:</span>
                                <span className="ml-2 text-slate-900 dark:text-white">
                                  {customer.nip}
                                </span>
                              </div>
                            )}
                          </div>
                          {customer.city && (
                            <div className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                              📍 {customer.city}
                              {customer.country && customer.country !== 'Polska' && `, ${customer.country}`}
                            </div>
                          )}
                        </div>
                        <div className="text-slate-400 dark:text-slate-500">
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
