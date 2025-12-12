'use client'

import { useTranslation } from '@/hooks/useTranslation'

interface ClientOrder {
  id: string
  order_number: string
  part_name: string | null
  quantity: number
  deadline: string
  status: string
  created_at: string
}

interface ClientPortalContentProps {
  customerName: string
  orders: ClientOrder[]
}

export default function ClientPortalContent({ customerName, orders }: ClientPortalContentProps) {
  const { t } = useTranslation()

  const getStatusInfo = (status: string) => {
    const statusMap: Record<string, { label: string; color: string; progress: number }> = {
      pending: { label: t('orderStatus', 'pending'), color: 'bg-yellow-500', progress: 10 },
      in_progress: { label: t('orderStatus', 'in_progress'), color: 'bg-blue-500', progress: 50 },
      completed: { label: t('clientPortal', 'completed'), color: 'bg-green-500', progress: 100 },
      delayed: { label: t('orderStatus', 'delayed'), color: 'bg-red-500', progress: 60 },
      cancelled: { label: t('orderStatus', 'cancelled'), color: 'bg-gray-500', progress: 0 },
    }
    return statusMap[status] || { label: status, color: 'bg-gray-500', progress: 0 }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pl-PL', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })
  }

  const isOverdue = (deadline: string, status: string) => {
    if (status === 'completed' || status === 'cancelled') return false
    return new Date(deadline) < new Date()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      {/* Header */}
      <header className="bg-white/50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">{t('nav', 'clientPortal')}</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm">{customerName}</p>
          </div>
          <div className="text-right">
            <p className="text-slate-500 dark:text-slate-400 text-xs">{t('clientPortal', 'lastUpdate')}</p>
            <p className="text-slate-900 dark:text-white text-sm">{formatDate(new Date().toISOString())}</p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4 text-center">
            <p className="text-3xl font-bold text-slate-900 dark:text-white">{orders?.length || 0}</p>
            <p className="text-slate-500 dark:text-slate-400 text-sm">{t('common', 'all')}</p>
          </div>
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4 text-center">
            <p className="text-3xl font-bold text-blue-400">
              {orders?.filter(o => o.status === 'in_progress').length || 0}
            </p>
            <p className="text-slate-500 dark:text-slate-400 text-sm">{t('orderStatus', 'in_progress')}</p>
          </div>
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4 text-center">
            <p className="text-3xl font-bold text-green-400">
              {orders?.filter(o => o.status === 'completed').length || 0}
            </p>
            <p className="text-slate-500 dark:text-slate-400 text-sm">{t('clientPortal', 'completed')}</p>
          </div>
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4 text-center">
            <p className="text-3xl font-bold text-yellow-400">
              {orders?.filter(o => o.status === 'pending').length || 0}
            </p>
            <p className="text-slate-500 dark:text-slate-400 text-sm">{t('orderStatus', 'pending')}</p>
          </div>
        </div>

        {/* Orders List */}
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">{t('clientPortal', 'yourOrders')}</h2>

        {!orders || orders.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-8 text-center">
            <div className="text-5xl mb-4">📦</div>
            <p className="text-slate-500 dark:text-slate-400">{t('clientPortal', 'noOrders')}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order: ClientOrder) => {
              const statusInfo = getStatusInfo(order.status)
              const overdue = isOverdue(order.deadline, order.status)

              return (
                <div
                  key={order.id}
                  className={`bg-white dark:bg-slate-800 border rounded-lg p-4 ${
                    overdue ? 'border-red-500/50' : 'border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{order.order_number}</h3>
                      {order.part_name && (
                        <p className="text-slate-500 dark:text-slate-400 text-sm">{order.part_name}</p>
                      )}
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold text-white ${statusInfo.color}`}>
                      {statusInfo.label}
                    </span>
                  </div>

                  <div className="mb-3">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-slate-500 dark:text-slate-400">{t('common', 'status')}</span>
                      <span className="text-slate-900 dark:text-white font-medium">{statusInfo.progress}%</span>
                    </div>
                    <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${statusInfo.color} transition-all duration-500`}
                        style={{ width: `${statusInfo.progress}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-4 text-sm">
                    <div>
                      <span className="text-slate-500 dark:text-slate-400">{t('common', 'quantity')}:</span>
                      <span className="text-slate-900 dark:text-white ml-1 font-medium">{order.quantity} {t('common', 'pcs')}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 dark:text-slate-400">{t('orders', 'deadline')}:</span>
                      <span className={`ml-1 font-medium ${overdue ? 'text-red-400' : 'text-slate-900 dark:text-white'}`}>
                        {formatDate(order.deadline)}
                      </span>
                    </div>
                  </div>

                  {statusInfo.progress === 100 && (
                    <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                      <p className="text-green-400 text-sm flex items-center gap-2">
                        <span>✓</span> {t('clientPortal', 'accepted')}
                      </p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 p-4 bg-slate-100 dark:bg-slate-800/50 rounded-lg text-center">
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            {t('clientPortal', 'questions')}
          </p>
        </div>
      </main>
    </div>
  )
}
