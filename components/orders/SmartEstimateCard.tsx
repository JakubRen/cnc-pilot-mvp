'use client'

import { PricingEstimate } from '@/lib/pricing-engine'

// ============================================
// TYPES
// ============================================

/** AI dynamic pricing result (from /api/agents/dynamic-pricing) */
export interface DynamicPricingResult {
  suggested_price: number
  confidence: number // 0-100
  factors: Array<{
    name: string
    impact: 'increase' | 'decrease' | 'neutral'
    weight: number // percentage contribution, e.g. 10 = 10%
    description: string
  }>
  reasoning: string
}

interface SmartEstimateCardProps {
  estimate: PricingEstimate | null
  loading: boolean
  onApplyPrice: (price: number) => void
  /** Optional: AI dynamic pricing for enhanced comparison */
  dynamicPricing?: DynamicPricingResult | null
  dynamicPricingLoading?: boolean
  /** Current user-entered price for 3-way comparison */
  currentPrice?: number | null
}

// ============================================
// HELPERS
// ============================================

function getConfidenceColor(conf: string) {
  switch (conf) {
    case 'high': return 'text-green-400 bg-green-400/10 border-green-400/20'
    case 'medium': return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20'
    default: return 'text-slate-400 bg-slate-400/10 border-slate-400/20'
  }
}

function getConfidenceLabel(conf: string) {
  switch (conf) {
    case 'high': return 'Wysoka pewnosc'
    case 'medium': return 'Srednia pewnosc'
    default: return 'Niska pewnosc'
  }
}

function getAiConfidenceColor(confidence: number) {
  if (confidence >= 70) return 'text-green-400 bg-green-400/10 border-green-400/20'
  if (confidence >= 40) return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20'
  return 'text-slate-400 bg-slate-400/10 border-slate-400/20'
}

function getAiConfidenceLabel(confidence: number) {
  if (confidence >= 70) return 'Wysoka pewnosc'
  if (confidence >= 40) return 'Srednia pewnosc'
  return 'Niska pewnosc'
}

// ============================================
// SUB: Factor breakdown
// ============================================

