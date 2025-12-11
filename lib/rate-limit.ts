// ============================================
// lib/rate-limit.ts
// Rate limiting utility using LRU cache
// ============================================

import { LRUCache } from 'lru-cache'

type RateLimitOptions = {
  uniqueTokenPerInterval?: number
  interval?: number
}

/**
 * Create a rate limiter with LRU cache
 * @param options - Configuration options
 * @param options.uniqueTokenPerInterval - Maximum unique tokens to track (default: 500)
 * @param options.interval - Time window in milliseconds (default: 60000 = 1 minute)
 * @returns Rate limiter instance with check method
 */
export function rateLimit(options?: RateLimitOptions) {
  const tokenCache = new LRUCache<string, number>({
    max: options?.uniqueTokenPerInterval || 500,
    ttl: options?.interval || 60000, // 1 minute
  })

  return {
    /**
     * Check if request is within rate limit
     * @param limit - Maximum requests allowed per interval
     * @param token - Unique identifier (e.g., IP address or user ID)
     * @returns Promise that resolves if within limit, rejects if exceeded
     */
    check: (limit: number, token: string) =>
      new Promise<void>((resolve, reject) => {
        const tokenCount = (tokenCache.get(token) as number) || 0
        if (tokenCount >= limit) {
          reject(new Error('Rate limit exceeded'))
          return
        }
        tokenCache.set(token, tokenCount + 1)
        resolve()
      }),
  }
}
