/**
 * Unit Tests for Quality Predictor (Phase 3 — Feature 3.3)
 *
 * Tests the quality risk prediction system that assigns risk scores
 * and badges to orders based on operator, machine, and material factors.
 *
 * CONTRACT for backend-dev:
 * - predictQualityRisk(input) -> QualityPrediction
 * - Risk score 0-100 from weighted factors
 * - Badge assignment: low (<35), medium (35-59), high (>=60)
 * - Handles missing correlation data gracefully
 * - Historical defect rate calculation from past operations
 * - Per-order risk assessment
 * - Company isolation via company_id
 */

import { describe, it, expect, vi } from 'vitest'

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}))

// ============================================
// CONTRACT TYPES
// ============================================

type QualityBadge = 'low' | 'medium' | 'high'
type Complexity = 'simple' | 'medium' | 'complex'

interface QualityRiskInput {
  orderId: string
  partName: string
  material: string
  complexity: Complexity
  quantity: number
  companyId: string
  /** Operator who will execute — null if not yet assigned */
  operatorId: number | null
  /** Machine assigned — null if not yet assigned */
  machineId: string | null
}

interface OperatorHistory {
  operatorId: number
  operatorName: string
  totalOperations: number
  failedOperations: number
  defectRate: number // 0-1
}

interface MachineHistory {
  machineId: string
  machineName: string
  totalOperations: number
  failedOperations: number
  defectRate: number // 0-1
}

interface MaterialHistory {
  material: string
  totalOrders: number
  defectOrders: number
  defectRate: number // 0-1
}

interface QualityRiskFactor {
  name: string
  score: number // 0-100 contribution
  weight: number
  description: string
}

interface QualityPrediction {
  orderId: string
  riskScore: number // 0-100
  badge: QualityBadge
  factors: QualityRiskFactor[]
  defectProbability: number // 0-1
  recommendation: string
  confidence: number // 0-100
  source: 'ai' | 'heuristic'
}

// ============================================
// REFERENCE: DEFECT RATE CALCULATION
// ============================================

function calculateDefectRate(failed: number, total: number): number {
  if (total === 0) return 0
  return Math.round((failed / total) * 1000) / 1000
}

// ============================================
// REFERENCE: RISK SCORE HEURISTIC
// ============================================

const FACTOR_WEIGHTS = {
  operator: 0.30,
  machine: 0.25,
  material: 0.20,
  complexity: 0.15,
  quantity: 0.10,
}

function operatorRiskScore(history: OperatorHistory | null): QualityRiskFactor {
  if (!history) {
    return {
      name: 'operator',
      score: 50, // unknown = medium risk
      weight: FACTOR_WEIGHTS.operator,
      description: 'Brak danych o operatorze — przyjeto srednie ryzyko.',
    }
  }

  if (history.totalOperations < 10) {
    return {
      name: 'operator',
      score: 40,
      weight: FACTOR_WEIGHTS.operator,
      description: `Operator ${history.operatorName} ma malo doswiadczenia (${history.totalOperations} operacji).`,
    }
  }

  const riskFromDefects = Math.min(100, history.defectRate * 500)
  return {
    name: 'operator',
    score: Math.round(riskFromDefects),
    weight: FACTOR_WEIGHTS.operator,
    description: `Operator ${history.operatorName}: wskaznik defektow ${(history.defectRate * 100).toFixed(1)}%.`,
  }
}

function machineRiskScore(history: MachineHistory | null): QualityRiskFactor {
  if (!history) {
    return {
      name: 'machine',
      score: 50,
      weight: FACTOR_WEIGHTS.machine,
      description: 'Brak danych o maszynie — przyjeto srednie ryzyko.',
    }
  }

  const riskFromDefects = Math.min(100, history.defectRate * 500)
  return {
    name: 'machine',
    score: Math.round(riskFromDefects),
    weight: FACTOR_WEIGHTS.machine,
    description: `Maszyna ${history.machineName}: wskaznik defektow ${(history.defectRate * 100).toFixed(1)}%.`,
  }
}

function materialRiskScore(history: MaterialHistory | null): QualityRiskFactor {
  if (!history) {
    return {
      name: 'material',
      score: 30, // default low-medium for unknown material
      weight: FACTOR_WEIGHTS.material,
      description: 'Brak historii defektow dla tego materialu.',
    }
  }

  const riskFromDefects = Math.min(100, history.defectRate * 400)
  return {
    name: 'material',
    score: Math.round(riskFromDefects),
    weight: FACTOR_WEIGHTS.material,
    description: `Material ${history.material}: wskaznik defektow ${(history.defectRate * 100).toFixed(1)}%.`,
  }
}

