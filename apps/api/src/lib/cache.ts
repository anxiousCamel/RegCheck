import { redis } from './redis';

/**
 * Centralized cache service with Redis
 * Provides type-safe caching with graceful degradation when Redis is unavailable
 */
export class CacheService {
  private isRedisAvailable = true;

  constructor() {
    // Monitor Redis connection status
    redis.on('error', () => {
      this.isRedisAvailable = false;
    });

    redis.on('connect', () => {
      this.isRedisAvailable = true;
    });

    redis.on('ready', () => {
      this.isRedisAvailable = true;
    });
  }

  /**
   * Get a value from cache
   * @param key Cache key
   * @returns Cached value or null if not found or Redis unavailable
   */
  async get<T>(key: string): Promise<T | null> {
    if (!this.isRedisAvailable) {
      return null;
    }

    try {
      const value = await redis.get(key);
      if (!value) {
        return null;
      }
      return JSON.parse(value) as T;
    } catch (error) {
      console.error('[Cache] Get failed:', error);
      return null;
    }
  }

  /**
   * Set a value in cache with optional TTL
   * @param key Cache key
   * @param value Value to cache
   * @param ttl Time to live in seconds (default: 300 = 5 minutes)
   */
  async set<T>(key: string, value: T, ttl = 300): Promise<void> {
    if (!this.isRedisAvailable) {
      return;
    }

    try {
      await redis.set(key, JSON.stringify(value), 'EX', ttl);
    } catch (error) {
      console.error('[Cache] Set failed:', error);
      // Don't throw - cache failures shouldn't break the application
    }
  }

  /**
   * Delete a specific cache key
   * @param key Cache key to delete
   */
  async del(key: string): Promise<void> {
    if (!this.isRedisAvailable) {
      return;
    }

    try {
      await redis.del(key);
    } catch (error) {
      console.error('[Cache] Delete failed:', error);
    }
  }

  /**
   * Delete all keys matching a pattern
   * @param pattern Pattern to match (e.g., 'lojas:list:*')
   */
  async delPattern(pattern: string): Promise<void> {
    if (!this.isRedisAvailable) {
      return;
    }

    try {
      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    } catch (error) {
      console.error('[Cache] Delete pattern failed:', error);
    }
  }

  /**
   * Cache-aside pattern: get from cache or execute function and cache result
   * @param key Cache key
   * @param fn Function to execute if cache miss
   * @param ttl Time to live in seconds (default: 300 = 5 minutes)
   * @returns Cached or freshly computed value
   */
  async wrap<T>(key: string, fn: () => Promise<T>, ttl = 300): Promise<T> {
    // Try to get from cache first
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Cache miss - execute function
    const value = await fn();

    // Store in cache (fire and forget)
    this.set(key, value, ttl).catch((error) => {
      console.error('[Cache] Wrap set failed:', error);
    });

    return value;
  }
}

// Export singleton instance
export const cacheService = new CacheService();
