import { createClient } from '@/lib/supabase-server'
import { getUserProfile } from '@/lib/auth-server'
import { redirect, notFound } from 'next/navigation'
import AppLayout from '@/components/layout/AppLayout'
import Link from 'next/link'
import MeasurementForm from './MeasurementForm'

export default async function QCPlanDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getUserProfile()

  if (!user || !user.company_id) {
    redirect('/login')
  }

  const supabase = await createClient()

  // Fetch plan with items
  const { data: plan, error } = await supabase
    .from('quality_control_plans')
    .select(`
      *,
      quality_control_items (
        id,
        name,
        description,
        nominal_value,
        tolerance_plus,
        tolerance_minus,
        unit,
        is_critical,
        sort_order
      )
    `)
    .eq('id', id)
    .eq('company_id', user.company_id)
    .single()

  if (error || !plan) {
    notFound()
  }

  // Fetch recent measurements for this plan
  const { data: recentMeasurements } = await supabase
    .from('quality_measurements')
    .select(`
      *,
      quality_control_items (name),
      users (full_name),
      orders (order_number)
    `)
    .eq('plan_id', id)
    .order('measured_at', { ascending: false })
    .limit(50)

  // Fetch active orders for measurement form
  const { data: orders } = await supabase
    .from('orders')
    .select('id, order_number, customer_name')
    .eq('company_id', user.company_id)
    .in('status', ['pending', 'in_progress'])
    .order('deadline', { ascending: true })

  // Sort items by sort_order
  const sortedItems = (plan.quality_control_items || []).sort(
    (a: { sort_order: number }, b: { sort_order: number }) => a.sort_order - b.sort_order
  )

  return (
    <AppLayout>
      <div className="p-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex items-center gap-4 mb-2">
            <Link href="/quality-control" className="text-slate-400 hover:text-white">
              ← Wróć
            </Link>
          </div>
          <div className="flex justify-between items-start mb-8">
            <div>
              <h1 className="text-3xl font-bold text-white">{plan.name}</h1>
              {plan.part_name && (
                <p className="text-slate-400 mt-1">Część: {plan.part_name}</p>
              )}
              {plan.description && (
                <p className="text-slate-500 text-sm mt-2">{plan.description}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Measurement Form */}
            <div>
              <h2 className="text-xl font-semibold text-white mb-4">Wprowadź pomiary</h2>
              <MeasurementForm
                planId={plan.id}
                items={sortedItems}
                orders={orders || []}
                userId={user.id}
                companyId={user.company_id}
              />
            </div>

            {/* Items List & Recent Measurements */}
            <div className="space-y-6">
              {/* QC Items Reference */}
              <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-white mb-3">Wymiary w planie ({sortedItems.length})</h3>
                <div className="space-y-2">
                  {sortedItems.map((item: {
                    id: string
                    name: string
                    nominal_value: number
                    tolerance_plus: number
                    tolerance_minus: number
                    unit: string
                    is_critical: boolean
                  }) => (
                    <div
                      key={item.id}
                      className={`p-3 rounded-lg ${item.is_critical ? 'bg-red-900/20 border border-red-700/50' : 'bg-slate-900'}`}
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <span className="text-white font-medium">{item.name}</span>
                          {item.is_critical && (
                            <span className="ml-2 text-xs text-red-400">KRYTYCZNY</span>
                          )}
                        </div>
                        <span className="text-slate-400 text-sm font-mono">
                          {item.nominal_value} <span className="text-green-400">+{item.tolerance_plus}</span>/<span className="text-red-400">-{item.tolerance_minus}</span> {item.unit}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent Measurements */}
              <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-white mb-3">Ostatnie pomiary</h3>
                {!recentMeasurements || recentMeasurements.length === 0 ? (
                  <p className="text-slate-500 text-sm">Brak pomiarów</p>
                ) : (
                  <div className="max-h-[400px] overflow-y-auto">
                    <table className="w-full">
                      <thead className="bg-slate-700 sticky top-0">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs text-slate-300">Wymiar</th>
                          <th className="px-3 py-2 text-left text-xs text-slate-300">Pomiar</th>
                          <th className="px-3 py-2 text-left text-xs text-slate-300">Wynik</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-700">
                        {recentMeasurements.map((m) => (
                          <tr key={m.id} className="hover:bg-slate-700/50">
                            <td className="px-3 py-2 text-sm text-slate-300">
                              {m.quality_control_items?.name || '-'}
                            </td>
                            <td className="px-3 py-2 text-sm text-white font-mono">
                              {m.measured_value}
                            </td>
                            <td className="px-3 py-2">
                              {m.is_pass ? (
                                <span className="text-green-400 text-sm">✓ OK</span>
                              ) : (
                                <span className="text-red-400 text-sm">✕ NOK</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
