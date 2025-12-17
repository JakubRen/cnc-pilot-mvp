/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import toast from 'react-hot-toast'
import type { UnifiedPricingResult } from '@/types/quotes'

interface UnifiedPricingCardProps {
  pricingResult: UnifiedPricingResult
  quantity: number
  onApply: (finalPrice: number, customMargin?: number | null) => void
  onCancel?: () => void
  allowEdit?: boolean
  isApplying?: boolean
  showCancelButton?: boolean
  applyButtonText?: string
}

export default function UnifiedPricingCard({
  pricingResult,
  quantity,
  onApply,
  onCancel,
  allowEdit = true,
  isApplying = false,
  showCancelButton = true,
  applyButtonText = '✅ Zastosuj cenę'
}: UnifiedPricingCardProps) {
  const [customPrice, setCustomPrice] = useState<number | null>(null)
  const [customMargin, setCustomMargin] = useState<number | null>(null)

  // Helper: Recalculate price when margin changes
  const handleMarginChange = (newMargin: number) => {
    const costBeforeMargin = pricingResult.recommended.breakdown.totalCostBeforeMargin || 0
    if (costBeforeMargin === 0) return

    const newPrice = costBeforeMargin * (1 + newMargin / 100)

    setCustomMargin(newMargin)
    setCustomPrice(newPrice)
  }

  // Helper: Get final price (custom or recommended)
  const getFinalPrice = () => {
    return customPrice ?? pricingResult.recommended.price
  }

  // Helper: Get final margin (custom or recommended)
  const getFinalMargin = () => {
    return customMargin ?? pricingResult.recommended.breakdown.marginPercentage
  }

  const handleReset = () => {
    setCustomPrice(null)
    setCustomMargin(null)
    toast.success('Przywrócono rekomendowaną cenę')
  }

  const handleApply = () => {
    onApply(getFinalPrice(), customMargin)
  }

  return (
    <div className="bg-gradient-to-br from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 border-2 border-green-500 rounded-lg p-8 shadow-xl">
      <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6 text-center">
        💰 Rekomendowana cena
      </h2>

      {/* Main Price Display */}
      <div className="bg-white dark:bg-slate-800 rounded-lg p-6 mb-6">
        <div className="text-center">
          {customPrice && (
            <div className="mb-2">
              <span className="inline-block px-3 py-1 bg-blue-600 text-white text-xs font-semibold rounded-full">
                ✏️ Cena dostosowana
              </span>
            </div>
          )}
          <div className={`text-5xl font-bold mb-2 ${customPrice ? 'text-blue-600 dark:text-blue-400' : 'text-green-600 dark:text-green-400'}`}>
            {getFinalPrice().toFixed(2)} PLN
          </div>
          <div className="text-slate-500 dark:text-slate-400">
            {(getFinalPrice() / quantity).toFixed(2)} PLN / szt.
          </div>
          {customPrice && pricingResult.recommended.price !== customPrice && (
            <div className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              <span className="line-through">Rekomendowana: {pricingResult.recommended.price.toFixed(2)} PLN</span>
            </div>
          )}
          <div className="mt-4 flex items-center justify-center gap-2 flex-wrap">
            <span className="px-3 py-1 bg-blue-600 text-white text-xs font-semibold rounded-full">
              {customPrice ? 'Ręcznie dostosowana' :
               pricingResult.recommended.method === 'rule_based' ? 'Kalkulator' :
               pricingResult.recommended.method === 'historical' ? 'Historia' :
               'Hybrid'}
            </span>
            {!customPrice && (
              <span className="px-3 py-1 bg-green-600 text-white text-xs font-semibold rounded-full">
                Pewność: {pricingResult.recommended.confidence}%
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Reasoning */}
      <div className="bg-white/50 dark:bg-slate-900/50 rounded-lg p-4 mb-6">
        <p className="text-sm text-slate-700 dark:text-slate-300">
          <strong>Uzasadnienie:</strong> {pricingResult.recommended.reasoning}
        </p>
      </div>

      {/* Breakdown */}
      <div className="grid grid-cols-2 gap-3 mb-6 text-sm">
        <div className="bg-white dark:bg-slate-800 rounded p-3">
          <p className="text-slate-500 dark:text-slate-400">Materiał</p>
          <p className="text-slate-900 dark:text-white font-semibold">
            {pricingResult.recommended.breakdown.materialCost.toFixed(2)} PLN
          </p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded p-3">
          <p className="text-slate-500 dark:text-slate-400">Robocizna</p>
          <p className="text-slate-900 dark:text-white font-semibold">
            {pricingResult.recommended.breakdown.laborCost.toFixed(2)} PLN
          </p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded p-3">
          <p className="text-slate-500 dark:text-slate-400">Setup</p>
          <p className="text-slate-900 dark:text-white font-semibold">
            {pricingResult.recommended.breakdown.setupCost.toFixed(2)} PLN
          </p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded p-3">
          <p className="text-slate-500 dark:text-slate-400">Marża</p>
          <p className="text-slate-900 dark:text-white font-semibold">
            {getFinalMargin()}%
          </p>
        </div>
      </div>

      {/* Editable Price Section */}
      {allowEdit && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-500 rounded-lg p-6 mb-6">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            ✏️ Dostosuj cenę
            {customPrice && (
              <span className="text-xs font-normal px-2 py-1 bg-blue-600 text-white rounded-full">
                Edytowane
              </span>
            )}
          </h3>

          <div className="space-y-4">
            {/* Manual Price Input */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Twoja finalna cena (PLN)
              </label>
              <Input
                type="number"
                value={getFinalPrice().toFixed(2)}
                onChange={(e) => {
                  const newPrice = parseFloat(e.target.value)
                  if (!isNaN(newPrice) && newPrice > 0) {
                    setCustomPrice(newPrice)
                    // Recalculate margin from new price
                    const costBeforeMargin = pricingResult.recommended.breakdown.totalCostBeforeMargin || 0
                    if (costBeforeMargin > 0) {
                      const newMargin = ((newPrice - costBeforeMargin) / costBeforeMargin) * 100
                      setCustomMargin(Math.max(0, newMargin))
                    }
                  }
                }}
                step="0.01"
                min="0"
                className="text-lg font-semibold"
              />
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Cena za całość ({quantity} szt.)
              </p>
            </div>

            {/* Margin Slider */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Marża: {getFinalMargin().toFixed(1)}%
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="0.5"
                  value={getFinalMargin()}
                  onChange={(e) => handleMarginChange(parseFloat(e.target.value))}
                  className="flex-1 h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-600 [&::-webkit-slider-thumb]:cursor-pointer"
                />
                <span className="text-sm font-semibold text-slate-900 dark:text-white min-w-[60px] text-right">
                  {getFinalMargin().toFixed(1)}%
                </span>
              </div>
              <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 mt-1">
                <span>0%</span>
                <span>Koszt: {(pricingResult.recommended.breakdown.totalCostBeforeMargin || 0).toFixed(2)} PLN</span>
                <span>100%</span>
              </div>
            </div>

            {/* Reset Button */}
            {customPrice && (
              <Button
                onClick={handleReset}
                variant="secondary"
                className="w-full"
              >
                🔄 Przywróć rekomendowaną cenę
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Compare Methods */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {pricingResult.estimates.ruleBased && (
          <div className="bg-white dark:bg-slate-800 rounded-lg p-4 text-center">
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">Kalkulator</p>
            <p className="text-xl font-bold text-slate-900 dark:text-white">
              {pricingResult.estimates.ruleBased.price.toFixed(2)}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {pricingResult.estimates.ruleBased.confidence}% pewności
            </p>
          </div>
        )}

        {pricingResult.estimates.historical && (
          <div className="bg-white dark:bg-slate-800 rounded-lg p-4 text-center">
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">Historia</p>
            <p className="text-xl font-bold text-slate-900 dark:text-white">
              {pricingResult.estimates.historical.price.toFixed(2)}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {pricingResult.estimates.historical.orderCount} zleceń
            </p>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-4">
        <Button
          onClick={handleApply}
          disabled={isApplying}
          className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-4 text-lg"
        >
          {isApplying ? 'Stosowanie...' : applyButtonText}
        </Button>
        {showCancelButton && onCancel && (
          <Button
            onClick={onCancel}
            variant="secondary"
            className="px-8"
          >
            ← Wróć
          </Button>
        )}
      </div>
    </div>
  )
}
