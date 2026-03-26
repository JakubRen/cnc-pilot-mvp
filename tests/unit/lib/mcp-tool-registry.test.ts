import { describe, it, expect, vi } from 'vitest'

// Mock copilot tools and report tools (they import Supabase)
// All mocked functions must return Promises since execute() expects async
vi.mock('@/lib/ai/copilot/tools', () => ({
  searchOrders: vi.fn().mockResolvedValue({}),
  searchInventory: vi.fn().mockResolvedValue({}),
  getCustomer: vi.fn().mockResolvedValue({}),
  checkDeadlines: vi.fn().mockResolvedValue({}),
  generateQuote: vi.fn().mockResolvedValue({}),
  getProductionPlan: vi.fn().mockResolvedValue({}),
  runDemandForecast: vi.fn().mockResolvedValue({}),
  runRevenueForecast: vi.fn().mockResolvedValue({}),
  checkAutoReorder: vi.fn().mockResolvedValue({}),
  runDynamicPricing: vi.fn().mockResolvedValue({}),
  checkCompletionRisks: vi.fn().mockResolvedValue({}),
  getWorkshopStatus: vi.fn().mockResolvedValue({}),
  generateQuotePdf: vi.fn().mockResolvedValue({}),
}))

vi.mock('@/lib/ai/copilot/report-tools', () => ({
  generateOrdersReport: vi.fn().mockResolvedValue({}),
  generateInventoryReport: vi.fn().mockResolvedValue({}),
  generateCostsReport: vi.fn().mockResolvedValue({}),
  generateCustomerReport: vi.fn().mockResolvedValue({}),
  generateDeadlinesReport: vi.fn().mockResolvedValue({}),
}))

// Mock PDF fetcher (used by generate_quote_pdf tool)
vi.mock('@/lib/pdf/fetch-quote', () => ({
  fetchQuotePdfData: vi.fn().mockResolvedValue({}),
}))

import { toolRegistry, getToolByName } from '@/lib/mcp/tool-registry'

// ============================================
// Tool Registry — structure
// ============================================
describe('toolRegistry', () => {
  it('should have exactly 18 tools', () => {
    expect(toolRegistry).toHaveLength(18)
  })

  it('should have all expected tool names', () => {
    const names = toolRegistry.map(t => t.name)
    expect(names).toEqual([
      // Core Tools (1-6)
      'search_orders',
      'search_inventory',
      'get_customer',
      'check_deadlines',
      'generate_quote',
      'get_production_plan',
      // Background Agent Tools (7-12)
      'run_demand_forecast',
      'run_revenue_forecast',
      'check_auto_reorder',
      'run_dynamic_pricing',
      'check_completion_risks',
      'get_workshop_status',
      // PDF Tool (13)
      'generate_quote_pdf',
      // Report Tools (14-18)
      'generate_orders_report',
      'generate_inventory_report',
      'generate_costs_report',
      'generate_customer_report',
      'generate_deadlines_report',
    ])
  })

  it('should have unique tool names (no duplicates)', () => {
    const names = toolRegistry.map(t => t.name)
    const uniqueNames = new Set(names)
    expect(uniqueNames.size).toBe(names.length)
  })

  it('each tool should have name, description, inputSchema, execute', () => {
    for (const tool of toolRegistry) {
      expect(typeof tool.name).toBe('string')
      expect(tool.name.length).toBeGreaterThan(0)

      expect(typeof tool.description).toBe('string')
      expect(tool.description.length).toBeGreaterThan(0)

      // inputSchema should be a Zod schema (has .parse, .safeParse, etc.)
      expect(tool.inputSchema).toBeDefined()
      expect(typeof tool.inputSchema.safeParse).toBe('function')
      expect(typeof tool.inputSchema.parse).toBe('function')

      expect(typeof tool.execute).toBe('function')
    }
  })

  it('each Zod schema should support toJSONSchema() conversion', async () => {
    // This is critical for MCP tools/list — it uses toJSONSchema()
    const { toJSONSchema } = await import('zod')
    for (const tool of toolRegistry) {
      const jsonSchema = toJSONSchema(tool.inputSchema)
      expect(jsonSchema).toBeDefined()
      expect(typeof jsonSchema).toBe('object')
      // All tool schemas are z.object() which should produce type: "object"
      expect(jsonSchema.type).toBe('object')
    }
  })
})

// ============================================
// getToolByName
// ============================================
describe('getToolByName', () => {
  it('should return the correct tool for a known name', () => {
    const tool = getToolByName('search_orders')
    expect(tool).toBeDefined()
    expect(tool!.name).toBe('search_orders')
    expect(tool!.description).toContain('zamówienia')
  })

  it('should return each tool correctly', () => {
    for (const t of toolRegistry) {
      const found = getToolByName(t.name)
      expect(found).toBeDefined()
      expect(found!.name).toBe(t.name)
    }
  })

  it('should return undefined for an unknown tool name', () => {
    const tool = getToolByName('non_existent_tool')
    expect(tool).toBeUndefined()
  })

  it('should return undefined for empty string', () => {
    const tool = getToolByName('')
    expect(tool).toBeUndefined()
  })

  it('should be case-sensitive', () => {
    const tool = getToolByName('Search_Orders')
    expect(tool).toBeUndefined()
  })
})

// ============================================
// Tool execute functions are callable
// ============================================
describe('tool execute functions', () => {
  it('each tool execute should be an async function', () => {
    for (const tool of toolRegistry) {
      // Call with dummy args — the underlying functions are mocked
      const result = tool.execute('test-company-id', {})
      // Should return a Promise (async function)
      expect(result).toBeInstanceOf(Promise)
    }
  })
})
