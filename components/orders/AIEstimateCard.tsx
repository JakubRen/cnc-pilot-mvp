'use client'

import type { PriceEstimateResult } from '@/lib/ai/openai-client'

interface AIEstimateCardProps {
  estimate: PriceEstimateResult
  onApplyPrice: (price: number) => void
  onApplyCosts: (material: number, labor: number, overhead: number) => void
  onDismiss: () => void
}

export default function AIEstimateCard({ estimate, onApplyPrice, onApplyCosts, onDismiss }: AIEstimateCardProps) {
  const confidenceColor = estimate.confidence >= 70
    ? 'text-green-600 dark:text-green-400'
    : estimate.confidence >= 40
    ? 'text-amber-600 dark:text-amber-400'
    : 'text-red-600 dark:text-red-400'

  return (
    <div className="bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20 border border-violet-300 dark:border-violet-600/40 rounded-lg p-5 relative">
      {/* Close button */}
      <button
        onClick={onDismiss}
        className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition text-sm"
      >
        ✕
      </button>

      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xl">✨</span>
        <h4 className="font-bold text-foreground">AI Wycena (Gemini)</h4>
        <span className={`text-xs font-semibold ${confidenceColor}`}>
          {estimate.confidence}% pewności
        </span>
      </div>

      {/* Main price */}
      <div className="mb-4">
        <p className="text-muted-foreground text-xs mb-1">Szacowana cena</p>
        <span className="text-3xl font-bold text-foreground">{estimate.estimatedPrice.toFixed(2)}</span>
        <span className="text-sm text-muted-foreground ml-1">PLN</span>
        <span className="text-muted-foreground text-sm ml-3">
          (~{estimate.estimatedHours.toFixed(1)}h pracy)
        </span>
      </div>

      {/* Breakdown */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <div className="bg-white/60 dark:bg-white/5 rounded-md p-2">
          <p className="text-muted-foreground text-[10px]">Materiał</p>
          <p className="text-foreground font-semibold text-sm">{estimate.breakdown.materialCost.toFixed(0)} PLN</p>
        </div>
        <div className="bg-white/60 dark:bg-white/5 rounded-md p-2">
          <p className="text-muted-foreground text-[10px]">Praca</p>
          <p className="text-foreground font-semibold text-sm">{estimate.breakdown.laborCost.toFixed(0)} PLN</p>
        </div>
        <div className="bg-white/60 dark:bg-white/5 rounded-md p-2">
          <p className="text-muted-foreground text-[10px]">Maszyna</p>
          <p className="text-foreground font-semibold text-sm">{estimate.breakdown.machineTimeCost.toFixed(0)} PLN</p>
        </div>
        <div className="bg-white/60 dark:bg-white/5 rounded-md p-2">
          <p className="text-muted-foreground text-[10px]">Narzut</p>
          <p className="text-foreground font-semibold text-sm">{estimate.breakdown.overhead.toFixed(0)} PLN</p>
        </div>
      </div>

      {/* Reasoning */}
      <p className="text-muted-foreground text-xs mb-4 italic">
        {estimate.reasoning}
      </p>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={() => onApplyCosts(
            estimate.breakdown.materialCost,
            estimate.breakdown.laborCost,
            estimate.breakdown.machineTimeCost + estimate.breakdown.overhead
          )}
          className="flex-1 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-md text-sm font-semibold transition"
        >
          Zastosuj koszty
        </button>
        <button
          onClick={() => onApplyPrice(estimate.estimatedPrice)}
          className="px-4 py-2 bg-white/80 dark:bg-white/10 hover:bg-white dark:hover:bg-white/20 text-foreground border border-border rounded-md text-sm font-medium transition"
        >
          Jako cena sprzedaży
        </button>
      </div>
    </div>
  )
}
