type RateLimitEntry = {
  timestamps: number[]
}

const stores = new Map<string, Map<string, RateLimitEntry>>()

/**
 * Memory-backed sliding-window rate limiter for sensitive API routes and functions.
 * Automatically purges stale window timestamps.
 */
export function checkRateLimit(options: {
  key: string
  identifier: string
  limit: number
  windowMs: number
}): { success: boolean; remaining: number; resetMs: number } {
  const { key, identifier, limit, windowMs } = options
  const now = Date.now()
  const windowStart = now - windowMs

  let store = stores.get(key)
  if (!store) {
    store = new Map<string, RateLimitEntry>()
    stores.set(key, store)
  }
  let entry = store.get(identifier)
  if (!entry) {
    entry = { timestamps: [] }
    store.set(identifier, entry)
  }

  // Filter timestamps within current sliding window
  entry.timestamps = entry.timestamps.filter((ts) => ts > windowStart)
  if (entry.timestamps.length >= limit) {
    const oldestTimestamp = entry.timestamps[0] ?? now
    const resetMs = oldestTimestamp + windowMs - now
    return {
      success: false,
      remaining: 0,
      resetMs: Math.max(0, resetMs),
    }
  }

  entry.timestamps.push(now)
  return {
    success: true,
    remaining: limit - entry.timestamps.length,
    resetMs: windowMs,
  }
}

/**
 * Extracts client IP address from request headers (x-forwarded-for, x-real-ip, etc.)
 */
export function getClientIp(headers: Headers): string {
  const xForwardedFor = headers.get('x-forwarded-for')
  if (xForwardedFor) {
    const ips = xForwardedFor.split(',')
    const clientIp = ips[0]?.trim()
    if (clientIp) return clientIp
  }
  const xRealIp = headers.get('x-real-ip')
  if (xRealIp?.trim()) return xRealIp.trim()
  const cfConnectingIp = headers.get('cf-connecting-ip')
  if (cfConnectingIp?.trim()) return cfConnectingIp.trim()
  return '127.0.0.1'
}
