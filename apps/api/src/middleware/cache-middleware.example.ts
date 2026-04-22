/**
 * Cache Middleware Usage Examples
 * 
 * This file demonstrates how to use the cacheMiddleware in Express routes
 */

import express from 'express';
import { cacheMiddleware } from './cache-middleware';

const app = express();

// Example 1: Basic usage with default options (5 minute TTL)
app.get('/api/lojas', cacheMiddleware(), async (req, res) => {
  // Your route handler
  const lojas = []; // fetch from database
  res.json({ items: lojas });
});

// Example 2: Custom TTL (2 minutes for more dynamic data)
app.get('/api/documents', cacheMiddleware({ ttl: 120 }), async (req, res) => {
  const documents = []; // fetch from database
  res.json({ items: documents });
});

// Example 3: Custom cache key generator
// Useful when you want to include specific query params or headers in the cache key
app.get(
  '/api/equipamentos',
  cacheMiddleware({
    ttl: 300,
    keyGenerator: (req) => {
      // Include specific query params in cache key
      const { page = '1', pageSize = '50', lojaId } = req.query;
      return `equipamentos:page:${page}:size:${pageSize}:loja:${lojaId || 'all'}`;
    },
  }),
  async (req, res) => {
    const equipamentos = []; // fetch from database
    res.json({ items: equipamentos });
  }
);

// Example 4: Conditional caching
// Only cache responses that meet certain criteria
app.get(
  '/api/templates',
  cacheMiddleware({
    ttl: 300,
    shouldCache: (req, res) => {
      // Only cache successful responses with specific query params
      const isSuccess = res.statusCode >= 200 && res.statusCode < 300;
      const hasValidParams = req.query.status === 'published';
      return isSuccess && hasValidParams;
    },
  }),
  async (req, res) => {
    const templates = []; // fetch from database
    res.json({ items: templates });
  }
);

// Example 5: Different TTLs for different data types
const CACHE_TTL = {
  STATIC: 300, // 5 minutes for relatively static data (lojas, setores, tipos)
  DYNAMIC: 120, // 2 minutes for more dynamic data (equipamentos)
  VOLATILE: 60, // 1 minute for highly volatile data (documents)
};

app.get('/api/lojas', cacheMiddleware({ ttl: CACHE_TTL.STATIC }), async (req, res) => {
  // Handler
});

app.get('/api/equipamentos', cacheMiddleware({ ttl: CACHE_TTL.DYNAMIC }), async (req, res) => {
  // Handler
});

app.get('/api/documents', cacheMiddleware({ ttl: CACHE_TTL.VOLATILE }), async (req, res) => {
  // Handler
});

// Example 6: Cache key patterns for easy invalidation
// Use consistent patterns so you can invalidate related caches
app.get(
  '/api/lojas',
  cacheMiddleware({
    keyGenerator: (req) => {
      const { page = '1', pageSize = '50' } = req.query;
      return `lojas:list:page:${page}:size:${pageSize}`;
    },
  }),
  async (req, res) => {
    // Handler
  }
);

app.get(
  '/api/lojas/:id',
  cacheMiddleware({
    keyGenerator: (req) => `loja:${req.params.id}`,
  }),
  async (req, res) => {
    // Handler
  }
);

// When creating/updating/deleting a loja, invalidate related caches:
// await cacheService.delPattern('lojas:list:*');
// await cacheService.del(`loja:${id}`);

// Example 7: Checking cache status in responses
// The middleware automatically adds X-Cache header (HIT/MISS)
// You can check this in your API responses:
// curl -I http://localhost:4000/api/lojas
// X-Cache: MISS (first request)
// X-Cache: HIT (subsequent requests within TTL)

export default app;
