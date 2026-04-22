# Cache Middleware

Express middleware for automatic response caching using Redis.

## Features

- ✅ Automatic caching of GET requests
- ✅ Configurable TTL (Time To Live)
- ✅ Custom cache key generation
- ✅ Conditional caching based on request/response
- ✅ X-Cache header (HIT/MISS) for debugging
- ✅ Graceful degradation when Redis is unavailable
- ✅ Type-safe with TypeScript

## Basic Usage

```typescript
import { cacheMiddleware } from './middleware/cache-middleware';

// Apply to specific routes
app.get('/api/lojas', cacheMiddleware(), async (req, res) => {
  const lojas = await LojaService.list();
  res.json({ items: lojas });
});
```

## Configuration Options

### `ttl` (number)
Time to live in seconds. Default: 300 (5 minutes)

```typescript
app.get('/api/documents', cacheMiddleware({ ttl: 120 }), handler);
```

### `keyGenerator` (function)
Custom function to generate cache keys. Default: `cache:{method}:{path}:{queryString}`

```typescript
app.get('/api/equipamentos', cacheMiddleware({
  keyGenerator: (req) => {
    const { page, pageSize, lojaId } = req.query;
    return `equipamentos:page:${page}:size:${pageSize}:loja:${lojaId || 'all'}`;
  }
}), handler);
```

### `shouldCache` (function)
Conditional caching based on request/response. Default: cache only 2xx responses

```typescript
app.get('/api/templates', cacheMiddleware({
  shouldCache: (req, res) => {
    return res.statusCode === 200 && req.query.status === 'published';
  }
}), handler);
```

## Cache Key Patterns

Use consistent patterns for easy cache invalidation:

```typescript
// Listing endpoints
`lojas:list:page:{page}:size:{pageSize}`
`equipamentos:list:page:{page}:size:{pageSize}`

// Detail endpoints
`loja:{id}`
`equipamento:{id}`
```

## Cache Invalidation

When data changes, invalidate related caches:

```typescript
import { cacheService } from '../lib/cache';

// Invalidate all listing caches
await cacheService.delPattern('lojas:list:*');

// Invalidate specific detail cache
await cacheService.del(`loja:${id}`);
```

## X-Cache Header

The middleware adds an `X-Cache` header to all responses:

- `X-Cache: MISS` - Response was not in cache, fetched from database
- `X-Cache: HIT` - Response was served from cache

Use this for debugging and monitoring cache effectiveness:

```bash
curl -I http://localhost:4000/api/lojas
# First request: X-Cache: MISS
# Second request: X-Cache: HIT
```

## Recommended TTL Values

Based on data volatility:

```typescript
const CACHE_TTL = {
  STATIC: 300,    // 5 min - lojas, setores, tipos (rarely change)
  DYNAMIC: 120,   // 2 min - equipamentos (moderate changes)
  VOLATILE: 60,   // 1 min - documents (frequent changes)
};
```

## Error Handling

The middleware gracefully handles Redis failures:

- If Redis is unavailable, requests proceed normally without caching
- Cache failures are logged but don't break the application
- Responses always reach the client, with or without caching

## Performance Impact

Expected performance improvements:

- **Cache Hit**: ~50ms response time (Redis lookup)
- **Cache Miss**: Normal response time + ~5ms (cache write)
- **Cache Hit Rate**: Target 70%+ for listing endpoints

## Testing

The middleware includes comprehensive tests:

- Unit tests: `src/middleware/__tests__/cache-middleware.test.ts`
- Integration tests: `src/middleware/__tests__/cache-middleware.integration.test.ts`

Run tests:

```bash
npm test cache-middleware
```

## Examples

See `cache-middleware.example.ts` for detailed usage examples.

## Related

- **CacheService**: `src/lib/cache.ts` - Underlying cache service
- **Redis Client**: `src/lib/redis.ts` - Redis connection
- **Requirements**: Implements requirements 6.1, 6.2 from page-load-optimization spec
