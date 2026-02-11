'use client'

import type { ChurnRiskLevel } from '@/types/ai-expansion'

interface Props {
  riskLevel: ChurnRiskLevel
  size?: 'sm' | 'default'
}

const RISK_STYLES: Record<ChurnRiskLevel, { bg: string; text: string; label: string; dot: string }> = {
  high: {
    bg: 'bg-red-100 dark:bg-red-900/30',
    text: 'text-red-700 dark:text-red-300',
    label: 'Wysoki',
    dot: 'bg-red-500',
  },
  medium: {
    bg: 'bg-amber-100 dark:bg-amber-900/30',
    text: 'text-amber-700 dark:text-amber-300',
    label: 'Sredni',
    dot: 'bg-amber-500',
  },
  low: {
    bg: 'bg-green-100 dark:bg-green-900/30',
    text: 'text-green-700 dark:text-green-300',
    label: 'Niski',
    dot: 'bg-green-500',
  },
}

export default function CustomerRiskBadge({ riskLevel, size = 'default' }: Props) {
  const style = RISK_STYLES[riskLevel]

  const sizeClasses = size === 'sm'
    ? 'px-1.5 py-0.5 text-[10px]'
    : 'px-2 py-0.5 text-xs'

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-semibold ${style.bg} ${style.text} ${sizeClasses}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
      {style.label}
    </span>
  )
}
