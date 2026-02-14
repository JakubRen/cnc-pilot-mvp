// Auto-Reorder System (Phase 2 — Feature 2.6)
// Calculates EOQ (Economic Order Quantity) and generates draft purchase orders.
// Groups items by supplier for efficient procurement.
// Pure heuristic — no AI dependency.

import { createClient } from '@/lib/supabase-server'
import { calculateReorderPoint } from '@/lib/ai/inventory-math'
import { logger } from '@/lib/logger'

// ============================================
// TYPES
// ============================================

export interface EOQInput {
  annualDemandUnits: number
  orderingCostPln: number
  holdingCostPerUnitPln: number
  minimumOrderQuantity: number
}

export interface EOQResult {
  optimalQuantity: number
  annualOrderingCost: number
  annualHoldingCost: number
  totalAnnualCost: number
  ordersPerYear: number
}

export interface ReorderCandidate {
  itemId: string
  itemName: string
  currentStock: number
  reorderPoint: number
  dailyUsageRate: number
  supplier: string | null
  minimumOrderQuantity: number
  unitCostPln: number
}

export interface ReorderDraftItem {
  itemId: string
  itemName: string
  orderQuantity: number
  estimatedUnitCostPln: number
  estimatedLineCostPln: number
  reason: string
}

export interface ReorderDraft {
  supplierId: string | null
  supplierName: string | null
  items: ReorderDraftItem[]
  totalEstimatedCostPln: number
  urgency: 'critical' | 'standard'
  createdAt: string
}

// ============================================
// EOQ CALCULATION (Wilson Formula)
// ============================================

/**
 * Classic Wilson EOQ formula: Q* = sqrt(2DS/H)
 *   D = annual demand (units)
 *   S = ordering cost per order (PLN)
 *   H = holding cost per unit per year (PLN)
 *
 * Returns the optimal order quantity that minimizes total annual cost.
 */
export function calculateEOQ(input: EOQInput): EOQResult {
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
// REORDER DRAFT GENERATOR (pure function)
// ============================================

/**
 * Generate draft purchase orders from reorder candidates.
 * Groups items by supplier, calculates EOQ-based quantities, prevents duplicates.
 *
 * @param candidates - Items that are below their reorder point
 * @param existingDraftItemIds - Item IDs that already have pending draft orders
 */
export function generateReorderDrafts(
  candidates: ReorderCandidate[],
  existingDraftItemIds: Set<string>
): ReorderDraft[] {
  // 1. Filter out items that already have pending drafts (idempotency)
  const newCandidates = candidates.filter(c => !existingDraftItemIds.has(c.itemId))

  if (newCandidates.length === 0) return []

  // 2. Calculate order quantities via EOQ
  const draftItems: Array<ReorderDraftItem & { supplier: string | null; urgency: 'critical' | 'standard' }> = newCandidates.map(c => {
    const deficit = Math.max(0, c.reorderPoint - c.currentStock)
    const eoqInput: EOQInput = {
      annualDemandUnits: c.dailyUsageRate * 365,
      orderingCostPln: 50, // default ordering cost per order
      holdingCostPerUnitPln: c.unitCostPln * 0.2, // 20% of unit cost as annual holding cost
      minimumOrderQuantity: c.minimumOrderQuantity,
    }
    const eoq = calculateEOQ(eoqInput)
    const orderQuantity = Math.max(c.minimumOrderQuantity, Math.max(deficit, eoq.optimalQuantity))

    // Critical if out of stock or <=3 days of stock remaining
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

  // 4. Create drafts per supplier group
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
// PUBLIC API (server-side, Supabase queries)
// ============================================

/** Default ordering cost per order (PLN) */
const DEFAULT_ORDERING_COST_PLN = 50
/** Holding cost as % of unit cost per year */
const DEFAULT_HOLDING_COST_RATIO = 0.2
/** Default lead time (days) if no supplier data */
const DEFAULT_LEAD_TIME_DAYS = 5
/** Default minimum order quantity */
const DEFAULT_MIN_ORDER_QTY = 1

/**
 * Get auto-reorder drafts for a company.
 * Fetches inventory data, calculates reorder points, generates supplier-grouped drafts.
 *
 * @param companyId - company isolation
 */
export async function getAutoReorderDrafts(
  companyId: string
): Promise<ReorderDraft[]> {
  try {
    const supabase = await createClient()

    // 1. Fetch inventory items with stock data
    const { data: inventoryItems, error: invError } = await supabase
      .from('inventory')
      .select('id, name, quantity, unit_cost, supplier, low_stock_threshold')
      .eq('company_id', companyId)

    if (invError) {
      logger.error('[auto-reorder] Error fetching inventory', { error: invError })
      return []
    }

    if (!inventoryItems || inventoryItems.length === 0) return []

    // 2. Fetch material usage from orders (last 90 days)
    const ninetyDaysAgo = new Date()
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)

    const { data: orders, error: ordError } = await supabase
      .from('orders')
      .select('material, quantity')
      .eq('company_id', companyId)
      .neq('status', 'cancelled')
      .gte('created_at', ninetyDaysAgo.toISOString())
      .not('material', 'is', null)

    if (ordError) {
      logger.error('[auto-reorder] Error fetching orders', { error: ordError })
    }

    // Build usage map: material name (lowercase) → total quantity consumed
    const usageMap = new Map<string, number>()
    for (const order of orders || []) {
      if (!order.material) continue
      const key = order.material.toLowerCase()
      usageMap.set(key, (usageMap.get(key) || 0) + (order.quantity || 0))
    }

    // 3. Build reorder candidates
    const candidates: ReorderCandidate[] = []

    for (const item of inventoryItems) {
      const nameLower = item.name.toLowerCase()
      const totalConsumed = usageMap.get(nameLower) || 0
      const dailyRate = totalConsumed / 90

      if (dailyRate <= 0) continue // No usage → no reorder needed

      const { reorderPoint } = calculateReorderPoint({
        dailyUsageRate: dailyRate,
        leadTimeDays: DEFAULT_LEAD_TIME_DAYS,
      })

      const currentStock = Number(item.quantity) || 0

      // Only include items at or below reorder point
      if (currentStock <= reorderPoint) {
        candidates.push({
          itemId: item.id,
          itemName: item.name,
          currentStock,
          reorderPoint,
          dailyUsageRate: dailyRate,
          supplier: item.supplier || null,
          minimumOrderQuantity: DEFAULT_MIN_ORDER_QTY,
          unitCostPln: Number(item.unit_cost) || 0,
        })
      }
    }

    if (candidates.length === 0) return []

    // 4. Check for existing draft orders to prevent duplicates
    // (Placeholder: if a purchase_orders table existed, we'd query it here)
    const existingDraftItemIds = new Set<string>()

    // 5. Generate grouped drafts
    const drafts = generateReorderDrafts(candidates, existingDraftItemIds)

    logger.info('[auto-reorder] Generated drafts', {
      companyId,
      candidateCount: candidates.length,
      draftCount: drafts.length,
      criticalCount: drafts.filter(d => d.urgency === 'critical').length,
    })

    return drafts
  } catch (err) {
    logger.error('[auto-reorder] getAutoReorderDrafts failed', { error: err })
    return []
  }
}
