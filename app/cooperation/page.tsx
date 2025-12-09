import { createClient } from '@/lib/supabase-server'
import { getUserProfile } from '@/lib/auth-server'
import { redirect } from 'next/navigation'
import AppLayout from '@/components/layout/AppLayout'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'

export default async function CooperationPage() {
  const user = await getUserProfile()

  if (!user || !user.company_id) {
    redirect('/login')
  }

  const supabase = await createClient()

  // Fetch cooperants
  const { data: cooperants } = await supabase
    .from('cooperants')
    .select('*')
    .eq('company_id', user.company_id)
    .eq('is_active', true)
    .order('name')

  // Fetch active external operations
  const { data: activeOperations } = await supabase
    .from('external_operations')
    .select(`
      *,
      cooperants (
        name,
        phone,
        email
      ),
      sent_by_user:users!external_operations_sent_by_fkey (
        full_name
      ),
      external_operation_items (
        id,
        part_name,
        quantity,
        order_id,
        orders (
          order_number
        )
      )
    `)
    .eq('company_id', user.company_id)
    .in('status', ['pending', 'sent', 'in_progress', 'returning'])
    .order('created_at', { ascending: false })

  // Fetch completed operations (last 20)
  const { data: completedOperations } = await supabase
    .from('external_operations')
    .select(`
      *,
      cooperants (name)
    `)
    .eq('company_id', user.company_id)
    .eq('status', 'completed')
    .order('actual_return_date', { ascending: false })
    .limit(20)

  // Calculate stats
  const pendingCount = activeOperations?.filter(o => o.status === 'pending').length || 0
  const sentCount = activeOperations?.filter(o => o.status === 'sent' || o.status === 'in_progress').length || 0
  const returningCount = activeOperations?.filter(o => o.status === 'returning').length || 0

  // Find overdue operations
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const overdueOperations = activeOperations?.filter(o => {
    if (!o.expected_return_date) return false
    const returnDate = new Date(o.expected_return_date)
    return returnDate < today && o.status !== 'completed'
  }) || []

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
      pending: { bg: 'bg-yellow-600', text: 'text-yellow-100', label: 'Przygotowane' },
      sent: { bg: 'bg-blue-600', text: 'text-blue-100', label: 'Wysłane' },
      in_progress: { bg: 'bg-purple-600', text: 'text-purple-100', label: 'U kooperanta' },
      returning: { bg: 'bg-cyan-600', text: 'text-cyan-100', label: 'W drodze powrotnej' },
      completed: { bg: 'bg-green-600', text: 'text-green-100', label: 'Zakończone' },
      delayed: { bg: 'bg-red-600', text: 'text-red-100', label: 'Opóźnione' },
    }
    const config = statusConfig[status] || { bg: 'bg-gray-600', text: 'text-gray-100', label: status }
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    )
  }

  return (
    <AppLayout>
      <div className="p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-4xl font-bold text-slate-900 dark:text-white">Kooperacja</h1>
              <p className="text-slate-500 dark:text-slate-400 mt-1">Zarządzanie procesami zewnętrznymi (hartowanie, anodowanie, etc.)</p>
            </div>
            <div className="flex gap-3">
              <Link href="/cooperation/cooperants">
                <Button variant="ghost">Kooperanci</Button>
              </Link>
              <Link href="/cooperation/send">
                <Button variant="primary">+ Nowa wysyłka</Button>
              </Link>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4">
              <p className="text-slate-500 dark:text-slate-400 text-sm">Kooperanci</p>
              <p className="text-3xl font-bold text-slate-900 dark:text-white">{cooperants?.length || 0}</p>
            </div>
            <div className="bg-white dark:bg-slate-800 border border-yellow-700/50 rounded-lg p-4">
              <p className="text-slate-500 dark:text-slate-400 text-sm">Przygotowane</p>
              <p className="text-3xl font-bold text-yellow-400">{pendingCount}</p>
            </div>
            <div className="bg-white dark:bg-slate-800 border border-blue-700/50 rounded-lg p-4">
              <p className="text-slate-500 dark:text-slate-400 text-sm">U kooperanta</p>
              <p className="text-3xl font-bold text-blue-400">{sentCount}</p>
            </div>
            <div className="bg-white dark:bg-slate-800 border border-cyan-700/50 rounded-lg p-4">
              <p className="text-slate-500 dark:text-slate-400 text-sm">W drodze powrotnej</p>
              <p className="text-3xl font-bold text-cyan-400">{returningCount}</p>
            </div>
            <div className={`bg-white dark:bg-slate-800 border rounded-lg p-4 ${overdueOperations.length > 0 ? 'border-red-700/50' : 'border-slate-200 dark:border-slate-700'}`}>
              <p className="text-slate-500 dark:text-slate-400 text-sm">Opóźnione</p>
              <p className={`text-3xl font-bold ${overdueOperations.length > 0 ? 'text-red-400' : 'text-green-400'}`}>
                {overdueOperations.length}
              </p>
            </div>
          </div>

          {/* Overdue Alert */}
          {overdueOperations.length > 0 && (
            <div className="bg-red-900/30 border border-red-700 rounded-lg p-4 mb-8">
              <h3 className="text-red-400 font-semibold mb-2 flex items-center gap-2">
                <span>⚠️</span> Opóźnione powroty
              </h3>
              <div className="space-y-2">
                {overdueOperations.map(op => {
                  const daysOverdue = Math.floor((today.getTime() - new Date(op.expected_return_date).getTime()) / (1000 * 60 * 60 * 24))
                  return (
                    <div key={op.id} className="flex justify-between items-center bg-red-900/20 p-3 rounded-lg">
                      <div>
                        <span className="text-slate-900 dark:text-white font-medium">{op.operation_number}</span>
                        <span className="text-slate-500 dark:text-slate-400 mx-2">•</span>
                        <span className="text-slate-700 dark:text-slate-300">{op.cooperants?.name || op.operation_type}</span>
                      </div>
                      <span className="text-red-400 font-semibold">
                        {daysOverdue} dni opóźnienia
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Active Operations */}
            <div className="lg:col-span-2">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">Aktywne operacje</h2>
              {!activeOperations || activeOperations.length === 0 ? (
                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-8 text-center">
                  <div className="text-5xl mb-4">🚚</div>
                  <p className="text-slate-500 dark:text-slate-400 mb-4">Brak aktywnych operacji zewnętrznych</p>
                  <Link href="/cooperation/send">
                    <Button variant="primary" size="sm">Utwórz pierwszą wysyłkę</Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {activeOperations.map((operation) => {
                    const isOverdue = operation.expected_return_date &&
                      new Date(operation.expected_return_date) < today &&
                      operation.status !== 'completed'

                    return (
                      <Link
                        key={operation.id}
                        href={`/cooperation/${operation.id}`}
                        className={`block bg-white dark:bg-slate-800 border rounded-lg p-4 hover:border-blue-500/50 transition ${isOverdue ? 'border-red-700/50' : 'border-slate-200 dark:border-slate-700'}`}
                      >
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <div className="flex items-center gap-3">
                              <span className="text-slate-900 dark:text-white font-semibold text-lg">{operation.operation_number}</span>
                              {getStatusBadge(operation.status)}
                              {isOverdue && (
                                <span className="px-2 py-1 rounded-full text-xs font-semibold bg-red-600 text-white animate-pulse">
                                  OPÓŹNIONE
                                </span>
                              )}
                            </div>
                            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                              {operation.operation_type} • {operation.cooperants?.name || 'Brak kooperanta'}
                            </p>
                          </div>
                          <div className="text-right">
                            {operation.expected_return_date && (
                              <p className={`text-sm ${isOverdue ? 'text-red-400' : 'text-slate-500 dark:text-slate-400'}`}>
                                Powrót: {new Date(operation.expected_return_date).toLocaleDateString('pl-PL')}
                              </p>
                            )}
                            {operation.sent_date && (
                              <p className="text-slate-500 text-xs">
                                Wysłano: {new Date(operation.sent_date).toLocaleDateString('pl-PL')}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Items */}
                        {operation.external_operation_items && operation.external_operation_items.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {operation.external_operation_items.slice(0, 3).map((item: { id: string; part_name: string; quantity: number; orders?: { order_number: string } }) => (
                              <span
                                key={item.id}
                                className="px-2 py-1 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs rounded"
                              >
                                {item.part_name} ({item.quantity} szt)
                                {item.orders && <span className="text-slate-500 ml-1">• {item.orders.order_number}</span>}
                              </span>
                            ))}
                            {operation.external_operation_items.length > 3 && (
                              <span className="px-2 py-1 bg-slate-100 dark:bg-slate-700 text-slate-500 text-xs rounded">
                                +{operation.external_operation_items.length - 3} więcej
                              </span>
                            )}
                          </div>
                        )}
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Cooperants List */}
              <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Kooperanci</h3>
                  <Link href="/cooperation/cooperants/add" className="text-blue-400 text-sm hover:text-blue-300">
                    + Dodaj
                  </Link>
                </div>
                {!cooperants || cooperants.length === 0 ? (
                  <p className="text-slate-500 text-sm">Brak kooperantów. Dodaj pierwszego.</p>
                ) : (
                  <div className="space-y-2">
                    {cooperants.slice(0, 5).map((coop) => (
                      <div key={coop.id} className="p-2 bg-slate-50 dark:bg-slate-900 rounded-lg">
                        <p className="text-slate-900 dark:text-white text-sm font-medium">{coop.name}</p>
                        <p className="text-slate-500 text-xs">{coop.service_type}</p>
                      </div>
                    ))}
                    {cooperants.length > 5 && (
                      <Link href="/cooperation/cooperants" className="block text-center text-slate-500 dark:text-slate-400 text-sm hover:text-slate-900 dark:hover:text-white">
                        Zobacz wszystkich ({cooperants.length})
                      </Link>
                    )}
                  </div>
                )}
              </div>

              {/* Recent Completed */}
              <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">Ostatnio zakończone</h3>
                {!completedOperations || completedOperations.length === 0 ? (
                  <p className="text-slate-500 text-sm">Brak zakończonych operacji</p>
                ) : (
                  <div className="space-y-2">
                    {completedOperations.slice(0, 5).map((op) => (
                      <Link
                        key={op.id}
                        href={`/cooperation/${op.id}`}
                        className="block p-2 bg-slate-50 dark:bg-slate-900 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition"
                      >
                        <div className="flex justify-between items-center">
                          <span className="text-slate-900 dark:text-white text-sm">{op.operation_number}</span>
                          <span className="text-green-400 text-xs">✓</span>
                        </div>
                        <p className="text-slate-500 text-xs">
                          {op.cooperants?.name} • {op.actual_return_date && new Date(op.actual_return_date).toLocaleDateString('pl-PL')}
                        </p>
                      </Link>
                    ))}
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
