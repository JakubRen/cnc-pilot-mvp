/**
 * Unit Tests for Customer Lifetime Value (CLV) Prediction (Phase 1 — Feature 1.2)
 *
 * Tests the CLV prediction module that extends customer-intelligence.ts
 * with future value estimation based on order history.
 *
 * CONTRACT for backend-dev:
 * - New function: predictCLV(customerData) -> CLVPrediction
 * - Uses order history to project future revenue
 * - Heuristic formula: avgOrderValue * predictedOrdersPerYear * retentionYears
 * - AI enrichment: Gemini can refine the prediction with industry context
 * - Segment-based defaults when individual data is sparse
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// ============================================
// MOCKS
// ============================================

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}))

// ============================================
// CLV PREDICTION TYPES (contract definition)
// ============================================

interface CLVInput {
  customerName: string
  totalOrders: number
  totalRevenue: number
  firstOrderDate: string
  lastOrderDate: string
  averageOrderValue: number
  orderFrequencyDays: number
  churnRisk: 'high' | 'medium' | 'low'
}

interface CLVPrediction {
  customerName: string
  /** Predicted lifetime value in PLN */
  predictedCLV: number
  /** Confidence 0-100 */
  confidence: number
  /** Annual predicted revenue */
  annualRevenue: number
  /** Predicted retention in years */
  retentionYears: number
  /** Segment: vip, regular, occasional, at_risk */
  segment: string
  /** Trend: growing, stable, declining */
  trend: 'growing' | 'stable' | 'declining'
}

// ============================================
// HEURISTIC CLV CALCULATION
// ============================================

/**
 * Reference heuristic implementation for test validation.
 * Backend-dev will implement the real version.
 *
 * Formula: CLV = avgOrderValue * ordersPerYear * retentionYears
 * Retention depends on churn risk:
 *   low -> 3 years, medium -> 1.5 years, high -> 0.5 years
 */
function heuristicCLV(input: CLVInput): CLVPrediction {
  const daysActive = Math.max(1, Math.ceil(
    (new Date(input.lastOrderDate).getTime() - new Date(input.firstOrderDate).getTime()) /
    (1000 * 60 * 60 * 24)
  ))

  const ordersPerYear = input.orderFrequencyDays > 0
    ? Math.round(365 / input.orderFrequencyDays)
    : (input.totalOrders / Math.max(1, daysActive / 365))

  const retentionYears = input.churnRisk === 'high' ? 0.5
    : input.churnRisk === 'medium' ? 1.5
    : 3

  const annualRevenue = input.averageOrderValue * ordersPerYear
  const predictedCLV = annualRevenue * retentionYears

  // Confidence based on data quality
  let confidence = 50
  if (input.totalOrders >= 10) confidence += 20
  if (input.totalOrders >= 5) confidence += 10
  if (input.orderFrequencyDays > 0) confidence += 10

  const trend: CLVPrediction['trend'] =
    input.churnRisk === 'high' ? 'declining'
    : input.churnRisk === 'low' ? 'growing'
    : 'stable'

  return {
    customerName: input.customerName,
    predictedCLV: Math.round(predictedCLV),
    confidence: Math.min(100, confidence),
    annualRevenue: Math.round(annualRevenue),
    retentionYears,
    segment: input.totalRevenue > 50000 ? 'vip' : input.totalOrders >= 5 ? 'regular' : 'occasional',
    trend,
  }
}

// ============================================
// CLV PREDICTION — BASIC CALCULATION
// ============================================