function FactorBreakdown({ factors }: { factors: DynamicPricingResult['factors'] }) {
  if (factors.length === 0) return null

  const impactStyles = {
    increase: 'text-red-600 dark:text-red-400',
    decrease: 'text-green-600 dark:text-green-400',
    neutral: 'text-muted-foreground',
  }
  const impactArrows = {
    increase: '\u2191',
    decrease: '\u2193',
    neutral: '-',
  }

  return (
    <div className="mt-3 pt-3 border-t border-border/50">
      <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-2">Czynniki cenowe</p>
      <div className="space-y-1">
        {factors.slice(0, 5).map((f, i) => (
          <div key={i} className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 min-w-0 flex-1">
              <span className={`font-semibold ${impactStyles[f.impact]}`}>
                {impactArrows[f.impact]}
              </span>
              <span className="text-foreground truncate" title={f.description}>{f.name}</span>
            </div>
            <span className="text-muted-foreground flex-shrink-0 ml-2">{f.weight}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ============================================
// SUB: 3-way price comparison
// ============================================

function PriceComparison({
  currentPrice,
  historicalPrice,
  aiPrice,
}: {
  currentPrice: number | null | undefined
  historicalPrice: number | null
  aiPrice: number | null
}) {
  const prices = [
    { label: 'Twoja cena', value: currentPrice, color: 'text-foreground' },
    { label: 'Historia', value: historicalPrice, color: 'text-violet-500' },
    { label: 'AI sugestia', value: aiPrice, color: 'text-green-500' },
  ].filter(p => p.value != null && p.value > 0) as Array<{ label: string; value: number; color: string }>

  if (prices.length < 2) return null

  const maxPrice = Math.max(...prices.map(p => p.value))

  return (
    <div className="mt-3 pt-3 border-t border-border/50">
      <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-2">Porownanie cen</p>
      <div className="space-y-1.5">
        {prices.map((p, i) => {
          const widthPercent = maxPrice > 0 ? (p.value / maxPrice) * 100 : 0
          return (
            <div key={i}>
              <div className="flex items-center justify-between text-xs mb-0.5">
                <span className="text-muted-foreground">{p.label}</span>
                <span className={`font-semibold ${p.color}`}>{p.value.toFixed(0)} PLN</span>
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${widthPercent}%`,
                    backgroundColor: p.color === 'text-foreground' ? '#94a3b8'
                      : p.color === 'text-violet-500' ? '#8b5cf6'
                      : '#10b981',
                  }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function SmartEstimateCard({
  estimate,
  loading,
  onApplyPrice,
  dynamicPricing,
  dynamicPricingLoading,
  currentPrice,
}: SmartEstimateCardProps) {
  if (loading) {
    return (
      <div className="bg-card border border-border rounded-lg p-4 animate-pulse">
        <div className="h-4 bg-muted rounded w-1/2 mb-3"></div>
        <div className="h-8 bg-muted rounded w-3/4 mb-2"></div>
        <div className="h-4 bg-muted rounded w-1/3"></div>
      </div>
    )
  }

  const hasEstimate = estimate && estimate.confidence !== 'none' && estimate.orderCount > 0
  const hasDynamic = dynamicPricing && dynamicPricing.suggested_price > 0

  if (!hasEstimate && !hasDynamic) {
    return (
      <div className="bg-card border border-border rounded-lg p-4">
        <div className="flex items-center gap-2 text-muted-foreground mb-2">
          <span className="text-xl">&#x1F9E0;</span>
          <h3 className="text-sm font-semibold">Brak danych historycznych</h3>
        </div>
        <p className="text-xs text-slate-500">
          Wpisz nazwe detalu lub material, aby wyszukac podobne zlecenia w historii.
        </p>
      </div>
    )
  }

  return (
    <div className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-900 border border-violet-500/30 rounded-lg p-5 shadow-lg relative overflow-hidden group">
      {/* Animated background glow */}
      <div className="absolute -right-10 -top-10 w-32 h-32 bg-violet-500/10 rounded-full blur-3xl group-hover:bg-violet-500/20 transition duration-700"></div>

      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-2xl">&#x2728;</span>
            <h3 className="text-base font-bold text-foreground">Smart Estymacja</h3>
          </div>
          {hasEstimate && (
            <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${getConfidenceColor(estimate.confidence)}`}>
              {getConfidenceLabel(estimate.confidence)}
            </span>
          )}
        </div>

        {/* Historical Price Stats */}
        {hasEstimate && (
          <div className="mb-4">
            <p className="text-muted-foreground text-xs mb-1">Srednia historyczna</p>
            <div className="flex items-end gap-2">
              <span className="text-3xl font-bold text-foreground">{estimate.avgPrice}</span>
              <span className="text-sm text-muted-foreground mb-1.5">PLN</span>
            </div>
            <div className="text-xs text-slate-500 mt-1">
              Zakres: {estimate.minPrice} - {estimate.maxPrice} PLN
            </div>
          </div>
        )}

        {/* AI Dynamic Pricing */}
        {dynamicPricingLoading && (
          <div className="mb-4 p-3 bg-violet-50 dark:bg-violet-900/20 rounded-lg border border-violet-200 dark:border-violet-800/30 animate-pulse">
            <div className="h-3 bg-violet-200 dark:bg-violet-800 rounded w-1/3 mb-2"></div>
            <div className="h-6 bg-violet-200 dark:bg-violet-800 rounded w-1/2"></div>
          </div>
        )}

        {hasDynamic && !dynamicPricingLoading && (
          <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/15 rounded-lg border border-green-200 dark:border-green-800/30">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-semibold text-green-700 dark:text-green-300">AI sugestia cenowa</p>
              <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${getAiConfidenceColor(dynamicPricing.confidence)}`}>
                {getAiConfidenceLabel(dynamicPricing.confidence)} ({dynamicPricing.confidence}%)
              </span>
            </div>
            <div className="flex items-end gap-2">
              <span className="text-2xl font-bold text-green-600 dark:text-green-400">
                {dynamicPricing.suggested_price.toFixed(0)}
              </span>
              <span className="text-sm text-green-600/70 dark:text-green-400/70 mb-0.5">PLN</span>
            </div>
            {dynamicPricing.reasoning && (
              <p className="text-[10px] text-green-600/80 dark:text-green-400/60 mt-1 italic">
                {dynamicPricing.reasoning}
              </p>
            )}
            {/* Factor breakdown */}
            <FactorBreakdown factors={dynamicPricing.factors} />
          </div>
        )}

        {/* 3-way price comparison */}
        <PriceComparison
          currentPrice={currentPrice}
          historicalPrice={hasEstimate ? estimate.avgPrice : null}
          aiPrice={hasDynamic ? dynamicPricing.suggested_price : null}
        />

        {/* Time Stats (historical) */}
        {hasEstimate && (
          <div className="flex items-center gap-4 mb-4 pt-3 border-t border-border/50">
            <div>
              <p className="text-muted-foreground text-[10px]">Sr. Czas</p>
              <p className="text-foreground font-semibold">{estimate.avgDuration}h</p>
            </div>
            <div>
              <p className="text-muted-foreground text-[10px]">Proba</p>
              <p className="text-foreground font-semibold">{estimate.orderCount} zlecen</p>
            </div>
            <div>
              <p className="text-muted-foreground text-[10px]">Ostatnie</p>
              <p className="text-foreground font-semibold">{new Date(estimate.lastOrderDate).toLocaleDateString('pl-PL')}</p>
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="space-y-2">
          {hasDynamic && (
            <button
              type="button"
              onClick={() => onApplyPrice(dynamicPricing.suggested_price)}
              className="w-full py-2 bg-green-600 hover:bg-green-500 text-white rounded-md text-sm font-semibold transition flex items-center justify-center gap-2"
            >
              Zastosuj cene AI ({dynamicPricing.suggested_price.toFixed(0)} PLN)
            </button>
          )}
          {hasEstimate && (
            <button
              type="button"
              onClick={() => onApplyPrice(estimate.avgPrice)}
              className={`w-full py-2 rounded-md text-sm font-semibold transition flex items-center justify-center gap-2 ${
                hasDynamic
                  ? 'bg-muted text-foreground hover:bg-accent'
                  : 'bg-violet-600 hover:bg-violet-500 text-white'
              }`}
            >
              Uzyj ceny historycznej ({estimate.avgPrice} PLN)
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
