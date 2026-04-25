# Cache Integration Tests Documentation

## Overview

This document describes the comprehensive integration tests for the cached services in the RegCheck API. These tests verify that the Redis caching layer works correctly across all services.

## Test Coverage

The integration tests cover all six cached services:

1. **LojaService** - Store/location management
2. **SetorService** - Department/sector management
3. **TipoEquipamentoService** - Equipment type management
4. **EquipamentoService** - Equipment management (with complex filtering)
5. **DocumentService** - Document management
6. **TemplateService** - Template management

## Requirements Validated

- **Requirement 6.3**: Cache invalidation on mutations
- **Requirement 6.5**: Graceful degradation when Redis is unavailable

## Test Categories

### 1. Cache Hit/Miss Behavior

Tests verify that:

- First request fetches from database (cache miss)
- Second identical request uses cached data (cache hit)
- Responses are identical between cache hit and miss
- Different pagination parameters use different cache keys
- Different filters use different cache keys (for EquipamentoService)

**Example Tests:**

- `should cache list responses`
- `should use different cache keys for different pagination parameters`
- `should use different cache keys for different filters`

### 2. Cache Invalidation on Mutations

Tests verify that cache is properly invalidated when data changes:

- **CREATE operations**: List caches are cleared
- **UPDATE operations**: Both list and detail caches are cleared
- **DELETE operations**: Both list and detail caches are cleared
- **Toggle operations**: Active list caches are cleared

**Example Tests:**

- `should invalidate cache after creating a [entity]`
- `should invalidate cache after updating a [entity]`
- `should invalidate cache after deleting a [entity]`

### 3. Graceful Degradation

Tests verify the system continues working when Redis is unavailable:

- Read operations work without caching
- Write operations (create/update/delete) work without cache invalidation
- No errors are thrown to the client
- System automatically reconnects when Redis becomes available

**Example Tests:**

- `should continue working when Redis is unavailable`
- `should handle Redis errors gracefully during write operations`
- `should handle Redis errors gracefully during update operations`

### 4. Cache Performance

Tests verify caching improves performance:

- Cache hits are faster than cache misses
- Concurrent requests for the same data are handled efficiently
- Multiple concurrent requests return identical data

**Example Tests:**

- `should improve response time on cache hit`
- `should handle concurrent requests efficiently`

### 5. Cross-Service Cache Invalidation

Tests verify cache invalidation is properly scoped:

- Creating/updating one entity type doesn't invalidate unrelated caches
- Each service maintains independent cache keys
- Cache invalidation is precise and doesn't clear unrelated data

**Example Tests:**

- `should not invalidate unrelated service caches`

## Cache Key Patterns

The tests verify these cache key patterns are used correctly:

### List Caches

- `lojas:list:page:{page}:size:{pageSize}`
- `setores:list:page:{page}:size:{pageSize}`
- `tipos:list:page:{page}:size:{pageSize}`
- `equipamentos:list:page:{page}:size:{pageSize}:filters:{filterJson}`
- `documents:list:page:{page}:size:{pageSize}`
- `templates:list:page:{page}:size:{pageSize}`

### Detail Caches

- `loja:{id}`
- `setor:{id}`
- `tipo:{id}`
- `equipamento:{id}`
- `document:{id}`
- `template:{id}`

### Active List Caches

- `lojas:active`
- `setores:active`
- `tipos:active`

## TTL Configuration

Tests verify these TTL (Time To Live) values:

| Service         | List TTL     | Detail TTL   | Reason                 |
| --------------- | ------------ | ------------ | ---------------------- |
| Loja            | 5 min (300s) | 2 min (120s) | Relatively static data |
| Setor           | 5 min (300s) | 2 min (120s) | Relatively static data |
| TipoEquipamento | 5 min (300s) | 2 min (120s) | Relatively static data |
| Equipamento     | 2 min (120s) | 2 min (120s) | More dynamic data      |
| Document        | 1 min (60s)  | 1 min (60s)  | Highly dynamic data    |
| Template        | 5 min (300s) | 2 min (120s) | Relatively static data |

## Running the Tests

### Run all cache integration tests:

```bash
npm test -- src/services/__tests__/services-cache.integration.test.ts
```

### Run with watch mode:

```bash
npm run test:watch -- src/services/__tests__/services-cache.integration.test.ts
```

### Run from workspace root:

```bash
pnpm --filter @regcheck/api test src/services/__tests__/services-cache.integration.test.ts
```

## Test Environment Requirements

- **Redis**: Must be running and accessible
- **PostgreSQL**: Must be running with test database
- **Environment Variables**: Properly configured in `.env` file

## Test Data Cleanup

- `beforeEach`: Clears all Redis keys with `redis.flushall()`
- `afterEach`: Clears all Redis keys with `redis.flushall()`
- Database cleanup is handled by the test framework

## Known Limitations

1. **Performance tests**: Timing-based tests may be flaky in CI environments
2. **Redis reconnection**: Tests assume Redis can be disconnected/reconnected
3. **Concurrent requests**: Test assumes reasonable system performance

## Future Enhancements

Potential improvements for the test suite:

1. **Cache warming tests**: Verify cache warming on application startup
2. **TTL expiration tests**: Verify cache entries expire after TTL
3. **Memory usage tests**: Verify cache doesn't grow unbounded
4. **Cache hit rate metrics**: Track and report cache effectiveness
5. **Load testing**: Verify cache performance under high load

## Related Files

- **Cache Service**: `apps/api/src/lib/cache.ts`
- **Service Implementations**:
  - `apps/api/src/services/loja-service.ts`
  - `apps/api/src/services/setor-service.ts`
  - `apps/api/src/services/tipo-equipamento-service.ts`
  - `apps/api/src/services/equipamento-service.ts`
  - `apps/api/src/services/document-service.ts`
  - `apps/api/src/services/template-service.ts`
- **Unit Tests**: `apps/api/src/services/__tests__/*-cache.test.ts`

## Troubleshooting

### Tests fail with "Redis connection refused"

- Ensure Redis is running: `redis-cli ping` should return `PONG`
- Check Redis connection string in `.env` file

### Tests fail with "Database connection error"

- Ensure PostgreSQL is running
- Check database connection string in `.env` file
- Run migrations: `pnpm db:migrate`

### Tests are slow

- Check Redis and PostgreSQL are running locally (not remote)
- Ensure test database is properly indexed
- Consider running tests in parallel with `--pool=threads`

### Flaky performance tests

- Performance tests may fail in CI or slow environments
- Consider increasing timeout thresholds
- Run tests multiple times to verify consistency
