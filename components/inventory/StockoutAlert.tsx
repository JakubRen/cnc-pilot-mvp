'use client'

import type { InventoryPrediction } from '@/types/ai-expansion'

interface Props {
  prediction: InventoryPrediction
}

const URGENCY_STYLES: Record<string, { bg: string; border: string; text: string; badge: string }> = {
  critical: {
    bg: 'bg-red-50 dark:bg-red-900/10',
    border: 'border-red-100 dark:border-red-900/30',
    text: 'text-red-800 dark:text-red-300',
    badge: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300',
  },
  warning: {
    bg: 'bg-amber-50 dark:bg-amber-900/10',
    border: 'border-amber-100 dark:border-amber-900/30',
    text: 'text-amber-800 dark:text-amber-300',
    badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300',
  },
  ok: {
    bg: 'bg-green-50 dark:bg-green-900/10',
    border: 'border-green-100 dark:border-green-900/30',
    text: 'text-green-800 dark:text-green-300',
    badge: 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300',
  },
}

export default function StockoutAlert({ prediction }: Props) {
  const style = URGENCY_STYLES[prediction.urgency] || URGENCY_STYLES.warning

  return (
    <div className={`${style.bg} border ${style.border} rounded-lg p-3`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className={`font-medium text-sm ${style.text}`}>
            {prediction.itemName}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            SKU: {prediction.sku} | Stan: {prediction.currentStock} szt.
          </p>
          {prediction.reorderRecommendation && (
            <p className="text-xs text-muted-foreground mt-1">
              {prediction.reorderRecommendation}
            </p>
          )}
        </div>
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          <span className={`text-[10px] uppercase font-bold ${style.badge} px-2 py-0.5 rounded`}>
            {prediction.daysUntilStockout <= 0 ? 'BRAK' : `${prediction.daysUntilStockout}d`}
          </span>
          <span className="text-[10px] text-muted-foreground">
            {prediction.usageVelocity.toFixed(1)}/dzien
          </span>
        </div>
      </div>
    </div>
  )
}
