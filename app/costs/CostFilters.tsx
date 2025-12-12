'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useTranslation } from '@/hooks/useTranslation'

interface CostFiltersProps {
  currentStatus: string
  currentProfitable: string
  currentDays: number
}

export default function CostFilters({ currentStatus, currentProfitable, currentDays }: CostFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { t } = useTranslation()

  const updateFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value === 'all' || value === '30') {
      params.delete(key)
    } else {
      params.set(key, value)
    }
    router.push(`/costs?${params.toString()}`)
  }

  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4 mb-6">
      <div className="flex flex-wrap gap-4 items-center">
        {/* Status Filter */}
        <div>
          <label className="text-slate-700 dark:text-slate-400 text-sm mr-2">{t('common', 'status')}:</label>
          <select
            value={currentStatus}
            onChange={(e) => updateFilter('status', e.target.value)}
            className="px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none"
          >
            <option value="all">{t('common', 'all')}</option>
            <option value="pending">{t('orderStatus', 'pending')}</option>
            <option value="in_progress">{t('orderStatus', 'in_progress')}</option>
            <option value="completed">{t('orderStatus', 'completed')}</option>
            <option value="delayed">{t('orderStatus', 'delayed')}</option>
            <option value="cancelled">{t('orderStatus', 'cancelled')}</option>
          </select>
        </div>

        {/* Profitability Filter */}
        <div>
          <label className="text-slate-700 dark:text-slate-400 text-sm mr-2">{t('costs', 'profitability')}:</label>
          <select
            value={currentProfitable}
            onChange={(e) => updateFilter('profitable', e.target.value)}
            className="px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none"
          >
            <option value="all">{t('common', 'all')}</option>
            <option value="profitable">{t('costs', 'profitable')}</option>
            <option value="unprofitable">{t('costs', 'unprofitable')}</option>
          </select>
        </div>

        {/* Days Filter */}
        <div>
          <label className="text-slate-700 dark:text-slate-400 text-sm mr-2">{t('costs', 'period')}:</label>
          <select
            value={currentDays}
            onChange={(e) => updateFilter('days', e.target.value)}
            className="px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none"
          >
            <option value="7">{t('costs', 'days7')}</option>
            <option value="14">{t('costs', 'days14')}</option>
            <option value="30">{t('costs', 'days30')}</option>
            <option value="60">{t('costs', 'days60')}</option>
            <option value="90">{t('costs', 'days90')}</option>
            <option value="365">{t('costs', 'year')}</option>
          </select>
        </div>

        {/* Reset */}
        {(currentStatus !== 'all' || currentProfitable !== 'all' || currentDays !== 30) && (
          <button
            onClick={() => router.push('/costs')}
            className="px-3 py-2 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition"
          >
            ✕ {t('costs', 'clearFilters')}
          </button>
        )}
      </div>
    </div>
  )
}
