import { createClient } from '@/lib/supabase-server'
import { getUserProfile } from '@/lib/auth-server'
import { redirect } from 'next/navigation'
import AppLayout from '@/components/layout/AppLayout'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'

export default async function CooperantsPage() {
  const user = await getUserProfile()

  if (!user || !user.company_id) {
    redirect('/login')
  }

  const supabase = await createClient()

  // Fetch all cooperants
  const { data: cooperants } = await supabase
    .from('cooperants')
    .select('*')
    .eq('company_id', user.company_id)
    .order('name')

  // Get stats per cooperant
  const { data: stats } = await supabase
    .from('external_operations')
    .select('cooperant_id, status')
    .eq('company_id', user.company_id)

  const cooperantStats = (cooperants || []).map(coop => {
    const coopOps = stats?.filter(s => s.cooperant_id === coop.id) || []
    return {
      ...coop,
      totalOperations: coopOps.length,
      activeOperations: coopOps.filter(s => ['pending', 'sent', 'in_progress', 'returning'].includes(s.status)).length
    }
  })

  return (
    <AppLayout>
      <div className="p-8">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <div>
              <div className="flex items-center gap-4 mb-2">
                <Link href="/cooperation" className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white">
                  ← Wróć
                </Link>
              </div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Kooperanci</h1>
              <p className="text-slate-500 dark:text-slate-400 mt-1">Zarządzaj zewnętrznymi dostawcami usług</p>
            </div>
            <Link href="/cooperation/cooperants/add">
              <Button variant="primary">+ Dodaj kooperanta</Button>
            </Link>
          </div>

          {/* Cooperants List */}
          {!cooperantStats || cooperantStats.length === 0 ? (
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-12 text-center">
              <div className="text-6xl mb-4">🏭</div>
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">Brak kooperantów</h2>
              <p className="text-slate-500 dark:text-slate-400 mb-6">
                Dodaj firmy zewnętrzne świadczące usługi obróbki (hartowanie, anodowanie, etc.)
              </p>
              <Link href="/cooperation/cooperants/add">
                <Button variant="primary">Dodaj pierwszego kooperanta</Button>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {cooperantStats.map((coop) => (
                <div
                  key={coop.id}
                  className={`bg-white dark:bg-slate-800 border rounded-lg p-6 ${coop.is_active ? 'border-slate-200 dark:border-slate-700' : 'border-slate-300 dark:border-slate-600 opacity-60'}`}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-xl font-semibold text-slate-900 dark:text-white">{coop.name}</h3>
                      <span className="inline-block px-2 py-1 bg-blue-600/20 text-blue-400 text-xs rounded mt-1">
                        {coop.service_type}
                      </span>
                    </div>
                    {!coop.is_active && (
                      <span className="px-2 py-1 bg-slate-600 text-slate-300 text-xs rounded">
                        Nieaktywny
                      </span>
                    )}
                  </div>

                  <div className="space-y-2 text-sm mb-4">
                    {coop.contact_person && (
                      <p className="text-slate-500 dark:text-slate-400">
                        <span className="text-slate-500">Kontakt:</span> {coop.contact_person}
                      </p>
                    )}
                    {coop.phone && (
                      <p className="text-slate-500 dark:text-slate-400">
                        <span className="text-slate-500">Tel:</span>{' '}
                        <a href={`tel:${coop.phone}`} className="text-blue-400 hover:underline">
                          {coop.phone}
                        </a>
                      </p>
                    )}
                    {coop.email && (
                      <p className="text-slate-500 dark:text-slate-400">
                        <span className="text-slate-500">Email:</span>{' '}
                        <a href={`mailto:${coop.email}`} className="text-blue-400 hover:underline">
                          {coop.email}
                        </a>
                      </p>
                    )}
                    <p className="text-slate-500 dark:text-slate-400">
                      <span className="text-slate-500">Średni czas:</span> {coop.avg_lead_days} dni
                    </p>
                  </div>

                  <div className="flex justify-between items-center pt-4 border-t border-slate-200 dark:border-slate-700">
                    <div className="flex gap-4 text-sm">
                      <span className="text-slate-500 dark:text-slate-400">
                        Wszystkie: <span className="text-slate-900 dark:text-white font-semibold">{coop.totalOperations}</span>
                      </span>
                      <span className="text-slate-500 dark:text-slate-400">
                        Aktywne: <span className="text-blue-400 font-semibold">{coop.activeOperations}</span>
                      </span>
                    </div>
                    <Link
                      href={`/cooperation/cooperants/${coop.id}/edit`}
                      className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white text-sm"
                    >
                      Edytuj
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  )
}
