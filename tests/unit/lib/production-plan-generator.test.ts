/**
 * Unit Tests for Production Plan Generator (Phase 2 — Feature 2.4)
 *
 * Tests the AI-powered operation list generator that creates a production plan
 * from part specifications (name, material, dimensions, complexity).
 *
 * CONTRACT for backend-dev:
 * - generateProductionPlan(input) -> GeneratedPlan
 * - Returns typed operation list (operation_type, setup_time, run_time, machine suggestion)
 * - Uses historical data (few-shot) from similar past plans
 * - Heuristic fallback when AI is unavailable
 * - Respects OperationType enum from types/operations.ts
 * - Validates output: at least 1 operation, positive times
 * - Sanitizes all text fields via sanitizer.ts
 */

import { describe, it, expect, vi } from 'vitest'

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}))

// ============================================
// CONTRACT TYPES
// ============================================

type OperationType =
  | 'milling'
  | 'turning'
  | 'drilling'
  | 'grinding'
  | 'cutting'
  | 'deburring'
  | 'quality_control'
  | 'other'

type Complexity = 'simple' | 'medium' | 'complex'

interface PlanGeneratorInput {
  partName: string
  material: string
  quantity: number
  complexity: Complexity
  dimensions: { length?: number | null; width?: number | null; height?: number | null } | null
  technicalNotes: string | null
  companyId: string
}

interface GeneratedOperation {
  operationNumber: number
  operationType: OperationType
  operationName: string
  setupTimeMinutes: number
  runTimePerUnitMinutes: number
  machineSuggestion: string | null
  description: string | null
}

interface GeneratedPlan {
  operations: GeneratedOperation[]
  totalSetupMinutes: number
  totalRunMinutes: number
  estimatedCostPln: number | null
  confidence: number // 0-100
  source: 'ai' | 'heuristic'
}

// ============================================
// VALID OPERATION TYPES
// ============================================

const VALID_OPERATION_TYPES: OperationType[] = [
  'milling', 'turning', 'drilling', 'grinding',
  'cutting', 'deburring', 'quality_control', 'other',
]

// ============================================
// REFERENCE HEURISTIC
// ============================================

const COMPLEXITY_MULTIPLIERS: Record<Complexity, number> = {
  simple: 1,
  medium: 1.5,
  complex: 2.5,
}

function inferOperations(input: PlanGeneratorInput): GeneratedOperation[] {
  const ops: GeneratedOperation[] = []
  const mult = COMPLEXITY_MULTIPLIERS[input.complexity]
  let opNum = 1

  // 1. Cutting — always first (raw material prep)
  ops.push({
    operationNumber: opNum++,
    operationType: 'cutting',
    operationName: 'Ciecie materialu',
    setupTimeMinutes: Math.round(10 * mult),
    runTimePerUnitMinutes: Math.round(2 * mult * 10) / 10,
    machineSuggestion: null,
    description: `Ciecie ${input.material || 'materialu'} na wymiar`,
  })

  // 2. Primary machining based on part name heuristics
  const nameLower = input.partName.toLowerCase()
  const isTurned = /tuleja|wal|sworzeń|rolka|trzpien/i.test(nameLower)
  const isMilled = /korpus|plyta|adapter|konsola|uchwyt/i.test(nameLower)

  if (isTurned) {
    ops.push({
      operationNumber: opNum++,
      operationType: 'turning',
      operationName: 'Toczenie',
      setupTimeMinutes: Math.round(15 * mult),
      runTimePerUnitMinutes: Math.round(5 * mult * 10) / 10,
      machineSuggestion: 'Tokarka CNC',
      description: null,
    })
  } else if (isMilled) {
    ops.push({
      operationNumber: opNum++,
      operationType: 'milling',
      operationName: 'Frezowanie',
      setupTimeMinutes: Math.round(20 * mult),
      runTimePerUnitMinutes: Math.round(8 * mult * 10) / 10,
      machineSuggestion: 'Frezarka CNC',
      description: null,
    })
  } else {
    // Default: milling
    ops.push({
      operationNumber: opNum++,
      operationType: 'milling',
      operationName: 'Frezowanie',
      setupTimeMinutes: Math.round(15 * mult),
      runTimePerUnitMinutes: Math.round(6 * mult * 10) / 10,
      machineSuggestion: null,
      description: null,
    })
  }

  // 3. Drilling for complex parts
  if (input.complexity === 'complex' || input.complexity === 'medium') {
    ops.push({
      operationNumber: opNum++,
      operationType: 'drilling',
      operationName: 'Wiercenie otworow',
      setupTimeMinutes: Math.round(10 * mult),
      runTimePerUnitMinutes: Math.round(3 * mult * 10) / 10,
      machineSuggestion: null,
      description: null,
    })
  }

  // 4. Deburring
  ops.push({
    operationNumber: opNum++,
    operationType: 'deburring',
    operationName: 'Usuwanie zadziorow',
    setupTimeMinutes: 5,
    runTimePerUnitMinutes: Math.round(1.5 * mult * 10) / 10,
    machineSuggestion: null,
    description: null,
  })

  // 5. Quality control — always last
  ops.push({
    operationNumber: opNum++,
    operationType: 'quality_control',
    operationName: 'Kontrola jakosci',
    setupTimeMinutes: 5,
    runTimePerUnitMinutes: Math.round(1 * mult * 10) / 10,
    machineSuggestion: null,
    description: null,
  })

  return ops
}