describe('CLV Prediction — Basic Calculation', () => {
  it('should calculate CLV for a regular customer', () => {
    const input: CLVInput = {
      customerName: 'MetalTech Sp. z o.o.',
      totalOrders: 12,
      totalRevenue: 36000,
      firstOrderDate: '2025-06-01',
      lastOrderDate: '2026-01-15',
      averageOrderValue: 3000,
      orderFrequencyDays: 21,
      churnRisk: 'low',
    }

    const result = heuristicCLV(input)

    expect(result.customerName).toBe('MetalTech Sp. z o.o.')
    expect(result.predictedCLV).toBeGreaterThan(0)
    expect(result.annualRevenue).toBeGreaterThan(0)
    expect(result.retentionYears).toBe(3)
    expect(result.confidence).toBeGreaterThanOrEqual(50)
  })

  it('should predict lower CLV for high churn risk customer', () => {
    const lowRisk: CLVInput = {
      customerName: 'Good Customer',
      totalOrders: 10,
      totalRevenue: 30000,
      firstOrderDate: '2025-01-01',
      lastOrderDate: '2026-01-01',
      averageOrderValue: 3000,
      orderFrequencyDays: 30,
      churnRisk: 'low',
    }

    const highRisk: CLVInput = {
      ...lowRisk,
      customerName: 'Risky Customer',
      churnRisk: 'high',
    }

    const lowResult = heuristicCLV(lowRisk)
    const highResult = heuristicCLV(highRisk)

    expect(lowResult.predictedCLV).toBeGreaterThan(highResult.predictedCLV)
    expect(highResult.retentionYears).toBe(0.5)
    expect(lowResult.retentionYears).toBe(3)
  })

  it('should assign medium retention for medium churn risk', () => {
    const input: CLVInput = {
      customerName: 'Medium Customer',
      totalOrders: 5,
      totalRevenue: 10000,
      firstOrderDate: '2025-06-01',
      lastOrderDate: '2025-12-01',
      averageOrderValue: 2000,
      orderFrequencyDays: 30,
      churnRisk: 'medium',
    }

    const result = heuristicCLV(input)
    expect(result.retentionYears).toBe(1.5)
  })
})

// ============================================
// CLV PREDICTION — CONFIDENCE SCORING
// ============================================

describe('CLV Prediction — Confidence Scoring', () => {
  it('should have higher confidence with more orders', () => {
    const fewOrders: CLVInput = {
      customerName: 'New Customer',
      totalOrders: 2,
      totalRevenue: 6000,
      firstOrderDate: '2025-12-01',
      lastOrderDate: '2026-01-01',
      averageOrderValue: 3000,
      orderFrequencyDays: 30,
      churnRisk: 'low',
    }

    const manyOrders: CLVInput = {
      ...fewOrders,
      customerName: 'Veteran Customer',
      totalOrders: 20,
      totalRevenue: 60000,
    }

    const fewResult = heuristicCLV(fewOrders)
    const manyResult = heuristicCLV(manyOrders)

    expect(manyResult.confidence).toBeGreaterThan(fewResult.confidence)
  })

  it('should cap confidence at 100', () => {
    const input: CLVInput = {
      customerName: 'Super Customer',
      totalOrders: 100,
      totalRevenue: 500000,
      firstOrderDate: '2020-01-01',
      lastOrderDate: '2026-01-01',
      averageOrderValue: 5000,
      orderFrequencyDays: 7,
      churnRisk: 'low',
    }

    const result = heuristicCLV(input)
    expect(result.confidence).toBeLessThanOrEqual(100)
  })

  it('should have minimum confidence of 50 (base)', () => {
    const input: CLVInput = {
      customerName: 'Unknown Customer',
      totalOrders: 1,
      totalRevenue: 1000,
      firstOrderDate: '2026-01-01',
      lastOrderDate: '2026-01-01',
      averageOrderValue: 1000,
      orderFrequencyDays: 0,
      churnRisk: 'low',
    }

    const result = heuristicCLV(input)
    expect(result.confidence).toBeGreaterThanOrEqual(50)
  })
})

// ============================================
// CLV PREDICTION — TREND DETECTION
// ============================================

describe('CLV Prediction — Trend Detection', () => {
  it('should detect growing trend for low churn risk', () => {
    const input: CLVInput = {
      customerName: 'Growing Customer',
      totalOrders: 15,
      totalRevenue: 60000,
      firstOrderDate: '2025-01-01',
      lastOrderDate: '2026-01-15',
      averageOrderValue: 4000,
      orderFrequencyDays: 21,
      churnRisk: 'low',
    }

    const result = heuristicCLV(input)
    expect(result.trend).toBe('growing')
  })

  it('should detect declining trend for high churn risk', () => {
    const input: CLVInput = {
      customerName: 'Declining Customer',
      totalOrders: 5,
      totalRevenue: 10000,
      firstOrderDate: '2025-01-01',
      lastOrderDate: '2025-06-01',
      averageOrderValue: 2000,
      orderFrequencyDays: 30,
      churnRisk: 'high',
    }

    const result = heuristicCLV(input)
    expect(result.trend).toBe('declining')
  })

  it('should detect stable trend for medium churn risk', () => {
    const input: CLVInput = {
      customerName: 'Stable Customer',
      totalOrders: 8,
      totalRevenue: 24000,
      firstOrderDate: '2025-03-01',
      lastOrderDate: '2025-12-01',
      averageOrderValue: 3000,
      orderFrequencyDays: 30,
      churnRisk: 'medium',
    }

    const result = heuristicCLV(input)
    expect(result.trend).toBe('stable')
  })
})

