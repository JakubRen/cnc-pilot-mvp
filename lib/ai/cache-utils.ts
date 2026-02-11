'use server'

import { createClient } from '@/lib/supabase-server'
import { logger } from '@/lib/logger'

export interface CacheEntry<T> {
  data: T
  model: string
  generatedAt: string
  expiresAt: string
  isStale: boolean
}

/**
 * Read cached AI data from ai_cache table.
 * Returns null if no cache exists.
 */
export async function readCache<T>(
  companyId: string,
  cacheKey: string
): Promise<CacheEntry<T> | null> {
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
    }
  } catch (err) {
    logger.error('[cache-utils] writeCache error', { error: err, cacheKey })
  }
}