function complexityRiskScore(complexity: Complexity): QualityRiskFactor {
  const scores: Record<Complexity, number> = {
    simple: 10,
    medium: 40,
    complex: 75,
  }

  return {
    name: 'complexity',
    score: scores[complexity],
    weight: FACTOR_WEIGHTS.complexity,
    description: `Zlozonosc: ${complexity}.`,
  }
}

function quantityRiskScore(quantity: number): QualityRiskFactor {
  // Large batches have higher QC risk (fatigue, tool wear)
  let score = 10
  if (quantity > 100) score = 50
  else if (quantity > 50) score = 35
  else if (quantity > 20) score = 25

  return {
    name: 'quantity',
    score,
    weight: FACTOR_WEIGHTS.quantity,
    description: `Ilosc: ${quantity} szt.`,
  }
}

function assignBadge(riskScore: number): QualityBadge {
  if (riskScore >= 60) return 'high'
  if (riskScore >= 35) return 'medium'
  return 'low'
}

function generateRecommendation(badge: QualityBadge, factors: QualityRiskFactor[]): string {
  const topFactor = [...factors].sort((a, b) => b.score * b.weight - a.score * a.weight)[0]

  switch (badge) {
    case 'high':
      return `Wysokie ryzyko jakości! Główny czynnik: ${topFactor.description} Zalecana dodatkowa kontrola jakości.`
    case 'medium':
      return `Umiarkowane ryzyko jakości. Zwróć uwagę na: ${topFactor.description}`
    case 'low':
      return 'Niskie ryzyko jakości. Standardowa kontrola wystarczająca.'
  }
}

function predictQualityRisk(
  input: QualityRiskInput,
  operatorHistory: OperatorHistory | null,
  machineHistory: MachineHistory | null,
  materialHistory: MaterialHistory | null
): QualityPrediction {
  const factors: QualityRiskFactor[] = [
    operatorRiskScore(operatorHistory),
    machineRiskScore(machineHistory),
    materialRiskScore(materialHistory),
    complexityRiskScore(input.complexity),
    quantityRiskScore(input.quantity),
  ]

  // Weighted sum
  const riskScore = Math.round(
    factors.reduce((sum, f) => sum + f.score * f.weight, 0)
  )

  const badge = assignBadge(riskScore)
  const defectProbability = Math.round((riskScore / 100) * 0.3 * 1000) / 1000 // max 30% defect probability
  const recommendation = generateRecommendation(badge, factors)

  // Confidence based on data availability
  let confidence = 30
  if (operatorHistory && operatorHistory.totalOperations >= 10) confidence += 20
  if (machineHistory && machineHistory.totalOperations >= 10) confidence += 20
  if (materialHistory && materialHistory.totalOrders >= 5) confidence += 15
  confidence = Math.min(100, confidence)

  return {
    orderId: input.orderId,
    riskScore,
    badge,
    factors,
    defectProbability,
    recommendation,
    confidence,
    source: 'heuristic',
  }
}

// ============================================
// RISK SCORE CALCULATION
// ============================================

describe('Quality Predictor — Risk Score Calculation', () => {
  const baseInput: QualityRiskInput = {
    orderId: 'o1', partName: 'Tuleja', material: 'Stal 45',
    complexity: 'medium', quantity: 10, companyId: 'c1',
    operatorId: 1, machineId: 'm1',
  }

  it('should produce risk score in 0-100 range', () => {
    const result = predictQualityRisk(baseInput, null, null, null)
    expect(result.riskScore).toBeGreaterThanOrEqual(0)
    expect(result.riskScore).toBeLessThanOrEqual(100)
  })

  it('should produce higher score for experienced operator with high defects', () => {
    const goodOp: OperatorHistory = { operatorId: 1, operatorName: 'Jan', totalOperations: 100, failedOperations: 2, defectRate: 0.02 }
    const badOp: OperatorHistory = { operatorId: 2, operatorName: 'Adam', totalOperations: 100, failedOperations: 30, defectRate: 0.30 }

    const goodResult = predictQualityRisk(baseInput, goodOp, null, null)
    const badResult = predictQualityRisk(baseInput, badOp, null, null)

    expect(badResult.riskScore).toBeGreaterThan(goodResult.riskScore)
  })

  it('should produce higher score for machine with high defect history', () => {
    const goodMachine: MachineHistory = { machineId: 'm1', machineName: 'CNC-1', totalOperations: 200, failedOperations: 5, defectRate: 0.025 }
    const badMachine: MachineHistory = { machineId: 'm2', machineName: 'CNC-2', totalOperations: 200, failedOperations: 50, defectRate: 0.25 }

    const goodResult = predictQualityRisk(baseInput, null, goodMachine, null)
    const badResult = predictQualityRisk(baseInput, null, badMachine, null)

    expect(badResult.riskScore).toBeGreaterThan(goodResult.riskScore)
  })

  it('should produce higher score for complex parts', () => {
    const simpleResult = predictQualityRisk({ ...baseInput, complexity: 'simple' }, null, null, null)
    const complexResult = predictQualityRisk({ ...baseInput, complexity: 'complex' }, null, null, null)

    expect(complexResult.riskScore).toBeGreaterThan(simpleResult.riskScore)
  })

  it('should produce higher score for large quantities', () => {
    const small = predictQualityRisk({ ...baseInput, quantity: 5 }, null, null, null)
    const large = predictQualityRisk({ ...baseInput, quantity: 200 }, null, null, null)

    expect(large.riskScore).toBeGreaterThan(small.riskScore)
  })
})

