import { describe, it, expect, vi, beforeEach } from 'vitest'

// ============================================
// Mock Supabase and logger
// ============================================
const { mockOrdersData, mockPlansData, mockOpsData } = vi.hoisted(() => {
  const mockOrdersData = vi.fn()
  const mockPlansData = vi.fn()
  const mockOpsData = vi.fn()
  return { mockOrdersData, mockPlansData, mockOpsData }
})

vi.mock('@/lib/supabase-server', () => {
  // Build a thenable chain: every method returns the chain, and
  // when awaited (or .then() called), it calls the terminal function.
  const buildChain = (terminalFn: ReturnType<typeof vi.fn>) => {
    const chain: Record<string, unknown> = {}
    // Make chain thenable — resolves via terminalFn
    chain.then = (resolve: (v: unknown) => void, reject?: (e: unknown) => void) =>
      terminalFn().then(resolve, reject)
    // All query builder methods return the same chain
    chain.select = vi.fn().mockReturnValue(chain)
    chain.eq = vi.fn().mockReturnValue(chain)
    chain.in = vi.fn().mockReturnValue(chain)
    chain.lte = vi.fn().mockReturnValue(chain)
    chain.neq = vi.fn().mockReturnValue(chain)
    chain.order = vi.fn().mockReturnValue(chain)
    return chain
  }

  return {
    createClient: vi.fn().mockResolvedValue({
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'orders') return buildChain(mockOrdersData)
        if (table === 'production_plans') return buildChain(mockPlansData)
        if (table === 'operations') return buildChain(mockOpsData)
        return buildChain(vi.fn().mockResolvedValue({ data: [], error: null }))
      }),
    }),
  }
})

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}))

import { getOrderCompletionLikelihoods } from '@/lib/ai/features/deadline-monitor'

describe('getOrderCompletionLikelihoods', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return empty array when no orders match', async () => {
    mockOrdersData.mockResolvedValueOnce({ data: [], error: null })

    const result = await getOrderCompletionLikelihoods('company-123', 7)
    expect(result).toEqual([])
  })

  it('should return empty array on Supabase error', async () => {
    mockOrdersData.mockResolvedValueOnce({ data: null, error: { message: 'DB error' } })

    const result = await getOrderCompletionLikelihoods('company-123', 7)
    expect(result).toEqual([])
  })

  it('should classify order without production plan as at_risk', async () => {
    const futureDeadline = new Date()
    futureDeadline.setDate(futureDeadline.getDate() + 5)

    mockOrdersData.mockResolvedValueOnce({
      data: [{
        id: 'order-1',
        order_number: 'ZAM-001',
        customer_name: 'Metalex',
        deadline: futureDeadline.toISOString().split('T')[0],
        status: 'in_progress',
      }],
      error: null,
    })

    // No production plans
    mockPlansData.mockResolvedValueOnce({ data: [], error: null })

    const result = await getOrderCompletionLikelihoods('company-123', 7)
    expect(result).toHaveLength(1)
    expect(result[0].risk).toBe('at_risk')
    expect(result[0].orderNumber).toBe('ZAM-001')
    expect(result[0].productionProgress).toBeNull()
  })

  it('should classify order with deadline tomorrow and no plan as critical', async () => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)

    mockOrdersData.mockResolvedValueOnce({
      data: [{
        id: 'order-2',
        order_number: 'ZAM-002',
        customer_name: 'Client B',
        deadline: tomorrow.toISOString().split('T')[0],
        status: 'pending',
      }],
      error: null,
    })

    mockPlansData.mockResolvedValueOnce({ data: [], error: null })

    const result = await getOrderCompletionLikelihoods('company-123', 7)
    expect(result).toHaveLength(1)
    expect(result[0].risk).toBe('critical')
    expect(result[0].completionLikelihood).toBeLessThanOrEqual(30)
  })

  it('should handle order with production progress', async () => {
    const futureDeadline = new Date()
    futureDeadline.setDate(futureDeadline.getDate() + 5)

    mockOrdersData.mockResolvedValueOnce({
      data: [{
        id: 'order-3',
        order_number: 'ZAM-003',
        customer_name: 'Client C',
        deadline: futureDeadline.toISOString().split('T')[0],
        status: 'in_progress',
      }],
      error: null,
    })

    // Has one production plan
    mockPlansData.mockResolvedValueOnce({
      data: [{ id: 'plan-1', status: 'active', quantity: 10 }],
      error: null,
    })

    // 3 operations: 2 completed, 1 pending
    mockOpsData.mockResolvedValueOnce({
      data: [
        { status: 'completed', setup_time_minutes: 30, run_time_per_unit_minutes: 5 },
        { status: 'completed', setup_time_minutes: 20, run_time_per_unit_minutes: 3 },
        { status: 'pending', setup_time_minutes: 15, run_time_per_unit_minutes: 2 },
      ],
      error: null,
    })

    const result = await getOrderCompletionLikelihoods('company-123', 7)
    expect(result).toHaveLength(1)
    expect(result[0].productionProgress).toBe(67) // 2/3 * 100 = 66.67 → 67
    expect(result[0].completionLikelihood).toBeGreaterThan(0)
    expect(result[0].statusSummary).toContain('2/3 operacji')
  })

  it('should sort results by risk: critical first, then at_risk, then on_track', async () => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const nextWeek = new Date()
    nextWeek.setDate(nextWeek.getDate() + 5)

    mockOrdersData.mockResolvedValueOnce({
      data: [
        {
          id: 'order-a',
          order_number: 'ZAM-A',
          customer_name: 'Client A',
          deadline: nextWeek.toISOString().split('T')[0],
          status: 'in_progress',
        },
        {
          id: 'order-b',
          order_number: 'ZAM-B',
          customer_name: 'Client B',
          deadline: tomorrow.toISOString().split('T')[0],
          status: 'pending',
        },
      ],
      error: null,
    })

    // Both have no plans
    mockPlansData
      .mockResolvedValueOnce({ data: [], error: null })
      .mockResolvedValueOnce({ data: [], error: null })

    const result = await getOrderCompletionLikelihoods('company-123', 7)
    expect(result).toHaveLength(2)
    // Critical (tomorrow deadline) should come first
    expect(result[0].orderNumber).toBe('ZAM-B')
    expect(result[0].risk).toBe('critical')
  })
})
