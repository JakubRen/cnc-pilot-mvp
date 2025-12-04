import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useOrderFiltering } from '@/hooks/useOrderFiltering'

// ============================================
// TEST DATA
// ============================================

const createMockOrder = (overrides = {}) => ({
  id: crypto.randomUUID(),
  order_number: 'ORD-001',
  customer_name: 'Firma ABC',
  part_name: 'Tuleja',
  deadline: '2024-01-20',
  status: 'pending',
  total_cost: 1000,
  created_at: '2024-01-10T10:00:00Z',
  tags: [],
  ...overrides,
})

const defaultFilters = {
  status: 'all',
  deadline: 'all',
  search: '',
  sortBy: 'deadline',
}

// ============================================
// STATUS FILTERING
// ============================================
describe('useOrderFiltering - status filtering', () => {
  const orders = [
    createMockOrder({ id: '1', order_number: 'ORD-001', status: 'pending' }),
    createMockOrder({ id: '2', order_number: 'ORD-002', status: 'in_progress' }),
    createMockOrder({ id: '3', order_number: 'ORD-003', status: 'completed' }),
    createMockOrder({ id: '4', order_number: 'ORD-004', status: 'pending' }),
    createMockOrder({ id: '5', order_number: 'ORD-005', status: 'delayed' }),
  ]

  it('should return all orders when status is "all"', () => {
    const { result } = renderHook(() =>
      useOrderFiltering(orders, { ...defaultFilters, status: 'all' }, [], 'OR')
    )
    expect(result.current).toHaveLength(5)
  })

  it('should filter by pending status', () => {
    const { result } = renderHook(() =>
      useOrderFiltering(orders, { ...defaultFilters, status: 'pending' }, [], 'OR')
    )
    expect(result.current).toHaveLength(2)
    expect(result.current.every(o => o.status === 'pending')).toBe(true)
  })

  it('should filter by in_progress status', () => {
    const { result } = renderHook(() =>
      useOrderFiltering(orders, { ...defaultFilters, status: 'in_progress' }, [], 'OR')
    )
    expect(result.current).toHaveLength(1)
    expect(result.current[0].order_number).toBe('ORD-002')
  })

  it('should filter by completed status', () => {
    const { result } = renderHook(() =>
      useOrderFiltering(orders, { ...defaultFilters, status: 'completed' }, [], 'OR')
    )
    expect(result.current).toHaveLength(1)
    expect(result.current[0].order_number).toBe('ORD-003')
  })

  it('should return empty array when no orders match status', () => {
    const { result } = renderHook(() =>
      useOrderFiltering(orders, { ...defaultFilters, status: 'cancelled' }, [], 'OR')
    )
    expect(result.current).toHaveLength(0)
  })
})

