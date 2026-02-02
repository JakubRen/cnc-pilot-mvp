'use client'

import { useState } from 'react'
import { TIME } from '@/lib/constants/time'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { logger } from '@/lib/logger'

interface TimeLog {
  id: string
  start_time: string
  end_time: string | null
  status: string
  hourly_rate: number
  users?: { full_name: string }
}

interface OrderCostAnalysisProps {
  orderId: string
  quantity: number
  // Szacowane koszty (z formularza)
  estimatedMaterialCost: number
  estimatedLaborCost: number
  estimatedOverheadCost: number
  estimatedHours: number | null
  // Rzeczywiste koszty
  materialCost: number
  laborCost: number
  overheadCost: number
  totalCost: number
  // Cena sprzedaży
  sellingPrice: number
  marginPercent: number
  // Time logs
  timeLogs: TimeLog[]
  // Callbacks
  onUpdate?: () => void
}

export default function OrderCostAnalysis({
  orderId,
  quantity,
  estimatedMaterialCost,
  estimatedLaborCost,
  estimatedOverheadCost,
  estimatedHours,
  materialCost,
  laborCost,
  overheadCost,
  // totalCost and marginPercent from props are not used - we calculate them dynamically
  sellingPrice: initialSellingPrice,
  timeLogs,
  onUpdate,
}: OrderCostAnalysisProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [sellingPrice, setSellingPrice] = useState(initialSellingPrice || 0)

  // Oblicz rzeczywiste koszty pracy z time_logs
  const calculateActualLabor = () => {
    let totalHours = 0
    let totalCost = 0

    timeLogs.forEach((log) => {
      if (log.status === 'completed' || log.status === 'running') {
        const start = new Date(log.start_time)
        const end = log.end_time ? new Date(log.end_time) : new Date()
        const hours = (end.getTime() - start.getTime()) / TIME.MS_PER_HOUR
        const rate = log.hourly_rate || 150
        totalHours += hours
        totalCost += hours * rate
      }
    })

    return { hours: totalHours, cost: totalCost }
  }

  const actualLabor = calculateActualLabor()
  const actualTotalCost = materialCost + actualLabor.cost + overheadCost
  const costPerUnit = quantity > 0 ? actualTotalCost / quantity : 0

  // Marża i rentowność
  const marginAmount = sellingPrice - actualTotalCost
  const calculatedMarginPercent = sellingPrice > 0 ? (marginAmount / sellingPrice) * 100 : 0
  const isProfitable = marginAmount > 0

  // Odchylenia (variance)
  const materialVariance = materialCost - (estimatedMaterialCost || materialCost)
  const laborVariance = actualLabor.cost - (estimatedLaborCost || laborCost)
  const hoursVariance = estimatedHours ? actualLabor.hours - estimatedHours : 0
  const totalVariance = actualTotalCost - (estimatedMaterialCost + estimatedLaborCost + estimatedOverheadCost)

  const handleSaveSellingPrice = async () => {
    setIsSaving(true)
    const loadingToast = toast.loading('Zapisywanie ceny sprzedaży...')

    try {
      const { error } = await supabase
        .from('orders')
        .update({
          selling_price: sellingPrice,
          margin_amount: sellingPrice - actualTotalCost,
          margin_percent: sellingPrice > 0 ? ((sellingPrice - actualTotalCost) / sellingPrice) * 100 : 0,
          price_per_unit: quantity > 0 ? sellingPrice / quantity : 0,
        })
        .eq('id', orderId)

      if (error) throw error

      toast.dismiss(loadingToast)
      toast.success('Cena sprzedaży zaktualizowana!')
      setIsEditing(false)
      onUpdate?.()
    } catch (error) {
      toast.dismiss(loadingToast)
      toast.error('Nie udało się zapisać ceny')
      logger.error('Error saving selling price', { error })
    } finally {
      setIsSaving(false)
    }
  }

  const VarianceIndicator = ({ value, inverse = false }: { value: number; inverse?: boolean }) => {
    if (Math.abs(value) < 0.01) return <span className="text-muted-foreground">—</span>
    const isPositive = inverse ? value < 0 : value > 0
    const isNegative = inverse ? value > 0 : value < 0
    return (
      <span className={`font-semibold ${isNegative ? 'text-red-600 dark:text-red-400' : isPositive ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}`}>
        {value > 0 ? '+' : ''}{value.toFixed(2)} PLN
      </span>
    )
  }

  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
          <span>📊</span> Analiza Kosztów i Rentowności
        </h2>
        {timeLogs.length > 0 && (
          <span className="px-3 py-1 bg-violet-600/20 text-violet-400 text-sm rounded-full">
            {timeLogs.length} wpisów czasu pracy
          </span>
        )}
      </div>

      {/* Główne metryki */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className={`p-4 rounded-lg ${isProfitable ? 'bg-green-900/30 border border-green-700/50' : 'bg-red-900/30 border border-red-700/50'}`}>
          <p className="text-slate-400 text-sm mb-1">Marża</p>
          <p className={`text-2xl font-bold ${isProfitable ? 'text-green-400' : 'text-red-400'}`}>
            {marginAmount.toFixed(2)} PLN
          </p>
          <p className={`text-sm ${isProfitable ? 'text-green-500' : 'text-red-500'}`}>
            {calculatedMarginPercent.toFixed(1)}%
          </p>
        </div>

        <div className="bg-muted/50 p-4 rounded-lg">
          <p className="text-muted-foreground text-sm mb-1">Koszt całkowity</p>
          <p className="text-2xl font-bold text-foreground">{actualTotalCost.toFixed(2)} PLN</p>
          <p className="text-slate-500 text-sm">{costPerUnit.toFixed(2)} PLN/szt</p>
        </div>

        <div className="bg-muted/50 p-4 rounded-lg">
          <p className="text-muted-foreground text-sm mb-1">Czas pracy</p>
          <p className="text-2xl font-bold text-foreground">{actualLabor.hours.toFixed(1)}h</p>
          <p className="text-slate-500 text-sm">{actualLabor.cost.toFixed(2)} PLN</p>
        </div>

        <div className="bg-muted/50 p-4 rounded-lg">
          <p className="text-muted-foreground text-sm mb-1">Cena sprzedaży</p>
          {isEditing ? (
            <div className="flex gap-2">
              <Input
                type="number"
                step="0.01"
                value={sellingPrice}
                onChange={(e) => setSellingPrice(parseFloat(e.target.value) || 0)}
                className="h-8 text-sm"
              />
              <Button
                onClick={handleSaveSellingPrice}
                disabled={isSaving}
                className="h-8 px-2 text-xs bg-green-600 hover:bg-green-700"
              >
                ✓
              </Button>
              <Button
                onClick={() => {
                  setSellingPrice(initialSellingPrice || 0)
                  setIsEditing(false)
                }}
                className="h-8 px-2 text-xs bg-slate-600 hover:bg-slate-500"
              >
                ✕
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <p className="text-2xl font-bold text-violet-400">
                {sellingPrice > 0 ? `${sellingPrice.toFixed(2)} PLN` : '—'}
              </p>
              <button
                onClick={() => setIsEditing(true)}
                className="text-muted-foreground hover:text-foreground transition"
                title="Edytuj cenę"
              >
                ✏️
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Tabela porównawcza: Szacowane vs Rzeczywiste */}
      <div className="bg-muted rounded-lg overflow-hidden mb-6">
        <table className="w-full">
          <thead className="bg-muted">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Kategoria</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase">Szacowane</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase">Rzeczywiste</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase">Odchylenie</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
            <tr className="hover:bg-muted/50">
              <td className="px-4 py-3">
                <span className="text-foreground">🔩 Materiał</span>
              </td>
              <td className="px-4 py-3 text-right text-muted-foreground">
                {(estimatedMaterialCost || materialCost).toFixed(2)} PLN
              </td>
              <td className="px-4 py-3 text-right text-foreground font-medium">
                {materialCost.toFixed(2)} PLN
              </td>
              <td className="px-4 py-3 text-right">
                <VarianceIndicator value={materialVariance} inverse />
              </td>
            </tr>

            <tr className="hover:bg-muted/50">
              <td className="px-4 py-3">
                <span className="text-foreground">⏱️ Praca</span>
                {estimatedHours && (
                  <span className="text-slate-500 text-xs ml-2">
                    ({estimatedHours.toFixed(1)}h szac.)
                  </span>
                )}
              </td>
              <td className="px-4 py-3 text-right text-muted-foreground">
                {(estimatedLaborCost || laborCost).toFixed(2)} PLN
              </td>
              <td className="px-4 py-3 text-right">
                <span className="text-foreground font-medium">{actualLabor.cost.toFixed(2)} PLN</span>
                <span className="text-slate-500 text-xs block">{actualLabor.hours.toFixed(1)}h</span>
              </td>
              <td className="px-4 py-3 text-right">
                <VarianceIndicator value={laborVariance} inverse />
                {hoursVariance !== 0 && (
                  <span className={`text-xs block ${hoursVariance > 0 ? 'text-red-400' : 'text-green-400'}`}>
                    {hoursVariance > 0 ? '+' : ''}{hoursVariance.toFixed(1)}h
                  </span>
                )}
              </td>
            </tr>

            <tr className="hover:bg-muted/50">
              <td className="px-4 py-3">
                <span className="text-foreground">🏭 Koszty ogólne</span>
              </td>
              <td className="px-4 py-3 text-right text-muted-foreground">
                {(estimatedOverheadCost || overheadCost).toFixed(2)} PLN
              </td>
              <td className="px-4 py-3 text-right text-foreground font-medium">
                {overheadCost.toFixed(2)} PLN
              </td>
              <td className="px-4 py-3 text-right text-muted-foreground">—</td>
            </tr>

            <tr className="bg-muted/50 font-semibold">
              <td className="px-4 py-3">
                <span className="text-foreground">SUMA</span>
              </td>
              <td className="px-4 py-3 text-right text-muted-foreground">
                {((estimatedMaterialCost || materialCost) + (estimatedLaborCost || laborCost) + (estimatedOverheadCost || overheadCost)).toFixed(2)} PLN
              </td>
              <td className="px-4 py-3 text-right text-foreground">
                {actualTotalCost.toFixed(2)} PLN
              </td>
              <td className="px-4 py-3 text-right">
                <VarianceIndicator value={totalVariance} inverse />
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Podsumowanie rentowności */}
      {sellingPrice > 0 && (
        <div className={`p-4 rounded-lg ${isProfitable ? 'bg-green-900/20 border border-green-700/50' : 'bg-red-900/20 border border-red-700/50'}`}>
          <h3 className={`font-semibold mb-2 ${isProfitable ? 'text-green-400' : 'text-red-400'}`}>
            {isProfitable ? '✅ Zamówienie rentowne' : '⚠️ Zamówienie nierentowne'}
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Przychód:</span>
              <span className="text-foreground ml-2 font-medium">{sellingPrice.toFixed(2)} PLN</span>
            </div>
            <div>
              <span className="text-muted-foreground">Koszt:</span>
              <span className="text-foreground ml-2 font-medium">{actualTotalCost.toFixed(2)} PLN</span>
            </div>
            <div>
              <span className="text-muted-foreground">Zysk:</span>
              <span className={`ml-2 font-semibold ${isProfitable ? 'text-green-400' : 'text-red-400'}`}>
                {marginAmount.toFixed(2)} PLN
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Zysk na szt:</span>
              <span className={`ml-2 font-semibold ${isProfitable ? 'text-green-400' : 'text-red-400'}`}>
                {quantity > 0 ? (marginAmount / quantity).toFixed(2) : '0.00'} PLN
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Wskazówka jeśli brak ceny sprzedaży */}
      {sellingPrice === 0 && (
        <div className="p-4 bg-violet-900/20 border border-violet-700/50 rounded-lg">
          <p className="text-violet-400 text-sm">
            💡 <strong>Wskazówka:</strong> Dodaj cenę sprzedaży aby zobaczyć analizę rentowności zamówienia.
          </p>
        </div>
      )}
    </div>
  )
}
