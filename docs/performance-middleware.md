# Performance Middleware

## Overview

The performance middleware tracks request timing, adds performance headers, and logs request details with cache status. It integrates with the `PerformanceMonitor` service to provide comprehensive performance tracking across the API.

**Validates: Requirements 8.1**

## Features

- **Request Timing**: Tracks request start time and calculates total duration
- **Unique Request IDs**: Generates UUID for each request for correlation across logs
- **Performance Headers**: Adds `X-Response-Time` header to all responses
- **Comprehensive Logging**: Logs request details including:
  - HTTP method and path
  - Status code
  - Duration in milliseconds
  - Cache status (HIT/MISS)
  - Query count
  - Number of slow queries
- **Slow Request Detection**: Warns when requests take > 500ms
- **Integration**: Works seamlessly with `PerformanceMonitor` for query tracking

## Usage

### Basic Setup

The middleware is already configured in `server.ts`:

```typescript
import { performanceMiddleware } from './middleware/performance-middleware';

app.use(performanceMiddleware);
```

### Request Properties

The middleware extends the Express Request object with:

```typescript
interface RequestWithPerformance extends Request {
  requestId: string;  // Unique UUID for this request
  startTime: number;  // Timestamp when request started
}
```

Access these properties in your route handlers:

```typescript
app.get('/api/lojas', (req: Request, res: Response) => {
  const { requestId, startTime } = req as RequestWithPerformance;
  console.log(`Processing request ${requestId}`);
  // ... your logic
});
```

## Response Headers

The middleware adds the following header to all responses:

- `X-Response-Time`: Duration in milliseconds (e.g., `"45ms"`)

## Logging

### Standard Request Log

Every request is logged with the following format:

```
[Request] {
  requestId: "550e8400-e29b-41d4-a716-446655440000",
  method: "GET",
  path: "/api/lojas",
  statusCode: 200,
  duration: "45ms",
  cacheStatus: "HIT",
  queryCount: 0,
  slowQueries: 0
}
```

### Slow Request Warning

Requests taking > 500ms trigger a warning:

```
[Slow Request] {
  requestId: "550e8400-e29b-41d4-a716-446655440000",
  method: "GET",
  path: "/api/equipamentos",
  duration: "650ms",
  cacheStatus: "MISS",
  queryCount: 5
}
```

## Cache Status Integration

The middleware reads the `X-Cache-Status` header set by cache middleware:

```typescript
// In cache middleware
res.setHeader('X-Cache-Status', 'HIT');

// Performance middleware will log this status
// Output: cacheStatus: "HIT"
```

If no cache status is set, it defaults to `"MISS"`.

## Integration with PerformanceMonitor

The middleware automatically integrates with the `PerformanceMonitor` service:

1. **Start Tracking**: Calls `performanceMonitor.startRequest()` when request begins
2. **Query Tracking**: Route handlers can use `performanceMonitor.recordQuery()` to track database queries
3. **End Tracking**: Calls `performanceMonitor.endRequest()` when response finishes

Example with query tracking:

```typescript
import { performanceMonitor } from '../lib/performance';
import { RequestWithPerformance } from '../middleware/performance-middleware';

app.get('/api/lojas', async (req: Request, res: Response) => {
  const { requestId } = req as RequestWithPerformance;
  
  const startQuery = Date.now();
  const lojas = await prisma.loja.findMany();
  const queryDuration = Date.now() - startQuery;
  
  performanceMonitor.recordQuery(
    requestId,
    'SELECT * FROM lojas',
    queryDuration
  );
  
  res.json(lojas);
});
```

## Performance Thresholds

- **Slow Request**: > 500ms (triggers warning log)
- **Slow Query**: > 100ms (tracked by PerformanceMonitor)

## Testing

### Unit Tests

Located in `__tests__/performance-middleware.test.ts`:

- Request ID and start time assignment
- Performance monitor integration
- Header addition
- Logging behavior
- Slow request detection
- Graceful error handling

### Integration Tests

Located in `__tests__/performance-middleware.integration.test.ts`:

- End-to-end request tracking
- Header verification
- Concurrent request handling
- Cache status integration

Run tests:

```bash
npm test src/middleware/__tests__/performance-middleware
```

## Example Output

### Fast Cached Request

```
[Request] {
  requestId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  method: "GET",
  path: "/api/lojas",
  statusCode: 200,
  duration: "12ms",
  cacheStatus: "HIT",
  queryCount: 0,
  slowQueries: 0
}
```

### Slow Uncached Request

```
[Request] {
  requestId: "b2c3d4e5-f6a7-8901-bcde-f12345678901",
  method: "GET",
  path: "/api/equipamentos",
  statusCode: 200,
  duration: "650ms",
  cacheStatus: "MISS",
  queryCount: 5,
  slowQueries: 2
}

[Slow Request] {
  requestId: "b2c3d4e5-f6a7-8901-bcde-f12345678901",
  method: "GET",
  path: "/api/equipamentos",
  duration: "650ms",
  cacheStatus: "MISS",
  queryCount: 5
}
```

## Best Practices

1. **Always use with PerformanceMonitor**: Track database queries for complete performance visibility
2. **Set cache headers**: Ensure cache middleware sets `X-Cache-Status` for accurate logging
3. **Monitor slow requests**: Review slow request logs regularly to identify performance bottlenecks
4. **Use request IDs**: Include request ID in all related logs for easy correlation
5. **Don't block on logging**: All logging is non-blocking and won't impact request performance

## Related Components

- `lib/performance.ts`: PerformanceMonitor service for query tracking
- `middleware/cache-middleware.ts`: Sets cache status headers
- `middleware/request-logger.ts`: Legacy simple logger (replaced by this middleware)

## Migration from request-logger

The performance middleware replaces the simple `request-logger` middleware with enhanced functionality:

**Before:**
```typescript
app.use(requestLogger);
```

**After:**
```typescript
app.use(performanceMiddleware);
```

The new middleware provides:
- ✅ Request IDs for correlation
- ✅ Performance headers
- ✅ Cache status tracking
- ✅ Query count tracking
- ✅ Slow request detection
- ✅ Integration with PerformanceMonitor
