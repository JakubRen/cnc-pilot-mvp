'use client'

import { useTranslation } from '@/hooks/useTranslation'

export default function NoAccessMessage() {
  const { t } = useTranslation()

  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <div className="bg-red-900/20 border border-red-700/50 rounded-lg p-8 text-center max-w-md">
        <h1 className="text-2xl font-bold text-red-200 mb-4">{t('auditLogs', 'noAccess')}</h1>
        <p className="text-red-300">
          {t('auditLogs', 'noAccessMessage')}
        </p>
      </div>
    </div>
  )
}
