import type { Request, Response, NextFunction } from 'express';
import { performanceMonitor } from '../lib/performance';
import { requestContext } from '../lib/prisma-query-logger';
import { randomUUID } from 'crypto';

/**
 * Extended Request interface with performance tracking properties
 */
export interface RequestWithPerformance extends Request {
  requestId: string;
  startTime: number;
}

/**
 * Performance middleware that tracks request timing and adds performance headers
 * 
 * Features:
 * - Tracks request start time
 * - Generates unique request ID for correlation
 * - Adds X-Response-Time header with duration in milliseconds
 * - Logs request details including duration and cache status
 * - Integrates with PerformanceMonitor for query tracking
 * - Sets up request context for Prisma query logging
 * 
 * **Validates: Requirements 8.1, 8.2**
 */
export function performanceMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const requestId = randomUUID();
  const startTime = Date.now();

  // Extend request with performance tracking properties
  (req as RequestWithPerformance).requestId = requestId;
  (req as RequestWithPerformance).startTime = startTime;

  // Start performance monitoring
  performanceMonitor.startRequest(requestId, req.method, req.path);

  // Intercept res.end to set the header before the response is sent
  const originalEnd = res.end.bind(res);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (res as any).end = (...args: Parameters<typeof res.end>) => {
    const duration = Date.now() - startTime;
    if (!res.headersSent) {
      res.setHeader('X-Response-Time', `${duration}ms`);
    }
    return originalEnd(...args);
  };

  // Track response finish (logging only — headers already set above)
  res.on('finish', () => {
    const duration = Date.now() - startTime;

    // Get performance metrics
    const metrics = performanceMonitor.endRequest(requestId);

    // Determine cache status from response headers
    const cacheStatus = res.getHeader('X-Cache-Status') || 'MISS';

    // Log request with performance details
    console.log('[Request]', {
      requestId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      cacheStatus,
      queryCount: metrics?.queryCount ?? 0,
      slowQueries: metrics?.slowQueries.length ?? 0,
    });

    // Log warning for slow requests (> 500ms)
    if (duration > 500) {
      console.warn('[Slow Request]', {
        requestId,
        method: req.method,
        path: req.path,
        duration: `${duration}ms`,
        cacheStatus,
        queryCount: metrics?.queryCount ?? 0,
      });
    }
  });

  // Run the rest of the middleware chain within the request context
  // This allows Prisma query events to access the requestId
  requestContext.run({ requestId }, () => {
    next();
  });
}
