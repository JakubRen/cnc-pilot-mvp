/**
 * Unit Tests for Deadline Predictor (Phase 2 — Feature 2.1)
 *
 * Tests the AI-powered deadline feasibility checker.
 * Given an order (part, material, quantity) and a proposed deadline,
 * predicts whether it's realistic based on machine load and historical times.
 *
 * CONTRACT for backend-dev:
 * - predictDeadline(input) -> DeadlinePrediction
 * - Returns realistic/unrealistic assessment with confidence
 * - Suggests alternative date when unrealistic
 * - Considers current machine load (active orders)
 * - Uses historical time data from similar orders
 * - Heuristic fallback when AI unavailable
 */

import { describe, it, expect, vi } from 'vitest'

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}))

// ============================================
// CONTRACT TYPES
// ============================================

interface DeadlinePredictionInput {
  partName: string
  material: string
  quantity: number
  complexity: 'simple' | 'medium' | 'complex'
  proposedDeadline: string // ISO date
  companyId: string
}

interface MachineLoad {
  machineId: string
  machineName: string
  activeOrders: number
  totalQueuedHours: number
  availableHoursPerDay: number
}

interface DeadlinePrediction {
  feasible: boolean
  confidence: number // 0-100
  estimatedHours: number
  availableHours: number
  suggestedDeadline: string | null // ISO date, non-null when not feasible
  reasoning: string
  machineLoads: MachineLoad[]
}

// ============================================
// REFERENCE HEURISTIC
// ============================================

function heuristicPredict(input: DeadlinePredictionInput, machineLoads: MachineLoad[]): DeadlinePrediction {
  const complexityMultipliers = { simple: 1, medium: 2, complex: 4 }
  const baseHoursPerUnit = 0.5

  const estimatedHours = input.quantity * baseHoursPerUnit * complexityMultipliers[input.complexity]

  const proposedDate = new Date(input.proposedDeadline)
  const now = new Date()
  const availableDays = Math.max(0, Math.ceil((proposedDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))

  // Total available hours across all machines
  const totalAvailableHoursPerDay = machineLoads.length > 0
    ? machineLoads.reduce((sum, m) => sum + m.availableHoursPerDay, 0)
    : 8 // default single machine 8h/day

  const totalQueuedHours = machineLoads.reduce((sum, m) => sum + m.totalQueuedHours, 0)
  const availableHours = Math.max(0, (availableDays * totalAvailableHoursPerDay) - totalQueuedHours)

  const feasible = availableHours >= estimatedHours

  let suggestedDeadline: string | null = null
  if (!feasible) {
    const neededDays = Math.ceil((estimatedHours + totalQueuedHours) / totalAvailableHoursPerDay)
    const suggested = new Date()
    suggested.setDate(suggested.getDate() + neededDays + 1) // +1 buffer
    suggestedDeadline = suggested.toISOString().split('T')[0]
  }

  const confidence = machineLoads.length > 0 ? 70 : 40

  return {
    feasible,
    confidence,
    estimatedHours: Math.round(estimatedHours * 10) / 10,
    availableHours: Math.round(availableHours * 10) / 10,
    suggestedDeadline,
    reasoning: feasible
      ? `Szacowany czas: ${estimatedHours.toFixed(1)}h. Dostepne: ${availableHours.toFixed(1)}h. Deadline jest wykonalny.`
      : `Szacowany czas: ${estimatedHours.toFixed(1)}h. Dostepne: ${availableHours.toFixed(1)}h. Niewystarczajaco czasu.`,
    machineLoads,
  }
}

// ============================================
// FEASIBILITY ASSESSMENT
// ============================================

describe('Deadline Predictor — Feasibility Assessment', () => {
  it('should return feasible for simple order with plenty of time', () => {
    const input: DeadlinePredictionInput = {
      partName: 'Tuleja',
      material: 'Stal 45',
      quantity: 10,
      complexity: 'simple',
      proposedDeadline: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      companyId: 'test-company',
    }

    const result = heuristicPredict(input, [
      { machineId: 'm1', machineName: 'CNC-1', activeOrders: 1, totalQueuedHours: 5, availableHoursPerDay: 8 },
    ])

    expect(result.feasible).toBe(true)
    expect(result.estimatedHours).toBeGreaterThan(0)
    expect(result.suggestedDeadline).toBeNull()
  })

  it('should return not feasible for complex order with tight deadline', () => {
    const input: DeadlinePredictionInput = {
      partName: 'Korpus pompy',
      material: 'Stal nierdzewna 316',
      quantity: 50,
      complexity: 'complex',
      proposedDeadline: new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0],
      companyId: 'test-company',
    }

    const result = heuristicPredict(input, [
      { machineId: 'm1', machineName: 'CNC-1', activeOrders: 3, totalQueuedHours: 40, availableHoursPerDay: 8 },
    ])

    expect(result.feasible).toBe(false)
    expect(result.suggestedDeadline).not.toBeNull()
  })

  it('should suggest alternative deadline when not feasible', () => {
    const input: DeadlinePredictionInput = {
      partName: 'Wal napedowy',
      material: 'Stal 40Cr',
      quantity: 20,
      complexity: 'medium',
      proposedDeadline: new Date(Date.now() + 1 * 86400000).toISOString().split('T')[0],
      companyId: 'test-company',
    }

    const result = heuristicPredict(input, [
      { machineId: 'm1', machineName: 'CNC-1', activeOrders: 2, totalQueuedHours: 20, availableHoursPerDay: 8 },
    ])

    expect(result.feasible).toBe(false)
    expect(result.suggestedDeadline).not.toBeNull()
    // Suggested deadline must be after proposed deadline
    expect(new Date(result.suggestedDeadline!).getTime()).toBeGreaterThan(
      new Date(input.proposedDeadline).getTime()
    )
  })
})

