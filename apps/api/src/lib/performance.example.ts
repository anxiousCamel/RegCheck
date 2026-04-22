/**
 * Example usage of PerformanceMonitor
 * This file demonstrates how to use the performance monitoring service
 */

import { performanceMonitor } from './performance';
import { randomUUID } from 'crypto';

// Example 1: Basic request tracking
export function exampleBasicTracking() {
  const requestId = randomUUID();
  
  // Start tracking when request begins
  performanceMonitor.startRequest(requestId, 'GET', '/api/lojas');
  
  // Record database queries as they execute
  performanceMonitor.recordQuery(requestId, 'SELECT * FROM "Loja"', 45);
  performanceMonitor.recordQuery(requestId, 'SELECT * FROM "Setor" WHERE "lojaId" = ?', 30, { lojaId: 123 });
  
  // End tracking when request completes
  const metrics = performanceMonitor.endRequest(requestId);
  
  console.log('Request completed:', {
    duration: metrics?.duration,
    queryCount: metrics?.queryCount,
    slowQueries: metrics?.slowQueries.length,
  });
}

// Example 2: Tracking slow queries
export function exampleSlowQueryDetection() {
  const requestId = randomUUID();
  
  performanceMonitor.startRequest(requestId, 'GET', '/api/equipamentos');
  
  // Fast query - won't be logged
  performanceMonitor.recordQuery(requestId, 'SELECT * FROM "Equipamento" LIMIT 10', 50);
  
  // Slow query - will be logged with warning
  performanceMonitor.recordQuery(
    requestId,
    'SELECT * FROM "Equipamento" JOIN "Loja" ON "Equipamento"."lojaId" = "Loja"."id"',
    150,
    { limit: 100 }
  );
  
  const metrics = performanceMonitor.endRequest(requestId);
  
  if (metrics && metrics.slowQueries.length > 0) {
    console.warn('Request had slow queries:', {
      path: metrics.path,
      slowQueryCount: metrics.slowQueries.length,
      slowQueries: metrics.slowQueries.map(q => ({
        query: q.query,
        duration: q.duration,
      })),
    });
  }
}

// Example 3: Middleware integration pattern
export function exampleMiddlewarePattern() {
  // This would be used in Express middleware
  const requestId = randomUUID();
  const req = { method: 'GET', path: '/api/documents' };
  
  // Start tracking
  performanceMonitor.startRequest(requestId, req.method, req.path);
  
  // Simulate some queries
  performanceMonitor.recordQuery(requestId, 'SELECT * FROM "Document"', 40);
  performanceMonitor.recordQuery(requestId, 'SELECT * FROM "Template"', 35);
  
  // Get current metrics without ending (useful for logging during request)
  const currentMetrics = performanceMonitor.getMetrics(requestId);
  console.log('Current query count:', currentMetrics?.queryCount);
  
  // End tracking when response is sent
  const finalMetrics = performanceMonitor.endRequest(requestId);
  console.log('Request completed in', finalMetrics?.duration, 'ms');
}

// Example 4: Prisma integration pattern
export async function examplePrismaIntegration() {
  const requestId = randomUUID();
  
  performanceMonitor.startRequest(requestId, 'GET', '/api/lojas');
  
  // This would be integrated with Prisma's query event
  // prisma.$on('query', (e) => {
  //   performanceMonitor.recordQuery(requestId, e.query, e.duration, e.params);
  // });
  
  // Simulate Prisma queries
  performanceMonitor.recordQuery(
    requestId,
    'SELECT "Loja"."id", "Loja"."nome" FROM "Loja"',
    45
  );
  
  const metrics = performanceMonitor.endRequest(requestId);
  return metrics;
}
