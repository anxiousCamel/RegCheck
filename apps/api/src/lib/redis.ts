import Redis from 'ioredis';

const redisUrl = process.env.REDIS_URL ?? 'redis://localhost:6379';

export const redis = new Redis(redisUrl, {
  maxRetriesPerRequest: 3,
  lazyConnect: true,
});

redis.on('error', (err) => {
  console.error('[Redis] Connection error:', err.message);
});

redis.on('connect', () => {
  console.log('[Redis] Connected');
});

/** Cache helper: get or set with TTL */
export async function cachedGet<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlSeconds = 300,
): Promise<T> {
  const cached = await redis.get(key);
  if (cached) {
    // JSON.parse returns unknown; caller is responsible for validating the shape
    const parsed: unknown = JSON.parse(cached);
    return parsed as T;
  }

  const data = await fetcher();
  await redis.set(key, JSON.stringify(data), 'EX', ttlSeconds);
  return data;
}

/** Invalidate cache entries by pattern */
export async function invalidateCache(pattern: string): Promise<void> {
  const keys = await redis.keys(pattern);
  if (keys.length > 0) {
    await redis.del(...keys);
  }
}
