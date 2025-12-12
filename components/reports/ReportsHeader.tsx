'use client'

import { useTranslation } from '@/hooks/useTranslation'

export default function ReportsHeader() {
  const { t } = useTranslation()

  return (
    <div className="mb-8">
      <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-2">
        {t('reports', 'titleAnalytics')}
      </h1>
      <p className="text-slate-500 dark:text-slate-400">
        {t('reports', 'subtitle')}
      </p>
    </div>
  )
}
