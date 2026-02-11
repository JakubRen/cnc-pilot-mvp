'use client'

import { useState } from 'react'
import toast from 'react-hot-toast'
import { Skeleton } from '@/components/ui/Skeleton'
import StockoutAlert from './StockoutAlert'
import { getInventoryPredictions } from '@/lib/ai/inventory-predictions'
import type { InventoryPredictionsData, InventoryPrediction } from '@/types/ai-expansion'

interface Props {
  companyId: string
}

function PredictionRow({ prediction }: { prediction: InventoryPrediction }) {
  const urgencyColor: Record<string, string> = {
    critical: 'text-red-600 dark:text-red-400 font-bold',
    warning: 'text-amber-600 dark:text-amber-400 font-semibold',
    ok: 'text-green-600 dark:text-green-400',
  }

  return (
    <tr className="border-b border-border last:border-0 hover:bg-muted/50 transition">
      <td className="py-2.5 px-3 text-sm text-foreground font-medium">
        {prediction.itemName}
        <span className="block text-[10px] text-muted-foreground">{prediction.sku}</span>
      </td>
      <td className="py-2.5 px-3 text-sm text-foreground text-right">
        {prediction.currentStock}
      </td>
      <td className="py-2.5 px-3 text-xs text-muted-foreground text-right">
        {prediction.usageVelocity.toFixed(1)}/d
      </td>
      <td className={`py-2.5 px-3 text-sm text-right ${urgencyColor[prediction.urgency]}`}>
        {prediction.daysUntilStockout <= 0 ? 'Wyczerpane!' : `${prediction.daysUntilStockout}d`}
      </td>
      <td className="py-2.5 px-3 text-xs text-muted-foreground">
        {prediction.reorderRecommendation || '-'}
      </td>
    </tr>
  )
}

function LoadingSkeleton() {
  return (
    <div className="space-y-3 p-4">
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-16 w-full" />
    </div>
  )
}

export default function InventoryPredictionsPanel({ companyId }: Props) {
  const [data, setData] = useState<InventoryPredictionsData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isAnalysisExpanded, setIsAnalysisExpanded] = useState(false)

  const handleGenerate = async () => {
    setIsLoading(true)
    try {
      const result = await getInventoryPredictions(companyId)
      setData(result)
    } catch {
      toast.error('Blad predykcji stanow magazynowych')
    } finally {
      setIsLoading(false)
    }
  }

  // Initial state
  if (!data && !isLoading) {
    return (
      <div className="bg-card border border-border rounded-lg p-6">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-lg">&#x1F4E6;</span>
            <h3 className="text-lg font-semibold text-foreground">Predykcja Magazynu AI</h3>
          </div>
          <button
            onClick={handleGenerate}
            className="px-3 py-1.5 text-xs font-medium bg-violet-600 hover:bg-violet-500 text-white rounded-md transition"
          >
            Analizuj
          </button>
        </div>
        <p className="text-xs text-muted-foreground">
          AI przewidzi kiedy skonczy sie material i zaproponuje zamowienia uzupelniajace.
        </p>
      </div>
    )
  }

  // Loading
  if (isLoading) {
    return (
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="flex items-center gap-2 p-4 border-b border-border">
          <svg className="animate-spin h-4 w-4 text-violet-500" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <h3 className="text-sm font-semibold text-foreground">Analizuje magazyn...</h3>
        </div>
        <LoadingSkeleton />
      </div>
    )
  }

  if (!data) return null

  const criticalPredictions = data.predictions.filter(p => p.urgency === 'critical')
  const otherPredictions = data.predictions.filter(p => p.urgency !== 'critical')

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <span className="text-lg">&#x1F4E6;</span>
          <h3 className="text-sm font-semibold text-foreground">Predykcja Magazynu AI</h3>
          {data.criticalCount > 0 && (
            <span className="text-xs font-bold bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300 px-2 py-0.5 rounded">
              {data.criticalCount} krytycznych
            </span>
          )}
        </div>
        <button
          onClick={handleGenerate}
          className="px-2 py-1 text-[10px] font-medium bg-primary/10 hover:bg-primary/20 text-primary rounded transition"
        >
          Odswiez
        </button>
      </div>

      <div className="p-4 space-y-4">
        {/* Critical alerts as cards */}
        {criticalPredictions.length > 0 && (
          <div className="space-y-2">
            {criticalPredictions.map((pred) => (
              <StockoutAlert key={pred.itemId} prediction={pred} />
            ))}
          </div>
        )}

        {/* Predictions table */}
        {data.predictions.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-border">
                  <th className="py-2 px-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Pozycja</th>
                  <th className="py-2 px-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider text-right">Stan</th>
                  <th className="py-2 px-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider text-right">Zuzycie</th>
                  <th className="py-2 px-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider text-right">Do wyczerp.</th>
                  <th className="py-2 px-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Rekomendacja</th>
                </tr>
              </thead>
              <tbody>
                {data.predictions.map((pred) => (
                  <PredictionRow key={pred.itemId} prediction={pred} />
                ))}
              </tbody>
            </table>
          </div>
        )}

        {data.predictions.length === 0 && (
          <div className="text-center py-6">
            <p className="text-sm text-green-600 dark:text-green-400 font-medium">
              Brak zagrozen dla stanow magazynowych
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Wszystkie pozycje maja wystarczajace zapasy
            </p>
          </div>
        )}

        {/* AI Analysis (collapsible) */}
        {data.aiAnalysis && (
          <div className="border border-border rounded-lg overflow-hidden">
            <button
              onClick={() => setIsAnalysisExpanded(!isAnalysisExpanded)}
              className="w-full flex items-center justify-between p-3 text-sm font-medium text-foreground hover:bg-muted/50 transition"
            >
              <span>Analiza AI</span>
              <svg
                className={`h-4 w-4 transition-transform text-muted-foreground ${isAnalysisExpanded ? 'rotate-180' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {isAnalysisExpanded && (
              <div className="px-3 pb-3">
                <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                  {data.aiAnalysis}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
