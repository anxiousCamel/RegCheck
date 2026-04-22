# Prisma Query Logging

This module provides automatic query logging and performance monitoring for all Prisma database operations.

## Features

- **Automatic Query Tracking**: All Prisma queries are automatically tracked per request
- **Slow Query Detection**: Queries taking longer than 100ms are logged with full details
- **Request Context Association**: Queries are associated with their originating HTTP request using AsyncLocalStorage
- **Performance Metrics**: Query count and slow query count are included in request logs
- **Zero Configuration**: Works automatically once initialized

## Architecture

The query logging system consists of three main components:

1. **Prisma Client Configuration** (`packages/database/src/index.ts`)
   - Configured to emit query events
   - Events include query text, parameters, duration, and timestamp

2. **Query Logger** (`apps/api/src/lib/prisma-query-logger.ts`)
   - Listens to Prisma query events
   - Uses AsyncLocalStorage to track request context
   - Integrates with PerformanceMonitor to record queries

3. **Performance Middleware** (`apps/api/src/middleware/performance-middleware.ts`)
   - Sets up request context for each HTTP request
   - Wraps request handling in AsyncLocalStorage context
   - Logs final metrics including query count

## How It Works

```
HTTP Request
    ↓
Performance Middleware
    ↓ (sets up AsyncLocalStorage context)
Request Handler
    ↓
Prisma Query
    ↓ (emits query event)
Query Logger
    ↓ (records in PerformanceMonitor)
Response
    ↓
Performance Middleware
    ↓ (logs metrics with query count)
```

## Usage

### Initialization

The query logging is automatically initialized in `server.ts`:

```typescript
import { initializePrismaQueryLogging } from './lib/prisma-query-logger';

// Initialize at server startup
initializePrismaQueryLogging();
```

### Request Logs

Every request is logged with query metrics:

```json
{
  "requestId": "550e8400-e29b-41d4-a716-446655440000",
  "method": "GET",
  "path": "/api/lojas",
  "statusCode": 200,
  "duration": "145ms",
  "cacheStatus": "MISS",
  "queryCount": 3,
  "slowQueries": 1
}
```

### Slow Query Logs

Queries exceeding 100ms are logged separately:

```json
{
  "requestId": "550e8400-e29b-41d4-a716-446655440000",
  "query": "SELECT * FROM \"Equipamento\" JOIN \"Loja\" ON ...",
  "duration": "150ms",
  "params": "[1, 2, 3]"
}
```

## Configuration

### Slow Query Threshold

The threshold for slow queries is defined in `PerformanceMonitor`:

```typescript
private static readonly SLOW_QUERY_THRESHOLD_MS = 100;
```

To change this threshold, modify the constant in `apps/api/src/lib/performance.ts`.

### Query Event Logging

Prisma is configured to emit query events in `packages/database/src/index.ts`:

```typescript
new PrismaClient({
  log: [
    { level: 'query', emit: 'event' },
    { level: 'error', emit: 'stdout' },
    { level: 'warn', emit: 'stdout' },
  ],
});
```

## Performance Impact

The query logging system is designed to have minimal performance impact:

- **AsyncLocalStorage**: Native Node.js feature with negligible overhead
- **Event Listeners**: Asynchronous, non-blocking
- **Conditional Logging**: Only slow queries trigger detailed logging
- **Memory Management**: Request metrics are cleaned up after response

## Testing

### Unit Tests

Test the query logging components in isolation:

```bash
npm test src/lib/__tests__/prisma-query-logger.test.ts
```

### Integration Tests

Test the full flow with actual database queries:

```bash
npm test src/middleware/__tests__/prisma-query-logging.integration.test.ts
```

## Troubleshooting

### Queries Not Being Tracked

1. Verify `initializePrismaQueryLogging()` is called at server startup
2. Check that `performanceMiddleware` is registered before route handlers
3. Ensure Prisma client is configured to emit query events

### Request Context Not Available

If queries show "No Request Context" warnings:

1. Verify the query is happening within an HTTP request handler
2. Check that `performanceMiddleware` is wrapping the request
3. Ensure AsyncLocalStorage context is properly propagated through async operations

### High Memory Usage

If you notice high memory usage:

1. Check that `endRequest()` is being called to clean up metrics
2. Verify the `finish` event listener is properly attached to responses
3. Monitor the number of concurrent requests

## Related Components

- **PerformanceMonitor** (`apps/api/src/lib/performance.ts`): Core performance tracking service
- **Performance Middleware** (`apps/api/src/middleware/performance-middleware.ts`): Request-level performance tracking
- **Cache Service** (`apps/api/src/lib/cache.ts`): Redis caching layer

## Requirements Validation

**Validates: Requirements 8.2**

This implementation satisfies the following acceptance criteria:

1. ✅ Backend logs query execution time for each database query
2. ✅ Slow queries (> 100ms) are logged with query details and parameters
3. ✅ Query count is tracked per request and included in request logs
4. ✅ Query logging integrates with the PerformanceMonitor service
5. ✅ Query logging does not significantly impact performance
