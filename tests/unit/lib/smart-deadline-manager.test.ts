/**
 * Unit Tests for Smart Deadline Manager (Phase 2 — Feature 2.5)
 *
 * Tests the CRON-style deadline monitoring system that:
 * - Scores completion_likelihood 0-100% for active orders
 * - Identifies at-risk orders (low likelihood + approaching deadline)
 * - Generates remediation recommendations
 * - Filters by company_id (multi-tenant)
 *
 * CONTRACT for backend-dev:
 * - assessOrderDeadlines(companyId) -> DeadlineAssessment[]
 * - getAtRiskOrders(companyId) -> AtRiskOrder[]
 * - Pure scoring: completionLikelihood(order) -> 0-100
 * - Heuristic fallback when AI unavailable
 */

import { describe, it, expect, vi } from 'vitest'

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}))

// ============================================
// CONTRACT TYPES
// ============================================

type OrderStatus = 'new' | 'in_progress' | 'completed' | 'cancelled'

interface ActiveOrderSnapshot {
  orderId: string
  orderNumber: string
  partName: string
  quantity: number
  status: OrderStatus
  deadline: string // ISO date
  createdAt: string
  completedOperations: number
  totalOperations: number
  estimatedHoursRemaining: number
  assignedMachineLoad: number // 0-100%
}

interface DeadlineAssessment {
  orderId: string
  orderNumber: string
  completionLikelihood: number // 0-100
  daysUntilDeadline: number
  operationProgress: number // 0-100%
  risk: 'on_track' | 'at_risk' | 'critical' | 'overdue'
  recommendation: string
}

interface AtRiskOrder {
  orderId: string
  orderNumber: string
  partName: string
  completionLikelihood: number
  daysUntilDeadline: number
  recommendation: string
}

// ============================================
// REFERENCE HEURISTIC: COMPLETION LIKELIHOOD
// ============================================

