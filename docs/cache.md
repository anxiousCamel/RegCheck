# CacheService Documentation

## Overview

The `CacheService` is a centralized Redis caching layer that provides type-safe caching with automatic graceful degradation when Redis is unavailable. It implements the cache-aside pattern and supports pattern-based cache invalidation.

## Features

- ✅ **Type-Safe**: Generic type support for all operations
- ✅ **Graceful Degradation**: Continues working when Redis is unavailable
- ✅ **Cache-Aside Pattern**: Built-in `wrap()` method for easy implementation
- ✅ **Pattern Invalidation**: Delete multiple related cache entries at once
- ✅ **Configurable TTL**: Set custom expiration times per cache entry
- ✅ **Error Handling**: All errors are caught and logged, never thrown

## Installation

The service is already configured and ready to use. Redis connection is managed through `apps/api/src/lib/redis.ts`.

## Basic Usage

```typescript
import { cacheService } from './lib/cache';

// Get from cache
const data = await cacheService.get<MyType>('my-key');

// Set in cache (5-minute default TTL)
await cacheService.set('my-key', { data: 'value' });

// Set with custom TTL (2 minutes)
await cacheService.set('my-key', { data: 'value' }, 120);

// Delete specific key
await cacheService.del('my-key');

// Delete all keys matching pattern
await cacheService.delPattern('lojas:list:*');
```

## Cache-Aside Pattern

The `wrap()` method implements the cache-aside pattern automatically:

```typescript
const loja = await cacheService.wrap(
  `loja:${id}`,
  async () => {
    // This only executes on cache miss
    return await prisma.loja.findUnique({ where: { id } });
  },
  120, // TTL in seconds
);
```

**How it works:**

1. Checks cache for the key
2. If found (cache hit), returns cached value
3. If not found (cache miss), executes the provided function
4. Stores the result in cache with specified TTL
5. Returns the result

## API Reference

### `get<T>(key: string): Promise<T | null>`

Retrieves a value from cache.

**Parameters:**

- `key`: Cache key to retrieve

**Returns:**

- Cached value of type `T` if found
- `null` if not found or Redis unavailable

**Example:**

```typescript
const lojas = await cacheService.get<Loja[]>('lojas:list:page:1');
if (lojas) {
  return lojas; // Cache hit
}
// Cache miss - fetch from database
```

### `set<T>(key: string, value: T, ttl?: number): Promise<void>`

Stores a value in cache.

**Parameters:**

- `key`: Cache key
- `value`: Value to cache (will be JSON serialized)
- `ttl`: Time to live in seconds (default: 300 = 5 minutes)

**Example:**

```typescript
await cacheService.set('lojas:list:page:1', lojas, 300);
```

### `del(key: string): Promise<void>`

Deletes a specific cache key.

**Parameters:**

- `key`: Cache key to delete

**Example:**

```typescript
await cacheService.del('loja:123');
```

### `delPattern(pattern: string): Promise<void>`

Deletes all keys matching a pattern.

**Parameters:**

- `pattern`: Redis key pattern (supports `*` wildcard)

**Example:**

```typescript
// Delete all loja listing caches
await cacheService.delPattern('lojas:list:*');

// Delete all caches for a specific loja
await cacheService.delPattern('loja:123:*');
```

### `wrap<T>(key: string, fn: () => Promise<T>, ttl?: number): Promise<T>`

Cache-aside pattern implementation.

**Parameters:**

- `key`: Cache key
- `fn`: Function to execute on cache miss
- `ttl`: Time to live in seconds (default: 300)

**Returns:**

- Cached value or result of `fn()`

**Example:**

```typescript
const equipamentos = await cacheService.wrap(
  'equipamentos:list:page:1',
  async () => {
    return await prisma.equipamento.findMany({ take: 50 });
  },
  300,
);
```

## Cache Key Patterns

Use consistent naming patterns for cache keys:

```typescript
// Listings with pagination
'lojas:list:page:{page}:size:{pageSize}';
'equipamentos:list:page:{page}:size:{pageSize}';

// Detail views
'loja:{id}';
'equipamento:{id}';
'document:{id}';

// Nested resources
'loja:{lojaId}:equipamentos';
'template:{templateId}:fields';

// Aggregations
'dashboard:stats';
'reports:summary';
```

## Cache Invalidation Strategy

### On Create

```typescript
// Invalidate listing caches
await cacheService.delPattern('lojas:list:*');
```

### On Update

```typescript
// Invalidate specific item and all listings
await cacheService.del(`loja:${id}`);
await cacheService.delPattern('lojas:list:*');
```

### On Delete