// ============================================
// MACHINE LOAD HANDLING
// ============================================

describe('Deadline Predictor — Machine Load', () => {
  it('should handle empty machine data gracefully (default 8h/day)', () => {
    const input: DeadlinePredictionInput = {
      partName: 'Tuleja',
      material: 'Stal',
      quantity: 5,
      complexity: 'simple',
      proposedDeadline: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
      companyId: 'test-company',
    }

    const result = heuristicPredict(input, [])

    expect(result.feasible).toBe(true)
    expect(result.confidence).toBeLessThan(50) // Lower confidence without machine data
    expect(result.machineLoads).toEqual([])
  })

  it('should account for queued hours across multiple machines', () => {
    const input: DeadlinePredictionInput = {
      partName: 'Adapter',
      material: 'Aluminium',
      quantity: 100,
      complexity: 'medium',
      proposedDeadline: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
      companyId: 'test-company',
    }

    const heavyLoad = heuristicPredict(input, [
      { machineId: 'm1', machineName: 'CNC-1', activeOrders: 5, totalQueuedHours: 50, availableHoursPerDay: 8 },
      { machineId: 'm2', machineName: 'CNC-2', activeOrders: 4, totalQueuedHours: 40, availableHoursPerDay: 8 },
    ])

    const lightLoad = heuristicPredict(input, [
      { machineId: 'm1', machineName: 'CNC-1', activeOrders: 0, totalQueuedHours: 0, availableHoursPerDay: 8 },
      { machineId: 'm2', machineName: 'CNC-2', activeOrders: 0, totalQueuedHours: 0, availableHoursPerDay: 8 },
    ])

    // Light load should have more available hours
    expect(lightLoad.availableHours).toBeGreaterThan(heavyLoad.availableHours)
  })

  it('should have higher confidence with machine data present', () => {
    const input: DeadlinePredictionInput = {
      partName: 'Pin',
      material: 'Stal',
      quantity: 10,
      complexity: 'simple',
      proposedDeadline: new Date(Date.now() + 10 * 86400000).toISOString().split('T')[0],
      companyId: 'test-company',
    }

    const withMachines = heuristicPredict(input, [
      { machineId: 'm1', machineName: 'CNC-1', activeOrders: 1, totalQueuedHours: 5, availableHoursPerDay: 8 },
    ])
    const withoutMachines = heuristicPredict(input, [])

    expect(withMachines.confidence).toBeGreaterThan(withoutMachines.confidence)
  })
})

// ============================================
// COMPLEXITY IMPACT
// ============================================

describe('Deadline Predictor — Complexity', () => {
  const makeInput = (complexity: 'simple' | 'medium' | 'complex'): DeadlinePredictionInput => ({
    partName: 'Test Part',
    material: 'Stal',
    quantity: 10,
    complexity,
    proposedDeadline: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
    companyId: 'test-company',
  })

  it('should estimate more hours for complex parts', () => {
    const simple = heuristicPredict(makeInput('simple'), [])
    const complex = heuristicPredict(makeInput('complex'), [])

    expect(complex.estimatedHours).toBeGreaterThan(simple.estimatedHours)
  })

  it('should estimate medium hours between simple and complex', () => {
    const simple = heuristicPredict(makeInput('simple'), [])
    const medium = heuristicPredict(makeInput('medium'), [])
    const complex = heuristicPredict(makeInput('complex'), [])

    expect(medium.estimatedHours).toBeGreaterThan(simple.estimatedHours)
    expect(medium.estimatedHours).toBeLessThan(complex.estimatedHours)
  })
})

// ============================================
// RESULT SHAPE
// ============================================

describe('Deadline Predictor — Result Shape', () => {
  it('should return all required fields in DeadlinePrediction', () => {
    const result = heuristicPredict(
      {
        partName: 'Test',
        material: 'Stal',
        quantity: 5,
        complexity: 'simple',
        proposedDeadline: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
        companyId: 'company',
      },
      []
    )

    expect(result).toHaveProperty('feasible')
    expect(result).toHaveProperty('confidence')
    expect(result).toHaveProperty('estimatedHours')
    expect(result).toHaveProperty('availableHours')
    expect(result).toHaveProperty('suggestedDeadline')
    expect(result).toHaveProperty('reasoning')
    expect(result).toHaveProperty('machineLoads')
    expect(typeof result.feasible).toBe('boolean')
    expect(typeof result.confidence).toBe('number')
    expect(result.confidence).toBeGreaterThanOrEqual(0)
    expect(result.confidence).toBeLessThanOrEqual(100)
    expect(typeof result.reasoning).toBe('string')
    expect(result.reasoning.length).toBeGreaterThan(0)
  })
})