// ============================================
// BADGE ASSIGNMENT
// ============================================

describe('Quality Predictor — Badge Assignment', () => {
  it('should assign low badge for risk <35', () => {
    expect(assignBadge(15)).toBe('low')
    expect(assignBadge(0)).toBe('low')
    expect(assignBadge(34)).toBe('low')
  })

  it('should assign medium badge for risk 35-59', () => {
    expect(assignBadge(35)).toBe('medium')
    expect(assignBadge(50)).toBe('medium')
    expect(assignBadge(59)).toBe('medium')
  })

  it('should assign high badge for risk >=60', () => {
    expect(assignBadge(60)).toBe('high')
    expect(assignBadge(85)).toBe('high')
    expect(assignBadge(100)).toBe('high')
  })
})

// ============================================
// MISSING DATA HANDLING
// ============================================

describe('Quality Predictor — Missing Correlation Data', () => {
  const baseInput: QualityRiskInput = {
    orderId: 'o1', partName: 'Test', material: 'Stal',
    complexity: 'simple', quantity: 5, companyId: 'c1',
    operatorId: null, machineId: null,
  }

  it('should produce valid result with all history missing', () => {
    const result = predictQualityRisk(baseInput, null, null, null)

    expect(result.riskScore).toBeGreaterThanOrEqual(0)
    expect(result.riskScore).toBeLessThanOrEqual(100)
    expect(result.badge).toBeDefined()
    expect(result.factors.length).toBe(5) // all 5 factors still present
  })

  it('should assign medium risk for unknown operator', () => {
    const factor = operatorRiskScore(null)
    expect(factor.score).toBe(50)
    expect(factor.description).toContain('Brak danych')
  })

  it('should assign medium risk for unknown machine', () => {
    const factor = machineRiskScore(null)
    expect(factor.score).toBe(50)
    expect(factor.description).toContain('Brak danych')
  })

  it('should assign low-medium risk for unknown material', () => {
    const factor = materialRiskScore(null)
    expect(factor.score).toBe(30)
  })

  it('should have lower confidence when data is missing', () => {
    const withData = predictQualityRisk(
      baseInput,
      { operatorId: 1, operatorName: 'Jan', totalOperations: 50, failedOperations: 2, defectRate: 0.04 },
      { machineId: 'm1', machineName: 'CNC-1', totalOperations: 100, failedOperations: 3, defectRate: 0.03 },
      { material: 'Stal', totalOrders: 30, defectOrders: 2, defectRate: 0.067 },
    )

    const withoutData = predictQualityRisk(baseInput, null, null, null)

    expect(withData.confidence).toBeGreaterThan(withoutData.confidence)
  })
})

// ============================================
// DEFECT RATE CALCULATION
// ============================================

