/**
 * Unit Tests for CNC Copilot Tools & System Prompt
 *
 * Tests:
 * - buildSystemPrompt() — page context, RAG context, Polish language
 * - searchOrders() — Supabase query building with filters
 * - searchInventory() — product search with available_quantity calculation
 *
 * CONTRACT: lib/ai/copilot/system-prompt.ts, lib/ai/copilot/tools.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}))

// Supabase query builder mock — thenable (supports `await q`)
let resolveData: unknown = []

function createChainMock() {
  const chain: Record<string, ReturnType<typeof vi.fn>> & { then?: unknown } = {
    select: vi.fn(),
    eq: vi.fn(),
    ilike: vi.fn(),
    or: vi.fn(),
    gte: vi.fn(),
    lte: vi.fn(),
    order: vi.fn(),
    limit: vi.fn(),
  }
  // Every method returns the chain itself
  for (const fn of Object.values(chain)) {
    (fn as ReturnType<typeof vi.fn>).mockReturnValue(chain)
  }
  // Make chain thenable so `await q` resolves to { data, error }
  chain.then = (resolve: (v: unknown) => void) => {
    return Promise.resolve({ data: resolveData, error: null }).then(resolve)
  }
  return chain
}

let mockChain = createChainMock()
const mockFrom = vi.fn().mockReturnValue(mockChain)

vi.mock('@/lib/supabase-server', () => ({
  createClient: vi.fn().mockResolvedValue({
    from: (...args: unknown[]) => mockFrom(...args),
  }),
}))

// ============================================
// buildSystemPrompt tests
// ============================================

describe('buildSystemPrompt', () => {
  let buildSystemPrompt: typeof import('@/lib/ai/copilot/system-prompt').buildSystemPrompt

  beforeEach(async () => {
    const mod = await import('@/lib/ai/copilot/system-prompt')
    buildSystemPrompt = mod.buildSystemPrompt
  })

  it('should return text in Polish', () => {
    const result = buildSystemPrompt({ currentPage: '/' })
    expect(result).toContain('CNC Copilot')
    expect(result).toContain('po polsku')
  })

  it('should include page context for /orders', () => {
    const result = buildSystemPrompt({ currentPage: '/orders' })
    expect(result).toMatch(/zamówi|order/i)
  })

  it('should include page context for /inventory', () => {
    const result = buildSystemPrompt({ currentPage: '/inventory' })
    expect(result).toMatch(/magazyn|inventory|produkt/i)
  })

  it('should include page context for /customers', () => {
    const result = buildSystemPrompt({ currentPage: '/customers' })
    expect(result).toMatch(/klient|customer/i)
  })

  it('should include RAG context when provided', () => {
    const ragContext = '[product] Tuleja aluminiowa SKU-123'
    const result = buildSystemPrompt({ currentPage: '/' }, ragContext)
    expect(result).toContain('Tuleja aluminiowa SKU-123')
  })

  it('should NOT include RAG section when ragContext is empty', () => {
    const result = buildSystemPrompt({ currentPage: '/' }, '')
    expect(result).not.toContain('BAZY WIEDZY')
  })

  it('should list all 6 tool capabilities', () => {
    const result = buildSystemPrompt({ currentPage: '/' })
    expect(result).toContain('search_orders')
    expect(result).toContain('search_inventory')
    expect(result).toContain('get_customer')
    expect(result).toContain('check_deadlines')
    expect(result).toContain('generate_quote')
    expect(result).toContain('get_production_plan')
  })
})

// ============================================
// searchOrders tests
// ============================================

describe('searchOrders', () => {
  let searchOrders: typeof import('@/lib/ai/copilot/tools').searchOrders

  beforeEach(async () => {
    resolveData = []
    mockChain = createChainMock()
    mockFrom.mockReturnValue(mockChain)
    const mod = await import('@/lib/ai/copilot/tools')
    searchOrders = mod.searchOrders
  })

  it('should filter by company_id', async () => {
    await searchOrders('company-123', {})
    expect(mockChain.eq).toHaveBeenCalledWith('company_id', 'company-123')
  })

  it('should apply status filter when provided', async () => {
    await searchOrders('company-123', { status: 'delayed' })
    expect(mockChain.eq).toHaveBeenCalledWith('status', 'delayed')
  })

  it('should apply customer_name ilike filter', async () => {
    await searchOrders('company-123', { customer_name: 'ABC' })
    expect(mockChain.ilike).toHaveBeenCalledWith('customer_name', '%ABC%')
  })

  it('should apply date_from filter', async () => {
    await searchOrders('company-123', { date_from: '2026-01-01' })
    expect(mockChain.gte).toHaveBeenCalledWith('created_at', '2026-01-01')
  })

  it('should apply date_to filter', async () => {
    await searchOrders('company-123', { date_to: '2026-12-31' })
    expect(mockChain.lte).toHaveBeenCalledWith('created_at', '2026-12-31')
  })

  it('should limit results with default 10', async () => {
    await searchOrders('company-123', {})
    expect(mockChain.limit).toHaveBeenCalledWith(10)
  })

  it('should use custom limit when provided', async () => {
    await searchOrders('company-123', { limit: 5 })
    expect(mockChain.limit).toHaveBeenCalledWith(5)
  })
})

// ============================================
// searchInventory tests
// ============================================

describe('searchInventory', () => {
  let searchInventory: typeof import('@/lib/ai/copilot/tools').searchInventory

  beforeEach(async () => {
    const mod = await import('@/lib/ai/copilot/tools')
    searchInventory = mod.searchInventory
  })

  it('should search products by name/sku/description', async () => {
    resolveData = [
      {
        id: 'prod-1',
        name: 'Tuleja aluminiowa',
        sku: 'SKU-001',
        category: 'raw_material',
        unit: 'szt',
        description: 'Tuleja z aluminium 6061',
        inventory_locations: [
          { available_quantity: 10 },
          { available_quantity: 5 },
        ],
      },
    ]
    mockChain = createChainMock()
    mockFrom.mockReturnValue(mockChain)

    const results = await searchInventory('company-123', { query: 'aluminium' })

    expect(results).toHaveLength(1)
    expect(results[0].name).toBe('Tuleja aluminiowa')
    expect(results[0].available_quantity).toBe(15) // 10 + 5
  })
})