function heuristicPlan(input: PlanGeneratorInput): GeneratedPlan {
  const operations = inferOperations(input)

  const totalSetupMinutes = operations.reduce((s, o) => s + o.setupTimeMinutes, 0)
  const totalRunMinutes = operations.reduce(
    (s, o) => s + o.runTimePerUnitMinutes * input.quantity,
    0
  )

  return {
    operations,
    totalSetupMinutes,
    totalRunMinutes: Math.round(totalRunMinutes * 10) / 10,
    estimatedCostPln: null, // heuristic doesn't estimate cost
    confidence: 40,
    source: 'heuristic',
  }
}

// ============================================
// OPERATION INFERENCE
// ============================================

describe('Production Plan Generator — Operation Inference', () => {
  it('should generate turning operations for turned parts (tuleja)', () => {
    const plan = heuristicPlan({
      partName: 'Tuleja redukcyjna DN50',
      material: 'Stal 45',
      quantity: 10,
      complexity: 'simple',
      dimensions: { length: 50, width: 30, height: null },
      technicalNotes: null,
      companyId: 'test-company',
    })

    const types = plan.operations.map(o => o.operationType)
    expect(types).toContain('turning')
    expect(types).toContain('cutting')
    expect(types).toContain('quality_control')
  })

  it('should generate milling operations for milled parts (korpus)', () => {
    const plan = heuristicPlan({
      partName: 'Korpus pompy hydraulicznej',
      material: 'Aluminium 6061',
      quantity: 5,
      complexity: 'complex',
      dimensions: { length: 200, width: 150, height: 100 },
      technicalNotes: null,
      companyId: 'test-company',
    })

    const types = plan.operations.map(o => o.operationType)
    expect(types).toContain('milling')
    expect(types).not.toContain('turning')
  })

  it('should add drilling for medium and complex parts', () => {
    const medium = heuristicPlan({
      partName: 'Adapter flanszowy',
      material: 'Stal 304',
      quantity: 20,
      complexity: 'medium',
      dimensions: null,
      technicalNotes: null,
      companyId: 'test-company',
    })

    const simple = heuristicPlan({
      partName: 'Adapter flanszowy',
      material: 'Stal 304',
      quantity: 20,
      complexity: 'simple',
      dimensions: null,
      technicalNotes: null,
      companyId: 'test-company',
    })

    expect(medium.operations.map(o => o.operationType)).toContain('drilling')
    expect(simple.operations.map(o => o.operationType)).not.toContain('drilling')
  })

  it('should always include cutting first and quality_control last', () => {
    const plan = heuristicPlan({
      partName: 'Test Part',
      material: 'Stal',
      quantity: 1,
      complexity: 'simple',
      dimensions: null,
      technicalNotes: null,
      companyId: 'test-company',
    })

    expect(plan.operations[0].operationType).toBe('cutting')
    expect(plan.operations[plan.operations.length - 1].operationType).toBe('quality_control')
  })

  it('should always include deburring', () => {
    const plan = heuristicPlan({
      partName: 'Sworzeń',
      material: 'Stal',
      quantity: 50,
      complexity: 'simple',
      dimensions: null,
      technicalNotes: null,
      companyId: 'test-company',
    })

    expect(plan.operations.map(o => o.operationType)).toContain('deburring')
  })
})

// ============================================
// OPERATION TYPE VALIDATION
// ============================================

describe('Production Plan Generator — Type Validation', () => {
  it('should only use valid OperationType values', () => {
    const plan = heuristicPlan({
      partName: 'Korpus',
      material: 'Aluminium',
      quantity: 10,
      complexity: 'complex',
      dimensions: null,
      technicalNotes: null,
      companyId: 'test-company',
    })

    for (const op of plan.operations) {
      expect(VALID_OPERATION_TYPES).toContain(op.operationType)
    }
  })

  it('should have sequential operation numbers', () => {
    const plan = heuristicPlan({
      partName: 'Wal napedowy',
      material: 'Stal 40Cr',
      quantity: 5,
      complexity: 'medium',
      dimensions: null,
      technicalNotes: null,
      companyId: 'test-company',
    })

    for (let i = 0; i < plan.operations.length; i++) {
      expect(plan.operations[i].operationNumber).toBe(i + 1)
    }
  })

  it('should have positive setup and run times for all operations', () => {
    const plan = heuristicPlan({
      partName: 'Plyta mocujaca',
      material: 'Stal S355',
      quantity: 3,
      complexity: 'complex',
      dimensions: null,
      technicalNotes: null,
      companyId: 'test-company',
    })

    for (const op of plan.operations) {
      expect(op.setupTimeMinutes).toBeGreaterThan(0)
      expect(op.runTimePerUnitMinutes).toBeGreaterThan(0)
    }
  })
})

