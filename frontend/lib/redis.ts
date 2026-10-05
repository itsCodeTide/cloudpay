/**
 * Upstash Redis client — serverless, free tier, edge-compatible.
 * Free plan: 10,000 commands/day, 256 MB storage.
 * Sign up: https://console.upstash.com/redis
 *
 * Set env vars:
 *   UPSTASH_REDIS_REST_URL=https://us1-xxx.upstash.io
 *   UPSTASH_REDIS_REST_TOKEN=xxxx
 *
 * If not configured, falls back to a no-op mock so the app still works locally.
 */

let redis: {
  get(key: string): Promise<unknown>
  set(key: string, value: unknown, opts?: { ex?: number }): Promise<void>
  del(key: string): Promise<void>
  incr(key: string): Promise<number>
  expire(key: string, seconds: number): Promise<void>
  exists(key: string): Promise<number>
}

const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN

if (REDIS_URL && REDIS_TOKEN) {
  // Real Upstash Redis client
  const { Redis } = require('@upstash/redis')
  redis = new Redis({ url: REDIS_URL, token: REDIS_TOKEN })
} else {
  // In-memory fallback (local dev without Redis configured)
  const store = new Map<string, { value: unknown; expiresAt?: number }>()
  const isExpired = (k: string) => {
    const e = store.get(k)
    if (!e) return true
    if (e.expiresAt && Date.now() > e.expiresAt) { store.delete(k); return true }
    return false
  }
  redis = {
    async get(k) { return isExpired(k) ? null : store.get(k)?.value ?? null },
    async set(k, v, o) { store.set(k, { value: v, expiresAt: o?.ex ? Date.now() + o.ex * 1000 : undefined }) },
    async del(k) { store.delete(k) },
    async incr(k) { const n = Number((isExpired(k) ? 0 : store.get(k)?.value) ?? 0) + 1; store.set(k, { value: n }); return n },
    async expire(k, s) { const e = store.get(k); if (e) store.set(k, { ...e, expiresAt: Date.now() + s * 1000 }) },
    async exists(k) { return isExpired(k) ? 0 : 1 },
  }
  if (process.env.NODE_ENV !== 'test') {
    console.warn('[Redis] UPSTASH_REDIS_REST_URL not set — using in-memory fallback. Set up at https://console.upstash.com/redis')
  }
}

export { redis }

// ─── Helper utilities ─────────────────────────────────────────────────────────

/** Cache a value with a TTL (seconds). Returns cached value or null. */
export async function cacheGet<T>(key: string): Promise<T | null> {
  return redis.get(key) as Promise<T | null>
}

export async function cacheSet<T>(key: string, value: T, ttlSeconds = 300): Promise<void> {
  await redis.set(key, JSON.stringify(value), { ex: ttlSeconds })
}

export async function cacheDel(key: string): Promise<void> {
  await redis.del(key)
}

/** Idempotency: check if a key exists (already processed). Returns true if duplicate. */
export async function checkIdempotency(key: string, ttlSeconds = 86400): Promise<boolean> {
  const exists = await redis.exists(key)
  if (exists) return true
  await redis.set(key, '1', { ex: ttlSeconds })
  return false
}

/** Simple rate limiter. Returns { allowed, remaining, resetInSeconds }. */
export async function rateLimit(
  identifier: string,
  maxRequests: number,
  windowSeconds: number
): Promise<{ allowed: boolean; remaining: number; resetInSeconds: number }> {
  const key = `rl:${identifier}:${Math.floor(Date.now() / (windowSeconds * 1000))}`
  const count = await redis.incr(key)
  if (count === 1) await redis.expire(key, windowSeconds)
  const remaining = Math.max(0, maxRequests - count)
  return {
    allowed: count <= maxRequests,
    remaining,
    resetInSeconds: windowSeconds - (Math.floor(Date.now() / 1000) % windowSeconds),
  }
}
