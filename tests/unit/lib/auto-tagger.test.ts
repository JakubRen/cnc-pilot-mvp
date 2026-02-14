/**
 * Unit Tests for Auto-Tagger (Phase 1 — Feature 1.4)
 *
 * Tests the order auto-tagging system that suggests tags based on order data.
 * Tags help with filtering, reporting, and workflow automation.
 *
 * CONTRACT for backend-dev:
 * - New function: suggestTags(orderData) -> TagSuggestion[]
 * - Tag categories: material_type, complexity, urgency, machine_type, process
 * - Each suggestion has a tag, category, and confidence score (0-100)
 * - Heuristic tagging from structured fields (material, dimensions, deadline)
 * - AI enrichment for free-text fields (notes, email body)
 */

import { describe, it, expect, vi } from 'vitest'

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}))

// ============================================
// CONTRACT TYPES
// ============================================

type TagCategory = 'material_type' | 'complexity' | 'urgency' | 'machine_type' | 'process'

interface TagSuggestion {
  tag: string
  category: TagCategory
  confidence: number // 0-100
}

interface OrderTagInput {
  partName?: string
  material?: string
  dimensions?: string
  quantity?: number
  deadline?: string
  notes?: string
  complexity?: 'simple' | 'medium' | 'complex'
}

// ============================================
// HEURISTIC TAGGER (reference implementation for tests)
// ============================================

