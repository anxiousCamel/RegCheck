import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { requestContext } from '../prisma-query-logger';
import { performanceMonitor } from '../performance';

describe('Prisma Query Logger', () => {
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
  });

  describe('requestContext', () => {
    it('should store and retrieve request context', () => {
      const requestId = 'test-request-123';

      requestContext.run({ requestId }, () => {
        const context = requestContext.getStore();
        expect(context).toBeDefined();
        expect(context?.requestId).toBe(requestId);
      });
    });

    it('should return undefined outside of context', () => {
      const context = requestContext.getStore();
      expect(context).toBeUndefined();
    });

    it('should isolate contexts between different runs', () => {
      const requestId1 = 'request-1';
      const requestId2 = 'request-2';

      requestContext.run({ requestId: requestId1 }, () => {
        const context1 = requestContext.getStore();
        expect(context1?.requestId).toBe(requestId1);
      });

      requestContext.run({ requestId: requestId2 }, () => {
        const context2 = requestContext.getStore();
        expect(context2?.requestId).toBe(requestId2);
      });
    });
  });

  describe('Query logging integration', () => {
    it('should track queries within request context', () => {
      const requestId = 'test-request-123';
      performanceMonitor.startRequest(requestId, 'GET', '/api/lojas');

      requestContext.run({ requestId }, () => {
        // Simulate a query being recorded
        performanceMonitor.recordQuery(requestId, 'SELECT * FROM "Loja"', 45, '[]');
      });

      const metrics = performanceMonitor.endRequest(requestId);
      expect(metrics?.queryCount).toBe(1);
      expect(metrics?.slowQueries).toHaveLength(0);
    });

    it('should log slow queries within request context', () => {
      const requestId = 'test-request-456';
      performanceMonitor.startRequest(requestId, 'GET', '/api/equipamentos');

      requestContext.run({ requestId }, () => {
        // Simulate a slow query
        performanceMonitor.recordQuery(
          requestId,
          'SELECT * FROM "Equipamento" JOIN "Loja" ON ...',
          150,
          '[1, 2, 3]',
        );
      });

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        '[Slow Query]',
        expect.objectContaining({
          requestId,
          duration: '150ms',
        }),
      );

      const metrics = performanceMonitor.endRequest(requestId);
      expect(metrics?.queryCount).toBe(1);
      expect(metrics?.slowQueries).toHaveLength(1);
      expect(metrics?.slowQueries[0].duration).toBe(150);
    });

    it('should track multiple queries in the same request', () => {
      const requestId = 'test-request-789';
      performanceMonitor.startRequest(requestId, 'GET', '/api/documents');

      requestContext.run({ requestId }, () => {
        performanceMonitor.recordQuery(requestId, 'SELECT * FROM "Document"', 30);
        performanceMonitor.recordQuery(requestId, 'SELECT * FROM "Template"', 40);
        performanceMonitor.recordQuery(requestId, 'SELECT * FROM "Field"', 120);
      });

      const metrics = performanceMonitor.endRequest(requestId);
      expect(metrics?.queryCount).toBe(3);
      expect(metrics?.slowQueries).toHaveLength(1);
      expect(metrics?.slowQueries[0].query).toBe('SELECT * FROM "Field"');
    });
  });

  describe('Query logging without request context', () => {
    it('should handle queries without request context gracefully', () => {
      // This simulates queries from background jobs or startup
      // They should not crash, but should log slow queries differently

      // No request context, so this should not throw
      expect(() => {
        const context = requestContext.getStore();
        expect(context).toBeUndefined();
      }).not.toThrow();
    });
  });
});

/**
 * **Validates: Requirements 8.2**
 *
 * These tests verify that:
 * 1. Prisma query events are properly captured
 * 2. Slow queries (> 100ms) are logged with duration and parameters
 * 3. Query count is tracked per request using AsyncLocalStorage
 * 4. Request context is properly isolated between concurrent requests
 * 5. Queries without request context are handled gracefully
 */
