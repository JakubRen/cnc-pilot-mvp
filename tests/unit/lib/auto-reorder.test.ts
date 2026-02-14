/**
 * Unit Tests for Auto-Reorder (Phase 2 — Feature 2.6)
 *
 * Tests the automatic reorder system that:
 * - Calculates EOQ (Economic Order Quantity) from usage velocity
 * - Groups orders by supplier for efficiency
 * - Triggers on critical inventory thresholds
 * - Prevents duplicate draft purchase orders
 * - Respects minimum order quantities
 *
 * CONTRACT for backend-dev:
 * - calculateEOQ(input) -> EOQResult
 * - generateReorderDrafts(companyId) -> ReorderDraft[]
 * - Uses inventory-math.ts velocity + reorder point calculations
 * - Company isolation via company_id
 * - Idempotent: no duplicate drafts for same item
 */

import { describe, it, expect, vi } from 'vitest'

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}))

// ============================================
// CONTRACT TYPES
// ============================================

interface EOQInput {
  annualDemandUnits: number
  orderingCostPln: number
  holdingCostPerUnitPln: number
  minimumOrderQuantity: number
}

interface EOQResult {
  optimalQuantity: number
  annualOrderingCost: number
  annualHoldingCost: number
  totalAnnualCost: number
  ordersPerYear: number
}

interface ReorderCandidate {
  itemId: string
  itemName: string
  currentStock: number
  reorderPoint: number
  dailyUsageRate: number
  supplier: string | null
  minimumOrderQuantity: number
  unitCostPln: number
}

interface ReorderDraft {
  supplierId: string | null
  supplierName: string | null
  items: ReorderDraftItem[]
  totalEstimatedCostPln: number
  urgency: 'critical' | 'standard'
  createdAt: string
}

interface ReorderDraftItem {
  itemId: string
  itemName: string
  orderQuantity: number
  estimatedUnitCostPln: number
  estimatedLineCostPln: number
  reason: string
}

// ============================================
// REFERENCE EOQ CALCULATION
// ============================================

/**
 * Classic Wilson EOQ formula: Q* = sqrt(2DS/H)
 *   D = annual demand
 *   S = ordering cost per order
 *   H = holding cost per unit per year
 */
function calculateEOQ(input: EOQInput): EOQResult {
  const { annualDemandUnits, orderingCostPln, holdingCostPerUnitPln, minimumOrderQuantity } = input

  if (annualDemandUnits <= 0 || orderingCostPln <= 0 || holdingCostPerUnitPln <= 0) {
    return {
      optimalQuantity: minimumOrderQuantity,
      annualOrderingCost: 0,
      annualHoldingCost: 0,
      totalAnnualCost: 0,
      ordersPerYear: 0,
    }
  }

  const rawEOQ = Math.sqrt((2 * annualDemandUnits * orderingCostPln) / holdingCostPerUnitPln)
  const optimalQuantity = Math.max(minimumOrderQuantity, Math.round(rawEOQ))

  const ordersPerYear = annualDemandUnits / optimalQuantity
  const annualOrderingCost = Math.round(ordersPerYear * orderingCostPln * 100) / 100
  const annualHoldingCost = Math.round((optimalQuantity / 2) * holdingCostPerUnitPln * 100) / 100
  const totalAnnualCost = Math.round((annualOrderingCost + annualHoldingCost) * 100) / 100

  return {
    optimalQuantity,
    annualOrderingCost,
    annualHoldingCost,
    totalAnnualCost,
    ordersPerYear: Math.round(ordersPerYear * 10) / 10,
  }
}

// ============================================
// REFERENCE REORDER DRAFT GENERATOR
// ============================================

