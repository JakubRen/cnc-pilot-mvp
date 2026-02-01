import Link from 'next/link'
import { getUserProfile } from '@/lib/auth-server'
import { canAccessModule } from '@/lib/permissions-server'
import { redirect } from 'next/navigation'

export default async function ReportsDashboard() {
  const user = await getUserProfile()

  if (!user) {
    redirect('/login')
  }

  // Permission check - reports access
  const hasAccess = await canAccessModule('reports')
  if (!hasAccess) {
    redirect('/no-access')
  }

  const reports = [
    {
      title: 'Raport Zamówień',
      description: 'Analiza zamówień, filtrowanie, export CSV/PDF',
      href: '/reports/orders',
      icon: '📋',
      color: 'blue',
    },
    {
      title: 'Raport Magazynu',
      description: 'Wartość magazynu, niskie stany, rotacja',
      href: '/reports/inventory',
      icon: '📦',
      color: 'green',
    },
    {
      title: 'Raport Czasu Pracy',
      description: 'Produktywność, godziny, koszty operatorów',
      href: '/reports/time',
      icon: '⏱️',
      color: 'orange',
    },
    {
      title: 'Raport Kontroli Jakości',
      description: 'Plany kontroli, pomiary, wskaźnik zgodności',
      href: '/reports/quality-control',
      icon: '✅',
      color: 'teal',
    },
    {
      title: 'Raport Śladu Węglowego',
      description: 'Emisje CO₂, kalkulator, paszporty węglowe',
      href: '/reports/carbon',
      icon: '🌿',
      color: 'emerald',
    },
    {
      title: 'Koszty i Rentowność',
      description: 'Analiza kosztów, marże, rentowność zamówień',
      href: '/reports/costs',
      icon: '💰',
      color: 'amber',
    },
  ]

  return (
    <div>
      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-500 dark:text-slate-400 text-sm">Zamówienia (miesiąc)</span>
            <span className="text-2xl">📋</span>
          </div>
          <p className="text-3xl font-bold text-slate-900 dark:text-white">--</p>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-500 dark:text-slate-400 text-sm">Wartość magazynu</span>
            <span className="text-2xl">📦</span>
          </div>
          <p className="text-3xl font-bold text-slate-900 dark:text-white">-- PLN</p>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-500 dark:text-slate-400 text-sm">Godziny (miesiąc)</span>
            <span className="text-2xl">⏱️</span>
          </div>
          <p className="text-3xl font-bold text-slate-900 dark:text-white">-- h</p>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-500 dark:text-slate-400 text-sm">Przychody (miesiąc)</span>
            <span className="text-2xl">💰</span>
          </div>
          <p className="text-3xl font-bold text-slate-900 dark:text-white">-- PLN</p>
        </div>
      </div>

      {/* Reports Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {reports.map((report) => (
          <Link
            key={report.href}
            href={report.href}
            className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6 hover:border-slate-300 dark:hover:border-slate-600 transition group"
          >
            <div className="flex items-start gap-4">
              <div className={`text-5xl group-hover:scale-110 transition`}>
                {report.icon}
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition">
                  {report.title}
                </h3>
                <p className="text-slate-500 dark:text-slate-400 text-sm mb-4">{report.description}</p>
                <div className="flex items-center text-blue-600 dark:text-blue-400 text-sm font-semibold">
                  Otwórz raport →
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Info */}
      <div className="mt-8 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700/50 rounded-lg p-6">
        <h3 className="text-slate-900 dark:text-white font-semibold mb-2">ℹ️ Informacje o raportach</h3>
        <ul className="text-blue-800 dark:text-blue-200 text-sm space-y-1">
          <li>• Wszystkie raporty można wyeksportować do CSV i PDF</li>
          <li>• Dane są filtrowane według Twojej firmy (multi-tenancy)</li>
          <li>• Możesz ustawić zakres dat i inne filtry</li>
          <li>• Raporty aktualizują się w czasie rzeczywistym</li>
        </ul>
      </div>
    </div>
  )
}
