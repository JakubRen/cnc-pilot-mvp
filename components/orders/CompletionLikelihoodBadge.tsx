'use client'

/**
 * CompletionLikelihoodBadge — displays AI-predicted completion likelihood
 * for an order as a color-coded badge with optional tooltip.
 *
 * Colors: green (>80%), yellow (50-80%), red (<50%)
 */

interface Props {
  /** Completion likelihood as a percentage (0-100) */
  likelihood: number | null | undefined
  /** Optional AI recommendation text shown as title tooltip */
  recommendation?: string
  /** Badge size */
  size?: 'sm' | 'md'
}

function getLikelihoodStyle(likelihood: number): {
  label: string
  bg: string
  text: string
  dot: string
} {
  if (likelihood >= 80) {
    return {
      label: 'Wysoka',
      bg: 'bg-green-100 dark:bg-green-900/30',
      text: 'text-green-700 dark:text-green-300',
      dot: 'bg-green-500',
    }
  }
  if (likelihood >= 50) {
    return {
      label: 'Srednia',
      bg: 'bg-amber-100 dark:bg-amber-900/30',
      text: 'text-amber-700 dark:text-amber-300',
      dot: 'bg-amber-500',
    }
  }
  return {
    label: 'Niska',
    bg: 'bg-red-100 dark:bg-red-900/30',
    text: 'text-red-700 dark:text-red-300',
    dot: 'bg-red-500',
  }
}

export default function CompletionLikelihoodBadge({ likelihood, recommendation, size = 'sm' }: Props) {
  if (likelihood == null) return null

  const clamped = Math.max(0, Math.min(100, Math.round(likelihood)))
  const style = getLikelihoodStyle(clamped)

  const sizeClasses = size === 'sm'
    ? 'text-[10px] px-1.5 py-0.5 gap-1'
    : 'text-xs px-2 py-0.5 gap-1.5'

  return (
    <span
      className={`inline-flex items-center rounded-full font-semibold ${style.bg} ${style.text} ${sizeClasses}`}
      title={recommendation || `Prawdopodobienstwo terminowej realizacji: ${clamped}%`}
    >
      <span className={`inline-block w-1.5 h-1.5 rounded-full ${style.dot}`} />
      {clamped}%
    </span>
  )
}