// ============================================
// DEADLINE FILTERING
// ============================================
describe('useOrderFiltering - deadline filtering', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    // Set current date to 2024-01-15 (Monday)
    vi.setSystemTime(new Date('2024-01-15T12:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  const orders = [
    createMockOrder({ id: '1', order_number: 'ORD-OVERDUE', deadline: '2024-01-10', status: 'in_progress' }), // 5 days ago
    createMockOrder({ id: '2', order_number: 'ORD-TODAY', deadline: '2024-01-15', status: 'pending' }),       // today
    createMockOrder({ id: '3', order_number: 'ORD-URGENT', deadline: '2024-01-17', status: 'pending' }),      // 2 days (urgent)
    createMockOrder({ id: '4', order_number: 'ORD-WEEK', deadline: '2024-01-20', status: 'pending' }),        // 5 days (this week)
    createMockOrder({ id: '5', order_number: 'ORD-MONTH', deadline: '2024-01-28', status: 'pending' }),       // this month
    createMockOrder({ id: '6', order_number: 'ORD-NEXT', deadline: '2024-02-15', status: 'pending' }),        // next month
    createMockOrder({ id: '7', order_number: 'ORD-COMPLETED', deadline: '2024-01-10', status: 'completed' }), // overdue but completed
  ]

  it('should return all orders when deadline is "all"', () => {
    const { result } = renderHook(() =>
      useOrderFiltering(orders, { ...defaultFilters, deadline: 'all' }, [], 'OR')
    )
    expect(result.current).toHaveLength(7)
  })

  it('should filter overdue orders (past deadline, not completed/cancelled)', () => {
    const { result } = renderHook(() =>
      useOrderFiltering(orders, { ...defaultFilters, deadline: 'overdue' }, [], 'OR')
    )
    expect(result.current).toHaveLength(1)
    expect(result.current[0].order_number).toBe('ORD-OVERDUE')
  })

  it('should NOT include completed orders in overdue', () => {
    const { result } = renderHook(() =>
      useOrderFiltering(orders, { ...defaultFilters, deadline: 'overdue' }, [], 'OR')
    )
    const orderNumbers = result.current.map(o => o.order_number)
    expect(orderNumbers).not.toContain('ORD-COMPLETED')
  })

  it('should filter orders due today', () => {
    const { result } = renderHook(() =>
      useOrderFiltering(orders, { ...defaultFilters, deadline: 'today' }, [], 'OR')
    )
    expect(result.current).toHaveLength(1)
    expect(result.current[0].order_number).toBe('ORD-TODAY')
  })

  it('should filter urgent orders (within 3 days, not completed)', () => {
    const { result } = renderHook(() =>
      useOrderFiltering(orders, { ...defaultFilters, deadline: 'urgent' }, [], 'OR')
    )
    // Today (0 days), +2 days = urgent
    const orderNumbers = result.current.map(o => o.order_number)
    expect(orderNumbers).toContain('ORD-TODAY')
    expect(orderNumbers).toContain('ORD-URGENT')
    expect(orderNumbers).not.toContain('ORD-WEEK') // 5 days out
  })

  it('should filter orders due this week (next 7 days)', () => {
    const { result } = renderHook(() =>
      useOrderFiltering(orders, { ...defaultFilters, deadline: 'this_week' }, [], 'OR')
    )
    // Jan 15 + 7 days = Jan 22, so Jan 15, 17, 20 are included
    const orderNumbers = result.current.map(o => o.order_number)
    expect(orderNumbers).toContain('ORD-TODAY')
    expect(orderNumbers).toContain('ORD-URGENT')
    expect(orderNumbers).toContain('ORD-WEEK')
    expect(orderNumbers).not.toContain('ORD-MONTH') // Jan 28 is outside
  })

  it('should filter orders due this month', () => {
    const { result } = renderHook(() =>
      useOrderFiltering(orders, { ...defaultFilters, deadline: 'this_month' }, [], 'OR')
    )
    const orderNumbers = result.current.map(o => o.order_number)
    expect(orderNumbers).toContain('ORD-TODAY')
    expect(orderNumbers).toContain('ORD-MONTH') // Jan 28
    expect(orderNumbers).not.toContain('ORD-NEXT') // Feb 15
    expect(orderNumbers).not.toContain('ORD-OVERDUE') // Past
  })

  it('should filter orders due next month', () => {
    const { result } = renderHook(() =>
      useOrderFiltering(orders, { ...defaultFilters, deadline: 'next_month' }, [], 'OR')
    )
    expect(result.current).toHaveLength(1)
    expect(result.current[0].order_number).toBe('ORD-NEXT')
  })
})

