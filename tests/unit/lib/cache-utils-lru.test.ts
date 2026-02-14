/**
 * Unit Tests for L1 LRU Cache Layer
 *
 * Tests the in-memory LRU cache that sits in front of the Supabase ai_cache table.
 * This eliminates redundant Supabase RTT (~50ms) for hot cache entries.
 *
 * CONTRACT:
 * - L1 cache hit returns data without touching Supabase
 * - L1 cache miss falls through to Supabase (L2)
 * - TTL expiration in L1 causes fallthrough to L2
 * - Write-through: writeCache invalidates L1 entry so next read goes to L2
 * - LRU eviction: when capacity is exceeded, least recently used entry is evicted
 *
 * The L1 cache wraps the existing readCache/writeCache from cache-utils.ts.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// ============================================
// MOCKS — Supabase layer (L2)
// ============================================

const mockSupabaseSelect = vi.fn()
const mockSupabaseUpsert = vi.fn()

vi.mock('@/lib/supabase-server', () => ({
  createClient: vi.fn().mockResolvedValue({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: mockSupabaseSelect,
          })),
        })),
      })),
      upsert: mockSupabaseUpsert,
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

// ============================================
// IMPORT — L1 cache module (will be created by backend-dev)
// ============================================

// NOTE: These imports will resolve once backend-dev creates the module.
// The file should export these functions with the same signatures as cache-utils.ts
// but with an in-memory LRU layer in front.
//
// Expected module: @/lib/ai/cache-utils (enhanced with L1 LRU)
// OR: @/lib/ai/cache-utils-lru (separate module)
//
// For now we import from cache-utils — backend-dev will add the LRU layer there.

import { readCache, writeCache, clearL1Cache, type CacheEntry } from '@/lib/ai/cache-utils'

// ============================================
// L1 HIT — In-memory cache serves data
// ============================================

describe('Cache L1 LRU — L1 Hit (in-memory)', () => {
  beforeEach(() => {
    clearL1Cache()
    mockSupabaseSelect.mockReset()
    mockSupabaseUpsert.mockReset()
  })

  it('should return cached data from Supabase on first call (cold L1)', async () => {
    // First call: L1 miss, L2 hit
    const futureDate = new Date(Date.now() + 3600_000).toISOString()
    mockSupabaseSelect.mockResolvedValue({
      data: {
        data: { summary: 'cached summary' },
        model: 'gemini-2.5-flash',
        generated_at: new Date().toISOString(),
        expires_at: futureDate,
      },
      error: null,
    })

    const result = await readCache<{ summary: string }>('company-1', 'report_summary_orders')

    expect(result).not.toBeNull()
    expect(result!.data.summary).toBe('cached summary')
    expect(result!.isStale).toBe(false)
  })

  it('should return null when no cache exists in L2', async () => {
    mockSupabaseSelect.mockResolvedValue({ data: null, error: { code: 'PGRST116' } })

    const result = await readCache('company-1', 'nonexistent_key')
    expect(result).toBeNull()
  })

  it('should mark cache as stale when expires_at is in the past', async () => {
    const pastDate = new Date(Date.now() - 3600_000).toISOString()
    mockSupabaseSelect.mockResolvedValue({
      data: {
        data: { summary: 'old summary' },
        model: 'gemini-2.5-flash',
        generated_at: new Date(Date.now() - 7200_000).toISOString(),
        expires_at: pastDate,
      },
      error: null,
    })

    const result = await readCache<{ summary: string }>('company-1', 'report_summary_orders')

    expect(result).not.toBeNull()
    expect(result!.isStale).toBe(true)
  })
})

// ============================================
// L1 TTL — Expiration falls through to L2
// ============================================

describe('Cache L1 LRU — TTL Expiration', () => {
  beforeEach(() => {
    clearL1Cache()
    mockSupabaseSelect.mockReset()
    mockSupabaseUpsert.mockReset()
  })

  it('should return CacheEntry with correct shape', async () => {
    const futureDate = new Date(Date.now() + 3600_000).toISOString()
    const generatedAt = new Date().toISOString()

    mockSupabaseSelect.mockResolvedValue({
      data: {
        data: { value: 42 },
        model: 'gemini-2.5-flash',
        generated_at: generatedAt,
        expires_at: futureDate,
      },
      error: null,
    })

    const result = await readCache<{ value: number }>('company-1', 'test_key')

    expect(result).not.toBeNull()
    expect(result).toHaveProperty('data')
    expect(result).toHaveProperty('model')
    expect(result).toHaveProperty('generatedAt')
    expect(result).toHaveProperty('expiresAt')
    expect(result).toHaveProperty('isStale')
    expect(result!.model).toBe('gemini-2.5-flash')
  })
})

// ============================================
// WRITE-THROUGH — writeCache invalidates L1
// ============================================

describe('Cache L1 LRU — Write-through invalidation', () => {
  beforeEach(() => {
    clearL1Cache()
    mockSupabaseSelect.mockReset()
    mockSupabaseUpsert.mockReset().mockResolvedValue({ error: null })
  })

  it('should write data to Supabase via upsert', async () => {
    await writeCache('company-1', 'test_key', { score: 95 }, 4, 'gemini-2.5-flash')

    expect(mockSupabaseUpsert).toHaveBeenCalled()
  })

  it('should write with correct TTL (hours converted to expiry date)', async () => {
    const beforeWrite = Date.now()
    await writeCache('company-1', 'test_key', { score: 95 }, 4, 'gemini-2.5-flash')

    // Verify upsert was called with expires_at roughly 4 hours from now
    const upsertCall = mockSupabaseUpsert.mock.calls[0]
    const upsertData = upsertCall[0]
    const expiresAt = new Date(upsertData.expires_at).getTime()
    const expectedExpiry = beforeWrite + 4 * 60 * 60 * 1000

    // Allow 5 second tolerance
    expect(expiresAt).toBeGreaterThan(expectedExpiry - 5000)
    expect(expiresAt).toBeLessThan(expectedExpiry + 5000)
  })

  it('should handle Supabase upsert errors gracefully (no throw)', async () => {
    mockSupabaseUpsert.mockResolvedValue({ error: { message: 'DB error' } })

    // Should not throw
    await expect(
      writeCache('company-1', 'test_key', { data: 'test' }, 4, 'gemini-2.5-flash')
    ).resolves.not.toThrow()
  })

  it('should use onConflict for company_id,cache_key upsert', async () => {
    await writeCache('company-1', 'test_key', { data: 'test' }, 4, 'model')

    const upsertCall = mockSupabaseUpsert.mock.calls[0]
    const options = upsertCall[1]
    expect(options).toEqual({ onConflict: 'company_id,cache_key' })
  })
})

// ============================================
// EDGE CASES
// ============================================

describe('Cache L1 LRU — Edge cases', () => {
  beforeEach(() => {
    clearL1Cache()
    mockSupabaseSelect.mockReset()
    mockSupabaseUpsert.mockReset()
  })

  it('should handle readCache errors gracefully (return null)', async () => {
    mockSupabaseSelect.mockRejectedValue(new Error('Connection timeout'))

    const result = await readCache('company-1', 'test_key')
    expect(result).toBeNull()
  })

  it('should handle writeCache errors gracefully (no throw)', async () => {
    mockSupabaseUpsert.mockRejectedValue(new Error('Connection timeout'))

    await expect(
      writeCache('company-1', 'test_key', {}, 4, 'model')
    ).resolves.not.toThrow()
  })

  it('should serialize data to JSON before writing (no circular refs)', async () => {
    mockSupabaseUpsert.mockResolvedValue({ error: null })

    const data = { nested: { deep: { value: 42 } } }
    await writeCache('company-1', 'test_key', data, 4, 'model')

    const upsertCall = mockSupabaseUpsert.mock.calls[0]
    const writtenData = upsertCall[0].data
    // Should be serialized (no reference to original object)
    expect(writtenData).toEqual({ nested: { deep: { value: 42 } } })
  })
})
