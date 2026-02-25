'use client'

/**
 * QualityRiskBadge — displays AI-predicted quality defect risk
 * for an order as a color-coded badge with tooltip showing risk factors.
 *
 * Colors: green (low, <20%), amber (medium, 20-50%), red (high, >50%)
 */

interface RiskFactor {
  factor: string
  weight: number
}

interface Props {
  /** Quality defect risk as a percentage (0-100) */
  risk: number | null | undefined
  /** Risk level label from backend */
  riskLevel?: 'low' | 'medium' | 'high' | null
  /** Breakdown of contributing risk factors */
  riskFactors?: RiskFactor[]
  /** Badge size */
  size?: 'sm' | 'md'
}

function getRiskStyle(risk: number): {
  label: string
  bg: string
  text: string
  dot: string
} {
  if (risk < 20) {
    return {
      label: 'Niskie',
      bg: 'bg-green-100 dark:bg-green-900/30',
      text: 'text-green-700 dark:text-green-300',
      dot: 'bg-green-500',
    }
  }
  if (risk <= 50) {
    return {
      label: 'Srednie',
      bg: 'bg-amber-100 dark:bg-amber-900/30',
      text: 'text-amber-700 dark:text-amber-300',
      dot: 'bg-amber-500',
    }
  }
  return {
    label: 'Wysokie',
    bg: 'bg-red-100 dark:bg-red-900/30',
    text: 'text-red-700 dark:text-red-300',
    dot: 'bg-red-500',
  }
}

export default function QualityRiskBadge({ risk, riskLevel, riskFactors, size = 'sm' }: Props) {
  if (risk == null) return null

  const clamped = Math.max(0, Math.min(100, Math.round(risk)))
  const style = getRiskStyle(clamped)

  const sizeClasses = size === 'sm'
    ? 'text-[10px] px-1.5 py-0.5 gap-1'
    : 'text-xs px-2 py-0.5 gap-1.5'

  // Build tooltip text with risk factors breakdown
  const tooltipParts = [`Ryzyko wad jakościowych: ${clamped}%`]
  if (riskLevel) {
    tooltipParts[0] = `Ryzyko: ${clamped}% (${riskLevel === 'low' ? 'niskie' : riskLevel === 'medium' ? 'średnie' : 'wysokie'})`
  }
  if (riskFactors && riskFactors.length > 0) {
    tooltipParts.push('')
    tooltipParts.push('Czynniki ryzyka:')
    for (const rf of riskFactors.slice(0, 5)) {
      tooltipParts.push(`- ${rf.factor} (${rf.weight}%)`)
    }
  }

  return (
    <span
      className={`inline-flex items-center rounded-full font-semibold ${style.bg} ${style.text} ${sizeClasses}`}
      title={tooltipParts.join('\n')}
    >
      <span className={`inline-block w-1.5 h-1.5 rounded-full ${style.dot}`} />
      {clamped}%
    </span>
  )
}
