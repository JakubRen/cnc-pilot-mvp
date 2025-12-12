'use client'

import Link from 'next/link'
import { useTranslation } from '@/hooks/useTranslation'

export default function ReportsTabs() {
  const { t } = useTranslation()

  const tabs = [
    { href: '/reports', labelKey: 'dashboard' as const, icon: '📊' },
    { href: '/reports/orders', labelKey: 'orders' as const, icon: '📋' },
    { href: '/reports/inventory', labelKey: 'inventory' as const, icon: '📦' },
    { href: '/reports/time', labelKey: 'timeTracking' as const, icon: '⏱️' },
    { href: '/reports/revenue', labelKey: 'revenue' as const, icon: '💰' },
  ]

  return (
    <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
      {tabs.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          className="px-4 py-2 rounded-lg font-semibold text-sm whitespace-nowrap transition hover:bg-slate-100 dark:hover:bg-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-700"
        >
          {tab.icon} {t('nav', tab.labelKey)}
        </Link>
      ))}
    </div>
  )
}
