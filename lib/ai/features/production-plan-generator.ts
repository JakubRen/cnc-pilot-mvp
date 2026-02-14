// Production Plan Generator (Phase 2 — Feature 2.4)
// Generates a production plan (operation list) from part specifications.
// Uses heuristic inference + optional AI enrichment with few-shot examples.

import { createClient } from '@/lib/supabase-server'
import { callGemini } from '@/lib/ai/gemini-client'
import { SchemaType } from '@/lib/ai/schema-types'
import { sanitizeField, FIELD_LIMITS } from '@/lib/ai/security/sanitizer'
import { logger } from '@/lib/logger'

// ============================================
// TYPES
// ============================================

export type OperationType =
  | 'milling'
  | 'turning'
  | 'drilling'
  | 'grinding'
  | 'cutting'
  | 'deburring'
  | 'quality_control'
  | 'other'

export type Complexity = 'simple' | 'medium' | 'complex'

export interface PlanGeneratorInput {
  partName: string
  material: string
  quantity: number
  complexity: Complexity
  dimensions: { length?: number | null; width?: number | null; height?: number | null } | null
  technicalNotes: string | null
  companyId: string
}

export interface GeneratedOperation {
  operationNumber: number
  operationType: OperationType
  operationName: string
  setupTimeMinutes: number
  runTimePerUnitMinutes: number
  machineSuggestion: string | null
  description: string | null
}

export interface GeneratedPlan {
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
// COMPLEXITY MULTIPLIERS
// ============================================

const COMPLEXITY_MULTIPLIERS: Record<Complexity, number> = {
  simple: 1,
  medium: 1.5,
  complex: 2.5,
}

// ============================================
// HEURISTIC PLAN GENERATION
// ============================================

/**
 * Infer operations from part name and complexity.
 * Uses Polish CNC naming conventions to detect turned vs milled parts.
 */
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

