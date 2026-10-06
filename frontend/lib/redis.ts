/**
 * Small in-memory cache used by the demo deployment.
 *
 * This intentionally has no external Redis dependency. It is suitable for a
 * single Render instance; use a shared cache only if the app is later scaled
 * to multiple instances.
 */

const store = new Map<string, { value: unknown; expiresAt?: number }>()

function isExpired(key: string) {
  const entry = store.get(key)
  if (!entry) return true
  if (entry.expiresAt && Date.now() > entry.expiresAt) {
    store.delete(key)
    return true
  }
  return false
}

const redis = {
  async get(key: string) {
    return isExpired(key) ? null : store.get(key)?.value ?? null
  },
  async set(key: string, value: unknown, options?: { ex?: number }) {
    store.set(key, {
      value,
      expiresAt: options?.ex ? Date.now() + options.ex * 1000 : undefined,
    })
  },
  async del(key: string) {
    store.delete(key)
  },
  async incr(key: string) {
    const current = Number((isExpired(key) ? 0 : store.get(key)?.value) ?? 0) + 1
    store.set(key, { value: current })
    return current
  },
  async expire(key: string, seconds: number) {
    const entry = store.get(key)
    if (entry) store.set(key, { ...entry, expiresAt: Date.now() + seconds * 1000 })
  },
  async exists(key: string) {
    return isExpired(key) ? 0 : 1
  },
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  return (await redis.get(key)) as T | null
}

export async function cacheSet<T>(key: string, value: T, ttlSeconds = 300): Promise<void> {
  await redis.set(key, JSON.stringify(value), { ex: ttlSeconds })
}

export async function cacheDel(key: string): Promise<void> {
  await redis.del(key)
}

export async function checkIdempotency(key: string, ttlSeconds = 86400): Promise<boolean> {
  if (await redis.exists(key)) return true
  await redis.set(key, '1', { ex: ttlSeconds })
  return false
}

export async function rateLimit(
  identifier: string,
  maxRequests: number,
  windowSeconds: number,
): Promise<{ allowed: boolean; remaining: number; resetInSeconds: number }> {
  const key = `rl:${identifier}:${Math.floor(Date.now() / (windowSeconds * 1000))}`
  const count = await redis.incr(key)
  if (count === 1) await redis.expire(key, windowSeconds)
  return {
    allowed: count <= maxRequests,
    remaining: Math.max(0, maxRequests - count),
    resetInSeconds: windowSeconds - (Math.floor(Date.now() / 1000) % windowSeconds),
  }
}