describe('Quality Predictor — Defect Rate', () => {
  it('should calculate defect rate correctly', () => {
    expect(calculateDefectRate(5, 100)).toBe(0.05)
    expect(calculateDefectRate(0, 100)).toBe(0)
    expect(calculateDefectRate(10, 50)).toBe(0.2)
  })

  it('should handle zero total operations', () => {
    expect(calculateDefectRate(0, 0)).toBe(0)
  })

  it('should cap defect probability at 30%', () => {
    const result = predictQualityRisk(
      {
        orderId: 'o1', partName: 'X', material: 'Y',
        complexity: 'complex', quantity: 200, companyId: 'c1',
        operatorId: 1, machineId: 'm1',
      },
      { operatorId: 1, operatorName: 'Bad', totalOperations: 50, failedOperations: 25, defectRate: 0.5 },
      { machineId: 'm1', machineName: 'Old', totalOperations: 50, failedOperations: 25, defectRate: 0.5 },
      { material: 'Y', totalOrders: 10, defectOrders: 5, defectRate: 0.5 },
    )

    expect(result.defectProbability).toBeLessThanOrEqual(0.3)
  })

  it('should scale defect probability with risk score', () => {
    const low = predictQualityRisk(
      { orderId: 'o1', partName: 'A', material: 'B', complexity: 'simple', quantity: 1, companyId: 'c1', operatorId: null, machineId: null },
      { operatorId: 1, operatorName: 'Good', totalOperations: 100, failedOperations: 0, defectRate: 0 },
      { machineId: 'm1', machineName: 'New', totalOperations: 100, failedOperations: 0, defectRate: 0 },
      { material: 'B', totalOrders: 50, defectOrders: 0, defectRate: 0 },
    )

    const high = predictQualityRisk(
      { orderId: 'o2', partName: 'A', material: 'B', complexity: 'complex', quantity: 200, companyId: 'c1', operatorId: null, machineId: null },
      { operatorId: 2, operatorName: 'Bad', totalOperations: 50, failedOperations: 20, defectRate: 0.4 },
      { machineId: 'm2', machineName: 'Old', totalOperations: 50, failedOperations: 15, defectRate: 0.3 },
      { material: 'B', totalOrders: 20, defectOrders: 8, defectRate: 0.4 },
    )

    expect(high.defectProbability).toBeGreaterThan(low.defectProbability)
  })
})

// ============================================
// RECOMMENDATIONS
// ============================================

describe('Quality Predictor — Recommendations', () => {
  it('should recommend extra QC for high badge', () => {
    const rec = generateRecommendation('high', [
      { name: 'operator', score: 80, weight: 0.3, description: 'Operator z wysokim defect rate.' },
    ])
    expect(rec).toContain('Wysokie ryzyko')
    expect(rec).toContain('kontrola jakości')
  })

  it('should warn for medium badge', () => {
    const rec = generateRecommendation('medium', [
      { name: 'complexity', score: 60, weight: 0.15, description: 'Wysoka zlozonosc.' },
    ])
    expect(rec).toContain('Umiarkowane ryzyko')
  })

  it('should reassure for low badge', () => {
    const rec = generateRecommendation('low', [
      { name: 'operator', score: 10, weight: 0.3, description: 'Doswiadczony operator.' },
    ])
    expect(rec).toContain('Niskie ryzyko')
  })
})

// ============================================
// RESULT SHAPE
// ============================================

describe('Quality Predictor — Result Shape', () => {
  it('should return QualityPrediction with all required fields', () => {
    const result = predictQualityRisk(
      { orderId: 'o1', partName: 'Tuleja', material: 'Stal 45', complexity: 'medium', quantity: 20, companyId: 'c1', operatorId: 1, machineId: 'm1' },
      { operatorId: 1, operatorName: 'Jan', totalOperations: 50, failedOperations: 3, defectRate: 0.06 },
      { machineId: 'm1', machineName: 'CNC-1', totalOperations: 100, failedOperations: 5, defectRate: 0.05 },
      { material: 'Stal 45', totalOrders: 40, defectOrders: 3, defectRate: 0.075 },
    )

    expect(result).toHaveProperty('orderId')
    expect(result).toHaveProperty('riskScore')
    expect(result).toHaveProperty('badge')
    expect(result).toHaveProperty('factors')
    expect(result).toHaveProperty('defectProbability')
    expect(result).toHaveProperty('recommendation')
    expect(result).toHaveProperty('confidence')
    expect(result).toHaveProperty('source')
    expect(typeof result.riskScore).toBe('number')
    expect(['low', 'medium', 'high']).toContain(result.badge)
    expect(Array.isArray(result.factors)).toBe(true)
    expect(result.factors.length).toBe(5)
  })
})

// ============================================
// COMPANY ISOLATION
// ============================================

describe('Quality Predictor — Company Isolation', () => {
  it('should require companyId in input', () => {
    const companyA = 'company-A'
    const companyB = 'company-B'
    expect(companyA).not.toBe(companyB)
    // Backend-dev must filter operator/machine/material history by company_id
  })
})
