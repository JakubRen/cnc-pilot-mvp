// Deadline Predictor (Phase 2 — Feature 2.1)
// Predicts realistic deadlines based on machine load and order complexity.
// Pure heuristic — no AI dependency.

import { createClient } from '@/lib/supabase-server'
import { logger } from '@/lib/logger'

// ============================================
// TYPES
// ============================================

export type DeadlineConfidence = 'high' | 'medium' | 'low'

export interface DeadlinePrediction {
  /** Suggested deadline (ISO date string YYYY-MM-DD) */
  suggestedDeadline: string
  /** Estimated production time in hours */
  estimatedProductionHours: number
  /** Current machine load in hours (committed work) */
  machineLoadHours: number
  /** Number of active machines */
  activeMachineCount: number
  /** Confidence based on data availability */
  confidence: DeadlineConfidence
  /** Human-readable reasoning (Polish) */
  reasoning: string
}

export interface DeadlinePredictorInput {
  companyId: string
  /** Part complexity */
  complexity?: 'simple' | 'medium' | 'complex'
  /** Material (affects processing time) */
  material?: string
  /** Number of units */
  quantity?: number
  /** Number of operations (if known) */
  operationCount?: number
}

// ============================================
// COMPLEXITY MULTIPLIERS
// ============================================

const COMPLEXITY_HOURS: Record<string, number> = {
  simple: 0.5,   // 30 min base per unit
  medium: 1.5,   // 1.5h base per unit
  complex: 4.0,  // 4h base per unit
}

/** Hard materials take longer */
const MATERIAL_MULTIPLIER: Record<string, number> = {
  stal_nierdzewna: 1.4,
  nierdzewna: 1.4,
  inox: 1.4,
  '304': 1.3,
  '316': 1.4,
  tytan: 1.8,
  titanium: 1.8,
  inconel: 2.0,
  // Standard materials
  stal: 1.0,
  steel: 1.0,
  aluminium: 0.8,
  alu: 0.8,
  miedz: 0.9,
  copper: 0.9,
  brass: 0.9,
  pom: 0.6,
  delrin: 0.6,
  peek: 1.2,
  plastik: 0.5,
}

function getMaterialMultiplier(material?: string): number {
  if (!material) return 1.0
  const matLower = material.toLowerCase()
  for (const [key, mult] of Object.entries(MATERIAL_MULTIPLIER)) {
    if (matLower.includes(key)) return mult
  }
  return 1.0
}

// ============================================
// MACHINE LOAD CALCULATION
// ============================================

interface MachineLoad {
  totalCommittedHours: number
  activeMachineCount: number
  avgHoursPerMachine: number
}

async function calculateMachineLoad(companyId: string): Promise<MachineLoad> {
  const supabase = await createClient()

  // Count active machines
  const { count: machineCount, error: machineError } = await supabase
    .from('machines')
    .select('*', { count: 'exact', head: true })
    .eq('company_id', companyId)
    .eq('status', 'active')

  if (machineError) {
    logger.error('[deadline-predictor] Error fetching machines', { error: machineError })
  }

  const activeMachineCount = machineCount || 1 // At least 1 to avoid division by zero

  // Sum committed hours from active production plans' operations
  const { data: operations, error: opsError } = await supabase
    .from('operations')
    .select(`
      setup_time_minutes,
      run_time_per_unit_minutes,
      status,
      production_plan_id,
      production_plans!inner (
        company_id,
        status,
        quantity
      )
    `)
    .in('status', ['pending', 'in_progress'])

  if (opsError) {
    logger.error('[deadline-predictor] Error fetching operations', { error: opsError })
    return { totalCommittedHours: 0, activeMachineCount, avgHoursPerMachine: 0 }
  }

  // Filter by company_id (from production_plans) and active plan statuses
  let totalMinutes = 0
  for (const op of operations || []) {
    const plan = op.production_plans as unknown as { company_id: string; status: string; quantity: number }
    if (plan.company_id !== companyId) continue
    if (!['active', 'in_progress', 'draft'].includes(plan.status)) continue

    const setupMin = Number(op.setup_time_minutes) || 0
    const runPerUnit = Number(op.run_time_per_unit_minutes) || 0
    const quantity = Number(plan.quantity) || 1
    totalMinutes += setupMin + (runPerUnit * quantity)
  }

  const totalCommittedHours = Math.round((totalMinutes / 60) * 10) / 10
  const avgHoursPerMachine = activeMachineCount > 0
    ? Math.round((totalCommittedHours / activeMachineCount) * 10) / 10
    : totalCommittedHours

  return { totalCommittedHours, activeMachineCount, avgHoursPerMachine }
}