```typescript
// Invalidate specific item and all listings
await cacheService.del(`loja:${id}`);
await cacheService.delPattern('lojas:list:*');
```

### Cascading Invalidation

```typescript
// When updating an equipamento, also invalidate related loja cache
await cacheService.del(`equipamento:${id}`);
await cacheService.delPattern('equipamentos:list:*');
await cacheService.del(`loja:${lojaId}:equipamentos`);
```

## TTL Guidelines

Choose appropriate TTL values based on data characteristics:

| Data Type                              | TTL           | Reason                      |
| -------------------------------------- | ------------- | --------------------------- |
| Static reference data (tipos, setores) | 600s (10 min) | Rarely changes              |
| Listings (lojas, equipamentos)         | 300s (5 min)  | Moderate change frequency   |
| Detail views                           | 120s (2 min)  | May be updated frequently   |
| User-specific data                     | 60s (1 min)   | Personalized, changes often |
| Real-time data                         | 30s           | Needs to be fresh           |

## Graceful Degradation

The service automatically handles Redis failures:

- **Connection Lost**: All operations return null/undefined, application continues
- **Serialization Error**: Logs error, returns null, doesn't break request
- **Timeout**: Logs error, continues without caching

**Example behavior when Redis is down:**

```typescript
// get() returns null (cache miss)
const data = await cacheService.get('key'); // null

// set() silently fails (logs error)
await cacheService.set('key', value); // No error thrown

// wrap() executes function and returns result (no caching)
const result = await cacheService.wrap('key', async () => {
  return await fetchData(); // Always executes
}); // Returns fresh data
```

## Performance Considerations

### Cache Hit Rate

Monitor cache hit rates to optimize TTL values:

```typescript
// Add X-Cache header to responses
res.setHeader('X-Cache', cached ? 'HIT' : 'MISS');
```

### Memory Usage

Redis memory is limited. Use appropriate TTLs and avoid caching:

- Large binary data (use S3 instead)
- Frequently changing data
- User-specific data with low reuse

### Serialization Cost

JSON serialization has overhead. For very large objects, consider:

- Caching only necessary fields
- Using compression
- Storing in database with better indexing

## Testing

### Unit Tests

```bash
npm test -- src/lib/__tests__/cache.test.ts
```

### Integration Tests (requires Redis)

```bash
npm test -- src/lib/__tests__/cache.integration.test.ts
```

## Monitoring

Monitor these metrics in production:

1. **Cache Hit Rate**: Percentage of requests served from cache
2. **Cache Miss Rate**: Percentage requiring database queries
3. **Redis Connection Status**: Uptime and error rate
4. **Response Time**: Compare cached vs uncached requests
5. **Memory Usage**: Redis memory consumption

## Troubleshooting

### Cache Not Working

1. Check Redis connection: `redis.status === 'ready'`
2. Verify cache keys are consistent
3. Check TTL hasn't expired
4. Look for serialization errors in logs

### Stale Data

1. Verify cache invalidation is called on updates
2. Check TTL is appropriate for data change frequency
3. Consider using shorter TTL for frequently updated data

### Memory Issues

1. Review TTL values (too long?)
2. Check for cache key leaks (keys never deleted)
3. Monitor Redis memory usage
4. Consider implementing cache size limits

## Best Practices

1. **Always use type parameters**: `cacheService.get<MyType>(key)`
2. **Use consistent key patterns**: Follow the naming conventions
3. **Invalidate on writes**: Always invalidate related caches on CREATE/UPDATE/DELETE
4. **Set appropriate TTLs**: Match TTL to data change frequency
5. **Handle cache misses**: Always have fallback to database
6. **Monitor performance**: Track cache hit rates and response times
7. **Don't cache everything**: Only cache frequently accessed data
8. **Use wrap() for simplicity**: Prefer `wrap()` over manual get/set

## Examples

See `cache.example.ts` for comprehensive usage examples including:

- Basic get/set operations
- Cache-aside pattern
- Cache invalidation strategies
- Express middleware integration
- Type-safe caching
- Cache warming
- And more...

## Related Files

- `apps/api/src/lib/cache.ts` - Main implementation
- `apps/api/src/lib/redis.ts` - Redis connection
- `apps/api/src/lib/__tests__/cache.test.ts` - Unit tests
- `apps/api/src/lib/__tests__/cache.integration.test.ts` - Integration tests
- `apps/api/src/lib/cache.example.ts` - Usage examples

## Requirements Satisfied

This implementation satisfies:

- **Requirement 6.1**: Redis cache for frequently accessed data
- **Requirement 6.5**: Graceful degradation when Redis unavailable
- **Design Section**: Centralized cache service with type safety
