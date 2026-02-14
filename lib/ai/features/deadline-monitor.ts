// Smart Deadline Monitor (Phase 2 — Feature 2.5)
// Calculates completion_likelihood for orders approaching deadlines.
// Used by the deadline-reminder cron job to prioritize notifications.
// Pure heuristic — no AI dependency.

import { createClient } from '@/lib/supabase-server'
import { logger } from '@/lib/logger'

// ============================================
// TYPES
// ============================================

export type CompletionRisk = 'on_track' | 'at_risk' | 'critical'

export interface OrderCompletionLikelihood {
  orderId: string
  orderNumber: string
  customerName: string
  deadline: string
  daysRemaining: number
  /** 0-100 percentage likelihood of on-time completion */
  completionLikelihood: number
  /** Risk classification */
  risk: CompletionRisk
  /** Production plan progress (0-100%), null if no plan */
  productionProgress: number | null
  /** Human-readable status (Polish) */
  statusSummary: string
}

// ============================================
// COMPLETION LIKELIHOOD CALCULATION
// ============================================

interface PlanProgress {
  totalOperations: number
  completedOperations: number
  inProgressOperations: number
  totalEstimatedMinutes: number
  completedMinutes: number
}

async function getProductionProgress(
  supabase: Awaited<ReturnType<typeof createClient>>,
  orderId: string
): Promise<PlanProgress | null> {
  const { data: plans, error } = await supabase
    .from('production_plans')
    .select('id, status, quantity')
    .eq('order_id', orderId)
    .in('status', ['draft', 'active', 'in_progress', 'completed'])

  if (error || !plans || plans.length === 0) return null

  let totalOps = 0
  let completedOps = 0
  let inProgressOps = 0
  let totalEstimatedMin = 0
  let completedMin = 0

  for (const plan of plans) {
    const { data: operations } = await supabase
      .from('operations')
      .select('status, setup_time_minutes, run_time_per_unit_minutes')
      .eq('production_plan_id', plan.id)

    if (!operations) continue

    const qty = Number(plan.quantity) || 1

    for (const op of operations) {
      totalOps++
      const setupMin = Number(op.setup_time_minutes) || 0
      const runPerUnit = Number(op.run_time_per_unit_minutes) || 0
      const opMinutes = setupMin + (runPerUnit * qty)
      totalEstimatedMin += opMinutes

      if (op.status === 'completed') {
        completedOps++
        completedMin += opMinutes
      } else if (op.status === 'in_progress') {
        inProgressOps++
        // Assume 50% complete for in-progress operations
        completedMin += opMinutes * 0.5
      }
    }
  }

  return {
    totalOperations: totalOps,
    completedOperations: completedOps,
    inProgressOperations: inProgressOps,
    totalEstimatedMinutes: totalEstimatedMin,
    completedMinutes: Math.round(completedMin),
  }
}

