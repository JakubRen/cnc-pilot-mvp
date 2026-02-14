// Dynamic Pricing Engine (Phase 3 — Feature 3.1)
// Multi-factor price adjustment based on 5 contextual signals.
//
// Architecture:
//   1. calculateDynamicPrice(input, basePricePerUnit) — pure heuristic, no DB/AI deps
//   2. getDynamicPriceSuggestion(input, basePricePerUnit) — server-side: loads context, calls heuristic
//
// Five independent factors multiply the base price:
//   1. Customer tier: VIP -5%, regular 0%, occasional 0%, new +5%
//   2. Urgency: <=2d +20%, 3-5d +10%, 6-7d +5%, >7d 0%
//   3. Machine load: >80h queue +10%, 40-80h 0%, <40h -5%
//   4. Quote win/loss: <30% acceptance -7%, 30-80% 0%, >80% +5%
//   5. Volume: >=100 -10%, >=50 -5%, <50 0%
//
// Result is ALWAYS a suggestion — never auto-applied to orders.

import { createClient } from '@/lib/supabase-server'
import { getUserProfile } from '@/lib/auth-server'
import { callGemini } from '@/lib/ai/gemini-client'
import { SchemaType } from '@/lib/ai/schema-types'
import { sanitizeField, FIELD_LIMITS } from '@/lib/ai/security/sanitizer'
import { logger } from '@/lib/logger'

// ============================================
// TYPES
// ============================================

export type CustomerTier = 'vip' | 'regular' | 'occasional' | 'new'
export type Complexity = 'simple' | 'medium' | 'complex'

export interface HistoricalPriceData {
  avgPricePerUnit: number
  minPricePerUnit: number
  maxPricePerUnit: number
  orderCount: number
  /** 'high' (>=10 orders), 'medium' (>=3), 'low' (<3) */
  confidence: 'high' | 'medium' | 'low'
}

export interface DynamicPricingInput {
  partName: string
  material: string
  quantity: number
  complexity: Complexity
  companyId: string
  /** Total queued machine hours (null = unknown) */
  machineQueuedHours: number | null
  /** Customer tier (from customer-intelligence) */
  customerTier: CustomerTier | null
  /** Days until deadline */
  daysUntilDeadline: number | null
  /** Quote acceptance rate for this customer 0-100 (null = unknown) */
  quoteAcceptanceRate: number | null
  /** Historical pricing data from similar orders */
  historicalPricing: HistoricalPriceData | null
}

export interface PriceFactor {
  name: string
  impact: number // multiplier, e.g. 1.15 = +15%
  reason: string
}

export interface DynamicPricingResult {
  /** Suggested price per unit in PLN */
  suggestedPricePerUnit: number
  /** Base price per unit (from static calculator) */
  basePricePerUnit: number
  /** Total suggested price for full quantity */
  totalSuggestedPrice: number
  /** Factors that adjusted the price */
  factors: PriceFactor[]
  /** Combined multiplier (product of all factor impacts) */
  combinedMultiplier: number
  /** How this compares to historical pricing */
  historicalComparison: 'below_range' | 'in_range' | 'above_range' | 'no_data'
  /** Confidence 0-100 */
  confidence: number
  /** This is a SUGGESTION only — NEVER auto-applied */
  isAutoApplied: false
  source: 'ai' | 'heuristic'
}

// ============================================
// TIER MULTIPLIERS (aligned with architect spec)
// ============================================

const TIER_MULTIPLIERS: Record<CustomerTier, number> = {
  vip: 0.95,        // -5% for VIP
  regular: 1.00,    // no change for regulars
  occasional: 1.00, // no change
  new: 1.05,        // +5% for new (unknown risk)
}

// ============================================
// FACTOR CALCULATORS
// ============================================

export function calculateCustomerTierFactor(tier: CustomerTier): PriceFactor {
  const impact = TIER_MULTIPLIERS[tier]
  const descriptions: Record<CustomerTier, string> = {
    vip: 'Klient VIP — rabat lojalnosci -5%.',
    regular: 'Staly klient — cena standardowa.',
    occasional: 'Klient okazjonalny — cena standardowa.',
    new: 'Nowy klient — premja za ryzyko +5%.',
  }
  return { name: 'customer_tier', impact, reason: descriptions[tier] }
}

