'use client'

import type { PricingEstimate } from '@/lib/pricing-engine'

interface Props {
  estimate: PricingEstimate | null
  loading: boolean
  /** Currently selected deadline (ISO date string, e.g. "2026-03-15") */
  currentDeadline?: string
  onApplyDeadline: (date: string) => void
}

/** Add working days to a date (skip weekends) */
function addWorkingDays(startDate: Date, days: number): Date {
  const result = new Date(startDate)
  let added = 0
  while (added < days) {
    result.setDate(result.getDate() + 1)
    const dayOfWeek = result.getDay()
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      added++
    }
  }
  return result
}

/** Count working days between two dates */
function workingDaysBetween(start: Date, end: Date): number {
  let count = 0
  const current = new Date(start)
  while (current < end) {
    current.setDate(current.getDate() + 1)
    const day = current.getDay()
    if (day !== 0 && day !== 6) count++
  }
  return count
}

type DeadlineVerdict = 'realistic' | 'tight' | 'unrealistic'

interface DeadlineAnalysis {
  verdict: DeadlineVerdict
  suggestedDateStr: string
  suggestedDisplayDate: string
  workingDaysNeeded: number
  workingDaysAvailable: number
  bufferDays: number
}

function analyzeDeadline(
  avgDuration: number,
  currentDeadline: string | undefined
): DeadlineAnalysis | null {
  const workingDaysNeeded = Math.ceil(avgDuration / 8)
  const suggestedDate = addWorkingDays(new Date(), workingDaysNeeded)
  const suggestedDateStr = suggestedDate.toISOString().split('T')[0]
  const suggestedDisplayDate = suggestedDate.toLocaleDateString('pl-PL', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })

  if (!currentDeadline) {
    return {
      verdict: 'realistic',
      suggestedDateStr,
      suggestedDisplayDate,
      workingDaysNeeded,
      workingDaysAvailable: workingDaysNeeded,
      bufferDays: 0,
    }
  }

  const deadlineDate = new Date(currentDeadline)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const workingDaysAvailable = workingDaysBetween(today, deadlineDate)
  const bufferDays = workingDaysAvailable - workingDaysNeeded

  let verdict: DeadlineVerdict
  if (bufferDays >= 2) {
    verdict = 'realistic'
  } else if (bufferDays >= 0) {
    verdict = 'tight'
  } else {
    verdict = 'unrealistic'
  }

  return {
    verdict,
    suggestedDateStr,
    suggestedDisplayDate,
    workingDaysNeeded,
    workingDaysAvailable,
    bufferDays,
  }
}

const VERDICT_STYLES: Record<DeadlineVerdict, { label: string; bg: string; text: string; border: string }> = {
  realistic: {
    label: 'Realny',
    bg: 'bg-green-100 dark:bg-green-900/30',
    text: 'text-green-700 dark:text-green-300',
    border: 'border-green-200 dark:border-green-800/30',
  },
  tight: {
    label: 'Napiety',
    bg: 'bg-amber-100 dark:bg-amber-900/30',
    text: 'text-amber-700 dark:text-amber-300',
    border: 'border-amber-200 dark:border-amber-800/30',
  },
  unrealistic: {
    label: 'Nierealistyczny',
    bg: 'bg-red-100 dark:bg-red-900/30',
    text: 'text-red-700 dark:text-red-300',
    border: 'border-red-200 dark:border-red-800/30',
  },
}

export default function DeadlineSuggestion({ estimate, loading, currentDeadline, onApplyDeadline }: Props) {
  if (loading || !estimate || estimate.confidence === 'none' || estimate.orderCount === 0 || !estimate.avgDuration) {
    return null
  }

  const analysis = analyzeDeadline(estimate.avgDuration, currentDeadline)
  if (!analysis) return null

  const style = VERDICT_STYLES[analysis.verdict]

  return (
    <div className="mt-2 space-y-1.5">
      {/* Suggestion row */}
      <div className="flex items-center gap-2 text-xs">
        <span className="text-muted-foreground">
          Na podstawie {estimate.orderCount} podobnych ({estimate.avgDuration.toFixed(1)}h ~ {analysis.workingDaysNeeded} dni rob.):
        </span>
        <button
          type="button"
          onClick={() => onApplyDeadline(analysis.suggestedDateStr)}
          className="px-2 py-0.5 bg-violet-600 hover:bg-violet-500 text-white rounded text-xs font-medium transition"
        >
          {analysis.suggestedDisplayDate}
        </button>
      </div>

      {/* Verdict badge — only show when a deadline is already selected */}
      {currentDeadline && (
        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-medium ${style.bg} ${style.text} ${style.border}`}>
          <span className={`inline-block w-1.5 h-1.5 rounded-full ${
            analysis.verdict === 'realistic' ? 'bg-green-500' :
            analysis.verdict === 'tight' ? 'bg-amber-500' : 'bg-red-500'
          }`} />
          <span>{style.label}</span>
          {analysis.verdict === 'unrealistic' && (
            <span className="font-normal ml-1">
              (brakuje {Math.abs(analysis.bufferDays)} dni rob.)
            </span>
          )}
          {analysis.verdict === 'tight' && (
            <span className="font-normal ml-1">
              (bez zapasu)
            </span>
          )}
          {analysis.verdict === 'realistic' && (
            <span className="font-normal ml-1">
              (+{analysis.bufferDays} dni zapasu)
            </span>
          )}
        </div>
      )}

      {/* Warning with suggested alternative for unrealistic deadlines */}
      {currentDeadline && analysis.verdict === 'unrealistic' && (
        <div className="flex items-center gap-2 text-xs bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/30 rounded-md px-2.5 py-1.5">
          <span className="text-red-500 flex-shrink-0">!</span>
          <span className="text-red-600 dark:text-red-400">
            Sugerowany termin to{' '}
            <button
              type="button"
              onClick={() => onApplyDeadline(analysis.suggestedDateStr)}
              className="font-semibold underline hover:no-underline"
            >
              {analysis.suggestedDisplayDate}
            </button>
            {' '}({analysis.workingDaysNeeded} dni rob.)
          </span>
        </div>
      )}
    </div>
  )
}
