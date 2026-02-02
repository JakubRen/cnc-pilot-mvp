'use client'

import { FilterState } from './OrderFilters'
import { useTranslation } from '@/hooks/useTranslation'
import { TIME } from '@/lib/constants/time'

interface OrderForStats {
  id: string
  status: string
  deadline: string
}

interface OrderStatsProps {
  orders: OrderForStats[]
  onFilterClick: (filters: FilterState) => void
}

export default function OrderStats({ orders, onFilterClick }: OrderStatsProps) {
  const { t } = useTranslation()

  // Calculate statistics
  const stats = {
    total: orders.length,
    pending: orders.filter(o => o.status === 'pending').length,
    in_progress: orders.filter(o => o.status === 'in_progress').length,
    completed: orders.filter(o => o.status === 'completed').length,
    delayed: orders.filter(o => o.status === 'delayed').length,
    cancelled: orders.filter(o => o.status === 'cancelled').length,
    urgent: orders.filter(o => {
      const deadline = new Date(o.deadline)
      const today = new Date()
      const daysUntilDeadline = Math.ceil((deadline.getTime() - today.getTime()) / TIME.MS_PER_DAY)
      return daysUntilDeadline <= 3 && daysUntilDeadline >= 0 && o.status !== 'completed' && o.status !== 'cancelled'
    }).length,
    overdue: orders.filter(o => {
      const deadlineDate = new Date(o.deadline)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      return deadlineDate <= today && o.status !== 'completed' && o.status !== 'cancelled'
    }).length,
  }

  return (
    <div className="space-y-3">
      {/* Total Orders - Click to clear filters */}
      <div
        onClick={() => onFilterClick({ status: 'all', deadline: 'all', search: '', sortBy: 'deadline' })}
        className="bg-card p-4 rounded-lg border border-border cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 transition"
      >
        <p className="text-muted-foreground text-xs mb-1">{t('orderStats', 'totalOrders')}</p>
        <p className="text-2xl font-bold text-foreground">{stats.total}</p>
      </div>

      {/* In Progress - Click to filter */}
      <div
        onClick={() => onFilterClick({ status: 'in_progress', deadline: 'all', search: '', sortBy: 'deadline' })}
        className="bg-card p-4 rounded-lg border border-violet-200 dark:border-violet-700 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 transition"
      >
        <p className="text-muted-foreground text-xs mb-1">{t('orderStats', 'inProgress')}</p>
        <p className="text-2xl font-bold text-primary">{stats.in_progress}</p>
      </div>

      {/* Urgent - Click to filter */}
      <div
        onClick={() => onFilterClick({ status: 'all', deadline: 'urgent', search: '', sortBy: 'deadline' })}
        className="bg-card p-4 rounded-lg border border-yellow-200 dark:border-yellow-700 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 transition"
      >
        <p className="text-muted-foreground text-xs mb-1">{t('orderStats', 'urgentLabel')}</p>
        <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{stats.urgent}</p>
        <p className="text-xs text-muted-foreground mt-1">{t('orderStats', 'urgentDays')}</p>
      </div>

      {/* Overdue - Click to filter */}
      <div
        onClick={() => onFilterClick({ status: 'all', deadline: 'overdue', search: '', sortBy: 'deadline' })}
        className="bg-card p-4 rounded-lg border border-red-200 dark:border-red-700 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 transition"
      >
        <p className="text-muted-foreground text-xs mb-1">{t('orderStats', 'overdueLabel')}</p>
        <p className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.overdue}</p>
      </div>

      {/* Status Breakdown */}
      <div className="bg-card p-4 rounded-lg border border-border">
        <p className="text-muted-foreground text-xs mb-3">{t('orderStats', 'statusBreakdown')}</p>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-yellow-600"></div>
              <span className="text-foreground text-xs">{t('orderStatus', 'pending')}</span>
            </div>
            <span className="text-foreground text-xs font-semibold">{stats.pending}</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-violet-600"></div>
              <span className="text-foreground text-xs">{t('orderStatus', 'in_progress')}</span>
            </div>
            <span className="text-foreground text-xs font-semibold">{stats.in_progress}</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-600"></div>
              <span className="text-foreground text-xs">{t('orderStatus', 'completed')}</span>
            </div>
            <span className="text-foreground text-xs font-semibold">{stats.completed}</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-red-600"></div>
              <span className="text-foreground text-xs">{t('orderStatus', 'delayed')}</span>
            </div>
            <span className="text-foreground text-xs font-semibold">{stats.delayed}</span>
          </div>
        </div>

        {/* Progress Bar */}
        {stats.total > 0 && (
          <div className="mt-3 pt-3 border-t border-border">
            <div className="flex justify-between text-xs text-muted-foreground mb-2">
              <span>{t('orderStats', 'progress')}</span>
              <span>{Math.round((stats.completed / stats.total) * 100)}%</span>
            </div>
            <div className="w-full bg-secondary rounded-full h-2">
              <div
                className="bg-green-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(stats.completed / stats.total) * 100}%` }}
              ></div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