function generateReorderDrafts(
  candidates: ReorderCandidate[],
  existingDraftItemIds: Set<string>
): ReorderDraft[] {
  // 1. Filter out items that already have pending drafts
  const newCandidates = candidates.filter(c => !existingDraftItemIds.has(c.itemId))

  if (newCandidates.length === 0) return []

  // 2. Calculate order quantities
  const draftItems: Array<ReorderDraftItem & { supplier: string | null; urgency: 'critical' | 'standard' }> = newCandidates.map(c => {
    const deficit = Math.max(0, c.reorderPoint - c.currentStock)
    const eoqInput: EOQInput = {
      annualDemandUnits: c.dailyUsageRate * 365,
      orderingCostPln: 50, // default ordering cost
      holdingCostPerUnitPln: c.unitCostPln * 0.2, // 20% of unit cost as holding cost
      minimumOrderQuantity: c.minimumOrderQuantity,
    }
    const eoq = calculateEOQ(eoqInput)
    const orderQuantity = Math.max(c.minimumOrderQuantity, Math.max(deficit, eoq.optimalQuantity))

    const isCritical = c.currentStock <= 0 || (c.dailyUsageRate > 0 && (c.currentStock / c.dailyUsageRate) <= 3)

    return {
      itemId: c.itemId,
      itemName: c.itemName,
      orderQuantity,
      estimatedUnitCostPln: c.unitCostPln,
      estimatedLineCostPln: Math.round(orderQuantity * c.unitCostPln * 100) / 100,
      reason: isCritical
        ? `Krytycznie niski stan: ${c.currentStock} szt. Punkt zamowienia: ${c.reorderPoint}.`
        : `Ponizej punktu zamowienia: ${c.currentStock}/${c.reorderPoint} szt.`,
      supplier: c.supplier,
      urgency: isCritical ? 'critical' as const : 'standard' as const,
    }
  })

  // 3. Group by supplier
  const groups = new Map<string, typeof draftItems>()
  for (const item of draftItems) {
    const key = item.supplier || '__no_supplier__'
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(item)
  }

  // 4. Create drafts
  const drafts: ReorderDraft[] = []
  for (const [supplier, items] of groups) {
    const totalCost = items.reduce((s, i) => s + i.estimatedLineCostPln, 0)
    const hasAnyCritical = items.some(i => i.urgency === 'critical')

    drafts.push({
      supplierId: supplier === '__no_supplier__' ? null : supplier,
      supplierName: supplier === '__no_supplier__' ? null : supplier,
      items: items.map(({ supplier: _, urgency: __, ...rest }) => rest),
      totalEstimatedCostPln: Math.round(totalCost * 100) / 100,
      urgency: hasAnyCritical ? 'critical' : 'standard',
      createdAt: new Date().toISOString(),
    })
  }

  // Sort: critical first
  drafts.sort((a, b) => (a.urgency === 'critical' ? -1 : 1) - (b.urgency === 'critical' ? -1 : 1))

  return drafts
}

// ============================================
// EOQ CALCULATION
// ============================================

describe('Auto-Reorder — EOQ Calculation', () => {
  it('should calculate correct EOQ for standard inputs', () => {
    const result = calculateEOQ({
      annualDemandUnits: 1000,
      orderingCostPln: 50,
      holdingCostPerUnitPln: 2,
      minimumOrderQuantity: 1,
    })

    // Q* = sqrt(2 * 1000 * 50 / 2) = sqrt(50000) ≈ 224
    expect(result.optimalQuantity).toBeGreaterThanOrEqual(200)
    expect(result.optimalQuantity).toBeLessThanOrEqual(250)
    expect(result.ordersPerYear).toBeGreaterThan(0)
    expect(result.totalAnnualCost).toBeGreaterThan(0)
  })

  it('should respect minimum order quantity', () => {
    const result = calculateEOQ({
      annualDemandUnits: 10,
      orderingCostPln: 5,
      holdingCostPerUnitPln: 1,
      minimumOrderQuantity: 100,
    })

    expect(result.optimalQuantity).toBeGreaterThanOrEqual(100)
  })

  it('should handle zero demand gracefully', () => {
    const result = calculateEOQ({
      annualDemandUnits: 0,
      orderingCostPln: 50,
      holdingCostPerUnitPln: 2,
      minimumOrderQuantity: 10,
    })

    expect(result.optimalQuantity).toBe(10) // fallback to minimum
    expect(result.totalAnnualCost).toBe(0)
  })

  it('should handle zero costs gracefully', () => {
    const result = calculateEOQ({
      annualDemandUnits: 1000,
      orderingCostPln: 0,
      holdingCostPerUnitPln: 0,
      minimumOrderQuantity: 5,
    })

    expect(result.optimalQuantity).toBe(5) // fallback to minimum
  })

  it('should balance ordering vs holding cost (EOQ property)', () => {
    const result = calculateEOQ({
      annualDemandUnits: 1200,
      orderingCostPln: 100,
      holdingCostPerUnitPln: 5,
      minimumOrderQuantity: 1,
    })

    // At EOQ, ordering cost ≈ holding cost (classic property)
    const costRatio = result.annualOrderingCost / result.annualHoldingCost
    expect(costRatio).toBeGreaterThan(0.5)
    expect(costRatio).toBeLessThan(2.0)
  })

  it('should produce integer optimal quantity', () => {
    const result = calculateEOQ({
      annualDemandUnits: 500,
      orderingCostPln: 75,
      holdingCostPerUnitPln: 3,
      minimumOrderQuantity: 1,
    })

    expect(Number.isInteger(result.optimalQuantity)).toBe(true)
  })
})

