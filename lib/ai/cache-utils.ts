'use server'

import { LRUCache } from 'lru-cache'
import { createClient } from '@/lib/supabase-server'
import { logger } from '@/lib/logger'

export interface CacheEntry<T> {
  data: T
  model: string
  generatedAt: string
  expiresAt: string
  isStale: boolean
}

// ============================================
// L1 IN-MEMORY LRU CACHE (lru-cache package)
// ============================================

interface L1Entry {
  data: unknown
  model: string
  generatedAt: string
  expiresAt: string
}

const l1Cache = new LRUCache<string, L1Entry>({
  max: 50,
  // Per-entry TTL set on each .set() call
  allowStale: false,
})

function l1Key(companyId: string, cacheKey: string): string {
  return `${companyId}:${cacheKey}`
}

/** Clear L1 cache — exposed for test isolation only */
export function clearL1Cache(): void {
  l1Cache.clear()
}

// ============================================
// PUBLIC API
// ============================================

/**
 * Read cached AI data — L1 in-memory first, then Supabase.
 * Returns null if no cache exists.
 */
export async function readCache<T>(
  companyId: string,
  cacheKey: string
): Promise<CacheEntry<T> | null> {
  // L1 check first (~0ms)
  const key = l1Key(companyId, cacheKey)
  const l1 = l1Cache.get(key)
  if (l1) {
    return {
      data: l1.data as T,
      model: l1.model,
      generatedAt: l1.generatedAt,
      expiresAt: l1.expiresAt,
      isStale: false, // LRUCache already evicts expired entries
    }
  }

  // L2 Supabase fallback (~50ms)
  try {
    const supabase = await createClient()

    const { data: cached, error } = await supabase
      .from('ai_cache')
      .select('data, model, generated_at, expires_at')
      .eq('company_id', companyId)
      .eq('cache_key', cacheKey)
      .single()

    if (error || !cached) {
      return null
    }

    const now = new Date()
    const expiresAt = new Date(cached.expires_at)
    const isStale = now > expiresAt

    // Populate L1 if not stale
    if (!isStale) {
      const ttlMs = expiresAt.getTime() - now.getTime()
      l1Cache.set(key, {
        data: cached.data,
        model: cached.model,
        generatedAt: cached.generated_at,
        expiresAt: cached.expires_at,
      }, { ttl: ttlMs })
    }

    return {
      data: cached.data as T,
      model: cached.model,
      generatedAt: cached.generated_at,
      expiresAt: cached.expires_at,
      isStale,
    }
  } catch (err) {
    logger.error('[cache-utils] readCache error', { error: err, cacheKey })
    return null
  }
}

/**
 * Write AI data to cache (upsert by company_id + cache_key).
 * Write-through: updates both L1 and Supabase.
 */
export async function writeCache<T>(
  companyId: string,
  cacheKey: string,
  data: T,
  ttlHours: number,
  model: string
): Promise<void> {
  try {
    const supabase = await createClient()

    const now = new Date()
    const expiresAt = new Date(now.getTime() + ttlHours * 60 * 60 * 1000)

    // Invalidate L1 entry first (write-through)
    const key = l1Key(companyId, cacheKey)
    l1Cache.delete(key)

    const { error } = await supabase
      .from('ai_cache')
      .upsert(
        {
          company_id: companyId,
          cache_key: cacheKey,
          data: JSON.parse(JSON.stringify(data)),
          model,
          generated_at: now.toISOString(),
          expires_at: expiresAt.toISOString(),
        },
        { onConflict: 'company_id,cache_key' }
      )

    if (error) {
      logger.error('[cache-utils] writeCache upsert error', { error, cacheKey })
      return
    }

    // Populate L1 with fresh data after successful write
    if (ttlHours > 0) {
      const ttlMs = ttlHours * 60 * 60 * 1000
      l1Cache.set(key, {
        data: JSON.parse(JSON.stringify(data)),
        model,
        generatedAt: now.toISOString(),
        expiresAt: expiresAt.toISOString(),
      }, { ttl: ttlMs })
    }
  } catch (err) {
    logger.error('[cache-utils] writeCache error', { error: err, cacheKey })
  }
}