// ============================================
// SEARCH FILTERING
// ============================================
describe('useOrderFiltering - search', () => {
  const orders = [
    createMockOrder({ id: '1', order_number: 'ORD-001', customer_name: 'Firma ABC', part_name: 'Tuleja' }),
    createMockOrder({ id: '2', order_number: 'ORD-002', customer_name: 'Metal Tech', part_name: 'Wałek' }),
    createMockOrder({ id: '3', order_number: 'ORD-003', customer_name: 'Firma ABC', part_name: 'Korpus' }),
    createMockOrder({ id: '4', order_number: 'ZAM-100', customer_name: 'CNC Solutions', part_name: null }),
  ]

  it('should return all orders when search is empty', () => {
    const { result } = renderHook(() =>
      useOrderFiltering(orders, { ...defaultFilters, search: '' }, [], 'OR')
    )
    expect(result.current).toHaveLength(4)
  })

  it('should search by order number', () => {
    const { result } = renderHook(() =>
      useOrderFiltering(orders, { ...defaultFilters, search: 'ORD-001' }, [], 'OR')
    )
    expect(result.current).toHaveLength(1)
    expect(result.current[0].order_number).toBe('ORD-001')
  })

  it('should search by partial order number', () => {
    const { result } = renderHook(() =>
      useOrderFiltering(orders, { ...defaultFilters, search: 'ORD' }, [], 'OR')
    )
    expect(result.current).toHaveLength(3) // ORD-001, ORD-002, ORD-003
  })

  it('should search by customer name', () => {
    const { result } = renderHook(() =>
      useOrderFiltering(orders, { ...defaultFilters, search: 'Firma ABC' }, [], 'OR')
    )
    expect(result.current).toHaveLength(2)
  })

  it('should search by part name', () => {
    const { result } = renderHook(() =>
      useOrderFiltering(orders, { ...defaultFilters, search: 'Tuleja' }, [], 'OR')
    )
    expect(result.current).toHaveLength(1)
    expect(result.current[0].part_name).toBe('Tuleja')
  })

  it('should be case insensitive', () => {
    const { result } = renderHook(() =>
      useOrderFiltering(orders, { ...defaultFilters, search: 'firma abc' }, [], 'OR')
    )
    expect(result.current).toHaveLength(2)
  })

  it('should handle null part_name gracefully', () => {
    const { result } = renderHook(() =>
      useOrderFiltering(orders, { ...defaultFilters, search: 'CNC' }, [], 'OR')
    )
    expect(result.current).toHaveLength(1)
    expect(result.current[0].customer_name).toBe('CNC Solutions')
  })

  it('should return empty when no match found', () => {
    const { result } = renderHook(() =>
      useOrderFiltering(orders, { ...defaultFilters, search: 'nieistniejacy' }, [], 'OR')
    )
    expect(result.current).toHaveLength(0)
  })
})

// ============================================
// TAG FILTERING
// ============================================
describe('useOrderFiltering - tag filtering', () => {
  const orders = [
    createMockOrder({
      id: '1',
      order_number: 'ORD-001',
      tags: [{ id: 'tag1', name: 'Pilne' }, { id: 'tag2', name: 'VIP' }]
    }),
    createMockOrder({
      id: '2',
      order_number: 'ORD-002',
      tags: [{ id: 'tag1', name: 'Pilne' }]
    }),
    createMockOrder({
      id: '3',
      order_number: 'ORD-003',
      tags: [{ id: 'tag2', name: 'VIP' }]
    }),
    createMockOrder({
      id: '4',
      order_number: 'ORD-004',
      tags: []
    }),
  ]

  it('should return all orders when no tags selected', () => {
    const { result } = renderHook(() =>
      useOrderFiltering(orders, defaultFilters, [], 'OR')
    )
    expect(result.current).toHaveLength(4)
  })

  it('should filter by single tag', () => {
    const { result } = renderHook(() =>
      useOrderFiltering(orders, defaultFilters, ['tag1'], 'OR')
    )
    expect(result.current).toHaveLength(2)
    const orderNumbers = result.current.map(o => o.order_number)
    expect(orderNumbers).toContain('ORD-001')
    expect(orderNumbers).toContain('ORD-002')
  })

  it('should filter by multiple tags with OR logic', () => {
    const { result } = renderHook(() =>
      useOrderFiltering(orders, defaultFilters, ['tag1', 'tag2'], 'OR')
    )
    // Orders with tag1 OR tag2
    expect(result.current).toHaveLength(3)
    const orderNumbers = result.current.map(o => o.order_number)
    expect(orderNumbers).toContain('ORD-001') // has both
    expect(orderNumbers).toContain('ORD-002') // has tag1
    expect(orderNumbers).toContain('ORD-003') // has tag2
  })

  it('should filter by multiple tags with AND logic', () => {
    const { result } = renderHook(() =>
      useOrderFiltering(orders, defaultFilters, ['tag1', 'tag2'], 'AND')
    )
    // Only orders with BOTH tag1 AND tag2
    expect(result.current).toHaveLength(1)
    expect(result.current[0].order_number).toBe('ORD-001')
  })

  it('should return empty when AND logic cannot be satisfied', () => {
    const { result } = renderHook(() =>
      useOrderFiltering(orders, defaultFilters, ['tag1', 'tag2', 'tag3'], 'AND')
    )
    expect(result.current).toHaveLength(0)
  })

  it('should handle orders with no tags', () => {
    const { result } = renderHook(() =>
      useOrderFiltering(orders, defaultFilters, ['tag1'], 'OR')
    )
    const orderNumbers = result.current.map(o => o.order_number)
    expect(orderNumbers).not.toContain('ORD-004') // no tags
  })
})

