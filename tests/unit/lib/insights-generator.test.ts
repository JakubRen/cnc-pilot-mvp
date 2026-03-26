import { describe, it, expect, vi, beforeEach } from 'vitest'

// ============================================
// Mock dependencies
// ============================================
const { mockSupabaseSingle, mockSupabaseSelect } = vi.hoisted(() => {
  const mockSupabaseSingle = vi.fn()
  const mockSupabaseSelect = vi.fn()
  return { mockSupabaseSingle, mockSupabaseSelect }
})

vi.mock('@/lib/supabase-server', () => {
  return {
    createClient: vi.fn().mockResolvedValue({
      from: vi.fn().mockReturnValue({
        select: mockSupabaseSelect.mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: mockSupabaseSingle,
          }),
        }),
      }),
    }),
  }
})

vi.mock('@/lib/ai/gemini-client', () => ({
  callGemini: vi.fn().mockResolvedValue(null),
}))

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}))

import { getOrGenerateInsights } from '@/lib/ai/insights-generator'

// ============================================
// getOrGenerateInsights — cache reading
// ============================================
describe('getOrGenerateInsights', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return cached insights when available and not stale', async () => {
    const futureDate = new Date()
    futureDate.setHours(futureDate.getHours() + 3)

    mockSupabaseSingle.mockResolvedValueOnce({
      data: {
        insights: [
          {
            type: 'revenue_trend',
            severity: 'positive',
            icon: '📈',
            title: 'Przychód wzrósł o 15%',
            description: 'Dobry tydzień!',
          },
        ],
        generated_at: new Date().toISOString(),
        expires_at: futureDate.toISOString(),
        model: 'gemini-2.5-flash',
      },
      error: null,
    })

    const result = await getOrGenerateInsights('company-123')
    expect(result.insights).toHaveLength(1)
    expect(result.insights[0].type).toBe('revenue_trend')
    expect(result.isStale).toBe(false)
    expect(result.model).toBe('gemini-2.5-flash')
  })

  it('should flag stale when cache has expired', async () => {
    const pastDate = new Date()
    pastDate.setHours(pastDate.getHours() - 1)

    mockSupabaseSingle.mockResolvedValueOnce({
      data: {
        insights: [{ type: 'deadline_risk', severity: 'warning', icon: '⏰', title: 'Test', description: 'Desc' }],
        generated_at: new Date(Date.now() - 7 * 3600000).toISOString(),
        expires_at: pastDate.toISOString(),
        model: 'gemini-2.5-flash',
      },
      error: null,
    })

    const result = await getOrGenerateInsights('company-123')
    expect(result.isStale).toBe(true)
    expect(result.insights).toHaveLength(1)
  })

  it('should return empty insights with stale flag when no cache exists', async () => {
    mockSupabaseSingle.mockResolvedValueOnce({
      data: null,
      error: { code: 'PGRST116', message: 'not found' },
    })

    const result = await getOrGenerateInsights('company-123')
    expect(result.insights).toEqual([])
    expect(result.isStale).toBe(true)
    expect(result.generatedAt).toBeNull()
    expect(result.model).toBeNull()
  })

  it('should handle null insights in cached data', async () => {
    const futureDate = new Date()
    futureDate.setHours(futureDate.getHours() + 3)

    mockSupabaseSingle.mockResolvedValueOnce({
      data: {
        insights: null,
        generated_at: new Date().toISOString(),
        expires_at: futureDate.toISOString(),
        model: 'gemini-2.5-flash',
      },
      error: null,
    })

    const result = await getOrGenerateInsights('company-123')
    expect(result.insights).toEqual([])
  })
})