export function calculateUrgencyFactor(daysUntilDeadline: number): PriceFactor {
  let impact = 1.0
  let reason = ''

  if (daysUntilDeadline <= 2) {
    impact = 1.20
    reason = 'Pilne zlecenie (<=2 dni) — surcharge ekspresowy +20%.'
  } else if (daysUntilDeadline <= 5) {
    impact = 1.10
    reason = 'Krotki deadline (3-5 dni) — premja za priorytet +10%.'
  } else if (daysUntilDeadline <= 7) {
    impact = 1.05
    reason = 'Deadline w tym tygodniu — lekka premja +5%.'
  } else {
    impact = 1.0
    reason = 'Standardowy deadline — brak korekty.'
  }

  return { name: 'urgency', impact, reason }
}

export function calculateMachineLoadFactor(queuedHours: number): PriceFactor {
  let impact = 1.0
  let reason = ''

  if (queuedHours > 80) {
    impact = 1.10
    reason = 'Wysokie obciazenie maszyn (>80h w kolejce) — premja +10%.'
  } else if (queuedHours < 40) {
    impact = 0.95
    reason = 'Niskie obciazenie maszyn (<40h) — rabat -5% za wolne moce.'
  } else {
    reason = 'Normalne obciazenie maszyn — brak korekty.'
  }

  return { name: 'machine_load', impact, reason }
}

export function calculateQuoteWinLossFactor(acceptanceRate: number): PriceFactor {
  let impact = 1.0
  let reason = ''

  if (acceptanceRate < 30) {
    impact = 0.93
    reason = `Niska akceptacja wycen (${acceptanceRate}%) — obnizka -7% by zwiekszyc konwersje.`
  } else if (acceptanceRate > 80) {
    impact = 1.05
    reason = `Wysoka akceptacja wycen (${acceptanceRate}%) — mozna podniesc cene +5%.`
  } else {
    reason = `Normalna akceptacja wycen (${acceptanceRate}%) — brak korekty.`
  }

  return { name: 'quote_win_loss', impact, reason }
}

export function calculateVolumeFactor(quantity: number): PriceFactor {
  let impact = 1.0
  let reason = ''

  if (quantity >= 100) {
    impact = 0.90
    reason = `Duza seria (${quantity} szt.) — rabat ilosciowy -10%.`
  } else if (quantity >= 50) {
    impact = 0.95
    reason = `Srednia seria (${quantity} szt.) — rabat ilosciowy -5%.`
  } else {
    reason = `Mala seria (${quantity} szt.) — brak rabatu.`
  }

  return { name: 'volume', impact, reason }
}

// ============================================
// HISTORICAL COMPARISON
// ============================================

export function compareToHistorical(
  suggestedPrice: number,
  historical: HistoricalPriceData | null
): DynamicPricingResult['historicalComparison'] {
  if (!historical || historical.orderCount === 0) return 'no_data'
  if (suggestedPrice < historical.minPricePerUnit) return 'below_range'
  if (suggestedPrice > historical.maxPricePerUnit) return 'above_range'
  return 'in_range'
}

// ============================================
// CORE: CALCULATE DYNAMIC PRICE
// ============================================

/**
 * Pure heuristic dynamic pricing with 5 contextual factors.
 * Takes a base price from the static calculator and applies factor multipliers.
 *
 * Factors: customer tier, urgency, machine load, quote win/loss, volume.
 * Volume is always applied; others are skipped when their input is null.
 *
 * This is a pure function — no DB or AI dependencies.
 */