// ============================================
// SORTING
// ============================================
describe('useOrderFiltering - sorting', () => {
  const orders = [
    createMockOrder({
      id: '1',
      order_number: 'ORD-001',
      deadline: '2024-01-20',
      total_cost: 500,
      created_at: '2024-01-10T10:00:00Z'
    }),
    createMockOrder({
      id: '2',
      order_number: 'ORD-002',
      deadline: '2024-01-15',
      total_cost: 2000,
      created_at: '2024-01-12T10:00:00Z'
    }),
    createMockOrder({
      id: '3',
      order_number: 'ORD-003',
      deadline: '2024-01-25',
      total_cost: 1000,
      created_at: '2024-01-08T10:00:00Z'
    }),
  ]

  it('should sort by deadline ascending (default)', () => {
    const { result } = renderHook(() =>
      useOrderFiltering(orders, { ...defaultFilters, sortBy: 'deadline' }, [], 'OR')
    )
    expect(result.current[0].order_number).toBe('ORD-002') // Jan 15
    expect(result.current[1].order_number).toBe('ORD-001') // Jan 20
    expect(result.current[2].order_number).toBe('ORD-003') // Jan 25
  })

  it('should sort by cost descending', () => {
    const { result } = renderHook(() =>
      useOrderFiltering(orders, { ...defaultFilters, sortBy: 'cost_desc' }, [], 'OR')
    )
    expect(result.current[0].total_cost).toBe(2000)
    expect(result.current[1].total_cost).toBe(1000)
    expect(result.current[2].total_cost).toBe(500)
  })

  it('should sort by cost ascending', () => {
    const { result } = renderHook(() =>
      useOrderFiltering(orders, { ...defaultFilters, sortBy: 'cost_asc' }, [], 'OR')
    )
    expect(result.current[0].total_cost).toBe(500)
    expect(result.current[1].total_cost).toBe(1000)
    expect(result.current[2].total_cost).toBe(2000)
  })

  it('should sort by created date descending', () => {
    const { result } = renderHook(() =>
      useOrderFiltering(orders, { ...defaultFilters, sortBy: 'created_desc' }, [], 'OR')
    )
    expect(result.current[0].order_number).toBe('ORD-002') // Jan 12
    expect(result.current[1].order_number).toBe('ORD-001') // Jan 10
    expect(result.current[2].order_number).toBe('ORD-003') // Jan 8
  })

  it('should sort by created date ascending', () => {
    const { result } = renderHook(() =>
      useOrderFiltering(orders, { ...defaultFilters, sortBy: 'created_asc' }, [], 'OR')
    )
    expect(result.current[0].order_number).toBe('ORD-003') // Jan 8
    expect(result.current[1].order_number).toBe('ORD-001') // Jan 10
    expect(result.current[2].order_number).toBe('ORD-002') // Jan 12
  })

  it('should handle null total_cost in sorting', () => {
    const ordersWithNull = [
      createMockOrder({ id: '1', total_cost: 1000 }),
      createMockOrder({ id: '2', total_cost: null }),
      createMockOrder({ id: '3', total_cost: 500 }),
    ]

    const { result } = renderHook(() =>
      useOrderFiltering(ordersWithNull, { ...defaultFilters, sortBy: 'cost_desc' }, [], 'OR')
    )

    // null should be treated as 0
    expect(result.current[0].total_cost).toBe(1000)
    expect(result.current[1].total_cost).toBe(500)
    expect(result.current[2].total_cost).toBeNull()
  })
})

