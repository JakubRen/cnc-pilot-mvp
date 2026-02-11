'use client'

import type { MaterialSuggestion, QuantitySuggestion, PriceSanityResult } from '@/types/ai-expansion'

interface MaterialSuggestionChipsProps {
  materials: MaterialSuggestion[]
  onSelect: (material: string) => void
}

function MaterialSuggestionChips({ materials, onSelect }: MaterialSuggestionChipsProps) {
  if (materials.length === 0) return null

  return (
    <div>
      <p className="text-xs text-muted-foreground mb-1.5">Sugerowane materialy:</p>
      <div className="flex flex-wrap gap-1.5">
        {materials.map((mat) => (
          <button
            key={mat.name}
            type="button"
            onClick={() => onSelect(mat.name)}
            className="px-2.5 py-1 text-xs rounded-full border transition
              bg-violet-50 dark:bg-violet-900/20 border-violet-200 dark:border-violet-700/30
              text-violet-700 dark:text-violet-300
              hover:bg-violet-100 dark:hover:bg-violet-900/40
              hover:border-violet-300 dark:hover:border-violet-600"
          >
            {mat.name}
            {mat.source === 'inventory' && (
              <span className="ml-1 text-[10px] opacity-60">magazyn</span>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}

interface QuantitySuggestionBadgeProps {
  quantities: QuantitySuggestion[]
  onSelect: (quantity: number) => void
}

function QuantitySuggestionBadge({ quantities, onSelect }: QuantitySuggestionBadgeProps) {
  if (quantities.length === 0) return null

  return (
    <div>
      <p className="text-xs text-muted-foreground mb-1.5">Sugerowane ilosci:</p>
      <div className="flex flex-wrap gap-1.5">
        {quantities.map((q) => (
          <button
            key={q.value}
            type="button"
            onClick={() => onSelect(q.value)}
            className="px-2.5 py-1 text-xs rounded-full border transition
              bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700/30
              text-blue-700 dark:text-blue-300
              hover:bg-blue-100 dark:hover:bg-blue-900/40"
          >
            {q.value} szt.
            <span className="ml-1 text-[10px] opacity-60">{q.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

interface PriceSanityAlertProps {
  priceSanity: PriceSanityResult | null
}

function PriceSanityAlert({ priceSanity }: PriceSanityAlertProps) {
  if (!priceSanity) return null

  const styles: Record<string, { bg: string; border: string; text: string; icon: string }> = {
    ok: {
      bg: 'bg-green-50 dark:bg-green-900/20',
      border: 'border-green-200 dark:border-green-700/30',
      text: 'text-green-700 dark:text-green-300',
      icon: '\u2713',
    },
    warning: {
      bg: 'bg-amber-50 dark:bg-amber-900/20',
      border: 'border-amber-200 dark:border-amber-700/30',
      text: 'text-amber-700 dark:text-amber-300',
      icon: '\u26A0',
    },
    high: {
      bg: 'bg-red-50 dark:bg-red-900/20',
      border: 'border-red-200 dark:border-red-700/30',
      text: 'text-red-700 dark:text-red-300',
      icon: '\u2191',
    },
    low: {
      bg: 'bg-amber-50 dark:bg-amber-900/20',
      border: 'border-amber-200 dark:border-amber-700/30',
      text: 'text-amber-700 dark:text-amber-300',
      icon: '\u2193',
    },
  }

  const style = styles[priceSanity.status] || styles.warning

  return (
    <div className={`${style.bg} border ${style.border} rounded-lg px-3 py-2 ${style.text}`}>
      <div className="flex items-center gap-2">
        <span className="text-sm">{style.icon}</span>
        <p className="text-xs font-medium">{priceSanity.message}</p>
      </div>
      {priceSanity.suggestedRange && (
        <p className="text-[10px] mt-1 opacity-80">
          Zakres rynkowy: {priceSanity.suggestedRange.min} - {priceSanity.suggestedRange.max} PLN
        </p>
      )}
    </div>
  )
}

interface FormSuggestionsPanelProps {
  materials: MaterialSuggestion[]
  quantities: QuantitySuggestion[]
  priceSanity: PriceSanityResult | null
  isLoading: boolean
  onSelectMaterial: (material: string) => void
  onSelectQuantity: (quantity: number) => void
}

export default function FormSuggestionsPanel({
  materials,
  quantities,
  priceSanity,
  isLoading,
  onSelectMaterial,
  onSelectQuantity,
}: FormSuggestionsPanelProps) {
  const hasContent = materials.length > 0 || quantities.length > 0 || priceSanity !== null

  if (!hasContent && !isLoading) return null

  return (
    <div className="bg-card border border-border rounded-lg p-4 mt-3 animate-fade-in">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-sm">&#x1F9E0;</span>
        <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider">
          Sugestie AI
        </h4>
        {isLoading && (
          <div className="ml-auto">
            <svg className="animate-spin h-3.5 w-3.5 text-violet-500" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
        )}
      </div>

      <div className="space-y-3">
        <MaterialSuggestionChips materials={materials} onSelect={onSelectMaterial} />
        <QuantitySuggestionBadge quantities={quantities} onSelect={onSelectQuantity} />
        <PriceSanityAlert priceSanity={priceSanity} />
      </div>
    </div>
  )
}
