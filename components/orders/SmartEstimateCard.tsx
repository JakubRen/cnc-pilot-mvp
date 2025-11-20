'use client'

import { PricingEstimate } from '@/lib/pricing-engine'

interface SmartEstimateCardProps {
  estimate: PricingEstimate | null
  loading: boolean
  onApplyPrice: (price: number) => void
}

export default function SmartEstimateCard({ estimate, loading, onApplyPrice }: SmartEstimateCardProps) {
  if (loading) {
    return (
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 animate-pulse">
        <div className="h-4 bg-slate-700 rounded w-1/2 mb-3"></div>
        <div className="h-8 bg-slate-700 rounded w-3/4 mb-2"></div>
        <div className="h-4 bg-slate-700 rounded w-1/3"></div>
      </div>
    )
  }

  if (!estimate || estimate.confidence === 'none' || estimate.orderCount === 0) {
    return (
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
        <div className="flex items-center gap-2 text-slate-400 mb-2">
          <span className="text-xl">🧠</span>
          <h3 className="text-sm font-semibold">Brak danych historycznych</h3>
        </div>
        <p className="text-xs text-slate-500">
          Wpisz nazwę detalu lub materiał, aby wyszukać podobne zlecenia w historii.
        </p>
      </div>
    )
  }

  const getConfidenceColor = (conf: string) => {
    switch (conf) {
      case 'high': return 'text-green-400 bg-green-400/10 border-green-400/20'
      case 'medium': return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20'
      default: return 'text-slate-400 bg-slate-400/10 border-slate-400/20'
    }
  }

  const getConfidenceLabel = (conf: string) => {
    switch (conf) {
      case 'high': return 'Wysoka pewność'
      case 'medium': return 'Średnia pewność'
      default: return 'Niska pewność'
    }
  }

  return (
    <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-blue-500/30 rounded-lg p-5 shadow-lg relative overflow-hidden group">
      {/* Animated background glow */}
      <div className="absolute -right-10 -top-10 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl group-hover:bg-blue-500/20 transition duration-700"></div>

      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-2xl">✨</span>
            <h3 className="text-base font-bold text-white">Smart Estymacja</h3>
          </div>
          <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${getConfidenceColor(estimate.confidence)}`}>
            {getConfidenceLabel(estimate.confidence)}
          </span>
        </div>

        {/* Price Stats */}
        <div className="mb-4">
          <p className="text-slate-400 text-xs mb-1">Sugerowana cena (średnia)</p>
          <div className="flex items-end gap-2">
            <span className="text-3xl font-bold text-white">{estimate.avgPrice}</span>
            <span className="text-sm text-slate-400 mb-1.5">PLN</span>
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Zakres: {estimate.minPrice} - {estimate.maxPrice} PLN
          </div>
        </div>

        {/* Time Stats */}
        <div className="flex items-center gap-4 mb-4 pt-3 border-t border-slate-700/50">
          <div>
            <p className="text-slate-400 text-[10px]">Śr. Czas</p>
            <p className="text-white font-semibold">{estimate.avgDuration}h</p>
          </div>
          <div>
            <p className="text-slate-400 text-[10px]">Próba</p>
            <p className="text-white font-semibold">{estimate.orderCount} zleceń</p>
          </div>
          <div>
            <p className="text-slate-400 text-[10px]">Ostatnie</p>
            <p className="text-white font-semibold">{new Date(estimate.lastOrderDate).toLocaleDateString('pl-PL')}</p>
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={() => onApplyPrice(estimate.avgPrice)}
          className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-md text-sm font-semibold transition flex items-center justify-center gap-2"
        >
          <span>💰</span> Użyj tej ceny
        </button>
      </div>
    </div>
  )
}
