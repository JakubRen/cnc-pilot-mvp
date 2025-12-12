'use client'

import { useTranslation } from '@/hooks/useTranslation'

export default function ExpiredLinkMessage() {
  const { t } = useTranslation()

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-8 max-w-md text-center">
        <div className="text-6xl mb-4">⏰</div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">{t('clientPortal', 'linkExpired')}</h1>
        <p className="text-slate-500 dark:text-slate-400">
          {t('clientPortal', 'linkExpiredMessage')}
        </p>
      </div>
    </div>
  )
}