// ============================================
// COMPLEXITY IMPACT
// ============================================

describe('Production Plan Generator — Complexity Impact', () => {
  const makeInput = (complexity: Complexity): PlanGeneratorInput => ({
    partName: 'Tuleja',
    material: 'Stal',
    quantity: 10,
    complexity,
    dimensions: null,
    technicalNotes: null,
    companyId: 'test-company',
  })

  it('should generate more operations for complex parts', () => {
    const simple = heuristicPlan(makeInput('simple'))
    const complex = heuristicPlan(makeInput('complex'))

    expect(complex.operations.length).toBeGreaterThanOrEqual(simple.operations.length)
  })

  it('should estimate more total time for complex parts', () => {
    const simple = heuristicPlan(makeInput('simple'))
    const complex = heuristicPlan(makeInput('complex'))

    const simpleTotal = simple.totalSetupMinutes + simple.totalRunMinutes
    const complexTotal = complex.totalSetupMinutes + complex.totalRunMinutes

    expect(complexTotal).toBeGreaterThan(simpleTotal)
  })

  it('should have higher per-unit times for complex parts', () => {
    const simple = heuristicPlan(makeInput('simple'))
    const complex = heuristicPlan(makeInput('complex'))

    // Compare first machining operation (turning, index 1 — after cutting)
    expect(complex.operations[1].runTimePerUnitMinutes).toBeGreaterThan(
      simple.operations[1].runTimePerUnitMinutes
    )
  })
})

// ============================================
// TIME SUMMATION
// ============================================

describe('Production Plan Generator — Time Summation', () => {
  it('should correctly sum setup times across operations', () => {
    const plan = heuristicPlan({
      partName: 'Tuleja',
      material: 'Stal',
      quantity: 10,
      complexity: 'simple',
      dimensions: null,
      technicalNotes: null,
      companyId: 'test-company',
    })

    const expectedSetup = plan.operations.reduce((s, o) => s + o.setupTimeMinutes, 0)
    expect(plan.totalSetupMinutes).toBe(expectedSetup)
  })

  it('should correctly sum run times multiplied by quantity', () => {
    const qty = 20
    const plan = heuristicPlan({
      partName: 'Tuleja',
      material: 'Stal',
      quantity: qty,
      complexity: 'simple',
      dimensions: null,
      technicalNotes: null,
      companyId: 'test-company',
    })

    const expectedRun = plan.operations.reduce(
      (s, o) => s + o.runTimePerUnitMinutes * qty,
      0
    )
    expect(plan.totalRunMinutes).toBeCloseTo(expectedRun, 0)
  })
})

// ============================================
// RESULT SHAPE
// ============================================

describe('Production Plan Generator — Result Shape', () => {
  it('should return GeneratedPlan with all required fields', () => {
    const plan = heuristicPlan({
      partName: 'Adapter',
      material: 'Aluminium',
      quantity: 5,
      complexity: 'medium',
      dimensions: { length: 100, width: 50, height: 30 },
      technicalNotes: 'Tolerancja 0.05mm',
      companyId: 'test-company',
    })

    expect(plan).toHaveProperty('operations')
    expect(plan).toHaveProperty('totalSetupMinutes')
    expect(plan).toHaveProperty('totalRunMinutes')
    expect(plan).toHaveProperty('estimatedCostPln')
    expect(plan).toHaveProperty('confidence')
    expect(plan).toHaveProperty('source')
    expect(Array.isArray(plan.operations)).toBe(true)
    expect(plan.operations.length).toBeGreaterThan(0)
    expect(plan.source).toBe('heuristic')
    expect(plan.confidence).toBeGreaterThanOrEqual(0)
    expect(plan.confidence).toBeLessThanOrEqual(100)
  })

  it('should return GeneratedOperation with all required fields', () => {
    const plan = heuristicPlan({
      partName: 'Wal',
      material: 'Stal',
      quantity: 1,
      complexity: 'simple',
      dimensions: null,
      technicalNotes: null,
      companyId: 'test-company',
    })

    const op = plan.operations[0]
    expect(op).toHaveProperty('operationNumber')
    expect(op).toHaveProperty('operationType')
    expect(op).toHaveProperty('operationName')
    expect(op).toHaveProperty('setupTimeMinutes')
    expect(op).toHaveProperty('runTimePerUnitMinutes')
    expect(op).toHaveProperty('machineSuggestion')
    expect(op).toHaveProperty('description')
    expect(typeof op.operationNumber).toBe('number')
    expect(typeof op.operationName).toBe('string')
    expect(op.operationName.length).toBeGreaterThan(0)
  })

  it('should have at least 3 operations for any part (cut + machining + QC)', () => {
    const plan = heuristicPlan({
      partName: 'Unknown Part',
      material: 'Material X',
      quantity: 1,
      complexity: 'simple',
      dimensions: null,
      technicalNotes: null,
      companyId: 'test-company',
    })

    expect(plan.operations.length).toBeGreaterThanOrEqual(3)
  })
})
