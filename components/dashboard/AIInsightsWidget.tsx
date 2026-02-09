'use client'

import { useState } from 'react'
import toast from 'react-hot-toast'
import { refreshInsights } from '@/lib/ai/insights-generator'
import type { AIInsightsData, AIInsight, InsightSeverity } from '@/types/ai-insights'

interface Props {
  initialInsights: AIInsightsData
  companyId: string
}

const SEVERITY_STYLES: Record<InsightSeverity, string> = {
  positive: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700/30 text-green-800 dark:text-green-300',
  warning: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-700/30 text-amber-800 dark:text-amber-300',
  critical: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700/30 text-red-800 dark:text-red-300',
  info: 'bg-violet-50 dark:bg-violet-900/20 border-violet-200 dark:border-violet-700/30 text-violet-800 dark:text-violet-300',
}

function timeAgo(dateString: string | null): string {
  if (!dateString) return ''
  const now = new Date()
  const date = new Date(dateString)
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return 'przed chwilą'
  if (diffMin < 60) return `${diffMin} min temu`
  const diffHours = Math.floor(diffMin / 60)
  if (diffHours < 24) return `${diffHours}h temu`
  return `${Math.floor(diffHours / 24)}d temu`
}

function InsightCard({ insight }: { insight: AIInsight }) {
  return (
    <div className={`border rounded-lg px-4 py-3 ${SEVERITY_STYLES[insight.severity]}`}>
      <div className="flex items-start gap-3">
        <span className="text-lg flex-shrink-0">{insight.icon}</span>
        <div className="min-w-0">
          <p className="font-medium text-sm">{insight.title}</p>
          <p className="text-xs mt-1 opacity-80">{insight.description}</p>
        </div>
      </div>
    </div>
  )
}

export default function AIInsightsWidget({ initialInsights, companyId }: Props) {
  const [data, setData] = useState<AIInsightsData>(initialInsights)
  const [isLoading, setIsLoading] = useState(false)
  const [lastRefresh, setLastRefresh] = useState<number>(0)

  const REFRESH_COOLDOWN_MS = 5 * 60 * 1000 // 5 minutes

  const canRefresh = Date.now() - lastRefresh > REFRESH_COOLDOWN_MS

  const handleRefresh = async () => {
    if (!canRefresh) {
      toast.error('Odczekaj 5 minut przed kolejnym odświeżeniem')
      return
    }

    setIsLoading(true)
    try {
      const result = await refreshInsights(companyId)
      setData(result)
      setLastRefresh(Date.now())
      toast.success('Insights zaktualizowane')
    } catch {
      toast.error('Błąd generowania insights')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-xl">🧠</span>
          <h3 className="text-lg font-semibold text-foreground">AI Insights</h3>
          {data.isStale && data.insights.length > 0 && (
            <span className="text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded-full">
              Nieaktualne
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {data.generatedAt && (
            <span className="text-xs text-muted-foreground">
              {timeAgo(data.generatedAt)}
            </span>
          )}
          <button
            onClick={handleRefresh}
            disabled={isLoading || !canRefresh}
            className="px-3 py-1.5 text-xs font-medium bg-primary/10 hover:bg-primary/20 text-primary rounded-md transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Generuję...
              </>
            ) : (
              'Odśwież'
            )}
          </button>
        </div>
      </div>

      {/* Content */}
      {data.insights.length > 0 ? (
        <div className="space-y-3">
          {data.insights.map((insight, i) => (
            <InsightCard key={`${insight.type}-${i}`} insight={insight} />
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <p className="text-muted-foreground text-sm mb-3">
            Kliknij Odśwież aby wygenerować insights
          </p>
          <p className="text-muted-foreground text-xs">
            AI przeanalizuje Twoje dane produkcyjne i poda konkretne rekomendacje
          </p>
        </div>
      )}
    </div>
  )
}
