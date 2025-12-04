import { describe, it, expect } from 'vitest'
import { calculatePricing, MATERIAL_OPTIONS } from '@/lib/pricing-calculator'

describe('calculatePricing', () => {
  // ============================================
  // MATERIAL COST CALCULATIONS
  // ============================================
  describe('material cost calculations', () => {
    it('should calculate aluminum part with dimensions correctly', () => {
      const result = calculatePricing({
        partName: 'Test Part',
        material: 'aluminum',
        length: 100,  // 10cm
        width: 100,   // 10cm
        height: 10,   // 1cm
        quantity: 1,
        complexity: 'simple'
      })

      // Volume: (100/10) * (100/10) * (10/10) = 10 * 10 * 1 = 100 cm³
      // Mass: 100 * 0.0027 = 0.27 kg
      // Material cost: 0.27 * 28 = 7.56 PLN
      expect(result.breakdown.materialCost).toBeCloseTo(7.56, 1)
    })

    it('should calculate steel part with dimensions correctly', () => {
      const result = calculatePricing({
        partName: 'Steel Block',
        material: 'steel',
        length: 50,   // 5cm
        width: 50,    // 5cm
        height: 50,   // 5cm
        quantity: 1,
        complexity: 'simple'
      })

      // Volume: 5 * 5 * 5 = 125 cm³
      // Mass: 125 * 0.00785 = 0.98125 kg
      // Material cost: 0.98125 * 10 = 9.81 PLN
      expect(result.breakdown.materialCost).toBeCloseTo(9.81, 1)
    })

    it('should estimate material cost when dimensions are missing', () => {
      const result = calculatePricing({
        partName: '',
        material: 'aluminum',
        quantity: 1,
        complexity: 'simple'
      })

      // No dimensions → estimate based on complexity
      // Simple: 0.5 kg estimated
      // Material cost: 0.5 * 28 = 14 PLN
      expect(result.breakdown.materialCost).toBeCloseTo(14, 1)
    })

    it('should estimate higher material for complex parts without dimensions', () => {
      const simpleResult = calculatePricing({
        partName: '',
        material: 'aluminum',
        quantity: 1,
        complexity: 'simple'
      })

      const complexResult = calculatePricing({
        partName: '',
        material: 'aluminum',
        quantity: 1,
        complexity: 'complex'
      })

      // Complex parts estimate more material (5kg vs 0.5kg)
      expect(complexResult.breakdown.materialCost).toBeGreaterThan(simpleResult.breakdown.materialCost)
    })

    it('should multiply material cost by quantity', () => {
      const singleResult = calculatePricing({
        partName: 'Part',
        material: 'aluminum',
        length: 100,
        width: 100,
        height: 10,
        quantity: 1,
        complexity: 'simple'
      })

      const batchResult = calculatePricing({
        partName: 'Part',
        material: 'aluminum',
        length: 100,
        width: 100,
        height: 10,
        quantity: 10,
        complexity: 'simple'
      })

      // Material cost should be 10x for 10 units
      expect(batchResult.breakdown.materialCost).toBeCloseTo(singleResult.breakdown.materialCost * 10, 1)
    })
  })

  // ============================================
  // MARGIN CALCULATIONS (CRITICAL!)
  // ============================================
  describe('margin calculations', () => {
    it('should apply 45% margin for single parts (quantity = 1)', () => {
      const result = calculatePricing({
        partName: 'Single Part',
        material: 'aluminum',
        quantity: 1,
        complexity: 'simple'
      })
      expect(result.breakdown.marginPercentage).toBe(45)
    })

    it('should apply 35% margin for small batches (2-10 parts)', () => {
      const results = [2, 5, 10].map(quantity =>
        calculatePricing({
          partName: 'Part',
          material: 'aluminum',
          quantity,
          complexity: 'simple'
        })
      )

      results.forEach(result => {
        expect(result.breakdown.marginPercentage).toBe(35)
      })
    })

    it('should apply 25% margin for medium batches (11-50 parts)', () => {
      const results = [11, 25, 50].map(quantity =>
        calculatePricing({
          partName: 'Part',
          material: 'aluminum',
          quantity,
          complexity: 'simple'
        })
      )

      results.forEach(result => {
        expect(result.breakdown.marginPercentage).toBe(25)
      })
    })

    it('should apply 20% margin for large batches (50+ parts)', () => {
      const results = [51, 100, 500].map(quantity =>
        calculatePricing({
          partName: 'Part',
          material: 'aluminum',
          quantity,
          complexity: 'simple'
        })
      )

      results.forEach(result => {
        expect(result.breakdown.marginPercentage).toBe(20)
      })
    })

    it('should correctly calculate margin amount', () => {
      const result = calculatePricing({
        partName: 'Part',
        material: 'aluminum',
        quantity: 1,
        complexity: 'simple'
      })

      // suggestedPrice = totalCostBeforeMargin * (1 + margin%)
      const expectedPrice = result.breakdown.totalCostBeforeMargin * 1.45
      expect(result.suggestedPrice).toBeCloseTo(expectedPrice, 1)
    })
  })

  // ============================================
  // COMPLEXITY TIME CALCULATIONS
  // ============================================
  describe('complexity time calculations', () => {
    it('should use 1.5h base time for simple parts', () => {
      const result = calculatePricing({
        partName: 'Simple Part',
        material: 'aluminum',
        quantity: 1,
        complexity: 'simple'
      })

      // Aluminum machining rate: 115 PLN/h
      // Machining cost: 1.5h * 115 = 172.5 PLN
      expect(result.breakdown.machiningCost).toBeCloseTo(172.5, 0)
    })

    it('should use 4.5h base time for medium complexity', () => {
      const result = calculatePricing({
        partName: 'Medium Part',
        material: 'aluminum',
        quantity: 1,
        complexity: 'medium'
      })

      // Machining cost: 4.5h * 115 = 517.5 PLN
      expect(result.breakdown.machiningCost).toBeCloseTo(517.5, 0)
    })

    it('should use 14h base time for complex parts', () => {
      const result = calculatePricing({
        partName: 'Complex Part',
        material: 'aluminum',
        quantity: 1,
        complexity: 'complex'
      })

      // Machining cost: 14h * 115 = 1610 PLN
      expect(result.breakdown.machiningCost).toBeCloseTo(1610, 0)
    })

    it('should multiply machining time by quantity', () => {
      const result = calculatePricing({
        partName: 'Part',
        material: 'aluminum',
        quantity: 5,
        complexity: 'simple'
      })

      // 1.5h * 5 = 7.5h total
      // 7.5h * 115 PLN/h = 862.5 PLN
      expect(result.breakdown.machiningCost).toBeCloseTo(862.5, 0)
    })

    it('should use different machining rates for different materials', () => {
      const aluminumResult = calculatePricing({
        partName: 'Part',
        material: 'aluminum',
        quantity: 1,
        complexity: 'simple'
      })

      const stainlessResult = calculatePricing({
        partName: 'Part',
        material: 'stainless',
        quantity: 1,
        complexity: 'simple'
      })

      // Stainless has higher machining rate (155 vs 115)
      expect(stainlessResult.breakdown.machiningCost).toBeGreaterThan(aluminumResult.breakdown.machiningCost)
    })
  })

  // ============================================
  // SETUP COST CALCULATIONS
  // ============================================
  describe('setup cost calculations', () => {
    it('should add setup cost (one-time, not scaled by quantity)', () => {
      const singleResult = calculatePricing({
        partName: 'Part',
        material: 'aluminum',
        quantity: 1,
        complexity: 'simple'
      })

      const batchResult = calculatePricing({
        partName: 'Part',
        material: 'aluminum',
        quantity: 100,
        complexity: 'simple'
      })

      // Setup cost should be SAME regardless of quantity
      expect(singleResult.breakdown.setupCost).toBe(batchResult.breakdown.setupCost)
    })

    it('should calculate setup cost based on complexity', () => {
      const simpleResult = calculatePricing({
        partName: 'Part',
        material: 'aluminum',
        quantity: 1,
        complexity: 'simple'
      })

      const complexResult = calculatePricing({
        partName: 'Part',
        material: 'aluminum',
        quantity: 1,
        complexity: 'complex'
      })

      // Simple: 0.5h setup, Complex: 2h setup
      // Simple: 0.5 * 115 = 57.5 PLN
      // Complex: 2 * 115 = 230 PLN
      expect(simpleResult.breakdown.setupCost).toBeCloseTo(57.5, 0)
      expect(complexResult.breakdown.setupCost).toBeCloseTo(230, 0)
    })
  })

  // ============================================
  // MATERIAL FUZZY MATCHING
  // ============================================
  describe('material fuzzy matching', () => {
    it('should match Polish material names', () => {
      const tests = [
        { input: 'aluminium', expectedMaterial: 'Aluminium' },
        { input: 'stal', expectedMaterial: 'Stal' },
        { input: 'stal nierdzewna', expectedMaterial: 'Stal nierdzewna' },
        { input: 'mosiądz', expectedMaterial: 'Mosiądz' },
        { input: 'brąz', expectedMaterial: 'Brąz' },
        { input: 'miedź', expectedMaterial: 'Miedź' },
        { input: 'plastik', expectedMaterial: 'Plastik' },
      ]

      tests.forEach(({ input, expectedMaterial }) => {
        const result = calculatePricing({
          partName: 'Test',
          material: input,
          quantity: 1,
          complexity: 'simple'
        })
        expect(result.reasoning).toContain(expectedMaterial)
      })
    })

    it('should match English material names', () => {
      const tests = [
        { input: 'aluminum', expectedMaterial: 'Aluminium' },
        { input: 'steel', expectedMaterial: 'Stal' },
        { input: 'stainless', expectedMaterial: 'Stal nierdzewna' }, // 'stainless' alone matches stainless steel
        { input: 'brass', expectedMaterial: 'Mosiądz' },
        { input: 'bronze', expectedMaterial: 'Brąz' },
        { input: 'copper', expectedMaterial: 'Miedź' },
        { input: 'plastic', expectedMaterial: 'Plastik' },
      ]

      tests.forEach(({ input, expectedMaterial }) => {
        const result = calculatePricing({
          partName: 'Test',
          material: input,
          quantity: 1,
          complexity: 'simple'
        })
        expect(result.reasoning).toContain(expectedMaterial)
      })
    })

    it('should match specific plastic types', () => {
      const absResult = calculatePricing({
        partName: 'Test',
        material: 'plastik abs',
        quantity: 1,
        complexity: 'simple'
      })

      const pomResult = calculatePricing({
        partName: 'Test',
        material: 'pom delrin',
        quantity: 1,
        complexity: 'simple'
      })

      expect(absResult.reasoning).toContain('ABS')
      expect(pomResult.reasoning).toContain('POM')
    })

    it('should default to aluminum for unknown materials', () => {
      const result = calculatePricing({
        partName: 'Test',
        material: 'nieznany material xyz',
        quantity: 1,
        complexity: 'simple'
      })

      // Should fallback to aluminum
      expect(result.reasoning).toContain('Aluminium')
    })

    it('should be case insensitive', () => {
      const lowerResult = calculatePricing({
        partName: 'Test',
        material: 'stal nierdzewna',
        quantity: 1,
        complexity: 'simple'
      })

      const upperResult = calculatePricing({
        partName: 'Test',
        material: 'STAL NIERDZEWNA',
        quantity: 1,
        complexity: 'simple'
      })

      expect(lowerResult.breakdown.materialCost).toBe(upperResult.breakdown.materialCost)
      expect(lowerResult.breakdown.machiningCost).toBe(upperResult.breakdown.machiningCost)
    })
  })

  // ============================================
  // CONFIDENCE SCORE
  // ============================================
  describe('confidence score', () => {
    it('should have base confidence of 70 without dimensions or part name', () => {
      const result = calculatePricing({
        partName: '',
        material: 'aluminum',
        quantity: 1,
        complexity: 'simple'
      })

      expect(result.confidence).toBe(70)
    })

    it('should add 20 points for having dimensions', () => {
      const result = calculatePricing({
        partName: '',
        material: 'aluminum',
        length: 100,
        width: 100,
        height: 10,
        quantity: 1,
        complexity: 'simple'
      })

      expect(result.confidence).toBe(90) // 70 + 20
    })

    it('should add 10 points for having part name', () => {
      const result = calculatePricing({
        partName: 'Tuleja',
        material: 'aluminum',
        quantity: 1,
        complexity: 'simple'
      })

      expect(result.confidence).toBe(80) // 70 + 10
    })

    it('should have 100 confidence with dimensions and part name', () => {
      const result = calculatePricing({
        partName: 'Tuleja precyzyjna',
        material: 'aluminum',
        length: 100,
        width: 100,
        height: 10,
        quantity: 1,
        complexity: 'simple'
      })

      expect(result.confidence).toBe(100) // 70 + 20 + 10
    })
  })

  // ============================================
  // PRICE PER UNIT
  // ============================================
  describe('price per unit', () => {
    it('should calculate correct price per unit', () => {
      const result = calculatePricing({
        partName: 'Part',
        material: 'aluminum',
        quantity: 10,
        complexity: 'simple'
      })

      expect(result.pricePerUnit).toBeCloseTo(result.suggestedPrice / 10, 2)
    })

    it('should equal suggestedPrice when quantity is 1', () => {
      const result = calculatePricing({
        partName: 'Part',
        material: 'aluminum',
        quantity: 1,
        complexity: 'simple'
      })

      expect(result.pricePerUnit).toBe(result.suggestedPrice)
    })
  })

  // ============================================
  // REASONING (POLISH)
  // ============================================
  describe('reasoning generation', () => {
    it('should generate reasoning in Polish', () => {
      const result = calculatePricing({
        partName: 'Tuleja',
        material: 'aluminum',
        quantity: 1,
        complexity: 'simple'
      })

      expect(result.reasoning).toContain('Wycena')
      expect(result.reasoning).toContain('Marża')
      expect(result.reasoning).toContain('%')
    })

    it('should describe quantity correctly', () => {
      const singleResult = calculatePricing({
        partName: 'Part',
        material: 'aluminum',
        quantity: 1,
        complexity: 'simple'
      })

      const smallBatchResult = calculatePricing({
        partName: 'Part',
        material: 'aluminum',
        quantity: 5,
        complexity: 'simple'
      })

      const largeBatchResult = calculatePricing({
        partName: 'Part',
        material: 'aluminum',
        quantity: 100,
        complexity: 'simple'
      })

      expect(singleResult.reasoning).toContain('pojedyncza sztuka')
      expect(smallBatchResult.reasoning).toContain('mała seria')
      expect(largeBatchResult.reasoning).toContain('duża seria')
    })

    it('should note when dimensions are missing', () => {
      const withDimensions = calculatePricing({
        partName: 'Part',
        material: 'aluminum',
        length: 100,
        width: 100,
        height: 10,
        quantity: 1,
        complexity: 'simple'
      })

      const withoutDimensions = calculatePricing({
        partName: 'Part',
        material: 'aluminum',
        quantity: 1,
        complexity: 'simple'
      })

      expect(withDimensions.reasoning).toContain('na podstawie podanych wymiarów')
      expect(withoutDimensions.reasoning).toContain('szacunkowo')
    })
  })

  // ============================================
  // EDGE CASES
  // ============================================
  describe('edge cases', () => {
    it('should handle large quantities', () => {
      const result = calculatePricing({
        partName: 'Part',
        material: 'aluminum',
        quantity: 10000,
        complexity: 'simple'
      })

      expect(result.suggestedPrice).toBeGreaterThan(0)
      expect(result.breakdown.marginPercentage).toBe(20) // Large batch margin
    })

    it('should handle very small dimensions', () => {
      const result = calculatePricing({
        partName: 'Micro Part',
        material: 'aluminum',
        length: 10,   // 1cm
        width: 10,    // 1cm
        height: 10,   // 1cm
        quantity: 1,
        complexity: 'simple'
      })

      // Volume: 1cm³, Mass: 0.0027kg, Cost: 0.0027 * 28 = 0.08 PLN
      expect(result.breakdown.materialCost).toBeGreaterThan(0)
      expect(result.breakdown.materialCost).toBeLessThan(1)
    })

    it('should handle large dimensions', () => {
      const result = calculatePricing({
        partName: 'Large Part',
        material: 'steel',
        length: 1000, // 1m
        width: 500,   // 0.5m
        height: 100,  // 10cm
        quantity: 1,
        complexity: 'complex'
      })

      expect(result.breakdown.materialCost).toBeGreaterThan(1000)
    })

    it('should round prices to 2 decimal places', () => {
      const result = calculatePricing({
        partName: 'Part',
        material: 'aluminum',
        length: 33,
        width: 33,
        height: 33,
        quantity: 3,
        complexity: 'medium'
      })

      // Check that prices are rounded
      const suggestedStr = result.suggestedPrice.toString()
      const decimalPart = suggestedStr.split('.')[1] || ''
      expect(decimalPart.length).toBeLessThanOrEqual(2)
    })
  })
})

// ============================================
// MATERIAL_OPTIONS EXPORT
// ============================================
describe('MATERIAL_OPTIONS', () => {
  it('should export 12 material options', () => {
    expect(MATERIAL_OPTIONS).toHaveLength(12)
  })

  it('should have correct format with value and label', () => {
    MATERIAL_OPTIONS.forEach(option => {
      expect(option).toHaveProperty('value')
      expect(option).toHaveProperty('label')
      expect(typeof option.value).toBe('string')
      expect(typeof option.label).toBe('string')
    })
  })

  it('should include common materials', () => {
    const values = MATERIAL_OPTIONS.map(o => o.value)

    expect(values).toContain('aluminum')
    expect(values).toContain('steel')
    expect(values).toContain('stainless')
    expect(values).toContain('brass')
    expect(values).toContain('plastic')
  })
})
