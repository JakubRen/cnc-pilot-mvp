'use client'

import { useState, useEffect, useRef } from 'react'
import toast from 'react-hot-toast'
import { Skeleton } from '@/components/ui/Skeleton'
import { getReportSummary } from '@/lib/ai/report-summaries'
import type { AIReportSummaryData, ReportType, TrendDirection, ReportFinding, ReportRecommendation } from '@/types/ai-expansion'

interface Props {
  reportType: ReportType
  companyId: string
  data?: Record<string, unknown>
}

const TREND_STYLES: Record<TrendDirection, { label: string; color: string; icon: string }> = {
  improving: {
    label: 'Poprawia sie',
    color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
    icon: '\u2191',
  },
  stable: {
    label: 'Stabilny',
    color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    icon: '\u2192',
  },
  declining: {
    label: 'Spada',
    color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
    icon: '\u2193',
  },
  mixed: {
    label: 'Mieszany',
    color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
    icon: '\u2194',
  },
}

const FINDING_SEVERITY_STYLES: Record<string, string> = {
  positive: 'text-green-600 dark:text-green-400',
  warning: 'text-amber-600 dark:text-amber-400',
  critical: 'text-red-600 dark:text-red-400',
  info: 'text-violet-600 dark:text-violet-400',
}

const PRIORITY_STYLES: Record<string, string> = {
  high: 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800/30',
  medium: 'bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800/30',
  low: 'bg-slate-50 dark:bg-slate-800/30 border-slate-200 dark:border-slate-700/30',
}

const STALE_THRESHOLD_MS = 4 * 60 * 60 * 1000 // 4 hours

function TrendBadge({ trend }: { trend: TrendDirection }) {
  const style = TREND_STYLES[trend]
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${style.color}`}>
      {style.icon} {style.label}
    </span>
  )
}

function FindingItem({ finding }: { finding: ReportFinding }) {
  return (
    <li className="flex items-start gap-2 text-sm">
      <span className={`flex-shrink-0 ${FINDING_SEVERITY_STYLES[finding.severity]}`}>
        {finding.icon}
      </span>
      <span className="text-foreground">{finding.text}</span>
    </li>
  )
}

function RecommendationItem({ rec }: { rec: ReportRecommendation }) {
  return (
    <li className={`border rounded-lg px-3 py-2 text-sm text-foreground ${PRIORITY_STYLES[rec.priority]}`}>
      {rec.text}
    </li>
  )
}

function LoadingSkeleton() {
  return (
    <div className="space-y-3 p-4">
      <div className="flex items-center gap-2">
        <Skeleton className="h-5 w-5 rounded" />
        <Skeleton className="h-4 w-48" />
      </div>
      <Skeleton className="h-16 w-full" />
      <div className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-5/6" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    </div>
  )
}

function timeAgo(dateString: string): string {
  const now = new Date()
  const date = new Date(dateString)
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return 'przed chwila'
  if (diffMin < 60) return `${diffMin} min temu`
  const diffHours = Math.floor(diffMin / 60)
  if (diffHours < 24) return `${diffHours}h temu`
  return `${Math.floor(diffHours / 24)}d temu`
}

function isStale(dateString: string): boolean {
  return Date.now() - new Date(dateString).getTime() > STALE_THRESHOLD_MS
}

export default function AIReportSummary({ reportType, companyId, data: reportData }: Props) {
  const [data, setData] = useState<AIReportSummaryData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isExpanded, setIsExpanded] = useState(true)
  const [lastGenerated, setLastGenerated] = useState<number>(0)
  const hasAutoLoaded = useRef(false)

  const COOLDOWN_MS = 2 * 60 * 1000 // 2 minutes

  const canRefresh = Date.now() - lastGenerated > COOLDOWN_MS

  const handleGenerate = async () => {
    if (!companyId) return
    if (!canRefresh && data) {
      toast.error('Odczekaj 2 minuty przed kolejnym odswiezeniem')
      return
    }

    setIsLoading(true)
    try {
      const result = await getReportSummary(reportType, companyId, reportData)
      setData(result)
      setLastGenerated(Date.now())
      setIsExpanded(true)
    } catch (err) {
      console.error('[AIReportSummary] Error:', err)
      toast.error('Blad generowania podsumowania AI')
    } finally {
      setIsLoading(false)
    }
  }

  // Auto-load on mount when companyId is available
  useEffect(() => {
    if (companyId && !hasAutoLoaded.current) {
      hasAutoLoaded.current = true
      handleGenerate()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId])

  const hasContent = data && (data.findings.length > 0 || data.recommendations.length > 0)

  // Loading state
  if (isLoading && !data) {
    return (
      <div className="bg-card border border-border rounded-lg mb-6 overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <svg className="animate-spin h-4 w-4 text-violet-500" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <h3 className="text-sm font-semibold text-foreground">Analizuje dane...</h3>
          </div>
        </div>
        <LoadingSkeleton />
      </div>
    )
  }

  // No data yet (companyId not ready or failed silently)
  if (!data) return null

  return (
    <div className="bg-card border border-border rounded-lg mb-6 overflow-hidden animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <span className="text-lg">&#x1F9E0;</span>
          <h3 className="text-sm font-semibold text-foreground">Podsumowanie AI</h3>
          <TrendBadge trend={data.trend} />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground">
            {timeAgo(data.generatedAt)}
          </span>
          {isStale(data.generatedAt) && (
            <span className="text-[10px] font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 px-1.5 py-0.5 rounded">
              nieaktualne
            </span>
          )}
          <button
            onClick={handleGenerate}
            disabled={!canRefresh || isLoading}
            className="px-2 py-1 text-[10px] font-medium bg-primary/10 hover:bg-primary/20 text-primary rounded transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Laduje...' : 'Odswiez'}
          </button>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 text-muted-foreground hover:text-foreground transition"
            aria-label={isExpanded ? 'Zwi\u0144' : 'Rozwi\u0144'}
          >
            <svg
              className={`h-4 w-4 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Animated collapsible content */}
      <div
        className={`transition-all duration-300 overflow-hidden ${
          isExpanded ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        {hasContent ? (
          <div className="p-4 space-y-4">
            {/* Summary text */}
            <p className="text-sm text-foreground leading-relaxed">
              {data.summary}
            </p>

            {/* Key Findings */}
            {data.findings.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Kluczowe ustalenia
                </h4>
                <ul className="space-y-1.5">
                  {data.findings.map((finding, i) => (
                    <FindingItem key={i} finding={finding} />
                  ))}
                </ul>
              </div>
            )}

            {/* Recommendations */}
            {data.recommendations.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Rekomendacje
                </h4>
                <ul className="space-y-2">
                  {data.recommendations.map((rec, i) => (
                    <RecommendationItem key={i} rec={rec} />
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : (
          <div className="p-4 text-center">
            <p className="text-sm text-muted-foreground">
              {data.summary}
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Brak danych do analizy. Dodaj wiecej zlecen aby zobaczyc wnioski AI.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
