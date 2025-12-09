import { createClient } from '@/lib/supabase-server'
import { getUserProfile } from '@/lib/auth-server'
import { redirect } from 'next/navigation'
import AppLayout from '@/components/layout/AppLayout'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'

export default async function QualityControlPage() {
  const user = await getUserProfile()

  if (!user || !user.company_id) {
    redirect('/login')
  }

  const supabase = await createClient()

  // Fetch QC plans
  const { data: plans } = await supabase
    .from('quality_control_plans')
    .select(`
      *,
      quality_control_items (count)
    `)
    .eq('company_id', user.company_id)
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  // Fetch recent measurements
  const { data: recentMeasurements } = await supabase
    .from('quality_measurements')
    .select(`
      *,
      quality_control_items (
        name,
        nominal_value,
        tolerance_plus,
        tolerance_minus,
        unit
      ),
      orders (
        order_number
      ),
      users (
        full_name
      )
    `)
    .eq('company_id', user.company_id)
    .order('measured_at', { ascending: false })
    .limit(20)

  // Calculate stats
  const totalMeasurements = recentMeasurements?.length || 0
  const passedCount = recentMeasurements?.filter(m => m.is_pass).length || 0
  const failedCount = totalMeasurements - passedCount
  const passRate = totalMeasurements > 0 ? Math.round((passedCount / totalMeasurements) * 100) : 0

  return (
    <AppLayout>
      <div className="p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-4xl font-bold text-slate-900 dark:text-white">Kontrola Jakości</h1>
              <p className="text-slate-500 dark:text-slate-400 mt-1">Plany kontroli, pomiary, raporty</p>
            </div>
            <Link href="/quality-control/plans/add">
              <Button variant="primary">+ Nowy Plan Kontroli</Button>
            </Link>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4">
              <p className="text-slate-500 dark:text-slate-400 text-sm">Plany kontroli</p>
              <p className="text-3xl font-bold text-slate-900 dark:text-white">{plans?.length || 0}</p>
            </div>
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4">
              <p className="text-slate-500 dark:text-slate-400 text-sm">Pomiary (ostatnie 20)</p>
              <p className="text-3xl font-bold text-slate-900 dark:text-white">{totalMeasurements}</p>
            </div>
            <div className="bg-white dark:bg-slate-800 border border-green-700/50 rounded-lg p-4">
              <p className="text-slate-500 dark:text-slate-400 text-sm">Zgodne</p>
              <p className="text-3xl font-bold text-green-400">{passedCount}</p>
            </div>
            <div className="bg-white dark:bg-slate-800 border border-red-700/50 rounded-lg p-4">
              <p className="text-slate-500 dark:text-slate-400 text-sm">Niezgodne</p>
              <p className="text-3xl font-bold text-red-400">{failedCount}</p>
            </div>
          </div>

          {/* Pass Rate Bar */}
          {totalMeasurements > 0 && (
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4 mb-8">
              <div className="flex justify-between items-center mb-2">
                <span className="text-slate-700 dark:text-slate-300 font-medium">Wskaźnik zgodności</span>
                <span className={`text-2xl font-bold ${passRate >= 95 ? 'text-green-400' : passRate >= 80 ? 'text-yellow-400' : 'text-red-400'}`}>
                  {passRate}%
                </span>
              </div>
              <div className="h-3 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all ${passRate >= 95 ? 'bg-green-500' : passRate >= 80 ? 'bg-yellow-500' : 'bg-red-500'}`}
                  style={{ width: `${passRate}%` }}
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* QC Plans */}
            <div>
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">Plany Kontroli</h2>
              {!plans || plans.length === 0 ? (
                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-8 text-center">
                  <div className="text-5xl mb-4">📋</div>
                  <p className="text-slate-500 dark:text-slate-400 mb-4">Brak planów kontroli</p>
                  <Link href="/quality-control/plans/add">
                    <Button variant="primary" size="sm">Utwórz pierwszy plan</Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {plans.map((plan) => (
                    <Link
                      key={plan.id}
                      href={`/quality-control/plans/${plan.id}`}
                      className="block bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4 hover:border-blue-500/50 transition"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="text-slate-900 dark:text-white font-semibold">{plan.name}</h3>
                          {plan.part_name && (
                            <p className="text-slate-500 dark:text-slate-400 text-sm">Część: {plan.part_name}</p>
                          )}
                        </div>
                        <span className="text-slate-500 text-sm">
                          {Array.isArray(plan.quality_control_items)
                            ? plan.quality_control_items.length
                            : 0} wymiarów
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Measurements */}
            <div>
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">Ostatnie Pomiary</h2>
              {!recentMeasurements || recentMeasurements.length === 0 ? (
                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-8 text-center">
                  <div className="text-5xl mb-4">📏</div>
                  <p className="text-slate-500 dark:text-slate-400">Brak pomiarów</p>
                </div>
              ) : (
                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-slate-100 dark:bg-slate-700">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-slate-700 dark:text-slate-300">Wymiar</th>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-slate-700 dark:text-slate-300">Pomiar</th>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-slate-700 dark:text-slate-300">Wynik</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                      {recentMeasurements.slice(0, 10).map((measurement) => {
                        const item = measurement.quality_control_items
                        const nominalDisplay = item
                          ? `${item.nominal_value} ${item.unit || 'mm'}`
                          : '-'

                        return (
                          <tr key={measurement.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                            <td className="px-4 py-2">
                              <p className="text-slate-900 dark:text-white text-sm">{item?.name || 'Nieznany'}</p>
                              <p className="text-slate-500 text-xs">Nom: {nominalDisplay}</p>
                            </td>
                            <td className="px-4 py-2 text-slate-700 dark:text-slate-300 text-sm">
                              {measurement.measured_value} {item?.unit || 'mm'}
                            </td>
                            <td className="px-4 py-2">
                              {measurement.is_pass ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded-full">
                                  <span>✓</span> OK
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-500/20 text-red-400 text-xs rounded-full">
                                  <span>✕</span> NOK
                                </span>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