function heuristicSuggestTags(input: OrderTagInput): TagSuggestion[] {
  const tags: TagSuggestion[] = []

  // Material type tagging
  if (input.material) {
    const mat = input.material.toLowerCase()
    if (mat.includes('stal') || mat.includes('steel')) {
      tags.push({ tag: 'stal', category: 'material_type', confidence: 90 })
      if (mat.includes('nierdzewna') || mat.includes('304') || mat.includes('316') || mat.includes('inox')) {
        tags.push({ tag: 'stal_nierdzewna', category: 'material_type', confidence: 95 })
      }
    }
    if (mat.includes('aluminium') || mat.includes('alu') || mat.includes('6061') || mat.includes('7075')) {
      tags.push({ tag: 'aluminium', category: 'material_type', confidence: 90 })
    }
    if (mat.includes('miedz') || mat.includes('copper') || mat.includes('brass') || mat.includes('mosiądz')) {
      tags.push({ tag: 'miedz', category: 'material_type', confidence: 85 })
    }
    if (mat.includes('plastik') || mat.includes('pom') || mat.includes('peek') || mat.includes('delrin')) {
      tags.push({ tag: 'tworzywo', category: 'material_type', confidence: 85 })
    }
  }

  // Complexity tagging
  if (input.complexity) {
    tags.push({ tag: input.complexity, category: 'complexity', confidence: 95 })
  } else if (input.dimensions) {
    // Heuristic: many dimensions = more complex
    const dimParts = input.dimensions.split(/[x×X*]/g).filter(Boolean)
    if (dimParts.length >= 3) {
      tags.push({ tag: 'medium', category: 'complexity', confidence: 60 })
    }
  }

  // Urgency tagging based on deadline
  if (input.deadline) {
    const deadlineDate = new Date(input.deadline)
    const now = new Date()
    const daysUntil = Math.ceil((deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

    if (daysUntil <= 3) {
      tags.push({ tag: 'pilne', category: 'urgency', confidence: 95 })
    } else if (daysUntil <= 7) {
      tags.push({ tag: 'priorytet', category: 'urgency', confidence: 80 })
    } else {
      tags.push({ tag: 'standardowe', category: 'urgency', confidence: 70 })
    }
  }

  // Quantity-based tagging
  if (input.quantity && input.quantity >= 100) {
    tags.push({ tag: 'seria', category: 'process', confidence: 85 })
  } else if (input.quantity && input.quantity === 1) {
    tags.push({ tag: 'prototyp', category: 'process', confidence: 60 })
  }

  return tags
}

// ============================================
// MATERIAL TYPE TAGGING
// ============================================

describe('Auto-Tagger — Material Type', () => {
  it('should tag steel materials', () => {
    const tags = heuristicSuggestTags({ material: 'Stal 45' })
    const materialTags = tags.filter(t => t.category === 'material_type')
    expect(materialTags.some(t => t.tag === 'stal')).toBe(true)
  })

  it('should tag stainless steel with specific sub-tag', () => {
    const tags = heuristicSuggestTags({ material: 'Stal nierdzewna 304' })
    const materialTags = tags.filter(t => t.category === 'material_type')
    expect(materialTags.some(t => t.tag === 'stal_nierdzewna')).toBe(true)
    expect(materialTags.find(t => t.tag === 'stal_nierdzewna')!.confidence).toBeGreaterThanOrEqual(90)
  })

  it('should tag aluminium materials', () => {
    const tags = heuristicSuggestTags({ material: 'Aluminium 6061' })
    const materialTags = tags.filter(t => t.category === 'material_type')
    expect(materialTags.some(t => t.tag === 'aluminium')).toBe(true)
  })

  it('should tag copper/brass materials', () => {
    const tags = heuristicSuggestTags({ material: 'Mosiądz CuZn39Pb3' })
    const materialTags = tags.filter(t => t.category === 'material_type')
    expect(materialTags.some(t => t.tag === 'miedz')).toBe(true)
  })

  it('should tag plastic/polymer materials', () => {
    const tags = heuristicSuggestTags({ material: 'POM-C Delrin' })
    const materialTags = tags.filter(t => t.category === 'material_type')
    expect(materialTags.some(t => t.tag === 'tworzywo')).toBe(true)
  })

  it('should return empty material tags for unknown material', () => {
    const tags = heuristicSuggestTags({ material: 'Unknown XYZ-999' })
    const materialTags = tags.filter(t => t.category === 'material_type')
    expect(materialTags.length).toBe(0)
  })

  it('should handle missing material gracefully', () => {
    const tags = heuristicSuggestTags({})
    const materialTags = tags.filter(t => t.category === 'material_type')
    expect(materialTags.length).toBe(0)
  })
})

// ============================================
// COMPLEXITY TAGGING
// ============================================

describe('Auto-Tagger — Complexity', () => {
  it('should use explicit complexity when provided', () => {
    const tags = heuristicSuggestTags({ complexity: 'complex' })
    const complexityTags = tags.filter(t => t.category === 'complexity')
    expect(complexityTags.some(t => t.tag === 'complex')).toBe(true)
    expect(complexityTags[0].confidence).toBeGreaterThanOrEqual(90)
  })

  it('should infer medium complexity from 3D dimensions', () => {
    const tags = heuristicSuggestTags({ dimensions: '100x50x20mm' })
    const complexityTags = tags.filter(t => t.category === 'complexity')
    expect(complexityTags.length).toBeGreaterThanOrEqual(1)
  })

  it('should handle missing complexity and dimensions gracefully', () => {
    const tags = heuristicSuggestTags({ partName: 'Tuleja' })
    const complexityTags = tags.filter(t => t.category === 'complexity')
    // No complexity data = no complexity tag
    expect(complexityTags.length).toBe(0)
  })
})

// ============================================
// URGENCY TAGGING
// ============================================

describe('Auto-Tagger — Urgency', () => {
  it('should tag "pilne" for deadline within 3 days', () => {
    const deadline = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const tags = heuristicSuggestTags({ deadline })
    const urgencyTags = tags.filter(t => t.category === 'urgency')
    expect(urgencyTags.some(t => t.tag === 'pilne')).toBe(true)
  })

  it('should tag "priorytet" for deadline within 7 days', () => {
    const deadline = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const tags = heuristicSuggestTags({ deadline })
    const urgencyTags = tags.filter(t => t.category === 'urgency')
    expect(urgencyTags.some(t => t.tag === 'priorytet')).toBe(true)
  })

  it('should tag "standardowe" for deadline beyond 7 days', () => {
    const deadline = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const tags = heuristicSuggestTags({ deadline })
    const urgencyTags = tags.filter(t => t.category === 'urgency')
    expect(urgencyTags.some(t => t.tag === 'standardowe')).toBe(true)
  })

  it('should not tag urgency when no deadline', () => {
    const tags = heuristicSuggestTags({ material: 'Stal' })
    const urgencyTags = tags.filter(t => t.category === 'urgency')
    expect(urgencyTags.length).toBe(0)
  })
})

// ============================================
// PROCESS TAGGING
// ============================================

describe('Auto-Tagger — Process', () => {
  it('should tag "seria" for quantity >= 100', () => {
    const tags = heuristicSuggestTags({ quantity: 150 })
    const processTags = tags.filter(t => t.category === 'process')
    expect(processTags.some(t => t.tag === 'seria')).toBe(true)
  })

  it('should tag "prototyp" for quantity === 1', () => {
    const tags = heuristicSuggestTags({ quantity: 1 })
    const processTags = tags.filter(t => t.category === 'process')
    expect(processTags.some(t => t.tag === 'prototyp')).toBe(true)
  })

  it('should not tag process for moderate quantities', () => {
    const tags = heuristicSuggestTags({ quantity: 10 })
    const processTags = tags.filter(t => t.category === 'process')
    expect(processTags.length).toBe(0)
  })
})

// ============================================
// TAG SUGGESTION SHAPE
// ============================================

describe('Auto-Tagger — Tag Shape', () => {
  it('should return TagSuggestion[] with correct shape', () => {
    const tags = heuristicSuggestTags({
      material: 'Stal 304',
      complexity: 'medium',
      deadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
      quantity: 50,
    })

    expect(tags.length).toBeGreaterThan(0)
    for (const tag of tags) {
      expect(tag).toHaveProperty('tag')
      expect(tag).toHaveProperty('category')
      expect(tag).toHaveProperty('confidence')
      expect(typeof tag.tag).toBe('string')
      expect(typeof tag.confidence).toBe('number')
      expect(tag.confidence).toBeGreaterThanOrEqual(0)
      expect(tag.confidence).toBeLessThanOrEqual(100)

      const validCategories: TagCategory[] = ['material_type', 'complexity', 'urgency', 'machine_type', 'process']
      expect(validCategories).toContain(tag.category)
    }
  })

  it('should return empty array for empty input', () => {
    const tags = heuristicSuggestTags({})
    expect(tags).toEqual([])
  })
})

// ============================================
// COMBINED SCENARIOS
// ============================================

describe('Auto-Tagger — Combined Scenarios', () => {
  it('should generate multiple tags for a typical CNC order', () => {
    const tags = heuristicSuggestTags({
      partName: 'Tuleja redukcyjna',
      material: 'Stal nierdzewna 304',
      dimensions: '100x50x30mm',
      quantity: 50,
      deadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
      complexity: 'medium',
    })

    // Should have tags from multiple categories
    const categories = new Set(tags.map(t => t.category))
    expect(categories.size).toBeGreaterThanOrEqual(3) // material, complexity, urgency at minimum
  })

  it('should produce high-confidence tags for explicit data', () => {
    const tags = heuristicSuggestTags({
      material: 'Aluminium 6061',
      complexity: 'complex',
    })

    const highConfidence = tags.filter(t => t.confidence >= 85)
    expect(highConfidence.length).toBeGreaterThanOrEqual(2) // material + complexity
  })
})