export function calculateDynamicPrice(
  input: DynamicPricingInput,
  basePricePerUnit: number
): DynamicPricingResult {
  const factors: PriceFactor[] = []

  // 1. Customer tier
  if (input.customerTier !== null) {
    factors.push(calculateCustomerTierFactor(input.customerTier))
  }

  // 2. Urgency
  if (input.daysUntilDeadline !== null) {
    factors.push(calculateUrgencyFactor(input.daysUntilDeadline))
  }

  // 3. Machine load
  if (input.machineQueuedHours !== null) {
    factors.push(calculateMachineLoadFactor(input.machineQueuedHours))
  }

  // 4. Quote win/loss
  if (input.quoteAcceptanceRate !== null) {
    factors.push(calculateQuoteWinLossFactor(input.quoteAcceptanceRate))
  }

  // 5. Volume (always applied)
  factors.push(calculateVolumeFactor(input.quantity))

  // Combine all factor impacts (multiplicative)
  const combinedMultiplier = factors.reduce((m, f) => m * f.impact, 1.0)
  const suggestedPricePerUnit = Math.round(basePricePerUnit * combinedMultiplier * 100) / 100
  const totalSuggestedPrice = Math.round(suggestedPricePerUnit * input.quantity * 100) / 100

  // Compare to historical pricing
  const historicalComparison = compareToHistorical(suggestedPricePerUnit, input.historicalPricing)

  // Confidence based on data availability
  let confidence = 40 // base heuristic confidence
  if (input.customerTier !== null) confidence += 10
  if (input.daysUntilDeadline !== null) confidence += 10
  if (input.machineQueuedHours !== null) confidence += 10
  if (input.quoteAcceptanceRate !== null) confidence += 10
  if (input.historicalPricing && input.historicalPricing.confidence === 'high') confidence += 20
  else if (input.historicalPricing && input.historicalPricing.confidence === 'medium') confidence += 10
  confidence = Math.min(100, confidence)

  return {
    suggestedPricePerUnit,
    basePricePerUnit,
    totalSuggestedPrice,
    factors,
    combinedMultiplier: Math.round(combinedMultiplier * 1000) / 1000,
    historicalComparison,
    confidence,
    isAutoApplied: false,
    source: 'heuristic',
  }
}

// ============================================
// SERVER-SIDE: FULL DYNAMIC PRICING
// ============================================

/**
 * Server-side dynamic pricing that loads context from DB,
 * calculates the heuristic suggestion, and optionally enriches with AI.
 */
