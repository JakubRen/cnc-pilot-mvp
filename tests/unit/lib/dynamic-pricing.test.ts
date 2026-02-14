/**
 * Unit Tests for Dynamic Pricing (Phase 3 — Feature 3.1)
 *
 * Tests the AI-powered dynamic pricing engine that adjusts price suggestions
 * based on 5 contextual factors beyond the static rule-based calculator.
 *
 * CONTRACT for backend-dev:
 * - calculateDynamicPrice(input) -> DynamicPricingResult
 * - 5 Factors: customer tier, urgency, machine load, quote win/loss, volume
 * - Returns suggestion only — NEVER auto-applies
 * - Handles missing factors gracefully (partial data)
 * - Compares suggestion to historical pricing range
 * - Heuristic fallback when AI unavailable
 */

import { describe, it, expect, vi } from 'vitest'

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}))

// ============================================
// CONTRACT TYPES (aligned with architect spec)
// ============================================

type CustomerTier = 'vip' | 'regular' | 'occasional' | 'new'
type Complexity = 'simple' | 'medium' | 'complex'

interface DynamicPricingInput {
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

interface HistoricalPriceData {
  avgPricePerUnit: number
  minPricePerUnit: number
  maxPricePerUnit: number
  orderCount: number
  /** 'high' (>=10 orders), 'medium' (>=3), 'low' (<3) */
  confidence: 'high' | 'medium' | 'low'
}

interface PriceFactor {
  name: string
  impact: number // multiplier, e.g. 1.15 = +15%
  reason: string
}

interface DynamicPricingResult {
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
// REFERENCE HEURISTIC (aligned with architect spec)
// ============================================

const TIER_MULTIPLIERS: Record<CustomerTier, number> = {
  vip: 0.95,        // -5% for VIP (per spec)
  regular: 1.00,    // no change for regulars
  occasional: 1.00, // no change
  new: 1.05,        // +5% for new (per spec)
}

function calculateCustomerTierFactor(tier: CustomerTier): PriceFactor {
  const impact = TIER_MULTIPLIERS[tier]
  const descriptions: Record<CustomerTier, string> = {
    vip: 'Klient VIP — rabat lojalnosci -5%.',
    regular: 'Staly klient — cena standardowa.',
    occasional: 'Klient okazjonalny — cena standardowa.',
    new: 'Nowy klient — premja za ryzyko +5%.',
  }
  return { name: 'customer_tier', impact, reason: descriptions[tier] }
}

function calculateUrgencyFactor(daysUntilDeadline: number): PriceFactor {
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

function calculateMachineLoadFactor(queuedHours: number): PriceFactor {
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

function calculateQuoteWinLossFactor(acceptanceRate: number): PriceFactor {
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

function calculateVolumeFactor(quantity: number): PriceFactor {
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

function compareToHistorical(
  suggestedPrice: number,
  historical: HistoricalPriceData | null
): DynamicPricingResult['historicalComparison'] {
  if (!historical || historical.orderCount === 0) return 'no_data'
  if (suggestedPrice < historical.minPricePerUnit) return 'below_range'
  if (suggestedPrice > historical.maxPricePerUnit) return 'above_range'
  return 'in_range'
}

function calculateDynamicPrice(input: DynamicPricingInput, basePricePerUnit: number): DynamicPricingResult {
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

  // 5. Volume
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
// FACTOR WEIGHTING (5 factors per architect spec)
// ============================================

describe('Dynamic Pricing — Customer Tier Factor', () => {
  it('should give VIP customers -5% discount', () => {
    const factor = calculateCustomerTierFactor('vip')
    expect(factor.impact).toBe(0.95)
  })

  it('should add +5% premium for new customers', () => {
    const factor = calculateCustomerTierFactor('new')
    expect(factor.impact).toBe(1.05)
  })

  it('should keep standard price for regular customers', () => {
    const factor = calculateCustomerTierFactor('regular')
    expect(factor.impact).toBe(1.00)
  })

  it('should order: VIP < regular = occasional < new', () => {
    const vip = calculateCustomerTierFactor('vip')
    const regular = calculateCustomerTierFactor('regular')
    const newCust = calculateCustomerTierFactor('new')
    expect(vip.impact).toBeLessThan(regular.impact)
    expect(regular.impact).toBeLessThan(newCust.impact)
  })
})

describe('Dynamic Pricing — Urgency Factor', () => {
  it('should apply +20% surcharge for <=2 day deadline', () => {
    expect(calculateUrgencyFactor(1).impact).toBe(1.20)
    expect(calculateUrgencyFactor(2).impact).toBe(1.20)
  })

  it('should apply +10% for 3-5 day deadline', () => {
    expect(calculateUrgencyFactor(4).impact).toBe(1.10)
  })

  it('should apply +5% for 6-7 day deadline', () => {
    expect(calculateUrgencyFactor(7).impact).toBe(1.05)
  })

  it('should not change price for >7 day deadline', () => {
    expect(calculateUrgencyFactor(10).impact).toBe(1.0)
    expect(calculateUrgencyFactor(30).impact).toBe(1.0)
  })
})

describe('Dynamic Pricing — Machine Load Factor', () => {
  it('should increase price for high queue (>80h)', () => {
    const factor = calculateMachineLoadFactor(100)
    expect(factor.impact).toBe(1.10)
  })

  it('should decrease price for low queue (<40h)', () => {
    const factor = calculateMachineLoadFactor(20)
    expect(factor.impact).toBe(0.95)
  })

  it('should not change for normal queue (40-80h)', () => {
    const factor = calculateMachineLoadFactor(60)
    expect(factor.impact).toBe(1.0)
  })
})

describe('Dynamic Pricing — Quote Win/Loss Factor', () => {
  it('should decrease price for low acceptance rate (<30%)', () => {
    const factor = calculateQuoteWinLossFactor(20)
    expect(factor.impact).toBe(0.93)
  })

  it('should increase price for high acceptance rate (>80%)', () => {
    const factor = calculateQuoteWinLossFactor(90)
    expect(factor.impact).toBe(1.05)
  })

  it('should not change for normal acceptance rate (30-80%)', () => {
    const factor = calculateQuoteWinLossFactor(50)
    expect(factor.impact).toBe(1.0)
  })
})

describe('Dynamic Pricing — Volume Factor', () => {
  it('should give -10% for large batches (>=100)', () => {
    const factor = calculateVolumeFactor(100)
    expect(factor.impact).toBe(0.90)
  })

  it('should give -5% for medium batches (>=50)', () => {
    const factor = calculateVolumeFactor(75)
    expect(factor.impact).toBe(0.95)
  })

  it('should not discount small batches (<50)', () => {
    const factor = calculateVolumeFactor(10)
    expect(factor.impact).toBe(1.0)
  })
})

// ============================================
// PRICE SUGGESTION BOUNDS
// ============================================

describe('Dynamic Pricing — Suggestion Bounds', () => {
  const BASE_PRICE = 150

  it('should produce suggestion as multiplication of base price and all factors', () => {
    const suggestion = calculateDynamicPrice({
      partName: 'Tuleja', material: 'Stal', quantity: 10, complexity: 'medium',
      companyId: 'c1', machineQueuedHours: 60, customerTier: 'regular',
      daysUntilDeadline: 10, quoteAcceptanceRate: 50, historicalPricing: null,
    }, BASE_PRICE)

    // regular -> 1.0, deadline 10d -> 1.0, machine 60h -> 1.0, quote 50% -> 1.0, volume 10 -> 1.0
    expect(suggestion.combinedMultiplier).toBe(1.0)
    expect(suggestion.suggestedPricePerUnit).toBe(BASE_PRICE)
  })

  it('should keep combined multiplier within reasonable bounds (0.7 - 1.5)', () => {
    // Most expensive: new + 1d deadline + >80h load + high acceptance + small qty
    const expensive = calculateDynamicPrice({
      partName: 'Test', material: 'Stal', quantity: 1, complexity: 'complex',
      companyId: 'c1', machineQueuedHours: 100, customerTier: 'new',
      daysUntilDeadline: 1, quoteAcceptanceRate: 90, historicalPricing: null,
    }, 100)

    // Cheapest: VIP + long deadline + low load + low acceptance + large qty
    const cheap = calculateDynamicPrice({
      partName: 'Test', material: 'Stal', quantity: 200, complexity: 'simple',
      companyId: 'c1', machineQueuedHours: 10, customerTier: 'vip',
      daysUntilDeadline: 30, quoteAcceptanceRate: 20, historicalPricing: null,
    }, 100)

    expect(expensive.combinedMultiplier).toBeLessThanOrEqual(1.5)
    expect(cheap.combinedMultiplier).toBeGreaterThanOrEqual(0.7)
  })

  it('should calculate total price as price_per_unit * quantity', () => {
    const suggestion = calculateDynamicPrice({
      partName: 'Adapter', material: 'Aluminium', quantity: 25, complexity: 'simple',
      companyId: 'c1', machineQueuedHours: 60, customerTier: 'occasional',
      daysUntilDeadline: 10, quoteAcceptanceRate: null, historicalPricing: null,
    }, 80)

    expect(suggestion.totalSuggestedPrice).toBe(
      Math.round(suggestion.suggestedPricePerUnit * 25 * 100) / 100
    )
  })
})

// ============================================
// NEVER AUTO-APPLIES
// ============================================

describe('Dynamic Pricing — Suggestion Only', () => {
  it('should always set isAutoApplied to false', () => {
    const suggestion = calculateDynamicPrice({
      partName: 'Test', material: 'Stal', quantity: 1, complexity: 'simple',
      companyId: 'c1', machineQueuedHours: 50, customerTier: 'vip',
      daysUntilDeadline: 5, quoteAcceptanceRate: null, historicalPricing: null,
    }, 100)

    expect(suggestion.isAutoApplied).toBe(false)
  })
})

// ============================================
// MISSING FACTORS
// ============================================

describe('Dynamic Pricing — Missing Factors', () => {
  it('should work with no machine load data', () => {
    const suggestion = calculateDynamicPrice({
      partName: 'Test', material: 'Stal', quantity: 10, complexity: 'simple',
      companyId: 'c1', machineQueuedHours: null, customerTier: 'regular',
      daysUntilDeadline: 10, quoteAcceptanceRate: null, historicalPricing: null,
    }, 100)

    expect(suggestion.factors.map(f => f.name)).not.toContain('machine_load')
  })

  it('should work with no customer tier data', () => {
    const suggestion = calculateDynamicPrice({
      partName: 'Test', material: 'Stal', quantity: 10, complexity: 'simple',
      companyId: 'c1', machineQueuedHours: 50, customerTier: null,
      daysUntilDeadline: 10, quoteAcceptanceRate: null, historicalPricing: null,
    }, 100)

    expect(suggestion.factors.map(f => f.name)).not.toContain('customer_tier')
  })

  it('should work with no deadline data', () => {
    const suggestion = calculateDynamicPrice({
      partName: 'Test', material: 'Stal', quantity: 10, complexity: 'simple',
      companyId: 'c1', machineQueuedHours: 50, customerTier: 'regular',
      daysUntilDeadline: null, quoteAcceptanceRate: null, historicalPricing: null,
    }, 100)

    expect(suggestion.factors.map(f => f.name)).not.toContain('urgency')
  })

  it('should work with no quote acceptance data', () => {
    const suggestion = calculateDynamicPrice({
      partName: 'Test', material: 'Stal', quantity: 10, complexity: 'simple',
      companyId: 'c1', machineQueuedHours: 50, customerTier: 'regular',
      daysUntilDeadline: 10, quoteAcceptanceRate: null, historicalPricing: null,
    }, 100)

    expect(suggestion.factors.map(f => f.name)).not.toContain('quote_win_loss')
  })

  it('should still apply volume factor even with all others missing', () => {
    const suggestion = calculateDynamicPrice({
      partName: 'Test', material: 'Stal', quantity: 10, complexity: 'simple',
      companyId: 'c1', machineQueuedHours: null, customerTier: null,
      daysUntilDeadline: null, quoteAcceptanceRate: null, historicalPricing: null,
    }, 100)

    // Volume is always applied (qty=10 -> 1.0 no discount)
    expect(suggestion.factors.length).toBe(1)
    expect(suggestion.factors[0].name).toBe('volume')
    expect(suggestion.suggestedPricePerUnit).toBe(100) // volume 10 = no change
  })

  it('should have lower confidence with fewer factors', () => {
    const allFactors = calculateDynamicPrice({
      partName: 'Test', material: 'Stal', quantity: 10, complexity: 'simple',
      companyId: 'c1', machineQueuedHours: 50, customerTier: 'regular',
      daysUntilDeadline: 10, quoteAcceptanceRate: 60,
      historicalPricing: { avgPricePerUnit: 100, minPricePerUnit: 80, maxPricePerUnit: 120, orderCount: 15, confidence: 'high' },
    }, 100)

    const fewFactors = calculateDynamicPrice({
      partName: 'Test', material: 'Stal', quantity: 10, complexity: 'simple',
      companyId: 'c1', machineQueuedHours: null, customerTier: null,
      daysUntilDeadline: null, quoteAcceptanceRate: null, historicalPricing: null,
    }, 100)

    expect(allFactors.confidence).toBeGreaterThan(fewFactors.confidence)
  })
})

// ============================================
// HISTORICAL COMPARISON
// ============================================

describe('Dynamic Pricing — Historical Comparison', () => {
  it('should detect price in_range of historical data', () => {
    const comparison = compareToHistorical(100, {
      avgPricePerUnit: 100, minPricePerUnit: 80, maxPricePerUnit: 120,
      orderCount: 10, confidence: 'high',
    })
    expect(comparison).toBe('in_range')
  })

  it('should detect price below_range', () => {
    const comparison = compareToHistorical(50, {
      avgPricePerUnit: 100, minPricePerUnit: 80, maxPricePerUnit: 120,
      orderCount: 10, confidence: 'high',
    })
    expect(comparison).toBe('below_range')
  })

  it('should detect price above_range', () => {
    const comparison = compareToHistorical(150, {
      avgPricePerUnit: 100, minPricePerUnit: 80, maxPricePerUnit: 120,
      orderCount: 10, confidence: 'high',
    })
    expect(comparison).toBe('above_range')
  })

  it('should return no_data when no historical pricing', () => {
    const comparison = compareToHistorical(100, null)
    expect(comparison).toBe('no_data')
  })

  it('should return no_data when historical has zero orders', () => {
    const comparison = compareToHistorical(100, {
      avgPricePerUnit: 0, minPricePerUnit: 0, maxPricePerUnit: 0,
      orderCount: 0, confidence: 'low',
    })
    expect(comparison).toBe('no_data')
  })
})

// ============================================
// CUSTOMER TIER IMPACT
// ============================================

describe('Dynamic Pricing — Customer Tier Impact on Final Price', () => {
  const BASE = 200

  it('should give VIP the lowest and new the highest suggested price', () => {
    const makeInput = (tier: CustomerTier): DynamicPricingInput => ({
      partName: 'X', material: 'Stal', quantity: 10, complexity: 'simple',
      companyId: 'c1', machineQueuedHours: null, customerTier: tier,
      daysUntilDeadline: null, quoteAcceptanceRate: null, historicalPricing: null,
    })

    const vip = calculateDynamicPrice(makeInput('vip'), BASE)
    const regular = calculateDynamicPrice(makeInput('regular'), BASE)
    const newCust = calculateDynamicPrice(makeInput('new'), BASE)

    expect(vip.suggestedPricePerUnit).toBeLessThan(regular.suggestedPricePerUnit)
    expect(regular.suggestedPricePerUnit).toBeLessThan(newCust.suggestedPricePerUnit)
  })
})

// ============================================
// RESULT SHAPE
// ============================================

describe('Dynamic Pricing — Result Shape', () => {
  it('should return DynamicPricingResult with all required fields', () => {
    const suggestion = calculateDynamicPrice({
      partName: 'Tuleja', material: 'Stal 304', quantity: 10, complexity: 'medium',
      companyId: 'c1', machineQueuedHours: 60, customerTier: 'regular',
      daysUntilDeadline: 7, quoteAcceptanceRate: 50,
      historicalPricing: { avgPricePerUnit: 150, minPricePerUnit: 120, maxPricePerUnit: 180, orderCount: 8, confidence: 'medium' },
    }, 150)

    expect(suggestion).toHaveProperty('suggestedPricePerUnit')
    expect(suggestion).toHaveProperty('basePricePerUnit')
    expect(suggestion).toHaveProperty('totalSuggestedPrice')
    expect(suggestion).toHaveProperty('factors')
    expect(suggestion).toHaveProperty('combinedMultiplier')
    expect(suggestion).toHaveProperty('historicalComparison')
    expect(suggestion).toHaveProperty('confidence')
    expect(suggestion).toHaveProperty('isAutoApplied')
    expect(suggestion).toHaveProperty('source')
    expect(typeof suggestion.suggestedPricePerUnit).toBe('number')
    expect(typeof suggestion.confidence).toBe('number')
    expect(suggestion.confidence).toBeGreaterThanOrEqual(0)
    expect(suggestion.confidence).toBeLessThanOrEqual(100)
    expect(Array.isArray(suggestion.factors)).toBe(true)
  })

  it('should include reason in every factor', () => {
    const suggestion = calculateDynamicPrice({
      partName: 'Test', material: 'Stal', quantity: 1, complexity: 'simple',
      companyId: 'c1', machineQueuedHours: 85, customerTier: 'vip',
      daysUntilDeadline: 3, quoteAcceptanceRate: null, historicalPricing: null,
    }, 100)

    for (const factor of suggestion.factors) {
      expect(factor).toHaveProperty('name')
      expect(factor).toHaveProperty('impact')
      expect(factor).toHaveProperty('reason')
      expect(typeof factor.reason).toBe('string')
      expect(factor.reason.length).toBeGreaterThan(0)
    }
  })
})