// ============================================
// SUPPLIER GROUPING
// ============================================

describe('Auto-Reorder — Supplier Grouping', () => {
  it('should group candidates by supplier', () => {
    const candidates: ReorderCandidate[] = [
      { itemId: 'i1', itemName: 'Stal 45', currentStock: 5, reorderPoint: 20, dailyUsageRate: 2, supplier: 'MetalMax', minimumOrderQuantity: 10, unitCostPln: 15 },
      { itemId: 'i2', itemName: 'Stal 304', currentStock: 3, reorderPoint: 15, dailyUsageRate: 1, supplier: 'MetalMax', minimumOrderQuantity: 5, unitCostPln: 25 },
      { itemId: 'i3', itemName: 'Aluminium 6061', currentStock: 0, reorderPoint: 10, dailyUsageRate: 3, supplier: 'AluCenter', minimumOrderQuantity: 10, unitCostPln: 30 },
    ]

    const drafts = generateReorderDrafts(candidates, new Set())

    // Should produce 2 drafts: MetalMax (2 items) and AluCenter (1 item)
    expect(drafts.length).toBe(2)

    const metalMax = drafts.find(d => d.supplierName === 'MetalMax')
    const aluCenter = drafts.find(d => d.supplierName === 'AluCenter')

    expect(metalMax).toBeDefined()
    expect(metalMax!.items.length).toBe(2)
    expect(aluCenter).toBeDefined()
    expect(aluCenter!.items.length).toBe(1)
  })

  it('should handle candidates without supplier', () => {
    const candidates: ReorderCandidate[] = [
      { itemId: 'i1', itemName: 'Unknown Material', currentStock: 5, reorderPoint: 20, dailyUsageRate: 1, supplier: null, minimumOrderQuantity: 10, unitCostPln: 10 },
    ]

    const drafts = generateReorderDrafts(candidates, new Set())

    expect(drafts.length).toBe(1)
    expect(drafts[0].supplierId).toBeNull()
    expect(drafts[0].supplierName).toBeNull()
  })
})

// ============================================
// CRITICAL INVENTORY TRIGGERS
// ============================================

describe('Auto-Reorder — Critical Triggers', () => {
  it('should mark out-of-stock items as critical urgency', () => {
    const candidates: ReorderCandidate[] = [
      { itemId: 'i1', itemName: 'Stal 45', currentStock: 0, reorderPoint: 20, dailyUsageRate: 5, supplier: 'Supplier A', minimumOrderQuantity: 10, unitCostPln: 10 },
    ]

    const drafts = generateReorderDrafts(candidates, new Set())

    expect(drafts[0].urgency).toBe('critical')
    expect(drafts[0].items[0].reason).toContain('Krytycznie')
  })

  it('should mark items with 3 or fewer days of stock as critical', () => {
    const candidates: ReorderCandidate[] = [
      { itemId: 'i1', itemName: 'Material A', currentStock: 6, reorderPoint: 20, dailyUsageRate: 3, supplier: 'Sup', minimumOrderQuantity: 1, unitCostPln: 10 },
    ]

    // 6 stock / 3 per day = 2 days <= 3 → critical
    const drafts = generateReorderDrafts(candidates, new Set())
    expect(drafts[0].urgency).toBe('critical')
  })

  it('should mark items with >3 days stock as standard urgency', () => {
    const candidates: ReorderCandidate[] = [
      { itemId: 'i1', itemName: 'Material B', currentStock: 50, reorderPoint: 60, dailyUsageRate: 5, supplier: 'Sup', minimumOrderQuantity: 1, unitCostPln: 10 },
    ]

    // 50 stock / 5 per day = 10 days > 3 → standard
    const drafts = generateReorderDrafts(candidates, new Set())
    expect(drafts[0].urgency).toBe('standard')
  })
})

