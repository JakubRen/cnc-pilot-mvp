'use client'

import { useTranslation } from '@/hooks/useTranslation'
import Link from 'next/link'
import OperationStatusUpdate from './OperationStatusUpdate'

interface Cooperant {
  id: string
  name: string
  service_type: string
  contact_person?: string
  phone?: string
  email?: string
  address?: string
}

interface OperationItem {
  id: string
  part_name: string
  quantity: number
  unit: string
  status: string
  orders?: {
    order_number: string
    customer_name: string
  }
}

interface OperationDetailClientProps {
  operation: {
    id: string
    operation_number: string
    operation_type: string
    status: string
    notes?: string
    sent_date?: string
    expected_return_date?: string
    actual_return_date?: string
    transport_info?: string
    created_at: string
    cooperants?: Cooperant
    sent_by_user?: { full_name: string }
    received_by_user?: { full_name: string }
    external_operation_items?: OperationItem[]
  }
  userId: number
}

export default function OperationDetailClient({ operation, userId }: OperationDetailClientProps) {
  const { t } = useTranslation()

  const getStatusConfig = (status: string) => {
    const config: Record<string, { bg: string; text: string; label: string }> = {
      pending: { bg: 'bg-yellow-600', text: 'text-yellow-100', label: t('cooperation', 'prepared' as any) },
      sent: { bg: 'bg-blue-600', text: 'text-blue-100', label: t('cooperation', 'btnSend' as any) },
      in_progress: { bg: 'bg-purple-600', text: 'text-purple-100', label: t('cooperation', 'atCooperant' as any) },
      returning: { bg: 'bg-cyan-600', text: 'text-cyan-100', label: t('cooperation', 'onWayBack' as any) },
      completed: { bg: 'bg-green-600', text: 'text-green-100', label: t('cooperation', 'completed') },
      delayed: { bg: 'bg-red-600', text: 'text-red-100', label: t('cooperation', 'delayed') },
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

  const getItemStatusLabel = (status: string) => {
    if (status === 'returned') return t('cooperation', 'returned' as any)
    if (status === 'lost') return t('cooperation', 'lost' as any)
    return t('cooperation', 'sent' as any)
  }

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-2">
          <Link href="/cooperation" className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white">
            ← {t('common', 'back')}
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
                  {t('cooperation', 'overdue')}
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
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">{t('cooperation', 'changeStatus' as any)}</h2>
              <OperationStatusUpdate
                operationId={operation.id}
                currentStatus={operation.status}
                userId={userId}
              />
            </div>

            {/* Items */}
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                {t('cooperation', 'items')} ({operation.external_operation_items?.length || 0})
              </h2>
              {!operation.external_operation_items || operation.external_operation_items.length === 0 ? (
                <p className="text-slate-500">{t('cooperation', 'noItems')}</p>
              ) : (
                <div className="space-y-3">
                  {operation.external_operation_items.map((item) => (
                    <div
                      key={item.id}
                      className="p-4 bg-slate-50 dark:bg-slate-900 rounded-lg flex justify-between items-center"
                    >
                      <div>
                        <p className="text-slate-900 dark:text-white font-medium">{item.part_name}</p>
                        <p className="text-slate-500 dark:text-slate-400 text-sm">
                          {item.quantity} {item.unit || t('common', 'pcs')}
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
                        {getItemStatusLabel(item.status)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Notes */}
            {operation.notes && (
              <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-6">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">{t('common', 'notes')}</h2>
                <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{operation.notes}</p>
              </div>
            )}
          </div>

          {/* Right Column - Details */}
          <div className="space-y-6">
            {/* Dates */}
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">{t('cooperation', 'dates' as any)}</h3>
              <div className="space-y-3">
                {operation.sent_date && (
                  <div>
                    <p className="text-slate-500 text-xs">{t('cooperation', 'sendDate' as any)}</p>
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
                    <p className="text-slate-500 text-xs">{t('cooperation', 'expectedReturn' as any)}</p>
                    <p className={`font-semibold ${isOverdue ? 'text-red-400' : 'text-slate-900 dark:text-white'}`}>
                      {new Date(operation.expected_return_date).toLocaleDateString('pl-PL', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric'
                      })}
                      {isOverdue && ` (${t('cooperation', 'overdue')})`}
                    </p>
                  </div>
                )}
                {operation.actual_return_date && (
                  <div>
                    <p className="text-slate-500 text-xs">{t('cooperation', 'actualReturn' as any)}</p>
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
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">{t('cooperation', 'cooperant' as any)}</h3>
                <div className="space-y-2">
                  <p className="text-slate-900 dark:text-white font-medium">{operation.cooperants.name}</p>
                  <p className="text-slate-500 dark:text-slate-400 text-sm">{operation.cooperants.service_type}</p>
                  {operation.cooperants.contact_person && (
                    <p className="text-slate-500 dark:text-slate-400 text-sm">
                      {t('cooperation', 'contact' as any)}: {operation.cooperants.contact_person}
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
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">{t('cooperation', 'transport' as any)}</h3>
                <p className="text-slate-700 dark:text-slate-300">{operation.transport_info}</p>
              </div>
            )}

            {/* Created by */}
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">{t('cooperation', 'created' as any)}</h3>
              <p className="text-slate-700 dark:text-slate-300">
                {operation.sent_by_user?.full_name || t('cooperation', 'unknown' as any)}
              </p>
              <p className="text-slate-500 text-sm">
                {new Date(operation.created_at).toLocaleDateString('pl-PL')}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
