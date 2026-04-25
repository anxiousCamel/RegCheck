import { describe, it, expect, beforeEach, afterEach, beforeAll } from 'vitest';
import express, { type Express } from 'express';
import request from 'supertest';
import { cacheMiddleware } from '../cache-middleware';
import { redis } from '../../lib/redis';

/**
 * Integration tests for cache middleware with real Redis
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
    console.log('[Test] Redis is available - running cache middleware integration tests');
  } catch (error) {
    isRedisAvailable = false;
    console.log('[Test] Redis is not available - skipping cache middleware integration tests');
  }
});

describe('cacheMiddleware integration', () => {
  let app: Express;

  beforeEach(async () => {
    if (!isRedisAvailable) return;

    // Clear Redis before each test
    await redis.flushall();

    // Create fresh Express app
    app = express();
    app.use(express.json());
  });

  afterEach(async () => {
    if (!isRedisAvailable) return;

    // Clean up Redis after tests
    await redis.flushall();
  });

  it.skipIf(!isRedisAvailable)(
    'should cache GET responses and return X-Cache headers',
    async () => {
      let callCount = 0;

      app.get('/api/test', cacheMiddleware({ ttl: 60 }), (req, res) => {
        callCount++;
        res.json({ data: 'test', timestamp: Date.now() });
      });

      // First request - cache miss
      const response1 = await request(app).get('/api/test');
      expect(response1.status).toBe(200);
      expect(response1.headers['x-cache']).toBe('MISS');
      expect(callCount).toBe(1);

      // Second request - cache hit
      const response2 = await request(app).get('/api/test');
      expect(response2.status).toBe(200);
      expect(response2.headers['x-cache']).toBe('HIT');
      expect(response2.body).toEqual(response1.body); // Same response
      expect(callCount).toBe(1); // Handler not called again
    },
  );

  it.skipIf(!isRedisAvailable)(
    'should cache responses with query parameters separately',
    async () => {
      app.get('/api/items', cacheMiddleware({ ttl: 60 }), (req, res) => {
        res.json({ page: req.query.page, data: ['item1', 'item2'] });
      });

      // Request with page=1
      const response1 = await request(app).get('/api/items?page=1');
      expect(response1.headers['x-cache']).toBe('MISS');

      // Request with page=2 - different cache key
      const response2 = await request(app).get('/api/items?page=2');
      expect(response2.headers['x-cache']).toBe('MISS');

      // Request with page=1 again - cache hit
      const response3 = await request(app).get('/api/items?page=1');
      expect(response3.headers['x-cache']).toBe('HIT');
      expect(response3.body).toEqual(response1.body);
    },
  );

  it.skipIf(!isRedisAvailable)('should not cache POST requests', async () => {
    let callCount = 0;

    app.post('/api/create', cacheMiddleware({ ttl: 60 }), (req, res) => {
      callCount++;
      res.json({ created: true });
    });

    // First POST
    const response1 = await request(app).post('/api/create').send({ data: 'test' });
    expect(response1.status).toBe(200);
    expect(response1.headers['x-cache']).toBeUndefined();
    expect(callCount).toBe(1);

    // Second POST - should not be cached
    const response2 = await request(app).post('/api/create').send({ data: 'test' });
    expect(response2.status).toBe(200);
    expect(response2.headers['x-cache']).toBeUndefined();
    expect(callCount).toBe(2); // Handler called again
  });

  it.skipIf(!isRedisAvailable)('should not cache error responses by default', async () => {
    let callCount = 0;

    app.get('/api/error', cacheMiddleware({ ttl: 60 }), (req, res) => {
      callCount++;
      res.status(500).json({ error: 'Internal error' });
    });

    // First request
    const response1 = await request(app).get('/api/error');
    expect(response1.status).toBe(500);
    expect(response1.headers['x-cache']).toBe('MISS');
    expect(callCount).toBe(1);

    // Second request - should not be cached
    const response2 = await request(app).get('/api/error');
    expect(response2.status).toBe(500);
    expect(response2.headers['x-cache']).toBe('MISS');
    expect(callCount).toBe(2); // Handler called again
  });

  it.skipIf(!isRedisAvailable)('should use custom key generator', async () => {
    app.get(
      '/api/custom',
      cacheMiddleware({
        ttl: 60,
        keyGenerator: (req) => `custom:${req.path}`,
      }),
      (req, res) => {
        res.json({ data: 'custom' });
      },
    );

    // First request
    const response1 = await request(app).get('/api/custom');
    expect(response1.headers['x-cache']).toBe('MISS');

    // Verify custom key was used in Redis
    const cachedValue = await redis.get('custom:/api/custom');
    expect(cachedValue).toBeTruthy();

    // Second request - cache hit
    const response2 = await request(app).get('/api/custom');
    expect(response2.headers['x-cache']).toBe('HIT');
  });

  it.skipIf(!isRedisAvailable)('should respect custom shouldCache function', async () => {
    let callCount = 0;

    app.get(
      '/api/conditional',
      cacheMiddleware({
        ttl: 60,
        shouldCache: (req, res) => {
          // Only cache if query param cache=true
          return req.query.cache === 'true' && res.statusCode === 200;
        },
      }),
      (req, res) => {
        callCount++;
        res.json({ data: 'conditional' });
      },
    );

    // Request without cache=true - should not cache
    const response1 = await request(app).get('/api/conditional');
    expect(response1.headers['x-cache']).toBe('MISS');
    expect(callCount).toBe(1);

    const response2 = await request(app).get('/api/conditional');
    expect(response2.headers['x-cache']).toBe('MISS');
    expect(callCount).toBe(2); // Not cached

    // Request with cache=true - should cache
    const response3 = await request(app).get('/api/conditional?cache=true');
    expect(response3.headers['x-cache']).toBe('MISS');
    expect(callCount).toBe(3);

    const response4 = await request(app).get('/api/conditional?cache=true');
    expect(response4.headers['x-cache']).toBe('HIT');
    expect(callCount).toBe(3); // Cached
  });

  it.skipIf(!isRedisAvailable)('should handle Redis unavailability gracefully', async () => {
    let callCount = 0;

    app.get('/api/resilient', cacheMiddleware({ ttl: 60 }), (req, res) => {
      callCount++;
      res.json({ data: 'resilient' });
    });

    // Disconnect Redis
    await redis.disconnect();

    // Should still work, just without caching
    const response = await request(app).get('/api/resilient');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ data: 'resilient' });
    expect(callCount).toBe(1);

    // Reconnect for cleanup
    await redis.connect();
  });
});
