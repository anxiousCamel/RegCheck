import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import { cacheService } from '../cache';
import { redis } from '../redis';

/**
 * Integration tests for CacheService with real Redis
 * These tests require Redis to be running
 * 
 * To run: ensure Redis is available at REDIS_URL or localhost:6379
 * 
 * If Redis is not available, these tests will be skipped automatically.
 */

// Check if Redis is available
let isRedisAvailable = false;

beforeAll(async () => {
  try {
    await redis.connect();
    await redis.ping();
    isRedisAvailable = true;
    console.log('[Test] Redis is available - running integration tests');
  } catch (error) {
    isRedisAvailable = false;
    console.log('[Test] Redis is not available - skipping integration tests');
  }
});

describe('CacheService Integration', () => {
  beforeEach(async () => {
    if (!isRedisAvailable) return;
    
    // Clean up test keys before each test
    const keys = await redis.keys('test:*');
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  });

  it.skipIf(!isRedisAvailable)('should store and retrieve data from Redis', async () => {
    const testData = { id: 1, name: 'Test Store', active: true };

    await cacheService.set('test:store:1', testData, 60);
    const retrieved = await cacheService.get<typeof testData>('test:store:1');

    expect(retrieved).toEqual(testData);
  });

  it.skipIf(!isRedisAvailable)('should return null for non-existent keys', async () => {
    const result = await cacheService.get('test:nonexistent');
    expect(result).toBeNull();
  });

  it.skipIf(!isRedisAvailable)('should delete specific keys', async () => {
    await cacheService.set('test:delete:1', { data: 'value' }, 60);

    let value = await cacheService.get('test:delete:1');
    expect(value).not.toBeNull();

    await cacheService.del('test:delete:1');

    value = await cacheService.get('test:delete:1');
    expect(value).toBeNull();
  });

  it.skipIf(!isRedisAvailable)('should delete keys by pattern', async () => {
    // Create multiple keys with same pattern
    await cacheService.set('test:pattern:1', { id: 1 }, 60);
    await cacheService.set('test:pattern:2', { id: 2 }, 60);
    await cacheService.set('test:pattern:3', { id: 3 }, 60);
    await cacheService.set('test:other:1', { id: 4 }, 60);

    // Delete only pattern-matched keys
    await cacheService.delPattern('test:pattern:*');

    // Pattern keys should be deleted
    expect(await cacheService.get('test:pattern:1')).toBeNull();
    expect(await cacheService.get('test:pattern:2')).toBeNull();
    expect(await cacheService.get('test:pattern:3')).toBeNull();

    // Other keys should remain
    expect(await cacheService.get('test:other:1')).not.toBeNull();
  });

  it.skipIf(!isRedisAvailable)('should use wrap for cache-aside pattern', async () => {
    let callCount = 0;
    const expensiveOperation = async () => {
      callCount++;
      return { result: 'computed', timestamp: Date.now() };
    };

    // First call - cache miss, should execute function
    const result1 = await cacheService.wrap('test:wrap:1', expensiveOperation, 60);
    expect(callCount).toBe(1);
    expect(result1.result).toBe('computed');

    // Second call - cache hit, should NOT execute function
    const result2 = await cacheService.wrap('test:wrap:1', expensiveOperation, 60);
    expect(callCount).toBe(1); // Still 1, not called again
    expect(result2).toEqual(result1); // Same cached result
  });

  it.skipIf(!isRedisAvailable)('should handle complex nested objects', async () => {
    const complexData = {
      id: 1,
      name: 'Complex Store',
      metadata: {
        tags: ['tag1', 'tag2'],
        settings: {
          enabled: true,
          threshold: 100,
        },
      },
      items: [
        { id: 1, value: 'item1' },
        { id: 2, value: 'item2' },
      ],
    };

    await cacheService.set('test:complex:1', complexData, 60);
    const retrieved = await cacheService.get<typeof complexData>('test:complex:1');

    expect(retrieved).toEqual(complexData);
  });

  it.skipIf(!isRedisAvailable)('should respect TTL expiration', async () => {
    // Set with 1 second TTL
    await cacheService.set('test:ttl:1', { data: 'expires' }, 1);

    // Should exist immediately
    let value = await cacheService.get('test:ttl:1');
    expect(value).not.toBeNull();

    // Wait for expiration
    await new Promise((resolve) => setTimeout(resolve, 1100));

    // Should be expired
    value = await cacheService.get('test:ttl:1');
    expect(value).toBeNull();
  }, 10000); // Increase timeout for this test
});