function calculateLikelihood(
  daysRemaining: number,
  progress: PlanProgress | null,
  orderStatus: string
): { likelihood: number; risk: CompletionRisk; summary: string } {
  // Already completed
  if (orderStatus === 'completed' || orderStatus === 'ready_to_ship') {
    return { likelihood: 100, risk: 'on_track', summary: 'Zamowienie ukonczone' }
  }

  // No production plan — can't assess
  if (!progress || progress.totalOperations === 0) {
    if (daysRemaining <= 1) {
      return { likelihood: 10, risk: 'critical', summary: 'Brak planu produkcji, deadline jutro' }
    }
    if (daysRemaining <= 3) {
      return { likelihood: 30, risk: 'at_risk', summary: 'Brak planu produkcji, deadline za ' + daysRemaining + ' dni' }
    }
    return { likelihood: 50, risk: 'at_risk', summary: 'Brak planu produkcji' }
  }

  // Calculate progress percentage
  const progressPercent = progress.totalOperations > 0
    ? (progress.completedOperations / progress.totalOperations) * 100
    : 0

  // Calculate time-based score
  // How much of the estimated work is done vs how much time is left
  const workDonePercent = progress.totalEstimatedMinutes > 0
    ? (progress.completedMinutes / progress.totalEstimatedMinutes) * 100
    : 0

  // Estimate remaining hours needed
  const remainingMinutes = progress.totalEstimatedMinutes - progress.completedMinutes
  const remainingHours = remainingMinutes / 60
  const availableHours = daysRemaining * 8 // 8h workday

  // Score: blend of progress and time feasibility
  let likelihood: number

  if (availableHours <= 0) {
    // Past deadline
    likelihood = progressPercent >= 90 ? 60 : Math.max(5, Math.round(progressPercent * 0.3))
  } else if (remainingHours <= 0) {
    // All work done
    likelihood = 95
  } else {
    // Time feasibility ratio: can we finish in time?
    const feasibilityRatio = availableHours / remainingHours
    const timeFeasibility = Math.min(100, Math.round(feasibilityRatio * 70))
    // Blend: 60% time feasibility + 40% progress
    likelihood = Math.round(timeFeasibility * 0.6 + progressPercent * 0.4)
  }

  likelihood = Math.max(0, Math.min(100, likelihood))

  // Risk classification
  let risk: CompletionRisk = 'on_track'
  if (likelihood < 40) risk = 'critical'
  else if (likelihood < 70) risk = 'at_risk'

  // Summary
  const parts: string[] = []
  parts.push(`${progress.completedOperations}/${progress.totalOperations} operacji`)
  if (remainingHours > 0) {
    parts.push(`~${Math.round(remainingHours)}h pracy pozostalo`)
  }
  if (daysRemaining <= 0) {
    parts.push('po terminie')
  }
  const summary = parts.join(', ')

  return { likelihood, risk, summary }
}

// ============================================
// PUBLIC API
// ============================================

/**
 * Get completion likelihood for orders approaching their deadlines.
 * Used by the deadline-reminder cron to enrich notifications.
 *
 * @param companyId — company isolation
 * @param daysAhead — look ahead window (default: 7 days)
 */
export async function getOrderCompletionLikelihoods(
  companyId: string,
  daysAhead: number = 7
): Promise<OrderCompletionLikelihood[]> {
  try {
    const supabase = await createClient()

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const futureDate = new Date(today)
    futureDate.setDate(futureDate.getDate() + daysAhead)

    // Fetch orders with deadlines in the window (not completed/cancelled)
    const { data: orders, error } = await supabase
      .from('orders')
      .select('id, order_number, customer_name, deadline, status')
      .eq('company_id', companyId)
      .in('status', ['pending', 'in_progress', 'delayed'])
      .lte('deadline', futureDate.toISOString().split('T')[0])
      .order('deadline', { ascending: true })

    if (error) {
      logger.error('[deadline-monitor] Error fetching orders', { error })
      return []
    }

    const results: OrderCompletionLikelihood[] = []

    for (const order of orders || []) {
      const deadlineDate = new Date(order.deadline)
      deadlineDate.setHours(0, 0, 0, 0)
      const daysRemaining = Math.ceil(
        (deadlineDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      )

      const progress = await getProductionProgress(supabase, order.id)
      const { likelihood, risk, summary } = calculateLikelihood(
        daysRemaining,
        progress,
        order.status
      )

      const progressPercent = progress && progress.totalOperations > 0
        ? Math.round((progress.completedOperations / progress.totalOperations) * 100)
        : null

      results.push({
        orderId: order.id,
        orderNumber: order.order_number,
        customerName: order.customer_name,
        deadline: order.deadline,
        daysRemaining,
        completionLikelihood: likelihood,
        risk,
        productionProgress: progressPercent,
        statusSummary: summary,
      })
    }

    // Sort by risk: critical first, then at_risk, then on_track
    const riskOrder: Record<CompletionRisk, number> = { critical: 0, at_risk: 1, on_track: 2 }
    results.sort((a, b) => riskOrder[a.risk] - riskOrder[b.risk])

    return results
  } catch (err) {
    logger.error('[deadline-monitor] getOrderCompletionLikelihoods failed', { error: err })
    return []
  }
}
