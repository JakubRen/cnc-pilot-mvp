'use client'

import { useTranslation } from '@/hooks/useTranslation'
import Link from 'next/link'

interface CalendarStats {
  totalOrders: number
  pendingCount: number
  inProgressCount: number
  delayedCount: number
}

export default function CalendarPageClient({ stats, children }: { stats: CalendarStats; children: React.ReactNode }) {
  const { t } = useTranslation()

  return (
    <>
      {/* Header */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-4xl font-bold text-foreground mb-2">{t('calendar', 'title')}</h1>
          <p className="text-muted-foreground">
            {t('calendar', 'subtitle')}
          </p>
        </div>
        <Link
          href="/orders/add"
          className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg transition flex items-center gap-2"
        >
          <span>+</span> {t('calendar', 'newOrder')}
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-muted-foreground text-sm">{t('calendar', 'allOrders')}</p>
          <p className="text-2xl font-bold text-foreground">{stats.totalOrders}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-muted-foreground text-sm">{t('orderStatus', 'pending')}</p>
          <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{stats.pendingCount}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-muted-foreground text-sm">{t('orderStatus', 'in_progress')}</p>
          <p className="text-2xl font-bold text-primary">{stats.inProgressCount}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-muted-foreground text-sm">{t('orderStatus', 'delayed')}</p>
          <p className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.delayedCount}</p>
        </div>
      </div>

      {/* Calendar component */}
      {children}
    </>
  )
}