// ============================================
// CLV PREDICTION — SEGMENTATION
// ============================================

describe('CLV Prediction — Segment Assignment', () => {
  it('should assign VIP segment for high revenue customers (>50k PLN)', () => {
    const input: CLVInput = {
      customerName: 'VIP Customer',
      totalOrders: 25,
      totalRevenue: 75000,
      firstOrderDate: '2024-01-01',
      lastOrderDate: '2026-01-01',
      averageOrderValue: 3000,
      orderFrequencyDays: 14,
      churnRisk: 'low',
    }

    const result = heuristicCLV(input)
    expect(result.segment).toBe('vip')
  })

  it('should assign regular segment for moderate customers (>=5 orders)', () => {
    const input: CLVInput = {
      customerName: 'Regular Customer',
      totalOrders: 8,
      totalRevenue: 16000,
      firstOrderDate: '2025-06-01',
      lastOrderDate: '2026-01-01',
      averageOrderValue: 2000,
      orderFrequencyDays: 21,
      churnRisk: 'low',
    }

    const result = heuristicCLV(input)
    expect(result.segment).toBe('regular')
  })

  it('should assign occasional segment for infrequent customers (<5 orders)', () => {
    const input: CLVInput = {
      customerName: 'Occasional Customer',
      totalOrders: 2,
      totalRevenue: 4000,
      firstOrderDate: '2025-10-01',
      lastOrderDate: '2025-12-01',
      averageOrderValue: 2000,
      orderFrequencyDays: 60,
      churnRisk: 'medium',
    }

    const result = heuristicCLV(input)
    expect(result.segment).toBe('occasional')
  })
})

// ============================================
// CLV PREDICTION — EDGE CASES
// ============================================

describe('CLV Prediction — Edge Cases', () => {
  it('should handle single-order customer', () => {
    const input: CLVInput = {
      customerName: 'One-time Customer',
      totalOrders: 1,
      totalRevenue: 5000,
      firstOrderDate: '2026-01-01',
      lastOrderDate: '2026-01-01',
      averageOrderValue: 5000,
      orderFrequencyDays: 0,
      churnRisk: 'medium',
    }

    const result = heuristicCLV(input)
    expect(result.predictedCLV).toBeGreaterThan(0)
    expect(result.confidence).toBeLessThanOrEqual(70) // Low confidence with 1 order
  })

  it('should handle zero order frequency gracefully', () => {
    const input: CLVInput = {
      customerName: 'Zero Freq',
      totalOrders: 3,
      totalRevenue: 9000,
      firstOrderDate: '2025-12-01',
      lastOrderDate: '2026-01-15',
      averageOrderValue: 3000,
      orderFrequencyDays: 0,
      churnRisk: 'low',
    }

    const result = heuristicCLV(input)
    expect(result.predictedCLV).toBeGreaterThan(0)
    expect(Number.isFinite(result.predictedCLV)).toBe(true)
    expect(Number.isFinite(result.annualRevenue)).toBe(true)
  })

  it('should return valid CLVPrediction shape', () => {
    const input: CLVInput = {
      customerName: 'Test',
      totalOrders: 5,
      totalRevenue: 15000,
      firstOrderDate: '2025-06-01',
      lastOrderDate: '2026-01-01',
      averageOrderValue: 3000,
      orderFrequencyDays: 30,
      churnRisk: 'low',
    }

    const result = heuristicCLV(input)
    expect(result).toHaveProperty('customerName')
    expect(result).toHaveProperty('predictedCLV')
    expect(result).toHaveProperty('confidence')
    expect(result).toHaveProperty('annualRevenue')
    expect(result).toHaveProperty('retentionYears')
    expect(result).toHaveProperty('segment')
    expect(result).toHaveProperty('trend')
    expect(typeof result.predictedCLV).toBe('number')
    expect(typeof result.confidence).toBe('number')
    expect(typeof result.annualRevenue).toBe('number')
  })
})