export async function getDynamicPriceSuggestion(
  input: {
    partName: string
    material: string
    quantity: number
    complexity: Complexity
    daysUntilDeadline?: number | null
    customerName?: string | null
  },
  basePricePerUnit: number
): Promise<DynamicPricingResult> {
  const userProfile = await getUserProfile()
  const companyId = userProfile?.company_id
  if (!companyId) {
    return calculateDynamicPrice({
      partName: input.partName,
      material: input.material,
      quantity: input.quantity,
      complexity: input.complexity,
      companyId: '',
      machineQueuedHours: null,
      customerTier: null,
      daysUntilDeadline: input.daysUntilDeadline ?? null,
      quoteAcceptanceRate: null,
      historicalPricing: null,
    }, basePricePerUnit)
  }

  const supabase = await createClient()

  // Load machine queue hours (sum of estimated remaining hours for active operations)
  let machineQueuedHours: number | null = null
  try {
    const { data: ops } = await supabase
      .from('operations')
      .select('estimated_time_minutes')
      .eq('company_id', companyId)
      .in('status', ['pending', 'in_progress'])

    if (ops && ops.length > 0) {
      const totalMinutes = ops.reduce((s, o) => s + (Number(o.estimated_time_minutes) || 0), 0)
      machineQueuedHours = Math.round(totalMinutes / 60)
    }
  } catch (err) {
    logger.warn('[dynamic-pricing] Failed to load machine queue', { error: String(err) })
  }

  // Load customer tier
  let customerTier: CustomerTier | null = null
  if (input.customerName) {
    try {
      const { data: orders } = await supabase
        .from('orders')
        .select('id')
        .eq('company_id', companyId)
        .eq('customer_name', input.customerName)

      const orderCount = orders?.length ?? 0
      if (orderCount >= 20) customerTier = 'vip'
      else if (orderCount >= 5) customerTier = 'regular'
      else if (orderCount >= 1) customerTier = 'occasional'
      else customerTier = 'new'
    } catch (err) {
      logger.warn('[dynamic-pricing] Failed to load customer tier', { error: String(err) })
    }
  }

  // Load quote acceptance rate for this customer
  let quoteAcceptanceRate: number | null = null
  if (input.customerName) {
    try {
      const { data: quotes } = await supabase
        .from('orders')
        .select('id, status')
        .eq('company_id', companyId)
        .eq('customer_name', input.customerName)

      if (quotes && quotes.length >= 3) {
        const accepted = quotes.filter(q => q.status !== 'cancelled' && q.status !== 'rejected').length
        quoteAcceptanceRate = Math.round((accepted / quotes.length) * 100)
      }
    } catch (err) {
      logger.warn('[dynamic-pricing] Failed to load quote acceptance', { error: String(err) })
    }
  }

  // Load historical pricing for similar parts
  let historicalPricing: HistoricalPriceData | null = null
  try {
    const searchTerm = `%${input.partName}%`
    const { data: similarOrders } = await supabase
      .from('orders')
      .select('price_per_unit')
      .eq('company_id', companyId)
      .ilike('part_name', searchTerm)
      .not('price_per_unit', 'is', null)
      .gt('price_per_unit', 0)
      .limit(50)

    if (similarOrders && similarOrders.length > 0) {
      const prices = similarOrders.map(o => Number(o.price_per_unit)).filter(p => p > 0)
      if (prices.length > 0) {
        const avg = prices.reduce((s, v) => s + v, 0) / prices.length
        historicalPricing = {
          avgPricePerUnit: Math.round(avg * 100) / 100,
          minPricePerUnit: Math.min(...prices),
          maxPricePerUnit: Math.max(...prices),
          orderCount: prices.length,
          confidence: prices.length >= 10 ? 'high' : prices.length >= 3 ? 'medium' : 'low',
        }
      }
    }
  } catch (err) {
    logger.warn('[dynamic-pricing] Failed to load historical pricing', { error: String(err) })
  }

  // Calculate heuristic suggestion
  const suggestion = calculateDynamicPrice({
    partName: input.partName,
    material: input.material,
    quantity: input.quantity,
    complexity: input.complexity,
    companyId,
    machineQueuedHours,
    customerTier,
    daysUntilDeadline: input.daysUntilDeadline ?? null,
    quoteAcceptanceRate,
    historicalPricing,
  }, basePricePerUnit)

  // Optionally enrich with AI explanation
  const aiResult = await callGemini<{ adjustedFactors: PriceFactor[] }>({
    label: 'dynamic-pricing',
    prompt: `Jestes ekspertem wycen CNC. Przeanalizuj sugestie cenowa i zwaliduj czynniki.

DANE:
- Czesc: ${sanitizeField(input.partName)}
- Material: ${sanitizeField(input.material)}
- Ilosc: ${input.quantity}
- Cena bazowa: ${basePricePerUnit} PLN/szt
- Cena sugerowana: ${suggestion.suggestedPricePerUnit} PLN/szt
- Mnoznik: ${suggestion.combinedMultiplier}
- Czynniki: ${JSON.stringify(suggestion.factors)}
${historicalPricing ? `- Historyczne ceny: ${historicalPricing.minPricePerUnit}-${historicalPricing.maxPricePerUnit} PLN (sr. ${historicalPricing.avgPricePerUnit})` : ''}

ZASADY:
- Zwroc zwalidowane czynniki (mozesz skorygowac "reason" dla czytelnosci)
- Nie zmieniam impact — tylko ulepszam opisy
- Po polsku`,
    responseSchema: {
      type: SchemaType.OBJECT,
      properties: {
        adjustedFactors: {
          type: SchemaType.ARRAY,
          items: {
            type: SchemaType.OBJECT,
            properties: {
              name: { type: SchemaType.STRING },
              impact: { type: SchemaType.NUMBER },
              reason: { type: SchemaType.STRING },
            },
            required: ['name', 'impact', 'reason'],
          },
        },
      },
      required: ['adjustedFactors'],
    },
  })

  if (aiResult && aiResult.data.adjustedFactors.length > 0) {
    const enrichedFactors = suggestion.factors.map(f => {
      const aiVersion = aiResult.data.adjustedFactors.find(af => af.name === f.name)
      if (aiVersion) {
        return {
          ...f,
          reason: sanitizeField(aiVersion.reason, FIELD_LIMITS.MEDIUM) || f.reason,
        }
      }
      return f
    })

    return {
      ...suggestion,
      factors: enrichedFactors,
      source: 'ai' as const,
    }
  }

  return suggestion
}
