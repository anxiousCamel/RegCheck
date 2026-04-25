/**
 * Prisma query logging integration with PerformanceMonitor
 *
 * This module sets up Prisma query event listeners to:
 * - Log slow queries (> 100ms) with duration and parameters
 * - Track query count per request
 * - Integrate with the PerformanceMonitor service
 *
 * **Validates: Requirements 8.2**
 */

import { prisma } from '@regcheck/database';
import { performanceMonitor } from './performance';
import { AsyncLocalStorage } from 'async_hooks';

/**
 * AsyncLocalStorage for tracking request context across async operations
 * This allows us to associate Prisma queries with the current request
 */
export const requestContext = new AsyncLocalStorage<{ requestId: string }>();

/**
 * Initialize Prisma query logging
 * Sets up event listeners for query events and integrates with PerformanceMonitor
 */
export function initializePrismaQueryLogging(): void {
  // Listen to query events
  // 'query' event is supported at runtime but not in Prisma's public typings;
  // cast to `never` is required to bypass the overload mismatch.
  prisma.$on(
    'query' as never,
    (event: {
      timestamp: Date;
      query: string;
      params: string;
      duration: number;
      target: string;
    }) => {
      const context = requestContext.getStore();

      // If we have a request context, record the query in PerformanceMonitor
      if (context?.requestId) {
        performanceMonitor.recordQuery(
          context.requestId,
          event.query,
          event.duration,
          event.params,
        );
      } else {
        // Log queries without request context (e.g., background jobs, startup)
        if (event.duration > 100) {
          console.warn('[Slow Query - No Request Context]', {
            query: event.query,
            duration: `${event.duration}ms`,
            params: event.params,
            timestamp: event.timestamp,
          });
        }
      }
    },
  );

  console.log('[Prisma Query Logger] Initialized');
}
