import { NextRequest, NextResponse } from 'next/server'
import { getUserProfile } from '@/lib/auth-server'
import { generateProductionPlan } from '@/lib/ai/features/production-plan-generator'
import type { Complexity } from '@/lib/ai/features/production-plan-generator'
import { sanitizeField, FIELD_LIMITS } from '@/lib/ai/security/sanitizer'

// =====================================================
// POST /api/agents/generate-plan
// Generates an AI-powered production plan from part specs.
// =====================================================

export async function POST(request: NextRequest) {
  try {
    const userProfile = await getUserProfile()

    if (!userProfile?.company_id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const companyId = userProfile.company_id
    const body = await request.json()

    // Validate required fields
    const partName = body.partName || body.part_name
    if (!partName || typeof partName !== 'string' || partName.trim().length === 0) {
      return NextResponse.json(
        { error: 'Field "partName" is required' },
        { status: 400 }
      )
    }

    const quantity = Math.max(1, Math.floor(Number(body.quantity) || 1))
    const complexity: Complexity = ['simple', 'medium', 'complex'].includes(body.complexity)
      ? body.complexity
      : 'medium'

    const material = sanitizeField(body.material, FIELD_LIMITS.SHORT) || 'Stal'
    const notes = body.notes ? sanitizeField(body.notes, FIELD_LIMITS.MEDIUM) : null

    // Parse dimensions
    let dimensions: { length?: number | null; width?: number | null; height?: number | null } | null = null
    if (body.dimensions && typeof body.dimensions === 'object') {
      dimensions = {
        length: body.dimensions.length != null ? Number(body.dimensions.length) : null,
        width: body.dimensions.width != null ? Number(body.dimensions.width) : null,
        height: body.dimensions.height != null ? Number(body.dimensions.height) : null,
      }
    }

    const plan = await generateProductionPlan({
      partName: sanitizeField(partName, FIELD_LIMITS.SHORT) || partName,
      material,
      quantity,
      complexity,
      dimensions,
      technicalNotes: notes,
      companyId,
    })

    // Transform to frontend contract (snake_case)
    const operations = plan.operations.map(op => ({
      operation_type: op.operationType,
      operation_name: op.operationName,
      description: op.description,
      setup_time_minutes: op.setupTimeMinutes,
      run_time_per_unit_minutes: op.runTimePerUnitMinutes,
      machine_suggestion: op.machineSuggestion,
      hourly_rate: null, // Could be populated from machines table in future
    }))

    return NextResponse.json({
      success: true,
      data: {
        operations,
        total_setup_minutes: plan.totalSetupMinutes,
        total_run_minutes: plan.totalRunMinutes,
        estimated_cost_pln: plan.estimatedCostPln,
        confidence: plan.confidence,
      },
      reasoning: plan.source === 'ai'
        ? `Plan wygenerowany przez AI na podstawie specyfikacji i ${plan.confidence > 60 ? 'historycznych planow' : 'wiedzy ogolnej'}.`
        : `Plan wygenerowany heurystycznie na podstawie nazwy czesci i zlozonosci.`,
      model: plan.source === 'ai' ? 'gemini-2.5-flash' : 'heuristic',
    })
  } catch (error) {
    console.error('[generate-plan] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
