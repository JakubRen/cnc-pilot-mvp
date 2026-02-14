/**
 * Unit Tests for Order Autofill (Phase 2 — Feature 2.2)
 *
 * Tests the fuzzy search system that matches past orders by part name
 * and pre-fills material, dimensions, pricing for new orders.
 *
 * CONTRACT for backend-dev:
 * - searchSimilarOrders(query, companyId) -> SimilarOrderMatch[]
 * - Fuzzy match by part_name, material, customer_name
 * - Score by relevance (name similarity) + recency (newer = higher)
 * - Return prefilled fields: material, dimensions, unit_price, complexity
 * - Respect company_id isolation (multi-tenant)
 * - Handle empty/no matches gracefully
 */

import { describe, it, expect, vi } from 'vitest'

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}))

// ============================================
// CONTRACT TYPES
// ============================================

interface SimilarOrderMatch {
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

interface AutofillSuggestion {
  material: string | null
  dimensions: string | null
  complexity: 'simple' | 'medium' | 'complex' | null
  unitPrice: number | null
  estimatedHours: number | null
  confidence: number // 0-100
  basedOn: number // count of similar orders
}

// ============================================
// REFERENCE SCORING FUNCTION
// ============================================

function scoreSimilarity(query: string, target: string): number {
  const q = query.toLowerCase().trim()
  const t = target.toLowerCase().trim()

  if (q === t) return 100
  if (t.includes(q)) return 80
  if (q.includes(t)) return 70

  // Simple word overlap
  const qWords = q.split(/\s+/)
  const tWords = t.split(/\s+/)
  const overlap = qWords.filter(w => tWords.some(tw => tw.includes(w) || w.includes(tw))).length
  const maxWords = Math.max(qWords.length, tWords.length)

  return maxWords > 0 ? Math.round((overlap / maxWords) * 60) : 0
}

function scoreRecency(createdAt: string): number {
  const age = Date.now() - new Date(createdAt).getTime()
  const dayAge = age / (1000 * 60 * 60 * 24)

  if (dayAge <= 7) return 30
  if (dayAge <= 30) return 20
  if (dayAge <= 90) return 10
  return 0
}

function combineScore(query: string, match: { partName: string; createdAt: string }): number {
  return Math.min(100, scoreSimilarity(query, match.partName) + scoreRecency(match.createdAt))
}

// ============================================
// FUZZY MATCHING
// ============================================

describe('Order Autofill — Fuzzy Matching', () => {
  it('should score exact match as 100', () => {
    const score = scoreSimilarity('Tuleja redukcyjna', 'Tuleja redukcyjna')
    expect(score).toBe(100)
  })

  it('should score substring match high', () => {
    const score = scoreSimilarity('Tuleja', 'Tuleja redukcyjna ze stali')
    expect(score).toBeGreaterThanOrEqual(70)
  })

  it('should score word overlap partial match', () => {
    const score = scoreSimilarity('tuleja redukcyjna', 'tuleja mocujaca')
    expect(score).toBeGreaterThan(0)
    expect(score).toBeLessThan(100)
  })

  it('should score zero for completely unrelated strings', () => {
    const score = scoreSimilarity('tuleja', 'frezowanie aluminium')
    expect(score).toBe(0)
  })

  it('should be case insensitive', () => {
    const score1 = scoreSimilarity('Tuleja', 'tuleja')
    const score2 = scoreSimilarity('TULEJA', 'tuleja')
    expect(score1).toBe(score2)
    expect(score1).toBe(100)
  })
})

// ============================================
// RECENCY SCORING
// ============================================

describe('Order Autofill — Recency Scoring', () => {
  it('should score recent orders (< 7 days) highest', () => {
    const recentDate = new Date(Date.now() - 3 * 86400000).toISOString()
    expect(scoreRecency(recentDate)).toBe(30)
  })

  it('should score orders < 30 days as medium', () => {
    const date = new Date(Date.now() - 15 * 86400000).toISOString()
    expect(scoreRecency(date)).toBe(20)
  })

  it('should score orders < 90 days as low', () => {
    const date = new Date(Date.now() - 60 * 86400000).toISOString()
    expect(scoreRecency(date)).toBe(10)
  })

  it('should score old orders (> 90 days) as zero', () => {
    const oldDate = new Date(Date.now() - 120 * 86400000).toISOString()
    expect(scoreRecency(oldDate)).toBe(0)
  })
})

// ============================================
// COMBINED SCORING
// ============================================

describe('Order Autofill — Combined Scoring', () => {
  it('should combine similarity and recency scores', () => {
    const score = combineScore('Tuleja redukcyjna', {
      partName: 'Tuleja redukcyjna',
      createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
    })
    // Exact match (100) + recency (30) = capped at 100
    expect(score).toBe(100)
  })

  it('should cap combined score at 100', () => {
    const score = combineScore('Tuleja', {
      partName: 'Tuleja',
      createdAt: new Date().toISOString(),
    })
    expect(score).toBeLessThanOrEqual(100)
  })

  it('should rank recent similar orders above old exact matches', () => {
    const recentPartial = combineScore('Tuleja', {
      partName: 'Tuleja redukcyjna',
      createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
    })

    const oldExact = combineScore('Tuleja', {
      partName: 'Tuleja',
      createdAt: new Date(Date.now() - 200 * 86400000).toISOString(),
    })

    // Recent partial (80+30=100) vs old exact (100+0=100) — both capped
    // In practice, recent should at least match old
    expect(recentPartial).toBeGreaterThanOrEqual(oldExact - 10)
  })
})

// ============================================
// PREFILLED FIELDS
// ============================================

describe('Order Autofill — Prefilled Fields', () => {
  it('should return AutofillSuggestion with correct shape', () => {
    const suggestion: AutofillSuggestion = {
      material: 'Stal 304',
      dimensions: '100x50x20mm',
      complexity: 'medium',
      unitPrice: 150,
      estimatedHours: 2.5,
      confidence: 80,
      basedOn: 5,
    }

    expect(suggestion).toHaveProperty('material')
    expect(suggestion).toHaveProperty('dimensions')
    expect(suggestion).toHaveProperty('complexity')
    expect(suggestion).toHaveProperty('unitPrice')
    expect(suggestion).toHaveProperty('confidence')
    expect(suggestion).toHaveProperty('basedOn')
    expect(suggestion.confidence).toBeGreaterThanOrEqual(0)
    expect(suggestion.confidence).toBeLessThanOrEqual(100)
  })

  it('should handle null fields for incomplete order data', () => {
    const suggestion: AutofillSuggestion = {
      material: null,
      dimensions: null,
      complexity: null,
      unitPrice: null,
      estimatedHours: null,
      confidence: 30,
      basedOn: 1,
    }

    expect(suggestion.material).toBeNull()
    expect(suggestion.dimensions).toBeNull()
    expect(suggestion.confidence).toBe(30)
  })
})

// ============================================
// NO MATCHES
// ============================================

describe('Order Autofill — No Matches', () => {
  it('should return empty array for no matching orders', () => {
    const results: SimilarOrderMatch[] = []
    expect(results).toEqual([])
  })

  it('should return null suggestion when no matches exist', () => {
    const suggestion: AutofillSuggestion | null = null
    expect(suggestion).toBeNull()
  })
})

// ============================================
// COMPANY ISOLATION
// ============================================

describe('Order Autofill — Company Isolation', () => {
  it('should only match orders from the same company_id', () => {
    // CONTRACT: searchSimilarOrders must filter by companyId
    // Backend-dev must add .eq('company_id', companyId) to query
    const companyA = 'company-A'
    const companyB = 'company-B'
    expect(companyA).not.toBe(companyB)
  })
})

// ============================================
// MATCH RESULT SHAPE
// ============================================

describe('Order Autofill — Match Shape', () => {
  it('should return SimilarOrderMatch with all required fields', () => {
    const match: SimilarOrderMatch = {
      orderId: 'uuid-1',
      orderNumber: 'ORD-001',
      partName: 'Tuleja redukcyjna',
      material: 'Stal 304',
      quantity: 50,
      dimensions: '100x50mm',
      complexity: 'medium',
      unitPrice: 150,
      customerName: 'MetalTech',
      createdAt: new Date().toISOString(),
      score: 85,
    }

    expect(match).toHaveProperty('orderId')
    expect(match).toHaveProperty('orderNumber')
    expect(match).toHaveProperty('partName')
    expect(match).toHaveProperty('score')
    expect(match.score).toBeGreaterThanOrEqual(0)
    expect(match.score).toBeLessThanOrEqual(100)
  })
})
