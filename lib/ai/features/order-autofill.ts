// Order Autofill (Phase 2 — Feature 2.2)
// Fuzzy searches past orders by part name and pre-fills material, dimensions,
// pricing for new orders. Pure DB query + scoring — no AI dependency.

import { createClient } from '@/lib/supabase-server'
import { logger } from '@/lib/logger'

// ============================================
// TYPES
// ============================================

export interface SimilarOrderMatch {
  orderId: string
  orderNumber: string
  partName: string
  material: string | null
  quantity: number
  dimensions: string | null
  complexity: 'simple' | 'medium' | 'complex' | null
  unitPrice: number | null
  customerName: string
  createdAt: string
  /** Relevance score 0-100 (higher = better match) */
  score: number
}

export interface AutofillSuggestion {
  material: string | null
  dimensions: string | null
  complexity: 'simple' | 'medium' | 'complex' | null
  unitPrice: number | null
  estimatedHours: number | null
  confidence: number // 0-100
  basedOn: number // count of similar orders
}

// ============================================
// SCORING FUNCTIONS
// ============================================

/**
 * Score how similar two strings are (0-100).
 * Handles exact match, substring, and word overlap.
 */
export function scoreSimilarity(query: string, target: string): number {
  const q = query.toLowerCase().trim()
  const t = target.toLowerCase().trim()

  if (q === t) return 100
  if (t.includes(q)) return 80
  if (q.includes(t)) return 70

  // Word overlap scoring
  const qWords = q.split(/\s+/)
  const tWords = t.split(/\s+/)
  const overlap = qWords.filter(w => tWords.some(tw => tw.includes(w) || w.includes(tw))).length
  const maxWords = Math.max(qWords.length, tWords.length)

  return maxWords > 0 ? Math.round((overlap / maxWords) * 60) : 0
}

/**
 * Score recency of an order (0-30). Newer orders score higher.
 */
export function scoreRecency(createdAt: string): number {
  const age = Date.now() - new Date(createdAt).getTime()
  const dayAge = age / (1000 * 60 * 60 * 24)

  if (dayAge <= 7) return 30
  if (dayAge <= 30) return 20
  if (dayAge <= 90) return 10
  return 0
}

/**
 * Combine similarity and recency into a single score (capped at 100).
 */
export function combineScore(query: string, match: { partName: string; createdAt: string }): number {
  return Math.min(100, scoreSimilarity(query, match.partName) + scoreRecency(match.createdAt))
}

// ============================================
// PUBLIC API
// ============================================

/** Maximum results to return */
const MAX_RESULTS = 10
/** Minimum score to include in results */
const MIN_SCORE = 20

/**
 * Search for similar past orders by part name.
 * Uses ilike for initial DB filtering, then scores client-side for ranking.
 *
 * @param query - Part name to search for
 * @param companyId - Company isolation
 */
export async function searchSimilarOrders(
  query: string,
  companyId: string
): Promise<SimilarOrderMatch[]> {
  if (!query || query.trim().length < 2) return []

  try {
    const supabase = await createClient()
    const searchTerm = `%${query.trim()}%`

    // Search orders with part_name matching the query
    const { data: orders, error } = await supabase
      .from('orders')
      .select('id, order_number, part_name, material, quantity, estimated_hours, customer_name, price_per_unit, created_at')
      .eq('company_id', companyId)
      .neq('status', 'cancelled')
      .ilike('part_name', searchTerm)
      .order('created_at', { ascending: false })
      .limit(50) // Fetch more than needed, then score and trim

    if (error) {
      logger.error('[order-autofill] Error searching orders', { error })
      return []
    }

    if (!orders || orders.length === 0) return []

    // Score and rank matches
    const matches: SimilarOrderMatch[] = orders
      .map(order => ({
        orderId: order.id,
        orderNumber: order.order_number,
        partName: order.part_name || '',
        material: order.material || null,
        quantity: order.quantity || 0,
        dimensions: null, // Orders table doesn't have dimensions; order_items does
        complexity: null as 'simple' | 'medium' | 'complex' | null,
        unitPrice: order.price_per_unit != null ? Number(order.price_per_unit) : null,
        customerName: order.customer_name || '',
        createdAt: order.created_at,
        score: combineScore(query, {
          partName: order.part_name || '',
          createdAt: order.created_at,
        }),
      }))
      .filter(m => m.score >= MIN_SCORE)
      .sort((a, b) => b.score - a.score)
      .slice(0, MAX_RESULTS)

    return matches
  } catch (err) {
    logger.error('[order-autofill] searchSimilarOrders failed', { error: err })
    return []
  }
}

/**
 * Get autofill suggestion based on similar orders.
 * Aggregates fields from the top matches to produce a confident suggestion.
 *
 * @param query - Part name to search for
 * @param companyId - Company isolation
 */
export async function getAutofillSuggestion(
  query: string,
  companyId: string
): Promise<AutofillSuggestion | null> {
  const matches = await searchSimilarOrders(query, companyId)

  if (matches.length === 0) return null

  // Use the highest-scored match as the primary source
  const best = matches[0]

  // Find most common material across matches
  const materialCounts = new Map<string, number>()
  for (const m of matches) {
    if (m.material) {
      const key = m.material.toLowerCase()
      materialCounts.set(key, (materialCounts.get(key) || 0) + 1)
    }
  }
  const topMaterial = [...materialCounts.entries()]
    .sort((a, b) => b[1] - a[1])[0]

  // Average unit price from matches that have one
  const prices = matches
    .filter(m => m.unitPrice != null && m.unitPrice > 0)
    .map(m => m.unitPrice as number)
  const avgPrice = prices.length > 0
    ? Math.round(prices.reduce((s, p) => s + p, 0) / prices.length * 100) / 100
    : null

  // Confidence based on match count and best score
  const confidence = Math.min(100, Math.round(
    (best.score * 0.6) + (Math.min(matches.length, 5) / 5 * 40)
  ))

  return {
    material: topMaterial
      ? matches.find(m => m.material?.toLowerCase() === topMaterial[0])?.material || null
      : best.material,
    dimensions: best.dimensions,
    complexity: best.complexity,
    unitPrice: avgPrice,
    estimatedHours: null, // Could be calculated from order_items in future
    confidence,
    basedOn: matches.length,
  }
}