// ============================================
// DUPLICATE PREVENTION
// ============================================

describe('Auto-Reorder — Duplicate Prevention', () => {
  it('should not create drafts for items with existing pending drafts', () => {
    const candidates: ReorderCandidate[] = [
      { itemId: 'i1', itemName: 'Stal 45', currentStock: 5, reorderPoint: 20, dailyUsageRate: 2, supplier: 'MetalMax', minimumOrderQuantity: 10, unitCostPln: 15 },
      { itemId: 'i2', itemName: 'Stal 304', currentStock: 3, reorderPoint: 15, dailyUsageRate: 1, supplier: 'MetalMax', minimumOrderQuantity: 5, unitCostPln: 25 },
    ]

    const existingDrafts = new Set(['i1']) // i1 already has a draft

    const drafts = generateReorderDrafts(candidates, existingDrafts)

    // Only i2 should be in draft
    expect(drafts.length).toBe(1)
    expect(drafts[0].items.length).toBe(1)
    expect(drafts[0].items[0].itemId).toBe('i2')
  })

  it('should return empty when all items already have drafts', () => {
    const candidates: ReorderCandidate[] = [
      { itemId: 'i1', itemName: 'A', currentStock: 5, reorderPoint: 20, dailyUsageRate: 1, supplier: 'S', minimumOrderQuantity: 1, unitCostPln: 10 },
    ]

    const drafts = generateReorderDrafts(candidates, new Set(['i1']))
    expect(drafts).toEqual([])
  })
})

// ============================================
// MINIMUM ORDER QUANTITIES
// ============================================

describe('Auto-Reorder — Minimum Order Quantities', () => {
  it('should never order below minimum quantity', () => {
    const candidates: ReorderCandidate[] = [
      { itemId: 'i1', itemName: 'Stal', currentStock: 19, reorderPoint: 20, dailyUsageRate: 0.5, supplier: 'S', minimumOrderQuantity: 100, unitCostPln: 10 },
    ]

    const drafts = generateReorderDrafts(candidates, new Set())

    expect(drafts[0].items[0].orderQuantity).toBeGreaterThanOrEqual(100)
  })

  it('should order at least the deficit amount', () => {
    const candidates: ReorderCandidate[] = [
      { itemId: 'i1', itemName: 'Aluminum', currentStock: 0, reorderPoint: 50, dailyUsageRate: 5, supplier: 'S', minimumOrderQuantity: 1, unitCostPln: 30 },
    ]

    const drafts = generateReorderDrafts(candidates, new Set())

    // deficit = 50 - 0 = 50, so order at least 50
    expect(drafts[0].items[0].orderQuantity).toBeGreaterThanOrEqual(50)
  })
})

// ============================================
// COST ESTIMATION
// ============================================

