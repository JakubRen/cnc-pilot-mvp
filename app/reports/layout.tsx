import Link from 'next/link'
import AppLayout from '@/components/layout/AppLayout'
import { getUserProfile } from '@/lib/auth-server'
import { redirect } from 'next/navigation'

export default async function ReportsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getUserProfile()

  if (!user) {
    redirect('/login')
  }

  const tabs = [
    { href: '/reports', label: 'Dashboard', icon: '📊' },
    { href: '/reports/orders', label: 'Zamówienia', icon: '📋' },
    { href: '/reports/inventory', label: 'Magazyn', icon: '📦' },
    { href: '/reports/time', label: 'Czas Pracy', icon: '⏱️' },
    { href: '/reports/revenue', label: 'Przychody', icon: '💰' },
  ]

  return (
    <AppLayout>
      <div className="p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-white mb-2">Raporty & Analityka</h1>
            <p className="text-slate-400">
              Przegląd danych, eksport raportów, i wizualizacje
            </p>
          </div>

          {/* Tabs Navigation */}
          <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
            {tabs.map((tab) => (
              <Link
                key={tab.href}
                href={tab.href}
                className="px-4 py-2 rounded-lg font-semibold text-sm whitespace-nowrap transition hover:bg-slate-700 bg-slate-800 text-slate-300 hover:text-white border border-slate-700"
              >
                {tab.icon} {tab.label}
              </Link>
            ))}
          </div>

          {/* Content */}
          {children}
        </div>
      </div>
    </AppLayout>
  )
}
