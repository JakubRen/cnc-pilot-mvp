'use client'

import type { PricingEstimate } from '@/lib/pricing-engine'

interface Props {
  estimate: PricingEstimate | null
  loading: boolean
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

export default function DeadlineSuggestion({ estimate, loading, onApplyDeadline }: Props) {
  if (loading || !estimate || estimate.confidence === 'none' || estimate.orderCount === 0 || !estimate.avgDuration) {
    return null
  }

  const workingDays = Math.ceil(estimate.avgDuration / 8)
  const suggestedDate = addWorkingDays(new Date(), workingDays)
  const dateStr = suggestedDate.toISOString().split('T')[0]
  const displayDate = suggestedDate.toLocaleDateString('pl-PL', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })

  return (
    <div className="mt-2 flex items-center gap-2 text-xs">
      <span className="text-muted-foreground">
        Na podstawie {estimate.orderCount} podobnych ({estimate.avgDuration.toFixed(1)}h ~ {workingDays} dni rob.):
      </span>
      <button
        type="button"
        onClick={() => onApplyDeadline(dateStr)}
        className="px-2 py-0.5 bg-violet-600 hover:bg-violet-500 text-white rounded text-xs font-medium transition"
      >
        {displayDate}
      </button>
    </div>
  )
}
