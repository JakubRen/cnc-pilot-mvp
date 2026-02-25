// Quality Predictor (Phase 3 — Feature 3.3)
// Assigns quality risk scores and badges to orders based on
// operator, machine, material, complexity, and quantity factors.
//
// Architecture:
//   1. Pure factor calculators: operatorRiskScore(), machineRiskScore(), etc.
//   2. predictQualityRisk(input, histories) — weighted sum heuristic
//   3. getOrderQualityPrediction(orderId) — server-side: loads history, predicts
//
// Weighted model: operator(30%) + machine(25%) + material(20%) + complexity(15%) + quantity(10%)
// Badge: green (<30), yellow (30-70), red (>=70)
// Defect probability: riskScore * 0.3 / 100 (capped at 30%)

import { createClient } from '@/lib/supabase-server'
import { callGemini } from '@/lib/ai/gemini-client'
import { SchemaType } from '@/lib/ai/schema-types'
import { sanitizeField, FIELD_LIMITS } from '@/lib/ai/security/sanitizer'
import { logger } from '@/lib/logger'

// ============================================
// TYPES
// ============================================

export type QualityBadge = 'green' | 'yellow' | 'red'
export type Complexity = 'simple' | 'medium' | 'complex'

export interface QualityRiskInput {
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

export interface OperatorHistory {
  operatorId: number
  operatorName: string
  totalOperations: number
  failedOperations: number
  defectRate: number // 0-1
}

export interface MachineHistory {
  machineId: string
  machineName: string
  totalOperations: number
  failedOperations: number
  defectRate: number // 0-1
}

export interface MaterialHistory {
  material: string
  totalOrders: number
  defectOrders: number
  defectRate: number // 0-1
}

export interface QualityRiskFactor {
  name: string
  score: number // 0-100 contribution
  weight: number
  description: string
}

export interface QualityPrediction {
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
// FACTOR WEIGHTS
// ============================================

export const FACTOR_WEIGHTS = {
  operator: 0.30,
  machine: 0.25,
  material: 0.20,
  complexity: 0.15,
  quantity: 0.10,
}

// ============================================
// DEFECT RATE UTILITY
// ============================================

export function calculateDefectRate(failed: number, total: number): number {
  if (total === 0) return 0
  return Math.round((failed / total) * 1000) / 1000
}

// ============================================
// FACTOR CALCULATORS
// ============================================

export function operatorRiskScore(history: OperatorHistory | null): QualityRiskFactor {
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

export function machineRiskScore(history: MachineHistory | null): QualityRiskFactor {
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

export function materialRiskScore(history: MaterialHistory | null): QualityRiskFactor {
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

export function complexityRiskScore(complexity: Complexity): QualityRiskFactor {
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

export function quantityRiskScore(quantity: number): QualityRiskFactor {
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

// ============================================
// BADGE ASSIGNMENT
// ============================================

export function assignBadge(riskScore: number): QualityBadge {
  if (riskScore >= 70) return 'red'
  if (riskScore >= 30) return 'yellow'
  return 'green'
}

// ============================================
// RECOMMENDATION GENERATOR
// ============================================

export function generateRecommendation(badge: QualityBadge, factors: QualityRiskFactor[]): string {
  const topFactor = [...factors].sort((a, b) => b.score * b.weight - a.score * a.weight)[0]

  switch (badge) {
    case 'red':
      return `Wysokie ryzyko jakości! Główny czynnik: ${topFactor.description} Zalecana dodatkowa kontrola jakości.`
    case 'yellow':
      return `Umiarkowane ryzyko jakości. Zwróć uwagę na: ${topFactor.description}`
    case 'green':
      return 'Niskie ryzyko jakości. Standardowa kontrola wystarczająca.'
  }
}

// ============================================
// CORE: PREDICT QUALITY RISK
// ============================================

/**
 * Pure heuristic quality risk prediction.
 * Takes order details and optional historical data for operator/machine/material.
 * Returns a risk score, badge, factor breakdown, and recommendation.
 */
export function predictQualityRisk(
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
// SERVER-SIDE: FULL QUALITY PREDICTION
// ============================================

/**
 * Server-side quality prediction.
 * Loads operator, machine, and material defect histories from DB.
 */
export async function getOrderQualityPrediction(
  input: QualityRiskInput
): Promise<QualityPrediction> {
  const supabase = await createClient()
  const { companyId } = input

  // Load operator history
  let operatorHistory: OperatorHistory | null = null
  if (input.operatorId !== null) {
    try {
      const { data: ops } = await supabase
        .from('operations')
        .select('id, status')
        .eq('company_id', companyId)
        .eq('operator_id', input.operatorId)

      if (ops && ops.length > 0) {
        const failed = ops.filter(o => o.status === 'failed' || o.status === 'rejected').length
        operatorHistory = {
          operatorId: input.operatorId,
          operatorName: `Operator #${input.operatorId}`,
          totalOperations: ops.length,
          failedOperations: failed,
          defectRate: calculateDefectRate(failed, ops.length),
        }
      }
    } catch (err) {
      logger.warn('[quality-predictor] Failed to load operator history', { error: String(err) })
    }
  }

  // Load machine history
  let machineHistory: MachineHistory | null = null
  if (input.machineId !== null) {
    try {
      const { data: ops } = await supabase
        .from('operations')
        .select('id, status')
        .eq('company_id', companyId)
        .eq('machine_id', input.machineId)

      const { data: machine } = await supabase
        .from('machines')
        .select('name')
        .eq('id', input.machineId)
        .single()

      if (ops && ops.length > 0) {
        const failed = ops.filter(o => o.status === 'failed' || o.status === 'rejected').length
        machineHistory = {
          machineId: input.machineId,
          machineName: machine?.name || input.machineId,
          totalOperations: ops.length,
          failedOperations: failed,
          defectRate: calculateDefectRate(failed, ops.length),
        }
      }
    } catch (err) {
      logger.warn('[quality-predictor] Failed to load machine history', { error: String(err) })
    }
  }

  // Load material history
  let materialHistory: MaterialHistory | null = null
  try {
    const { data: orders } = await supabase
      .from('orders')
      .select('id, status')
      .eq('company_id', companyId)
      .eq('material', input.material)

    if (orders && orders.length > 0) {
      const defectOrders = orders.filter(o =>
        o.status === 'rejected' || o.status === 'returned' || o.status === 'defective'
      ).length
      materialHistory = {
        material: input.material,
        totalOrders: orders.length,
        defectOrders,
        defectRate: calculateDefectRate(defectOrders, orders.length),
      }
    }
  } catch (err) {
    logger.warn('[quality-predictor] Failed to load material history', { error: String(err) })
  }

  return predictQualityRisk(input, operatorHistory, machineHistory, materialHistory)
}
