import { createClient } from '@/lib/supabase-server'
import { getUserProfile } from '@/lib/auth-server'
import { redirect, notFound } from 'next/navigation'
import AppLayout from '@/components/layout/AppLayout'
import Link from 'next/link'
import OperationStatusUpdate from './OperationStatusUpdate'

export default async function OperationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getUserProfile()

  if (!user || !user.company_id) {
    redirect('/login')
  }

  const supabase = await createClient()

  // Fetch operation with all relations
  const { data: operation, error } = await supabase
    .from('external_operations')
    .select(`
      *,
      cooperants (
        id,
        name,
        service_type,
        contact_person,
        phone,
        email,
        address
      ),
      sent_by_user:users!external_operations_sent_by_fkey (
        full_name
      ),
      received_by_user:users!external_operations_received_by_fkey (
        full_name
      ),
      external_operation_items (
        id,
        part_name,
        quantity,
        unit,
        status,
        order_id,
        orders (
          order_number,
          customer_name
        )
      )
    `)
    .eq('id', id)
    .eq('company_id', user.company_id)
    .single()

  if (error || !operation) {
    notFound()
  }

  const getStatusConfig = (status: string) => {
    const config: Record<string, { bg: string; text: string; label: string }> = {
      pending: { bg: 'bg-yellow-600', text: 'text-yellow-100', label: 'Przygotowane' },
      sent: { bg: 'bg-blue-600', text: 'text-blue-100', label: 'Wysłane' },
      in_progress: { bg: 'bg-purple-600', text: 'text-purple-100', label: 'U kooperanta' },
      returning: { bg: 'bg-cyan-600', text: 'text-cyan-100', label: 'W drodze powrotnej' },
      completed: { bg: 'bg-green-600', text: 'text-green-100', label: 'Zakończone' },
      delayed: { bg: 'bg-red-600', text: 'text-red-100', label: 'Opóźnione' },
    }
    return config[status] || { bg: 'bg-gray-600', text: 'text-gray-100', label: status }
  }

  const statusConfig = getStatusConfig(operation.status)

  // Check if overdue
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const isOverdue = operation.expected_return_date &&
    new Date(operation.expected_return_date) < today &&
    operation.status !== 'completed'

  return (
    <AppLayout>
      <div className="p-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center gap-4 mb-2">
            <Link href="/cooperation" className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white">
              ← Wróć
            </Link>
          </div>
          <div className="flex justify-between items-start mb-8">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white">{operation.operation_number}</h1>
                <span className={`px-3 py-1 rounded-full text-sm font-semibold ${statusConfig.bg} ${statusConfig.text}`}>
                  {statusConfig.label}
                </span>
                {isOverdue && (
                  <span className="px-3 py-1 rounded-full text-sm font-semibold bg-red-600 text-white animate-pulse">
                    OPÓŹNIONE
                  </span>
                )}
              </div>
              <p className="text-slate-500 dark:text-slate-400">
                {operation.operation_type}
                {operation.cooperants && <span> • {operation.cooperants.name}</span>}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Main Info */}
            <div className="lg:col-span-2 space-y-6">
              {/* Status Update */}
              <div className="bg-white dark:bg-slate-800 border border-blue-700 dark:border-blue-700 rounded-lg p-6">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Zmień status</h2>
                <OperationStatusUpdate
                  operationId={operation.id}
                  currentStatus={operation.status}
                  userId={user.id}
                />
              </div>

              {/* Items */}
              <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-6">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                  Pozycje ({operation.external_operation_items?.length || 0})
                </h2>
                {!operation.external_operation_items || operation.external_operation_items.length === 0 ? (
                  <p className="text-slate-500">Brak pozycji</p>
                ) : (
                  <div className="space-y-3">
                    {operation.external_operation_items.map((item: {
                      id: string
                      part_name: string
                      quantity: number
                      unit: string
                      status: string
                      orders?: { order_number: string; customer_name: string }
                    }) => (
                      <div
                        key={item.id}
                        className="p-4 bg-slate-50 dark:bg-slate-900 rounded-lg flex justify-between items-center"
                      >
                        <div>
                          <p className="text-slate-900 dark:text-white font-medium">{item.part_name}</p>
                          <p className="text-slate-500 dark:text-slate-400 text-sm">
                            {item.quantity} {item.unit || 'szt'}
                            {item.orders && (
                              <span className="text-blue-400 ml-2">
                                • {item.orders.order_number} ({item.orders.customer_name})
                              </span>
                            )}
                          </p>
                        </div>
                        <span className={`px-2 py-1 rounded text-xs ${
                          item.status === 'returned' ? 'bg-green-600 text-green-100' :
                          item.status === 'lost' ? 'bg-red-600 text-red-100' :
                          'bg-slate-700 text-slate-300'
                        }`}>
                          {item.status === 'returned' ? 'Odebrane' :
                           item.status === 'lost' ? 'Zgubione' : 'Wysłane'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Notes */}
              {operation.notes && (
                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-6">
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Notatki</h2>
                  <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{operation.notes}</p>
                </div>
              )}
            </div>

            {/* Right Column - Details */}
            <div className="space-y-6">
              {/* Dates */}
              <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Terminy</h3>
                <div className="space-y-3">
                  {operation.sent_date && (
                    <div>
                      <p className="text-slate-500 text-xs">Data wysyłki</p>
                      <p className="text-slate-900 dark:text-white">
                        {new Date(operation.sent_date).toLocaleDateString('pl-PL', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric'
                        })}
                      </p>
                    </div>
                  )}
                  {operation.expected_return_date && (
                    <div>
                      <p className="text-slate-500 text-xs">Planowany powrót</p>
                      <p className={`font-semibold ${isOverdue ? 'text-red-400' : 'text-slate-900 dark:text-white'}`}>
                        {new Date(operation.expected_return_date).toLocaleDateString('pl-PL', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric'
                        })}
                        {isOverdue && ' (OPÓŹNIONE)'}
                      </p>
                    </div>
                  )}
                  {operation.actual_return_date && (
                    <div>
                      <p className="text-slate-500 text-xs">Rzeczywisty powrót</p>
                      <p className="text-green-400">
                        {new Date(operation.actual_return_date).toLocaleDateString('pl-PL', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric'
                        })}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Cooperant */}
              {operation.cooperants && (
                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Kooperant</h3>
                  <div className="space-y-2">
                    <p className="text-slate-900 dark:text-white font-medium">{operation.cooperants.name}</p>
                    <p className="text-slate-500 dark:text-slate-400 text-sm">{operation.cooperants.service_type}</p>
                    {operation.cooperants.contact_person && (
                      <p className="text-slate-500 dark:text-slate-400 text-sm">
                        Kontakt: {operation.cooperants.contact_person}
                      </p>
                    )}
                    {operation.cooperants.phone && (
                      <a
                        href={`tel:${operation.cooperants.phone}`}
                        className="block text-blue-400 text-sm hover:underline"
                      >
                        📞 {operation.cooperants.phone}
                      </a>
                    )}
                    {operation.cooperants.email && (
                      <a
                        href={`mailto:${operation.cooperants.email}`}
                        className="block text-blue-400 text-sm hover:underline"
                      >
                        ✉️ {operation.cooperants.email}
                      </a>
                    )}
                  </div>
                </div>
              )}

              {/* Transport */}
              {operation.transport_info && (
                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Transport</h3>
                  <p className="text-slate-700 dark:text-slate-300">{operation.transport_info}</p>
                </div>
              )}

              {/* Created by */}
              <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Utworzone</h3>
                <p className="text-slate-700 dark:text-slate-300">
                  {operation.sent_by_user?.full_name || 'Nieznany'}
                </p>
                <p className="text-slate-500 text-sm">
                  {new Date(operation.created_at).toLocaleDateString('pl-PL')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
