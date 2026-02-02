'use client'

import { useTranslation } from '@/hooks/useTranslation'

export default function ExpiredLinkMessage() {
  const { t } = useTranslation()

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-lg p-8 max-w-md text-center">
        <div className="text-6xl mb-4">⏰</div>
        <h1 className="text-2xl font-bold text-foreground mb-2">{t('clientPortal', 'linkExpired')}</h1>
        <p className="text-muted-foreground">
          {t('clientPortal', 'linkExpiredMessage')}
        </p>
      </div>
    </div>
  )
}
