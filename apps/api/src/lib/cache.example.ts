/**
 * CacheService Usage Examples
 * 
 * This file demonstrates how to use the CacheService in various scenarios.
 * These examples are for documentation purposes and are not executed.
 */

import { cacheService } from './cache';
import { prisma } from '@regcheck/database';

// ============================================================================
// Example 1: Basic Get/Set Pattern
// ============================================================================

async function basicCacheExample() {
  // Store data in cache with 5-minute TTL (default)
  await cacheService.set('lojas:list:page:1', { items: [], total: 0 });

  // Retrieve data from cache
  const cached = await cacheService.get<{ items: unknown[]; total: number }>('lojas:list:page:1');
  
  if (cached) {
    console.log('Cache hit!', cached);
  } else {
    console.log('Cache miss - need to fetch from database');
  }
}

// ============================================================================
// Example 2: Cache-Aside Pattern with Wrap
// ============================================================================

async function cacheAsideExample(lojaId: string) {
  // The wrap method automatically handles cache miss/hit
  const loja = await cacheService.wrap(
    `loja:${lojaId}`,
    async () => {
      // This function only executes on cache miss
      console.log('Fetching from database...');
      return await prisma.loja.findUnique({
        where: { id: lojaId },
        select: { id: true, nome: true, endereco: true },
      });
    },
    120 // 2-minute TTL
  );

  return loja;
}

// ============================================================================
// Example 3: Cache Invalidation on Update
// ============================================================================

async function updateLojaWithInvalidation(lojaId: string, data: { nome: string }) {
  // Update the database
  const updated = await prisma.loja.update({
    where: { id: lojaId },
    data,
  });

  // Invalidate related cache entries
  await cacheService.del(`loja:${lojaId}`); // Specific detail cache
  await cacheService.delPattern('lojas:list:*'); // All listing caches

  return updated;
}

// ============================================================================
// Example 4: Paginated List Caching
// ============================================================================

async function getLojasList(page: number, pageSize: number) {
  const cacheKey = `lojas:list:page:${page}:size:${pageSize}`;

  return await cacheService.wrap(
    cacheKey,
    async () => {
      const [items, total] = await Promise.all([
        prisma.loja.findMany({
          skip: (page - 1) * pageSize,
          take: pageSize,
          select: { id: true, nome: true, endereco: true },
          orderBy: { nome: 'asc' },
        }),
        prisma.loja.count(),
      ]);

      return { items, total, page, pageSize };
    },
    300 // 5-minute TTL for listings
  );
}

// ============================================================================
// Example 5: Conditional Caching in Express Middleware
// ============================================================================

import type { Request, Response, NextFunction } from 'express';

function cacheMiddleware(ttl: number) {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    // Generate cache key from request
    const cacheKey = `api:${req.path}:${JSON.stringify(req.query)}`;

    // Try to get from cache
    const cached = await cacheService.get(cacheKey);
    if (cached) {
      res.setHeader('X-Cache', 'HIT');
      return res.json(cached);
    }

    // Store original json method
    const originalJson = res.json.bind(res);

    // Override json method to cache response
    res.json = function (data: unknown) {
      res.setHeader('X-Cache', 'MISS');
      cacheService.set(cacheKey, data, ttl).catch(console.error);
      return originalJson(data);
    };

    next();
  };
}

// ============================================================================
// Example 6: Bulk Cache Invalidation
// ============================================================================

async function invalidateEquipamentoCache(equipamentoId: string) {
  // When an equipamento is updated, invalidate:
  // 1. The specific equipamento detail cache
  await cacheService.del(`equipamento:${equipamentoId}`);
  
  // 2. All equipamento listing caches (all pages)
  await cacheService.delPattern('equipamentos:list:*');
  
  // 3. Related loja cache if needed
  const equipamento = await prisma.equipamento.findUnique({
    where: { id: equipamentoId },
    select: { lojaId: true },
  });
  
  if (equipamento?.lojaId) {
    await cacheService.del(`loja:${equipamento.lojaId}:equipamentos`);
  }
}

// ============================================================================
// Example 7: Cache Warming on Application Startup
// ============================================================================

async function warmCache() {
  console.log('[Cache] Warming cache with frequently accessed data...');

  // Pre-load first page of lojas
  await getLojasList(1, 50);

  // Pre-load tipos de equipamento (usually small and static)
  await cacheService.wrap(
    'tipos:list:all',
    async () => {
      return await prisma.tipoEquipamento.findMany({
        select: { id: true, nome: true },
        orderBy: { nome: 'asc' },
      });
    },
    600 // 10-minute TTL for relatively static data
  );

  console.log('[Cache] Cache warming complete');
}

// ============================================================================
// Example 8: Type-Safe Caching with Interfaces
// ============================================================================

interface LojaListResponse {
  items: Array<{ id: string; nome: string; endereco: string }>;
  total: number;
  page: number;
  pageSize: number;
}

async function typeSafeCacheExample(page: number): Promise<LojaListResponse> {
  // TypeScript will enforce the return type matches the cached type
  return await cacheService.wrap<LojaListResponse>(
    `lojas:list:page:${page}`,
    async () => {
      const items = await prisma.loja.findMany({
        skip: (page - 1) * 50,
        take: 50,
        select: { id: true, nome: true, endereco: true },
      });

      return {
        items,
        total: await prisma.loja.count(),
        page,
        pageSize: 50,
      };
    }
  );
}

// ============================================================================
// Example 9: Graceful Degradation Demo
// ============================================================================

async function gracefulDegradationExample() {
  // Even if Redis is down, this will work:
  // - get() returns null (cache miss)
  // - set() silently fails
  // - wrap() executes the function and returns the result
  
  const data = await cacheService.wrap(
    'some:key',
    async () => {
      // This will always execute if Redis is down
      return { message: 'Data from database' };
    }
  );

  // Application continues to work, just without caching benefit
  return data;
}

// ============================================================================
// Example 10: Cache Key Patterns (Best Practices)
// ============================================================================

const CACHE_KEYS = {
  // Listing patterns - include pagination params
  LOJAS_LIST: (page: number, size: number) => `lojas:list:page:${page}:size:${size}`,
  EQUIPAMENTOS_LIST: (page: number, size: number) => `equipamentos:list:page:${page}:size:${size}`,
  
  // Detail patterns - include ID
  LOJA_DETAIL: (id: string) => `loja:${id}`,
  EQUIPAMENTO_DETAIL: (id: string) => `equipamento:${id}`,
  
  // Nested resource patterns
  LOJA_EQUIPAMENTOS: (lojaId: string) => `loja:${lojaId}:equipamentos`,
  
  // Aggregation patterns
  DASHBOARD_STATS: () => 'dashboard:stats',
  
  // User-specific patterns
  USER_PREFERENCES: (userId: string) => `user:${userId}:preferences`,
};

// Usage:
async function useCacheKeys() {
  const lojas = await cacheService.get(CACHE_KEYS.LOJAS_LIST(1, 50));
  const loja = await cacheService.get(CACHE_KEYS.LOJA_DETAIL('some-id'));
  
  // Invalidate all loja listings
  await cacheService.delPattern('lojas:list:*');
}

export {
  basicCacheExample,
  cacheAsideExample,
  updateLojaWithInvalidation,
  getLojasList,
  cacheMiddleware,
  invalidateEquipamentoCache,
  warmCache,
  typeSafeCacheExample,
  gracefulDegradationExample,
  CACHE_KEYS,
};
