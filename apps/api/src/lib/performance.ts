/**
 * Performance monitoring service
 * Tracks request duration, query count, and slow queries
 */

export interface SlowQuery {
  query: string;
  duration: number;
  params?: unknown;
  timestamp: Date;
}

export interface PerformanceMetrics {
  requestId: string;
  method: string;
  path: string;
  duration: number;
  queryCount: number;
  slowQueries: SlowQuery[];
}

/**
 * Performance monitoring service for tracking API performance
 */
export class PerformanceMonitor {
  private static readonly SLOW_QUERY_THRESHOLD_MS = 100;
  private requestMetrics = new Map<string, {
    startTime: number;
    method: string;
    path: string;
    queryCount: number;
    slowQueries: SlowQuery[];
  }>();

  /**
   * Start tracking a request
   * @param requestId Unique request identifier
   * @param method HTTP method
   * @param path Request path
   */
  startRequest(requestId: string, method: string, path: string): void {
    this.requestMetrics.set(requestId, {
      startTime: Date.now(),
      method,
      path,
      queryCount: 0,
      slowQueries: [],
    });
  }

  /**
   * Record a database query execution
   * @param requestId Request identifier
   * @param query Query string or description
   * @param duration Query duration in milliseconds
   * @param params Optional query parameters
   */
  recordQuery(
    requestId: string,
    query: string,
    duration: number,
    params?: unknown
  ): void {
    const metrics = this.requestMetrics.get(requestId);
    if (!metrics) {
      return;
    }

    metrics.queryCount++;

    // Log slow queries
    if (duration > PerformanceMonitor.SLOW_QUERY_THRESHOLD_MS) {
      const slowQuery: SlowQuery = {
        query,
        duration,
        params,
        timestamp: new Date(),
      };
      metrics.slowQueries.push(slowQuery);

      console.warn('[Slow Query]', {
        requestId,
        query,
        duration: `${duration}ms`,
        params,
      });
    }
  }

  /**
   * End request tracking and return metrics
   * @param requestId Request identifier
   * @returns Performance metrics for the request
   */
  endRequest(requestId: string): PerformanceMetrics | null {
    const metrics = this.requestMetrics.get(requestId);
    if (!metrics) {
      return null;
    }

    const duration = Date.now() - metrics.startTime;
    const result: PerformanceMetrics = {
      requestId,
      method: metrics.method,
      path: metrics.path,
      duration,
      queryCount: metrics.queryCount,
      slowQueries: metrics.slowQueries,
    };

    // Clean up
    this.requestMetrics.delete(requestId);

    return result;
  }

  /**
   * Get current metrics for a request (without ending tracking)
   * @param requestId Request identifier
   * @returns Current performance metrics or null if not found
   */
  getMetrics(requestId: string): PerformanceMetrics | null {
    const metrics = this.requestMetrics.get(requestId);
    if (!metrics) {
      return null;
    }

    const duration = Date.now() - metrics.startTime;
    return {
      requestId,
      method: metrics.method,
      path: metrics.path,
      duration,
      queryCount: metrics.queryCount,
      slowQueries: [...metrics.slowQueries],
    };
  }
}

// Export singleton instance
export const performanceMonitor = new PerformanceMonitor();