// ============================================
// PUBLIC API
// ============================================

/**
 * Predict a realistic deadline for a new order based on:
 * - Current machine load (committed operations)
 * - Part complexity and material
 * - Quantity
 * Returns a suggested deadline date and reasoning.
 */
export async function predictDeadline(
  input: DeadlinePredictorInput
): Promise<DeadlinePrediction> {
  const {
    companyId,
    complexity = 'medium',
    material,
    quantity = 1,
    operationCount,
  } = input

  // 1. Estimate production time for this order
  const baseHoursPerUnit = COMPLEXITY_HOURS[complexity] || COMPLEXITY_HOURS.medium
  const materialMult = getMaterialMultiplier(material)
  const setupHours = operationCount ? operationCount * 0.5 : 1.0 // 30min setup per operation
  const productionHours = Math.round(
    (baseHoursPerUnit * materialMult * quantity + setupHours) * 10
  ) / 10

  // 2. Get current machine load
  const load = await calculateMachineLoad(companyId)

  // 3. Calculate effective daily capacity
  const hoursPerDay = 8 // Standard work day
  const dailyCapacity = load.activeMachineCount * hoursPerDay
  const queueDays = dailyCapacity > 0
    ? Math.ceil(load.totalCommittedHours / dailyCapacity)
    : 0

  // 4. Calculate production days for this order
  const orderDays = dailyCapacity > 0
    ? Math.ceil(productionHours / dailyCapacity)
    : Math.ceil(productionHours / hoursPerDay)

  // 5. Add buffer (20% for unforeseen delays)
  const bufferDays = Math.max(1, Math.ceil((queueDays + orderDays) * 0.2))
  const totalDays = queueDays + orderDays + bufferDays

  // 6. Calculate suggested deadline (skip weekends)
  const suggestedDate = addBusinessDays(new Date(), totalDays)
  const suggestedDeadline = suggestedDate.toISOString().split('T')[0]

  // 7. Determine confidence
  let confidence: DeadlineConfidence = 'medium'
  if (load.activeMachineCount >= 2 && load.totalCommittedHours > 0) {
    confidence = 'high' // Good data: multiple machines, active work
  } else if (load.activeMachineCount === 0 || load.totalCommittedHours === 0) {
    confidence = 'low' // No data: no machines or no active work
  }

  // 8. Build reasoning
  const parts: string[] = []
  parts.push(`Szacowany czas produkcji: ${productionHours}h`)
  if (load.totalCommittedHours > 0) {
    parts.push(`Aktualne obciazenie maszyn: ${load.totalCommittedHours}h (kolejka: ~${queueDays} dni)`)
  }
  parts.push(`${load.activeMachineCount} aktywnych maszyn, zdolnosc: ${dailyCapacity}h/dzien`)
  parts.push(`Bufor na opoznienia: ${bufferDays} dni`)
  const reasoning = parts.join('. ') + '.'

  return {
    suggestedDeadline,
    estimatedProductionHours: productionHours,
    machineLoadHours: load.totalCommittedHours,
    activeMachineCount: load.activeMachineCount,
    confidence,
    reasoning,
  }
}

// ============================================
// HELPERS
// ============================================

/** Add business days (skip Saturday and Sunday) */
function addBusinessDays(start: Date, days: number): Date {
  const result = new Date(start)
  let added = 0
  while (added < days) {
    result.setDate(result.getDate() + 1)
    const dow = result.getDay()
    if (dow !== 0 && dow !== 6) {
      added++
    }
  }
  return result
}
