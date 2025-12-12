'use client'

import { useTranslation } from '@/hooks/useTranslation'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'

interface Cooperant {
  id: string
  name: string
  phone?: string
  email?: string
}

interface ExternalOperation {
  id: string
  operation_number: string
  operation_type: string
  status: string
  expected_return_date?: string
  sent_date?: string
  actual_return_date?: string
  cooperants?: {
    name: string
  }
  external_operation_items?: Array<{
    id: string
    part_name: string
    quantity: number
    orders?: {
      order_number: string
    }
  }>
}

interface CooperationPageClientProps {
  cooperants: Cooperant[]
  activeOperations: ExternalOperation[]
  completedOperations: ExternalOperation[]
  pendingCount: number
  sentCount: number
  returningCount: number
  overdueOperations: ExternalOperation[]
}

export default function CooperationPageClient({
  cooperants,
  activeOperations,
  completedOperations,
  pendingCount,
  sentCount,
  returningCount,
  overdueOperations,
}: CooperationPageClientProps) {
  const { t } = useTranslation()

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
      pending: { bg: 'bg-yellow-600', text: 'text-yellow-100', label: t('cooperation', 'prepared') },
      sent: { bg: 'bg-blue-600', text: 'text-blue-100', label: t('cooperation', 'sent') },
      in_progress: { bg: 'bg-purple-600', text: 'text-purple-100', label: t('cooperation', 'atCooperant') },
      returning: { bg: 'bg-cyan-600', text: 'text-cyan-100', label: t('cooperation', 'onWayBack') },
      completed: { bg: 'bg-green-600', text: 'text-green-100', label: t('cooperation', 'completed') },
      delayed: { bg: 'bg-red-600', text: 'text-red-100', label: t('cooperation', 'delayed') },
    }
    const config = statusConfig[status] || { bg: 'bg-gray-600', text: 'text-gray-100', label: status }
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    )
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  return (
    <>
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold text-slate-900 dark:text-white">{t('cooperation', 'title')}</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">{t('cooperation', 'subtitle')}</p>
        </div>
        <div className="flex gap-3">
          <Link href="/cooperation/cooperants">
            <Button variant="ghost">{t('cooperation', 'cooperants')}</Button>
          </Link>
          <Link href="/cooperation/send">
            <Button variant="primary">+ {t('cooperation', 'newShipment')}</Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4">
          <p className="text-slate-500 dark:text-slate-400 text-sm">{t('cooperation', 'cooperants')}</p>
          <p className="text-3xl font-bold text-slate-900 dark:text-white">{cooperants?.length || 0}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 border border-yellow-700/50 rounded-lg p-4">
          <p className="text-slate-500 dark:text-slate-400 text-sm">{t('cooperation', 'prepared')}</p>
          <p className="text-3xl font-bold text-yellow-400">{pendingCount}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 border border-blue-700/50 rounded-lg p-4">
          <p className="text-slate-500 dark:text-slate-400 text-sm">{t('cooperation', 'atCooperant')}</p>
          <p className="text-3xl font-bold text-blue-400">{sentCount}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 border border-cyan-700/50 rounded-lg p-4">
          <p className="text-slate-500 dark:text-slate-400 text-sm">{t('cooperation', 'onWayBack')}</p>
          <p className="text-3xl font-bold text-cyan-400">{returningCount}</p>
        </div>
        <div className={`bg-white dark:bg-slate-800 border rounded-lg p-4 ${overdueOperations.length > 0 ? 'border-red-700/50' : 'border-slate-200 dark:border-slate-700'}`}>
          <p className="text-slate-500 dark:text-slate-400 text-sm">{t('cooperation', 'delayed')}</p>
          <p className={`text-3xl font-bold ${overdueOperations.length > 0 ? 'text-red-400' : 'text-green-400'}`}>
            {overdueOperations.length}
          </p>
        </div>
      </div>

      {/* Overdue Alert */}
      {overdueOperations.length > 0 && (
        <div className="bg-red-900/30 border border-red-700 rounded-lg p-4 mb-8">
          <h3 className="text-red-400 font-semibold mb-2 flex items-center gap-2">
            <span>⚠️</span> {t('cooperation', 'delayedReturns')}
          </h3>
          <div className="space-y-2">
            {overdueOperations.map(op => {
              const daysOverdue = Math.floor((today.getTime() - new Date(op.expected_return_date!).getTime()) / (1000 * 60 * 60 * 24))
              return (
                <div key={op.id} className="flex justify-between items-center bg-red-900/20 p-3 rounded-lg">
                  <div>
                    <span className="text-slate-900 dark:text-white font-medium">{op.operation_number}</span>
                    <span className="text-slate-500 dark:text-slate-400 mx-2">•</span>
                    <span className="text-slate-700 dark:text-slate-300">{op.cooperants?.name || op.operation_type}</span>
                  </div>
                  <span className="text-red-400 font-semibold">
                    {t('cooperation', 'daysDelay', { days: daysOverdue })}
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
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">{t('cooperation', 'activeOperations')}</h2>
          {!activeOperations || activeOperations.length === 0 ? (
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-8 text-center">
              <div className="text-5xl mb-4">🚚</div>
              <p className="text-slate-500 dark:text-slate-400 mb-4">{t('cooperation', 'noActiveOperations')}</p>
              <Link href="/cooperation/send">
                <Button variant="primary" size="sm">{t('cooperation', 'createFirst')}</Button>
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
                              {t('cooperation', 'overdue')}
                            </span>
                          )}
                        </div>
                        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                          {operation.operation_type} • {operation.cooperants?.name || t('cooperation', 'noCooperant')}
                        </p>
                      </div>
                      <div className="text-right">
                        {operation.expected_return_date && (
                          <p className={`text-sm ${isOverdue ? 'text-red-400' : 'text-slate-500 dark:text-slate-400'}`}>
                            {t('cooperation', 'returnDate')} {new Date(operation.expected_return_date).toLocaleDateString('pl-PL')}
                          </p>
                        )}
                        {operation.sent_date && (
                          <p className="text-slate-500 text-xs">
                            {t('cooperation', 'sentDate')} {new Date(operation.sent_date).toLocaleDateString('pl-PL')}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Items */}
                    {operation.external_operation_items && operation.external_operation_items.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {operation.external_operation_items.slice(0, 3).map((item) => (
                          <span
                            key={item.id}
                            className="px-2 py-1 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs rounded"
                          >
                            {item.part_name} ({item.quantity} {t('cooperation', 'pcs')})
                            {item.orders && <span className="text-slate-500 ml-1">• {item.orders.order_number}</span>}
                          </span>
                        ))}
                        {operation.external_operation_items.length > 3 && (
                          <span className="px-2 py-1 bg-slate-100 dark:bg-slate-700 text-slate-500 text-xs rounded">
                            {t('cooperation', 'moreItems', { count: operation.external_operation_items.length - 3 })}
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

        {/* Sidebar - Recently Completed */}
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">{t('cooperation', 'recentlyCompleted')}</h3>
            {!completedOperations || completedOperations.length === 0 ? (
              <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4 text-center">
                <p className="text-slate-500 dark:text-slate-400 text-sm">{t('cooperation', 'noCompleted')}</p>
              </div>
            ) : (
              <div className="space-y-2">
                {completedOperations.slice(0, 10).map((op) => (
                  <Link
                    key={op.id}
                    href={`/cooperation/${op.id}`}
                    className="block bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3 hover:border-green-500/50 transition"
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-slate-900 dark:text-white text-sm font-medium">{op.operation_number}</p>
                        <p className="text-slate-500 text-xs">{op.cooperants?.name || op.operation_type}</p>
                      </div>
                      <span className="text-green-400 text-xs">✓</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
