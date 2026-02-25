/**
 * Unit Tests for Embeddings Service
 *
 * Tests:
 * - generateEmbedding() — Google API call, error handling
 * - searchSimilar() — Supabase RPC call with params
 *
 * CONTRACT: lib/ai/embeddings.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}))

// ============================================
// generateEmbedding tests
// ============================================

describe('generateEmbedding', () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.resetModules()
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = originalEnv
    vi.restoreAllMocks()
  })

  it('should return number[] on success', async () => {
    process.env.GOOGLE_GENERATIVE_AI_API_KEY = 'test-key'

    const mockEmbedding = Array.from({ length: 768 }, (_, i) => i * 0.001)

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        embedding: { values: mockEmbedding },
      }),
    })

    const { generateEmbedding } = await import('@/lib/ai/embeddings')
    const result = await generateEmbedding('test text')

    expect(result).toEqual(mockEmbedding)
    expect(result).toHaveLength(768)
  })

  it('should return null when no API key', async () => {
    delete process.env.GOOGLE_GENERATIVE_AI_API_KEY

    const { generateEmbedding } = await import('@/lib/ai/embeddings')
    const result = await generateEmbedding('test text')

    expect(result).toBeNull()
  })

  it('should return null on API error', async () => {
    process.env.GOOGLE_GENERATIVE_AI_API_KEY = 'test-key'

    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
    })

    const { generateEmbedding } = await import('@/lib/ai/embeddings')
    const result = await generateEmbedding('test text')

    expect(result).toBeNull()
  })

  it('should call correct Google embedding API endpoint', async () => {
    process.env.GOOGLE_GENERATIVE_AI_API_KEY = 'test-key-123'

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        embedding: { values: [0.1, 0.2, 0.3] },
      }),
    })

    const { generateEmbedding } = await import('@/lib/ai/embeddings')
    await generateEmbedding('hello')

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('text-embedding-004'),
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
    )

    // Verify API key is in URL
    const callUrl = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string
    expect(callUrl).toContain('key=test-key-123')
  })

  it('should return null on network error', async () => {
    process.env.GOOGLE_GENERATIVE_AI_API_KEY = 'test-key'

    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'))

    const { generateEmbedding } = await import('@/lib/ai/embeddings')
    const result = await generateEmbedding('test text')

    expect(result).toBeNull()
  })
})

// ============================================
// searchSimilar tests
// ============================================

describe('searchSimilar', () => {
  beforeEach(() => {
    vi.resetModules()
    process.env.GOOGLE_GENERATIVE_AI_API_KEY = 'test-key'
  })

  it('should call Supabase RPC with correct params', async () => {
    const mockRpc = vi.fn().mockResolvedValue({
      data: [
        {
          id: 'emb-1',
          source_type: 'product',
          source_id: 'prod-1',
          content_text: 'Tuleja aluminiowa',
          content_summary: 'Tuleja (SKU-001)',
          metadata: {},
          similarity: 0.85,
        },
      ],
      error: null,
    })

    // Mock fetch for generateEmbedding
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        embedding: { values: Array(768).fill(0.1) },
      }),
    })

    vi.doMock('@/lib/supabase-server', () => ({
      createClient: vi.fn().mockResolvedValue({
        rpc: mockRpc,
      }),
    }))

    const { searchSimilar } = await import('@/lib/ai/embeddings')
    const results = await searchSimilar({
      companyId: 'company-123',
      query: 'tuleja',
      threshold: 0.7,
      limit: 5,
    })

    expect(results).toHaveLength(1)
    expect(results[0].source_type).toBe('product')
    expect(results[0].similarity).toBe(0.85)

    expect(mockRpc).toHaveBeenCalledWith('match_embeddings', {
      query_embedding: expect.any(String),
      match_company_id: 'company-123',
      match_threshold: 0.7,
      match_count: 5,
      filter_source_type: null,
    })
  })

  it('should return empty array on RPC error', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        embedding: { values: Array(768).fill(0.1) },
      }),
    })

    vi.doMock('@/lib/supabase-server', () => ({
      createClient: vi.fn().mockResolvedValue({
        rpc: vi.fn().mockResolvedValue({ data: null, error: { message: 'RPC error' } }),
      }),
    }))

    const { searchSimilar } = await import('@/lib/ai/embeddings')
    const results = await searchSimilar({
      companyId: 'company-123',
      query: 'test',
    })

    expect(results).toEqual([])
  })

  it('should use default threshold and limit', async () => {
    const mockRpc = vi.fn().mockResolvedValue({ data: [], error: null })

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        embedding: { values: Array(768).fill(0.1) },
      }),
    })

    vi.doMock('@/lib/supabase-server', () => ({
      createClient: vi.fn().mockResolvedValue({ rpc: mockRpc }),
    }))

    const { searchSimilar } = await import('@/lib/ai/embeddings')
    await searchSimilar({ companyId: 'company-123', query: 'test' })

    expect(mockRpc).toHaveBeenCalledWith('match_embeddings', expect.objectContaining({
      match_threshold: 0.7,
      match_count: 5,
    }))
  })

  it('should pass sourceType filter when provided', async () => {
    const mockRpc = vi.fn().mockResolvedValue({ data: [], error: null })

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        embedding: { values: Array(768).fill(0.1) },
      }),
    })

    vi.doMock('@/lib/supabase-server', () => ({
      createClient: vi.fn().mockResolvedValue({ rpc: mockRpc }),
    }))

    const { searchSimilar } = await import('@/lib/ai/embeddings')
    await searchSimilar({
      companyId: 'company-123',
      query: 'test',
      sourceType: 'product',
    })

    expect(mockRpc).toHaveBeenCalledWith('match_embeddings', expect.objectContaining({
      filter_source_type: 'product',
    }))
  })
})
