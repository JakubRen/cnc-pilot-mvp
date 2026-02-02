'use client'

import { useTranslation } from '@/hooks/useTranslation'

export default function ReportsHeader() {
  const { t } = useTranslation()

  return (
    <div className="mb-8">
      <h1 className="text-4xl font-bold text-foreground mb-2">
        {t('reports', 'titleAnalytics')}
      </h1>
      <p className="text-muted-foreground">
        {t('reports', 'subtitle')}
      </p>
    </div>
  )
}