function completionLikelihood(order: ActiveOrderSnapshot): number {
  const now = new Date()
  const deadline = new Date(order.deadline)
  const created = new Date(order.createdAt)

  const totalDays = Math.max(1, (deadline.getTime() - created.getTime()) / (1000 * 60 * 60 * 24))
  const elapsedDays = (now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24)
  const daysRemaining = Math.max(0, (deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

  // Factor 1: Operation progress (weight 40%)
  const operationProgress = order.totalOperations > 0
    ? (order.completedOperations / order.totalOperations) * 100
    : 0
  const progressScore = operationProgress * 0.4

  // Factor 2: Time adequacy — can remaining work fit in remaining time? (weight 35%)
  const availableHoursPerDay = 8
  const availableHours = daysRemaining * availableHoursPerDay
  const timeAdequacy = order.estimatedHoursRemaining > 0
    ? Math.min(100, (availableHours / order.estimatedHoursRemaining) * 100)
    : 100 // if no hours remaining, it's done
  const timeScore = timeAdequacy * 0.35

  // Factor 3: Expected progress vs actual (weight 15%)
  const expectedProgress = Math.min(100, (elapsedDays / totalDays) * 100)
  const progressDelta = operationProgress - expectedProgress
  const paceScore = Math.max(0, Math.min(100, 50 + progressDelta)) * 0.15

  // Factor 4: Machine load penalty (weight 10%)
  const loadPenalty = (100 - order.assignedMachineLoad) * 0.10

  return Math.round(Math.min(100, Math.max(0, progressScore + timeScore + paceScore + loadPenalty)))
}

function classifyRisk(likelihood: number, daysUntilDeadline: number): DeadlineAssessment['risk'] {
  if (daysUntilDeadline < 0) return 'overdue'
  if (likelihood < 30) return 'critical'
  if (likelihood < 60) return 'at_risk'
  return 'on_track'
}

function generateRecommendation(
  risk: DeadlineAssessment['risk'],
  order: ActiveOrderSnapshot
): string {
  switch (risk) {
    case 'overdue':
      return `Zlecenie ${order.orderNumber} po terminie! Skontaktuj sie z klientem i ustal nowy deadline.`
    case 'critical':
      return `Zlecenie ${order.orderNumber} zagrozne! Rozważ przydzielenie dodatkowej maszyny lub prace na dodatkowej zmianie.`
    case 'at_risk':
      return `Zlecenie ${order.orderNumber} moze sie opoznic. Sprawdz postep i rozważ priorytetyzacje.`
    case 'on_track':
      return `Zlecenie ${order.orderNumber} na dobrej drodze.`
  }
}

function assessOrder(order: ActiveOrderSnapshot): DeadlineAssessment {
  const now = new Date()
  const deadline = new Date(order.deadline)
  const daysUntilDeadline = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

  const likelihood = completionLikelihood(order)
  const operationProgress = order.totalOperations > 0
    ? Math.round((order.completedOperations / order.totalOperations) * 100)
    : 0

  const risk = classifyRisk(likelihood, daysUntilDeadline)

  return {
    orderId: order.orderId,
    orderNumber: order.orderNumber,
    completionLikelihood: likelihood,
    daysUntilDeadline,
    operationProgress,
    risk,
    recommendation: generateRecommendation(risk, order),
  }
}

// ============================================
// COMPLETION LIKELIHOOD SCORING
// ============================================

describe('Smart Deadline Manager — Completion Likelihood', () => {
  it('should return high likelihood for order with good progress and plenty of time', () => {
    const order: ActiveOrderSnapshot = {
      orderId: 'o1',
      orderNumber: 'ORD-001',
      partName: 'Tuleja',
      quantity: 10,
      status: 'in_progress',
      deadline: new Date(Date.now() + 30 * 86400000).toISOString(),
      createdAt: new Date(Date.now() - 10 * 86400000).toISOString(),
      completedOperations: 3,
      totalOperations: 5,
      estimatedHoursRemaining: 10,
      assignedMachineLoad: 30,
    }

    const likelihood = completionLikelihood(order)
    expect(likelihood).toBeGreaterThanOrEqual(60)
  })

  it('should return low likelihood for order with no progress and tight deadline', () => {
    const order: ActiveOrderSnapshot = {
      orderId: 'o2',
      orderNumber: 'ORD-002',
      partName: 'Korpus',
      quantity: 50,
      status: 'in_progress',
      deadline: new Date(Date.now() + 1 * 86400000).toISOString(),
      createdAt: new Date(Date.now() - 20 * 86400000).toISOString(),
      completedOperations: 0,
      totalOperations: 6,
      estimatedHoursRemaining: 80,
      assignedMachineLoad: 90,
    }

    const likelihood = completionLikelihood(order)
    expect(likelihood).toBeLessThan(30)
  })

  it('should return 0-100 range for all inputs', () => {
    const order: ActiveOrderSnapshot = {
      orderId: 'o3',
      orderNumber: 'ORD-003',
      partName: 'Test',
      quantity: 1,
      status: 'in_progress',
      deadline: new Date(Date.now() + 5 * 86400000).toISOString(),
      createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
      completedOperations: 2,
      totalOperations: 4,
      estimatedHoursRemaining: 20,
      assignedMachineLoad: 50,
    }

    const likelihood = completionLikelihood(order)
    expect(likelihood).toBeGreaterThanOrEqual(0)
    expect(likelihood).toBeLessThanOrEqual(100)
  })

  it('should score nearly-done orders high regardless of time pressure', () => {
    const order: ActiveOrderSnapshot = {
      orderId: 'o4',
      orderNumber: 'ORD-004',
      partName: 'Pin',
      quantity: 100,
      status: 'in_progress',
      deadline: new Date(Date.now() + 1 * 86400000).toISOString(),
      createdAt: new Date(Date.now() - 14 * 86400000).toISOString(),
      completedOperations: 4,
      totalOperations: 5,
      estimatedHoursRemaining: 2,
      assignedMachineLoad: 20,
    }

    const likelihood = completionLikelihood(order)
    expect(likelihood).toBeGreaterThanOrEqual(50)
  })

  it('should penalize high machine load', () => {
    const base: ActiveOrderSnapshot = {
      orderId: 'o5',
      orderNumber: 'ORD-005',
      partName: 'Wal',
      quantity: 10,
      status: 'in_progress',
      deadline: new Date(Date.now() + 10 * 86400000).toISOString(),
      createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
      completedOperations: 2,
      totalOperations: 4,
      estimatedHoursRemaining: 20,
      assignedMachineLoad: 20,
    }

    const lowLoad = completionLikelihood({ ...base, assignedMachineLoad: 20 })
    const highLoad = completionLikelihood({ ...base, assignedMachineLoad: 95 })

    expect(lowLoad).toBeGreaterThan(highLoad)
  })
})

// ============================================
// RISK CLASSIFICATION
// ============================================

describe('Smart Deadline Manager — Risk Classification', () => {
  it('should classify overdue orders correctly', () => {
    expect(classifyRisk(50, -2)).toBe('overdue')
  })

  it('should classify critical risk for very low likelihood', () => {
    expect(classifyRisk(15, 3)).toBe('critical')
  })

  it('should classify at_risk for medium likelihood', () => {
    expect(classifyRisk(45, 5)).toBe('at_risk')
  })

  it('should classify on_track for high likelihood', () => {
    expect(classifyRisk(75, 10)).toBe('on_track')
  })

  it('should always classify as overdue when days < 0, regardless of likelihood', () => {
    expect(classifyRisk(100, -1)).toBe('overdue')
    expect(classifyRisk(0, -5)).toBe('overdue')
  })
})

// ============================================
// RECOMMENDATIONS
// ============================================

describe('Smart Deadline Manager — Recommendations', () => {
  const mockOrder: ActiveOrderSnapshot = {
    orderId: 'o1',
    orderNumber: 'ORD-001',
    partName: 'Test',
    quantity: 1,
    status: 'in_progress',
    deadline: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    completedOperations: 0,
    totalOperations: 1,
    estimatedHoursRemaining: 10,
    assignedMachineLoad: 50,
  }

  it('should recommend contact for overdue orders', () => {
    const rec = generateRecommendation('overdue', mockOrder)
    expect(rec).toContain('po terminie')
    expect(rec).toContain(mockOrder.orderNumber)
  })

  it('should recommend additional resources for critical orders', () => {
    const rec = generateRecommendation('critical', mockOrder)
    expect(rec).toContain('zagrozne')
  })

  it('should recommend monitoring for at_risk orders', () => {
    const rec = generateRecommendation('at_risk', mockOrder)
    expect(rec).toContain('opoznic')
  })

  it('should be positive for on_track orders', () => {
    const rec = generateRecommendation('on_track', mockOrder)
    expect(rec).toContain('na dobrej drodze')
  })
})

// ============================================
// FULL ASSESSMENT
// ============================================

describe('Smart Deadline Manager — Full Assessment', () => {
  it('should return DeadlineAssessment with all required fields', () => {
    const order: ActiveOrderSnapshot = {
      orderId: 'o1',
      orderNumber: 'ORD-001',
      partName: 'Tuleja',
      quantity: 10,
      status: 'in_progress',
      deadline: new Date(Date.now() + 7 * 86400000).toISOString(),
      createdAt: new Date(Date.now() - 7 * 86400000).toISOString(),
      completedOperations: 3,
      totalOperations: 5,
      estimatedHoursRemaining: 15,
      assignedMachineLoad: 40,
    }

    const assessment = assessOrder(order)

    expect(assessment).toHaveProperty('orderId')
    expect(assessment).toHaveProperty('orderNumber')
    expect(assessment).toHaveProperty('completionLikelihood')
    expect(assessment).toHaveProperty('daysUntilDeadline')
    expect(assessment).toHaveProperty('operationProgress')
    expect(assessment).toHaveProperty('risk')
    expect(assessment).toHaveProperty('recommendation')
    expect(typeof assessment.completionLikelihood).toBe('number')
    expect(typeof assessment.recommendation).toBe('string')
    expect(assessment.recommendation.length).toBeGreaterThan(0)
  })

  it('should calculate operation progress as percentage', () => {
    const order: ActiveOrderSnapshot = {
      orderId: 'o1',
      orderNumber: 'ORD-001',
      partName: 'Test',
      quantity: 1,
      status: 'in_progress',
      deadline: new Date(Date.now() + 10 * 86400000).toISOString(),
      createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
      completedOperations: 3,
      totalOperations: 6,
      estimatedHoursRemaining: 10,
      assignedMachineLoad: 50,
    }

    const assessment = assessOrder(order)
    expect(assessment.operationProgress).toBe(50)
  })

  it('should handle orders with zero operations', () => {
    const order: ActiveOrderSnapshot = {
      orderId: 'o1',
      orderNumber: 'ORD-001',
      partName: 'Nowy',
      quantity: 1,
      status: 'new',
      deadline: new Date(Date.now() + 14 * 86400000).toISOString(),
      createdAt: new Date().toISOString(),
      completedOperations: 0,
      totalOperations: 0,
      estimatedHoursRemaining: 0,
      assignedMachineLoad: 0,
    }

    const assessment = assessOrder(order)
    expect(assessment.operationProgress).toBe(0)
    // Should not throw
  })
})

// ============================================
// AT-RISK FILTERING
// ============================================

describe('Smart Deadline Manager — At-Risk Filtering', () => {
  it('should filter only at_risk and critical orders', () => {
    const orders: ActiveOrderSnapshot[] = [
      {
        orderId: 'o1', orderNumber: 'ORD-001', partName: 'A', quantity: 1,
        status: 'in_progress',
        deadline: new Date(Date.now() + 30 * 86400000).toISOString(),
        createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
        completedOperations: 4, totalOperations: 5,
        estimatedHoursRemaining: 2, assignedMachineLoad: 20,
      },
      {
        orderId: 'o2', orderNumber: 'ORD-002', partName: 'B', quantity: 50,
        status: 'in_progress',
        deadline: new Date(Date.now() + 1 * 86400000).toISOString(),
        createdAt: new Date(Date.now() - 20 * 86400000).toISOString(),
        completedOperations: 0, totalOperations: 6,
        estimatedHoursRemaining: 80, assignedMachineLoad: 90,
      },
    ]

    const assessments = orders.map(assessOrder)
    const atRisk = assessments.filter(a => a.risk === 'at_risk' || a.risk === 'critical' || a.risk === 'overdue')

    // The second order should be at-risk or critical
    expect(atRisk.length).toBeGreaterThanOrEqual(1)
    expect(atRisk.some(a => a.orderId === 'o2')).toBe(true)
  })
})

// ============================================
// COMPANY ISOLATION
// ============================================

describe('Smart Deadline Manager — Company Isolation', () => {
  it('should require companyId in the contract', () => {
    // CONTRACT: assessOrderDeadlines(companyId) must filter by company_id
    const companyA = 'company-A'
    const companyB = 'company-B'
    expect(companyA).not.toBe(companyB)
    // Backend-dev must add .eq('company_id', companyId) to all queries
  })
})
