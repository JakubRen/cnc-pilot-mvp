'use server'

import { createClient } from '@/lib/supabase-server'
import { logger } from '@/lib/logger'
import type { MaterialSuggestion } from '@/types/ai-expansion'

// Re-export the main form suggestions API
export { getFormSuggestions } from '@/lib/ai/form-suggestions'

// ============================================
// MATERIAL SUGGESTIONS
// ============================================

/**
 * Suggest materials matching a partial input from order history + inventory.
 * Returns empty array for empty input.
 */
export async function suggestMaterials(
  input: string,
  companyId: string
): Promise<MaterialSuggestion[]> {
  if (!input || input.trim() === '') {
    return []
  }

  const normalizedInput = input.toLowerCase().trim()

  try {
    const supabase = await createClient()

    // Fetch unique materials from orders
    const { data: orders, error } = await supabase
      .from('orders')
      .select('material')
      .eq('company_id', companyId)
      .not('material', 'is', null)

    if (error) {
      logger.error('[smart-suggestions] Error fetching materials', { error })
      return []
    }

    // Count occurrences
    const materialCounts = new Map<string, number>()
    for (const order of orders || []) {
      if (order.material) {
        const mat = order.material.toLowerCase()
        materialCounts.set(mat, (materialCounts.get(mat) || 0) + 1)
      }
    }

    // Also fetch inventory materials
    const { data: invItems } = await supabase
      .from('inventory')
      .select('name')
      .eq('company_id', companyId)

    for (const item of invItems || []) {
      if (item.name && !materialCounts.has(item.name.toLowerCase())) {
        materialCounts.set(item.name.toLowerCase(), 0) // inventory-only
      }
    }

    // Filter and rank by match
    const results: MaterialSuggestion[] = []
    for (const [mat, count] of materialCounts.entries()) {
      if (mat.includes(normalizedInput)) {
        const source = count > 0 ? 'history' : 'inventory'
        const matchScore = mat === normalizedInput ? 100 : mat.startsWith(normalizedInput) ? 80 : 50
        results.push({
          name: mat,
          matchScore: Math.min(100, matchScore + count),
          source: source as 'history' | 'inventory',
        })
      }
    }

    // Sort by matchScore descending
    results.sort((a, b) => b.matchScore - a.matchScore)

    return results.slice(0, 10)
  } catch (err) {
    logger.error('[smart-suggestions] suggestMaterials error', { error: err })
    return []
  }
}

// ============================================
// QUANTITY SUGGESTION
// ============================================

export interface QuantitySuggestionResult {
  suggestedQuantity: number
  confidence: 'low' | 'medium' | 'high'
  basedOnOrders: number
}

/**
 * Suggest quantity based on order history for a given part name.
 * Returns null if no matching orders found.
 */
export async function suggestQuantity(
  partName: string,
  companyId: string
): Promise<QuantitySuggestionResult | null> {
  if (!partName || partName.trim() === '') {
    return null
  }

  try {
    const supabase = await createClient()

    const { data: orders, error } = await supabase
      .from('orders')
      .select('quantity')
      .eq('company_id', companyId)
      .ilike('part_name', `%${partName}%`)
      .neq('status', 'cancelled')
      .order('created_at', { ascending: false })
      .limit(20)

    if (error) {
      logger.error('[smart-suggestions] Error fetching quantities', { error })
      return null
    }

    if (!orders || orders.length === 0) {
      return null
    }

    const quantities = orders.map(o => o.quantity).filter(q => q > 0)
    if (quantities.length === 0) return null

    const avg = Math.round(quantities.reduce((s, q) => s + q, 0) / quantities.length)

    let confidence: 'low' | 'medium' | 'high' = 'low'
    if (quantities.length >= 5) confidence = 'high'
    else if (quantities.length >= 3) confidence = 'medium'

    return {
      suggestedQuantity: avg,
      confidence,
      basedOnOrders: quantities.length,
    }
  } catch (err) {
    logger.error('[smart-suggestions] suggestQuantity error', { error: err })
    return null
  }
}

// ============================================
// PRICE SANITY CHECK
// ============================================

export interface PriceSanityInput {
  partName: string
  material: string
  proposedPrice: number
  companyId: string
}

export interface PriceSanityResult {
  status: 'ok' | 'too_low' | 'too_high' | 'no_data'
  message: string
  avgHistoricalPrice: number | null
  suggestedRange: { min: number; max: number } | null
}

/**
 * Check if a proposed price is within a normal range based on history.
 */
export async function checkPriceSanity(
  input: PriceSanityInput
): Promise<PriceSanityResult> {
  try {
    const supabase = await createClient()

    let query = supabase
      .from('orders')
      .select('selling_price')
      .eq('company_id', input.companyId)
      .neq('status', 'cancelled')
      .not('selling_price', 'is', null)

    if (input.partName) {
      query = query.ilike('part_name', `%${input.partName}%`)
    }
    if (input.material) {
      query = query.ilike('material', `%${input.material}%`)
    }

    const { data: orders, error } = await query.limit(50)

    if (error) {
      logger.error('[smart-suggestions] Error fetching prices', { error })
      return { status: 'no_data', message: 'Nie udalo sie pobrac danych historycznych', avgHistoricalPrice: null, suggestedRange: null }
    }

    const prices = (orders || [])
      .map(o => Number(o.selling_price))
      .filter(p => p > 0)

    if (prices.length === 0) {
      return {
        status: 'no_data',
        message: 'Brak danych historycznych do porownania',
        avgHistoricalPrice: null,
        suggestedRange: null,
      }
    }

    const avgPrice = prices.reduce((s, p) => s + p, 0) / prices.length
    const minPrice = Math.min(...prices)
    const maxPrice = Math.max(...prices)

    const suggestedRange = {
      min: Math.round(minPrice * 0.9),
      max: Math.round(maxPrice * 1.1),
    }

    if (input.proposedPrice < avgPrice * 0.5) {
      return {
        status: 'too_low',
        message: `Cena ${input.proposedPrice} PLN jest znacznie ponizej sredniej ${avgPrice.toFixed(0)} PLN`,
        avgHistoricalPrice: Math.round(avgPrice),
        suggestedRange,
      }
    }

    if (input.proposedPrice > avgPrice * 2) {
      return {
        status: 'too_high',
        message: `Cena ${input.proposedPrice} PLN jest znacznie powyzej sredniej ${avgPrice.toFixed(0)} PLN`,
        avgHistoricalPrice: Math.round(avgPrice),
        suggestedRange,
      }
    }

    return {
      status: 'ok',
      message: 'Cena w normalnym zakresie',
      avgHistoricalPrice: Math.round(avgPrice),
      suggestedRange,
    }
  } catch (err) {
    logger.error('[smart-suggestions] checkPriceSanity error', { error: err })
    return { status: 'no_data', message: 'Blad podczas sprawdzania ceny', avgHistoricalPrice: null, suggestedRange: null }
  }
}