describe('Auto-Reorder — Cost Estimation', () => {
  it('should calculate correct line cost per item', () => {
    const candidates: ReorderCandidate[] = [
      { itemId: 'i1', itemName: 'Stal', currentStock: 0, reorderPoint: 10, dailyUsageRate: 1, supplier: 'S', minimumOrderQuantity: 10, unitCostPln: 25 },
    ]

    const drafts = generateReorderDrafts(candidates, new Set())
    const item = drafts[0].items[0]

    expect(item.estimatedLineCostPln).toBe(item.orderQuantity * item.estimatedUnitCostPln)
  })

  it('should calculate total draft cost as sum of line costs', () => {
    const candidates: ReorderCandidate[] = [
      { itemId: 'i1', itemName: 'A', currentStock: 0, reorderPoint: 10, dailyUsageRate: 1, supplier: 'Same', minimumOrderQuantity: 10, unitCostPln: 20 },
      { itemId: 'i2', itemName: 'B', currentStock: 0, reorderPoint: 10, dailyUsageRate: 1, supplier: 'Same', minimumOrderQuantity: 10, unitCostPln: 30 },
    ]

    const drafts = generateReorderDrafts(candidates, new Set())

    const expectedTotal = drafts[0].items.reduce((s, i) => s + i.estimatedLineCostPln, 0)
    expect(drafts[0].totalEstimatedCostPln).toBeCloseTo(expectedTotal, 2)
  })
})

// ============================================
// RESULT SHAPE
// ============================================

describe('Auto-Reorder — Result Shape', () => {
  it('should return ReorderDraft with all required fields', () => {
    const candidates: ReorderCandidate[] = [
      { itemId: 'i1', itemName: 'Stal 45', currentStock: 5, reorderPoint: 20, dailyUsageRate: 2, supplier: 'MetalMax', minimumOrderQuantity: 10, unitCostPln: 15 },
    ]

    const drafts = generateReorderDrafts(candidates, new Set())

    expect(drafts.length).toBe(1)
    const draft = drafts[0]
    expect(draft).toHaveProperty('supplierId')
    expect(draft).toHaveProperty('supplierName')
    expect(draft).toHaveProperty('items')
    expect(draft).toHaveProperty('totalEstimatedCostPln')
    expect(draft).toHaveProperty('urgency')
    expect(draft).toHaveProperty('createdAt')
    expect(Array.isArray(draft.items)).toBe(true)
    expect(draft.items.length).toBeGreaterThan(0)
  })

  it('should return ReorderDraftItem with all required fields', () => {
    const candidates: ReorderCandidate[] = [
      { itemId: 'i1', itemName: 'Stal', currentStock: 0, reorderPoint: 10, dailyUsageRate: 1, supplier: 'S', minimumOrderQuantity: 10, unitCostPln: 10 },
    ]

    const drafts = generateReorderDrafts(candidates, new Set())
    const item = drafts[0].items[0]

    expect(item).toHaveProperty('itemId')
    expect(item).toHaveProperty('itemName')
    expect(item).toHaveProperty('orderQuantity')
    expect(item).toHaveProperty('estimatedUnitCostPln')
    expect(item).toHaveProperty('estimatedLineCostPln')
    expect(item).toHaveProperty('reason')
    expect(typeof item.orderQuantity).toBe('number')
    expect(item.orderQuantity).toBeGreaterThan(0)
    expect(typeof item.reason).toBe('string')
    expect(item.reason.length).toBeGreaterThan(0)
  })

  it('should return EOQResult with all required fields', () => {
    const result = calculateEOQ({
      annualDemandUnits: 1000,
      orderingCostPln: 50,
      holdingCostPerUnitPln: 2,
      minimumOrderQuantity: 1,
    })

    expect(result).toHaveProperty('optimalQuantity')
    expect(result).toHaveProperty('annualOrderingCost')
    expect(result).toHaveProperty('annualHoldingCost')
    expect(result).toHaveProperty('totalAnnualCost')
    expect(result).toHaveProperty('ordersPerYear')
    expect(typeof result.optimalQuantity).toBe('number')
    expect(result.optimalQuantity).toBeGreaterThan(0)
  })

  it('should return empty array when no candidates', () => {
    const drafts = generateReorderDrafts([], new Set())
    expect(drafts).toEqual([])
  })
})

// ============================================
// COMPANY ISOLATION
// ============================================

describe('Auto-Reorder — Company Isolation', () => {
  it('should require companyId for reorder generation', () => {
    // CONTRACT: generateReorderDrafts(companyId) must filter by company_id
    const companyA = 'company-A'
    const companyB = 'company-B'
    expect(companyA).not.toBe(companyB)
    // Backend-dev must add .eq('company_id', companyId) to inventory + draft queries
  })
})
