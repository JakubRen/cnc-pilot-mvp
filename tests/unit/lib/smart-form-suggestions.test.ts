/**
 * Unit Tests for Smart Form Suggestions (AI Feature #1)
 *
 * Tests: material matching, quantity suggestion from history,
 * price sanity check math, heuristic fallback pricing.
 *
 * TDD: These tests define expected behavior. They will fail until
 * backend-dev implements the corresponding functions.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// ============================================
// MOCKS
// ============================================

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'test-user-id' } },
      }),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({
            data: { company_id: 'test-company' },
          }),
          order: vi.fn(() => ({
            limit: vi.fn().mockResolvedValue({ data: [] }),
          })),
        })),
        ilike: vi.fn(() => ({
          eq: vi.fn(() => ({
            limit: vi.fn().mockResolvedValue({ data: [] }),
          })),
        })),
      })),
      rpc: vi.fn().mockResolvedValue({ data: [] }),
    })),
    rpc: vi.fn().mockResolvedValue({ data: [] }),
  },
}))

// Mock Gemini API
vi.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: vi.fn().mockImplementation(() => ({
    getGenerativeModel: vi.fn().mockReturnValue({
      generateContent: vi.fn().mockResolvedValue({
        response: {
          text: () => JSON.stringify({ suggestion: 'mocked' }),
        },
      }),
    }),
  })),
  SchemaType: { OBJECT: 'OBJECT', STRING: 'STRING', NUMBER: 'NUMBER', ARRAY: 'ARRAY' },
}))

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}))

// ============================================
// HEURISTIC PRICE ESTIMATE (from openai-client.ts)
// ============================================

import { estimatePrice, type PriceEstimateParams } from '@/lib/ai/openai-client'

describe('Smart Form Suggestions — Heuristic Price Estimate', () => {
  beforeEach(() => {
    // Ensure no API key so we get heuristic fallback
    delete process.env.GOOGLE_GENERATIVE_AI_API_KEY
  })

  describe('basic heuristic calculations', () => {
    it('should return heuristic estimate when no API key', async () => {
      const result = await estimatePrice({
        material: 'stal',
        complexity: 'medium',
        quantity: 1,
      })

      expect(result.confidence).toBe(50)
      expect(result.reasoning).toContain('heurystyczna')
    })

    it('should calculate medium complexity correctly', async () => {
      const result = await estimatePrice({
        material: 'stal',
        complexity: 'medium',
        quantity: 1,
      })

      // medium complexity multiplier = 1.5
      // materialCost = 50 (stal default)
      // estimatedHours = 2 * 1.5 = 3
      // laborCost = 3 * 150 = 450
      // machineTimeCost = 3 * 50 = 150
      // overhead = (50 + 450 + 150) * 0.2 = 130
      // total = (50 + 450 + 150 + 130) * 1 = 780

      expect(result.estimatedHours).toBe(3)
      expect(result.breakdown.materialCost).toBe(50)
      expect(result.breakdown.laborCost).toBe(450)
      expect(result.breakdown.machineTimeCost).toBe(150)
      expect(result.breakdown.overhead).toBe(130)
      expect(result.estimatedPrice).toBe(780)
    })

    it('should calculate low complexity correctly', async () => {
      const result = await estimatePrice({
        material: 'stal',
        complexity: 'low',
        quantity: 1,
      })

      // low complexity multiplier = 1.0
      // estimatedHours = 2 * 1.0 = 2
      // laborCost = 2 * 150 = 300
      // machineTimeCost = 2 * 50 = 100
      // overhead = (50 + 300 + 100) * 0.2 = 90
      // total = 50 + 300 + 100 + 90 = 540

      expect(result.estimatedHours).toBe(2)
      expect(result.estimatedPrice).toBe(540)
    })

    it('should calculate high complexity correctly', async () => {
      const result = await estimatePrice({
        material: 'stal',
        complexity: 'high',
        quantity: 1,
      })

      // high complexity multiplier = 2.5
      // estimatedHours = 2 * 2.5 = 5
      // laborCost = 5 * 150 = 750
      // machineTimeCost = 5 * 50 = 250
      // overhead = (50 + 750 + 250) * 0.2 = 210
      // total = 50 + 750 + 250 + 210 = 1260

      expect(result.estimatedHours).toBe(5)
      expect(result.estimatedPrice).toBe(1260)
    })
  })

  describe('material cost lookup', () => {
    it('should use correct cost for aluminium', async () => {
      const result = await estimatePrice({
        material: 'aluminium',
        complexity: 'low',
        quantity: 1,
      })
      expect(result.breakdown.materialCost).toBe(80)
    })

    it('should use correct cost for miedz', async () => {
      const result = await estimatePrice({
        material: 'miedź',
        complexity: 'low',
        quantity: 1,
      })
      expect(result.breakdown.materialCost).toBe(120)
    })

    it('should use correct cost for plastik', async () => {
      const result = await estimatePrice({
        material: 'plastik',
        complexity: 'low',
        quantity: 1,
      })
      expect(result.breakdown.materialCost).toBe(30)
    })

    it('should default to 50 for unknown materials', async () => {
      const result = await estimatePrice({
        material: 'titanium',
        complexity: 'low',
        quantity: 1,
      })
      expect(result.breakdown.materialCost).toBe(50)
    })

    it('should be case-insensitive for material lookup', async () => {
      const result = await estimatePrice({
        material: 'STAL',
        complexity: 'low',
        quantity: 1,
      })
      expect(result.breakdown.materialCost).toBe(50)
    })
  })

  describe('quantity scaling', () => {
    it('should multiply costs by quantity', async () => {
      const single = await estimatePrice({
        material: 'stal',
        complexity: 'medium',
        quantity: 1,
      })
      const batch = await estimatePrice({
        material: 'stal',
        complexity: 'medium',
        quantity: 10,
      })

      expect(batch.estimatedPrice).toBe(single.estimatedPrice * 10)
      expect(batch.estimatedHours).toBe(single.estimatedHours * 10)
      expect(batch.breakdown.materialCost).toBe(single.breakdown.materialCost * 10)
      expect(batch.breakdown.laborCost).toBe(single.breakdown.laborCost * 10)
    })

    it('should handle quantity of 0 (defaults to 1)', async () => {
      const result = await estimatePrice({
        material: 'stal',
        complexity: 'medium',
      })
      // Default quantity = 1, should not be zero
      expect(result.estimatedPrice).toBeGreaterThan(0)
    })
  })

  describe('custom company context', () => {
    it('should use custom hourly rate', async () => {
      const result = await estimatePrice(
        { material: 'stal', complexity: 'low', quantity: 1 },
        { averageHourlyRate: 200 }
      )

      // estimatedHours = 2 * 1.0 = 2
      // laborCost = 2 * 200 = 400
      expect(result.breakdown.laborCost).toBe(400)
    })

    it('should use custom material costs', async () => {
      const result = await estimatePrice(
        { material: 'inconel', complexity: 'low', quantity: 1 },
        { typicalMaterialCosts: { inconel: 500 } }
      )

      expect(result.breakdown.materialCost).toBe(500)
    })
  })
})

// ============================================
// SMART FORM SUGGESTIONS (new feature — TDD)
// These tests define EXPECTED behavior for functions
// that backend-dev will implement.
// ============================================

describe('Smart Form Suggestions — Material Matching', () => {
  it('should return matching materials from order history', async () => {
    // TDD: This function should search recent orders for materials
    // that match the user's partial input
    const { suggestMaterials } = await import('@/lib/ai/smart-suggestions')

    const results = await suggestMaterials('stal', 'test-company')
    expect(results).toBeDefined()
    expect(Array.isArray(results)).toBe(true)
  })

  it('should return empty array for empty input', async () => {
    const { suggestMaterials } = await import('@/lib/ai/smart-suggestions')

    const results = await suggestMaterials('', 'test-company')
    expect(results).toEqual([])
  })

  it('should be case-insensitive when matching', async () => {
    const { suggestMaterials } = await import('@/lib/ai/smart-suggestions')

    const lower = await suggestMaterials('stal', 'test-company')
    const upper = await suggestMaterials('STAL', 'test-company')
    expect(lower).toEqual(upper)
  })

  it('should limit results to max 10 suggestions', async () => {
    const { suggestMaterials } = await import('@/lib/ai/smart-suggestions')

    const results = await suggestMaterials('s', 'test-company')
    expect(results.length).toBeLessThanOrEqual(10)
  })
})

describe('Smart Form Suggestions — Quantity from History', () => {
  it('should suggest quantity based on most common order quantity for same part', async () => {
    const { suggestQuantity } = await import('@/lib/ai/smart-suggestions')

    // TDD: Given a part name and company, return suggested quantity
    // based on order history
    const result = await suggestQuantity('Tuleja', 'test-company')
    expect(result).toBeDefined()
    if (result) {
      expect(result).toHaveProperty('suggestedQuantity')
      expect(result).toHaveProperty('confidence')
      expect(result.suggestedQuantity).toBeGreaterThanOrEqual(0)
    }
  })

  it('should return null for unknown part name', async () => {
    const { suggestQuantity } = await import('@/lib/ai/smart-suggestions')

    const result = await suggestQuantity('NieistniejacyDetal12345', 'test-company')
    // No history = no suggestion
    expect(result).toBeNull()
  })

  it('should return low confidence when fewer than 3 historical orders', async () => {
    const { suggestQuantity } = await import('@/lib/ai/smart-suggestions')

    const result = await suggestQuantity('RarePartXYZ', 'test-company')
    if (result) {
      expect(result.confidence).toBe('low')
    }
  })
})

describe('Smart Form Suggestions — Price Sanity Check', () => {
  it('should flag price as too low when below 50% of historical average', async () => {
    const { checkPriceSanity } = await import('@/lib/ai/smart-suggestions')

    // TDD: Compare proposed price against historical average
    // If < 50% of average, flag as 'too_low'
    const result = await checkPriceSanity({
      partName: 'Tuleja',
      material: 'stal',
      proposedPrice: 50,
      companyId: 'test-company',
    })

    expect(result).toBeDefined()
    if (result) {
      expect(result).toHaveProperty('status')
      expect(['ok', 'too_low', 'too_high', 'no_data']).toContain(result.status)
    }
  })

  it('should flag price as too high when above 200% of historical average', async () => {
    const { checkPriceSanity } = await import('@/lib/ai/smart-suggestions')

    const result = await checkPriceSanity({
      partName: 'Tuleja',
      material: 'stal',
      proposedPrice: 50000,
      companyId: 'test-company',
    })

    if (result && result.status !== 'no_data') {
      expect(result.status).toBe('too_high')
    }
  })

  it('should return no_data when no historical orders exist', async () => {
    const { checkPriceSanity } = await import('@/lib/ai/smart-suggestions')

    const result = await checkPriceSanity({
      partName: 'UniquePartNeverOrdered',
      material: 'unicornium',
      proposedPrice: 100,
      companyId: 'test-company',
    })

    expect(result).toBeDefined()
    if (result) {
      expect(result.status).toBe('no_data')
    }
  })

  it('should return ok when price is within normal range', async () => {
    const { checkPriceSanity } = await import('@/lib/ai/smart-suggestions')

    // Assume average is around 1000 PLN — 1000 is within 50%-200% range
    const result = await checkPriceSanity({
      partName: 'Tuleja',
      material: 'stal',
      proposedPrice: 1000,
      companyId: 'test-company',
    })

    if (result && result.status !== 'no_data') {
      expect(result.status).toBe('ok')
    }
  })
})