// ============================================
// COMBINED FILTERS
// ============================================
describe('useOrderFiltering - combined filters', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-01-15T12:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  const orders = [
    createMockOrder({
      id: '1',
      order_number: 'ORD-001',
      customer_name: 'Firma ABC',
      status: 'pending',
      deadline: '2024-01-17', // urgent
      tags: [{ id: 'tag1', name: 'Pilne' }]
    }),
    createMockOrder({
      id: '2',
      order_number: 'ORD-002',
      customer_name: 'Firma ABC',
      status: 'in_progress',
      deadline: '2024-01-20',
      tags: [{ id: 'tag1', name: 'Pilne' }]
    }),
    createMockOrder({
      id: '3',
      order_number: 'ORD-003',
      customer_name: 'Metal Tech',
      status: 'pending',
      deadline: '2024-01-17', // urgent
      tags: []
    }),
  ]

  it('should combine status + search filters', () => {
    const { result } = renderHook(() =>
      useOrderFiltering(
        orders,
        { ...defaultFilters, status: 'pending', search: 'ABC' },
        [],
        'OR'
      )
    )
    expect(result.current).toHaveLength(1)
    expect(result.current[0].order_number).toBe('ORD-001')
  })

  it('should combine status + deadline + tags', () => {
    const { result } = renderHook(() =>
      useOrderFiltering(
        orders,
        { ...defaultFilters, status: 'pending', deadline: 'urgent' },
        ['tag1'],
        'OR'
      )
    )
    expect(result.current).toHaveLength(1)
    expect(result.current[0].order_number).toBe('ORD-001')
  })

  it('should return empty when filters are too restrictive', () => {
    const { result } = renderHook(() =>
      useOrderFiltering(
        orders,
        { ...defaultFilters, status: 'completed', search: 'ABC' },
        ['tag1'],
        'AND'
      )
    )
    expect(result.current).toHaveLength(0)
  })
})

// ============================================
// EDGE CASES
// ============================================
describe('useOrderFiltering - edge cases', () => {
  it('should handle empty orders array', () => {
    const { result } = renderHook(() =>
      useOrderFiltering([], defaultFilters, [], 'OR')
    )
    expect(result.current).toHaveLength(0)
  })

  it('should handle undefined tags array', () => {
    const ordersWithUndefinedTags = [
      { ...createMockOrder({ id: '1' }), tags: undefined },
    ]

    const { result } = renderHook(() =>
      useOrderFiltering(ordersWithUndefinedTags as any, defaultFilters, ['tag1'], 'OR')
    )
    expect(result.current).toHaveLength(0)
  })

  it('should preserve order type (generic)', () => {
    interface ExtendedOrder {
      id: string
      order_number: string
      customer_name: string
      part_name: string
      deadline: string
      status: string
      customField: string
    }

    const extendedOrders: ExtendedOrder[] = [
      {
        id: '1',
        order_number: 'ORD-001',
        customer_name: 'Test',
        part_name: 'Part',
        deadline: '2024-01-20',
        status: 'pending',
        customField: 'custom value',
      },
    ]

    const { result } = renderHook(() =>
      useOrderFiltering(extendedOrders, defaultFilters, [], 'OR')
    )

    expect(result.current[0].customField).toBe('custom value')
  })
})