  // 3. Drilling for complex and medium parts
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

/**
 * Build a heuristic production plan from part specifications.
 */
export function heuristicPlan(input: PlanGeneratorInput): GeneratedPlan {
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
// FEW-SHOT HISTORY LOADER
// ============================================

interface HistoricalPlan {
  partName: string
  material: string
  quantity: number
  operations: Array<{
    operationType: string
    operationName: string
    setupTimeMinutes: number
    runTimePerUnitMinutes: number
  }>
}

async function loadSimilarPlans(
  companyId: string,
  material: string,
  complexity: Complexity
): Promise<HistoricalPlan[]> {
  try {
    const supabase = await createClient()

    // Find completed production plans for similar orders
    const { data: plans, error } = await supabase
      .from('production_plans')
      .select(`
        id, quantity,
        orders!inner ( part_name, material ),
        operations ( operation_type, setup_time_minutes, run_time_per_unit_minutes )
      `)
      .eq('company_id', companyId)
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(20)

    if (error || !plans) return []

    // Filter for similar material and map to HistoricalPlan
    const results: HistoricalPlan[] = []
    const materialLower = material.toLowerCase()

    for (const plan of plans) {
      const order = plan.orders as unknown as { part_name: string; material: string } | null
      if (!order?.material) continue

      // Check material similarity
      if (!order.material.toLowerCase().includes(materialLower) &&
          !materialLower.includes(order.material.toLowerCase())) continue

      const ops = (plan.operations as Array<{
        operation_type: string
        setup_time_minutes: number
        run_time_per_unit_minutes: number
      }>) || []

      if (ops.length === 0) continue

      results.push({
        partName: order.part_name || '',
        material: order.material || '',
        quantity: plan.quantity || 1,
        operations: ops.map(o => ({
          operationType: o.operation_type,
          operationName: o.operation_type, // simplified
          setupTimeMinutes: Number(o.setup_time_minutes) || 0,
          runTimePerUnitMinutes: Number(o.run_time_per_unit_minutes) || 0,
        })),
      })

      if (results.length >= 3) break // Max 3 examples
    }

    return results
  } catch (err) {
    logger.error('[production-plan-generator] Failed to load similar plans', { error: err })
    return []
  }
}

// ============================================
// AI-ENHANCED PLAN GENERATION
// ============================================

function buildPrompt(input: PlanGeneratorInput, fewShotExamples: HistoricalPlan[]): string {
  const lines: string[] = [
    'Jestes ekspertem od planowania produkcji CNC. Wygeneruj plan produkcji (liste operacji) dla podanej czesci.',
    '',
    'SPECYFIKACJA CZESCI:',
    `- Nazwa: ${input.partName}`,
    `- Material: ${input.material}`,
    `- Ilosc: ${input.quantity} szt.`,
    `- Zlozonosc: ${input.complexity}`,
  ]

  if (input.dimensions) {
    const dims = [
      input.dimensions.length && `L=${input.dimensions.length}mm`,
      input.dimensions.width && `W=${input.dimensions.width}mm`,
      input.dimensions.height && `H=${input.dimensions.height}mm`,
    ].filter(Boolean).join(', ')
    if (dims) lines.push(`- Wymiary: ${dims}`)
  }

  if (input.technicalNotes) {
    lines.push(`- Uwagi techniczne: ${input.technicalNotes}`)
  }

  if (fewShotExamples.length > 0) {
    lines.push('')
    lines.push('PRZYKLADY PODOBNYCH PLANOW (z historii firmy):')
    for (const ex of fewShotExamples) {
      lines.push(`  Czesc: ${ex.partName} (${ex.material}, ${ex.quantity} szt.)`)
      for (const op of ex.operations) {
        lines.push(`    - ${op.operationType}: setup ${op.setupTimeMinutes}min, run ${op.runTimePerUnitMinutes}min/szt`)
      }
    }
  }

  lines.push('')
  lines.push('ZASADY:')
  lines.push('- Zwroc liste operacji w kolejnosci wykonania')
  lines.push('- Dozwolone typy: milling, turning, drilling, grinding, cutting, deburring, quality_control, other')
  lines.push('- Zawsze zaczynaj od "cutting" (ciecie materialu)')
  lines.push('- Zawsze konczac "quality_control" (kontrola jakosci)')
  lines.push('- setup_time w minutach (czas przygotowania maszyny)')
  lines.push('- run_time_per_unit w minutach (czas na sztuke)')
  lines.push('- machine_suggestion: sugerowana maszyna (lub null)')
  lines.push('- Podaj realistyczne czasy bazujac na doswiadczeniu')

  return lines.join('\n')
}

/**
 * Generate a production plan — tries AI (with few-shot), falls back to heuristic.
 *
 * @param input - Part specifications
 */
export async function generateProductionPlan(
  input: PlanGeneratorInput
): Promise<GeneratedPlan> {
  // Always compute heuristic first as fallback
  const fallback = heuristicPlan(input)

  // Try AI-enhanced generation
  try {
    const fewShotExamples = await loadSimilarPlans(
      input.companyId,
      input.material,
      input.complexity
    )

    const prompt = buildPrompt(input, fewShotExamples)

    const aiResult = await callGemini<{
      operations: Array<{
        operation_type: string
        operation_name: string
        setup_time_minutes: number
        run_time_per_unit_minutes: number
        machine_suggestion: string | null
        description: string | null
      }>
    }>({
      label: 'production-plan-generator',
      prompt,
      responseSchema: {
        type: SchemaType.OBJECT,
        properties: {
          operations: {
            type: SchemaType.ARRAY,
            items: {
              type: SchemaType.OBJECT,
              properties: {
                operation_type: { type: SchemaType.STRING },
                operation_name: { type: SchemaType.STRING },
                setup_time_minutes: { type: SchemaType.NUMBER },
                run_time_per_unit_minutes: { type: SchemaType.NUMBER },
                machine_suggestion: { type: SchemaType.STRING, nullable: true },
                description: { type: SchemaType.STRING, nullable: true },
              },
              required: ['operation_type', 'operation_name', 'setup_time_minutes', 'run_time_per_unit_minutes'],
            },
          },
        },
        required: ['operations'],
      },
      temperature: 0.2,
    })

    if (!aiResult || !aiResult.data.operations || aiResult.data.operations.length === 0) {
      return fallback
    }

    // Validate and sanitize AI output
    const validOps: GeneratedOperation[] = []
    let opNum = 1

    for (const aiOp of aiResult.data.operations) {
      const opType = VALID_OPERATION_TYPES.includes(aiOp.operation_type as OperationType)
        ? aiOp.operation_type as OperationType
        : 'other'

      const setupMin = Math.max(1, Math.round(Number(aiOp.setup_time_minutes) || 5))
      const runMin = Math.max(0.1, Math.round(Number(aiOp.run_time_per_unit_minutes) * 10) / 10 || 1)

      validOps.push({
        operationNumber: opNum++,
        operationType: opType,
        operationName: sanitizeField(aiOp.operation_name, FIELD_LIMITS.SHORT) || opType,
        setupTimeMinutes: setupMin,
        runTimePerUnitMinutes: runMin,
        machineSuggestion: aiOp.machine_suggestion
          ? sanitizeField(aiOp.machine_suggestion, FIELD_LIMITS.SHORT)
          : null,
        description: aiOp.description
          ? sanitizeField(aiOp.description, FIELD_LIMITS.MEDIUM)
          : null,
      })
    }

    if (validOps.length === 0) return fallback

    const totalSetup = validOps.reduce((s, o) => s + o.setupTimeMinutes, 0)
    const totalRun = validOps.reduce((s, o) => s + o.runTimePerUnitMinutes * input.quantity, 0)

    // Confidence based on few-shot example count
    const confidence = fewShotExamples.length >= 2 ? 75 : fewShotExamples.length === 1 ? 60 : 50

    return {
      operations: validOps,
      totalSetupMinutes: totalSetup,
      totalRunMinutes: Math.round(totalRun * 10) / 10,
      estimatedCostPln: null,
      confidence,
      source: 'ai',
    }
  } catch (err) {
    logger.error('[production-plan-generator] AI generation failed, using heuristic', { error: err })
    return fallback
  }
}
