/**
 * Cache Headers Utility
 *
 * Controls browser and CDN caching for API responses.
 *
 * s-maxage = cache on CDN/Edge (Vercel)
 * max-age = cache in browser
 * stale-while-revalidate = serve stale content while fetching fresh
 */

export const cacheHeaders = {
  /**
   * Static data (materials, units, config)
   * - Cache on CDN for 1 hour
   * - Serve stale for up to 24 hours while revalidating
   *
   * @example
   * return Response.json(data, { headers: cacheHeaders.static });
   */
  static: {
    'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
  } as HeadersInit,

  /**
   * User-specific data (profile, preferences)
   * - Private cache only (not on CDN)
   * - Cache for 1 minute
   * - Serve stale for up to 5 minutes while revalidating
   *
   * @example
   * return Response.json(userData, { headers: cacheHeaders.user });
   */
  user: {
    'Cache-Control': 'private, max-age=60, stale-while-revalidate=300',
  } as HeadersInit,

  /**
   * Real-time data (orders list, notifications, timers)
   * - No caching at all
   * - Always fetch fresh data
   *
   * @example
   * return Response.json(orders, { headers: cacheHeaders.noCache });
   */
  noCache: {
    'Cache-Control': 'no-store, no-cache, must-revalidate',
    'Pragma': 'no-cache',
  } as HeadersInit,

  /**
   * Short-lived cache (dashboard stats)
   * - Cache for 30 seconds
   * - Good for data that updates frequently but doesn't need to be real-time
   *
   * @example
   * return Response.json(stats, { headers: cacheHeaders.short });
   */
  short: {
    'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
  } as HeadersInit,
};

/**
 * Helper to create Response with cache headers
 *
 * @example
 * return cachedResponse({ data: materials }, 'static');
 */
export function cachedResponse<T>(
  data: T,
  cacheType: keyof typeof cacheHeaders,
  status: number = 200
): Response {
  return Response.json(data, {
    status,
    headers: cacheHeaders[cacheType],
  });
}
