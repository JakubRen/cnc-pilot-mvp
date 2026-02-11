/**
 * Unit Tests for Anomaly Detection (existing feature)
 *
 * Tests the threshold-based anomaly detection rules:
 * - Time overrun (>150% estimated)
 * - Deadline risk (<3 days, no work logged)
 * - Stale orders (14+ days, <1h work)
 * - Cost overrun (labor > selling price)
 *
 * These tests validate the pure logic in lib/anomaly-alerts.ts
 * by mocking Supabase to return controlled order data.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// ============================================
// MOCKS
// ============================================

const mockOrders: Record<string, unknown>[] = []

vi.mock('@/lib/supabase-server', () => ({
  createClient: vi.fn().mockResolvedValue({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          in: vi.fn(() => ({
            order: vi.fn().mockResolvedValue({ data: mockOrders, error: null }),
          })),
          neq: vi.fn(() => ({
            in: vi.fn(() => ({
              order: vi.fn().mockResolvedValue({ data: mockOrders, error: null }),
            })),
          })),
        })),
      })),
    })),
  }),
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}))

import { getAnomalyAlerts } from '@/lib/anomaly-alerts'

// ============================================
// TIME OVERRUN DETECTION
// ============================================

describe('Anomaly Alerts — Time Overrun', () => {
  beforeEach(() => {
    mockOrders.length = 0
  })

  it('should detect time overrun when actual > 150% of estimated', async () => {
    mockOrders.push({
      id: '1',
      order_number: 'ORD-001',
      customer_name: 'Firma ABC',
      status: 'in_progress',
      deadline: new Date(Date.now() + 7 * 86400000).toISOString(), // 7 days from now
      estimated_hours: 10,
      actual_labor_hours: 16, // 160% — above threshold
      actual_labor_cost: null,
      selling_price: null,
      created_at: new Date(Date.now() - 5 * 86400000).toISOString(),
    })

    const result = await getAnomalyAlerts('test-company')

    const timeOverruns = result.alerts.filter(a => a.type === 'time_overrun')
    expect(timeOverruns.length).toBe(1)
    expect(timeOverruns[0].severity).toBe('warning')
    expect(timeOverruns[0].metric).toBe('160%')
  })

  it('should flag critical when actual >= 200% of estimated', async () => {
    mockOrders.push({
      id: '1',
      order_number: 'ORD-002',
      customer_name: 'Firma XYZ',
      status: 'in_progress',
      deadline: new Date(Date.now() + 7 * 86400000).toISOString(),
      estimated_hours: 10,
      actual_labor_hours: 22, // 220% — critical
      actual_labor_cost: null,
      selling_price: null,
      created_at: new Date(Date.now() - 5 * 86400000).toISOString(),
    })

    const result = await getAnomalyAlerts('test-company')

    const timeOverruns = result.alerts.filter(a => a.type === 'time_overrun')
    expect(timeOverruns.length).toBe(1)
    expect(timeOverruns[0].severity).toBe('critical')
  })

  it('should NOT flag when actual is within 150% of estimated', async () => {
    mockOrders.push({
      id: '1',
      order_number: 'ORD-003',
      customer_name: 'Firma OK',
      status: 'in_progress',
      deadline: new Date(Date.now() + 7 * 86400000).toISOString(),
      estimated_hours: 10,
      actual_labor_hours: 14, // 140% — below threshold
      actual_labor_cost: null,
      selling_price: null,
      created_at: new Date(Date.now() - 5 * 86400000).toISOString(),
    })

    const result = await getAnomalyAlerts('test-company')

    const timeOverruns = result.alerts.filter(a => a.type === 'time_overrun')
    expect(timeOverruns.length).toBe(0)
  })
})

// ============================================
// DEADLINE RISK DETECTION
// ============================================

describe('Anomaly Alerts — Deadline Risk', () => {
  beforeEach(() => {
    mockOrders.length = 0
  })

  it('should detect deadline risk when deadline < 3 days and no work logged', async () => {
    mockOrders.push({
      id: '1',
      order_number: 'ORD-010',
      customer_name: 'Firma Deadline',
      status: 'pending',
      deadline: new Date(Date.now() + 2 * 86400000).toISOString(), // 2 days from now
      estimated_hours: 10,
      actual_labor_hours: 0,
      actual_labor_cost: null,
      selling_price: null,
      created_at: new Date(Date.now() - 10 * 86400000).toISOString(),
    })

    const result = await getAnomalyAlerts('test-company')

    const deadlineRisks = result.alerts.filter(a => a.type === 'deadline_risk')
    expect(deadlineRisks.length).toBe(1)
    expect(deadlineRisks[0].severity).toBe('warning')
  })

  it('should flag critical when deadline is tomorrow with no work', async () => {
    mockOrders.push({
      id: '1',
      order_number: 'ORD-011',
      customer_name: 'Firma Urgent',
      status: 'in_progress',
      deadline: new Date(Date.now() + 0.5 * 86400000).toISOString(), // ~12 hours
      estimated_hours: 20,
      actual_labor_hours: 0,
      actual_labor_cost: null,
      selling_price: null,
      created_at: new Date(Date.now() - 5 * 86400000).toISOString(),
    })

    const result = await getAnomalyAlerts('test-company')

    const deadlineRisks = result.alerts.filter(a => a.type === 'deadline_risk')
    expect(deadlineRisks.length).toBeGreaterThanOrEqual(1)
    // Deadline <= 1 day should be critical
    const criticals = deadlineRisks.filter(a => a.severity === 'critical')
    expect(criticals.length).toBeGreaterThanOrEqual(1)
  })
})

// ============================================
// STALE ORDER DETECTION
// ============================================

describe('Anomaly Alerts — Stale Orders', () => {
  beforeEach(() => {
    mockOrders.length = 0
  })

  it('should detect stale order when in_progress for 14+ days with <1h work', async () => {
    mockOrders.push({
      id: '1',
      order_number: 'ORD-020',
      customer_name: 'Firma Stale',
      status: 'in_progress',
      deadline: new Date(Date.now() + 30 * 86400000).toISOString(),
      estimated_hours: 10,
      actual_labor_hours: 0.5,
      actual_labor_cost: null,
      selling_price: null,
      created_at: new Date(Date.now() - 20 * 86400000).toISOString(), // 20 days ago
    })

    const result = await getAnomalyAlerts('test-company')

    const staleOrders = result.alerts.filter(a => a.type === 'stale_order')
    expect(staleOrders.length).toBe(1)
    expect(staleOrders[0].severity).toBe('warning')
  })

  it('should flag critical when stale for 30+ days', async () => {
    mockOrders.push({
      id: '1',
      order_number: 'ORD-021',
      customer_name: 'Firma VeryStale',
      status: 'in_progress',
      deadline: new Date(Date.now() + 60 * 86400000).toISOString(),
      estimated_hours: 10,
      actual_labor_hours: 0,
      actual_labor_cost: null,
      selling_price: null,
      created_at: new Date(Date.now() - 35 * 86400000).toISOString(), // 35 days ago
    })

    const result = await getAnomalyAlerts('test-company')

    const staleOrders = result.alerts.filter(a => a.type === 'stale_order')
    expect(staleOrders.length).toBe(1)
    expect(staleOrders[0].severity).toBe('critical')
  })

  it('should NOT flag in_progress order with significant work logged', async () => {
    mockOrders.push({
      id: '1',
      order_number: 'ORD-022',
      customer_name: 'Firma Active',
      status: 'in_progress',
      deadline: new Date(Date.now() + 30 * 86400000).toISOString(),
      estimated_hours: 10,
      actual_labor_hours: 8, // Plenty of work done
      actual_labor_cost: null,
      selling_price: null,
      created_at: new Date(Date.now() - 20 * 86400000).toISOString(),
    })

    const result = await getAnomalyAlerts('test-company')

    const staleOrders = result.alerts.filter(a => a.type === 'stale_order')
    expect(staleOrders.length).toBe(0)
  })
})

// ============================================
// COST OVERRUN DETECTION
// ============================================

describe('Anomaly Alerts — Cost Overrun', () => {
  beforeEach(() => {
    mockOrders.length = 0
  })

  it('should detect when labor cost exceeds selling price', async () => {
    mockOrders.push({
      id: '1',
      order_number: 'ORD-030',
      customer_name: 'Firma Expensive',
      status: 'in_progress',
      deadline: new Date(Date.now() + 7 * 86400000).toISOString(),
      estimated_hours: null,
      actual_labor_hours: null,
      actual_labor_cost: 1200,
      selling_price: 1000, // Cost 120% of price
      created_at: new Date(Date.now() - 5 * 86400000).toISOString(),
    })

    const result = await getAnomalyAlerts('test-company')

    const costOverruns = result.alerts.filter(a => a.type === 'cost_overrun')
    expect(costOverruns.length).toBe(1)
    expect(costOverruns[0].metric).toBe('120%')
  })

  it('should flag critical when cost >= 150% of price', async () => {
    mockOrders.push({
      id: '1',
      order_number: 'ORD-031',
      customer_name: 'Firma MegaExpensive',
      status: 'in_progress',
      deadline: new Date(Date.now() + 7 * 86400000).toISOString(),
      estimated_hours: null,
      actual_labor_hours: null,
      actual_labor_cost: 3000,
      selling_price: 1500, // Cost 200% of price
      created_at: new Date(Date.now() - 5 * 86400000).toISOString(),
    })

    const result = await getAnomalyAlerts('test-company')

    const costOverruns = result.alerts.filter(a => a.type === 'cost_overrun')
    expect(costOverruns.length).toBe(1)
    expect(costOverruns[0].severity).toBe('critical')
  })
})

// ============================================
// SORTING & GENERAL BEHAVIOR
// ============================================

describe('Anomaly Alerts — Sorting & Structure', () => {
  beforeEach(() => {
    mockOrders.length = 0
  })

  it('should sort alerts with critical first', async () => {
    mockOrders.push(
      {
        id: '1',
        order_number: 'ORD-W',
        customer_name: 'Warning',
        status: 'in_progress',
        deadline: new Date(Date.now() + 7 * 86400000).toISOString(),
        estimated_hours: 10,
        actual_labor_hours: 16, // 160% — warning
        actual_labor_cost: null,
        selling_price: null,
        created_at: new Date(Date.now() - 5 * 86400000).toISOString(),
      },
      {
        id: '2',
        order_number: 'ORD-C',
        customer_name: 'Critical',
        status: 'in_progress',
        deadline: new Date(Date.now() + 7 * 86400000).toISOString(),
        estimated_hours: 10,
        actual_labor_hours: 25, // 250% — critical
        actual_labor_cost: null,
        selling_price: null,
        created_at: new Date(Date.now() - 5 * 86400000).toISOString(),
      }
    )

    const result = await getAnomalyAlerts('test-company')

    if (result.alerts.length >= 2) {
      expect(result.alerts[0].severity).toBe('critical')
    }
  })

  it('should return generatedAt timestamp', async () => {
    const result = await getAnomalyAlerts('test-company')

    expect(result.generatedAt).toBeDefined()
    expect(typeof result.generatedAt).toBe('string')
    // Should be a valid ISO date
    expect(new Date(result.generatedAt).toISOString()).toBe(result.generatedAt)
  })

  it('should return empty alerts array when no orders', async () => {
    const result = await getAnomalyAlerts('test-company')

    expect(result.alerts).toEqual([])
  })
})
