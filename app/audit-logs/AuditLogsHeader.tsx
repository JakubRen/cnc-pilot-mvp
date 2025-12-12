'use client'

import { useTranslation } from '@/hooks/useTranslation'

export default function AuditLogsHeader() {
  const { t } = useTranslation()

  return (
    <div className="mb-8">
      <h1 className="text-4xl font-bold text-white mb-2">{t('auditLogs', 'title')}</h1>
      <p className="text-slate-400">
        {t('auditLogs', 'subtitle')}
      </p>
    </div>
  )
}
