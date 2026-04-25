import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PerformanceMonitor } from '../performance';

/**
 * Integration tests for performance monitoring
 *
 * **Validates: Requirements 8.1, 8.2**
 *
 * These tests verify:
 * - Slow query detection (> 100ms threshold)
 * - Request duration tracking
 * - Integration between performance monitoring components
 */
describe('Performance Monitoring Integration', () => {
  let monitor: PerformanceMonitor;
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    monitor = new PerformanceMonitor();
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
    consoleLogSpy.mockRestore();
  });

  describe('Slow Query Detection - Requirement 8.2', () => {
    it('should detect and log slow queries above 100ms threshold', () => {
      const requestId = 'req-slow-query';
      monitor.startRequest(requestId, 'GET', '/api/lojas');

      // Simulate a slow query
      monitor.recordQuery(
        requestId,
        'SELECT * FROM "Loja" WHERE "ativo" = true ORDER BY "nome"',
        150,
        { ativo: true },
      );

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        '[Slow Query]',
        expect.objectContaining({
          requestId,
          query: 'SELECT * FROM "Loja" WHERE "ativo" = true ORDER BY "nome"',
          duration: '150ms',
          params: { ativo: true },
        }),
      );

      const metrics = monitor.endRequest(requestId);
      expect(metrics?.slowQueries).toHaveLength(1);
      expect(metrics?.slowQueries[0]).toMatchObject({
        query: 'SELECT * FROM "Loja" WHERE "ativo" = true ORDER BY "nome"',
        duration: 150,
        params: { ativo: true },
      });
    });

    it('should not log queries at or below 100ms threshold', () => {
      const requestId = 'req-fast-query';
      monitor.startRequest(requestId, 'GET', '/api/lojas');

      // Simulate fast queries
      monitor.recordQuery(requestId, 'SELECT * FROM "Loja" LIMIT 10', 50);
      monitor.recordQuery(requestId, 'SELECT * FROM "Setor" LIMIT 10', 100);

      expect(consoleWarnSpy).not.toHaveBeenCalled();

      const metrics = monitor.endRequest(requestId);
      expect(metrics?.slowQueries).toHaveLength(0);
      expect(metrics?.queryCount).toBe(2);
    });

    it('should track multiple slow queries in a single request', () => {
      const requestId = 'req-multiple-slow';
      monitor.startRequest(requestId, 'GET', '/api/equipamentos');

      // Simulate multiple slow queries
      monitor.recordQuery(requestId, 'SELECT * FROM "Equipamento" JOIN "Loja" ON ...', 120);
      monitor.recordQuery(requestId, 'SELECT * FROM "Equipamento" JOIN "Setor" ON ...', 150);
      monitor.recordQuery(requestId, 'SELECT * FROM "TipoEquipamento"', 30);

      expect(consoleWarnSpy).toHaveBeenCalledTimes(2);

      const metrics = monitor.endRequest(requestId);
      expect(metrics?.slowQueries).toHaveLength(2);
      expect(metrics?.queryCount).toBe(3);
    });

    it('should include query parameters in slow query logs', () => {
      const requestId = 'req-with-params';
      monitor.startRequest(requestId, 'GET', '/api/equipamentos/123');

      const params = {
        id: 123,
        include: { loja: true, setor: true, tipo: true },
      };

      monitor.recordQuery(requestId, 'SELECT * FROM "Equipamento" WHERE "id" = $1', 110, params);

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        '[Slow Query]',
        expect.objectContaining({
          params,
        }),
      );

      const metrics = monitor.endRequest(requestId);
      expect(metrics?.slowQueries[0].params).toEqual(params);
    });

    it('should track timestamp for each slow query', () => {
      const requestId = 'req-timestamp';
      const beforeTime = new Date();

      monitor.startRequest(requestId, 'GET', '/api/lojas');
      monitor.recordQuery(requestId, 'SELECT * FROM "Loja"', 150);

      const afterTime = new Date();
      const metrics = monitor.endRequest(requestId);

      expect(metrics?.slowQueries[0].timestamp).toBeInstanceOf(Date);
      expect(metrics?.slowQueries[0].timestamp.getTime()).toBeGreaterThanOrEqual(
        beforeTime.getTime(),
      );
      expect(metrics?.slowQueries[0].timestamp.getTime()).toBeLessThanOrEqual(afterTime.getTime());
    });
  });

  describe('Request Duration Tracking - Requirement 8.1', () => {
    it('should track request duration accurately', async () => {
      const requestId = 'req-duration';
      monitor.startRequest(requestId, 'GET', '/api/lojas');

      // Simulate some processing time
      await new Promise((resolve) => setTimeout(resolve, 100));

      const metrics = monitor.endRequest(requestId);

      expect(metrics).not.toBeNull();
      expect(metrics?.duration).toBeGreaterThanOrEqual(100);
      expect(metrics?.duration).toBeLessThan(150); // Allow some margin
    });

    it('should track duration for requests with multiple queries', async () => {
      const requestId = 'req-multi-query';
      monitor.startRequest(requestId, 'GET', '/api/equipamentos');

      // Simulate queries with delays
      await new Promise((resolve) => setTimeout(resolve, 30));
      monitor.recordQuery(requestId, 'SELECT * FROM "Equipamento"', 50);

      await new Promise((resolve) => setTimeout(resolve, 30));
      monitor.recordQuery(requestId, 'SELECT * FROM "Loja"', 40);

      await new Promise((resolve) => setTimeout(resolve, 30));
      monitor.recordQuery(requestId, 'SELECT * FROM "Setor"', 35);

      const metrics = monitor.endRequest(requestId);

      expect(metrics?.duration).toBeGreaterThanOrEqual(90);
      expect(metrics?.queryCount).toBe(3);
    });

    it('should track duration even when no queries are executed', async () => {
      const requestId = 'req-no-queries';
      monitor.startRequest(requestId, 'GET', '/api/health');

      await new Promise((resolve) => setTimeout(resolve, 50));

      const metrics = monitor.endRequest(requestId);

      expect(metrics?.duration).toBeGreaterThanOrEqual(50);
      expect(metrics?.queryCount).toBe(0);
      expect(metrics?.slowQueries).toHaveLength(0);
    });

    it('should include request metadata in metrics', async () => {
      const requestId = 'req-metadata';
      monitor.startRequest(requestId, 'POST', '/api/lojas');

      // Add a small delay to ensure duration > 0
      await new Promise((resolve) => setTimeout(resolve, 1));

      monitor.recordQuery(requestId, 'INSERT INTO "Loja"', 45);

      const metrics = monitor.endRequest(requestId);

      expect(metrics).toMatchObject({
        requestId: 'req-metadata',
        method: 'POST',
        path: '/api/lojas',
        queryCount: 1,
      });
      expect(metrics?.duration).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Full Request Lifecycle', () => {
    it('should track complete request lifecycle with mixed query performance', async () => {
      const requestId = 'req-lifecycle';
      monitor.startRequest(requestId, 'GET', '/api/equipamentos?page=1&pageSize=50');

      // Simulate realistic query pattern
      await new Promise((resolve) => setTimeout(resolve, 10));
      monitor.recordQuery(requestId, 'SELECT COUNT(*) FROM "Equipamento"', 25);

      await new Promise((resolve) => setTimeout(resolve, 20));
      monitor.recordQuery(
        requestId,
        'SELECT * FROM "Equipamento" JOIN "Loja" JOIN "Setor" JOIN "TipoEquipamento"',
        120, // Slow query
        { page: 1, pageSize: 50 },
      );

      await new Promise((resolve) => setTimeout(resolve, 10));
      monitor.recordQuery(requestId, 'SELECT * FROM "Loja" WHERE "id" IN (...)', 30);

      const metrics = monitor.endRequest(requestId);

      // Verify complete metrics
      expect(metrics).toMatchObject({
        requestId: 'req-lifecycle',
        method: 'GET',
        path: '/api/equipamentos?page=1&pageSize=50',
        queryCount: 3,
      });

      expect(metrics?.duration).toBeGreaterThanOrEqual(40);
      expect(metrics?.slowQueries).toHaveLength(1);
      expect(metrics?.slowQueries[0].duration).toBe(120);

      // Verify slow query was logged
      expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        '[Slow Query]',
        expect.objectContaining({
          duration: '120ms',
        }),
      );
    });

    it('should handle concurrent requests independently', async () => {
      const req1 = 'req-concurrent-1';
      const req2 = 'req-concurrent-2';

      // Start both requests
      monitor.startRequest(req1, 'GET', '/api/lojas');
      monitor.startRequest(req2, 'GET', '/api/equipamentos');

      // Record queries for req1
      await new Promise((resolve) => setTimeout(resolve, 30));
      monitor.recordQuery(req1, 'SELECT * FROM "Loja"', 50);

      // Record queries for req2 (with slow query)
      await new Promise((resolve) => setTimeout(resolve, 20));
      monitor.recordQuery(req2, 'SELECT * FROM "Equipamento"', 150);

      // End both requests
      const metrics1 = monitor.endRequest(req1);
      const metrics2 = monitor.endRequest(req2);

      // Verify req1 metrics
      expect(metrics1?.requestId).toBe(req1);
      expect(metrics1?.queryCount).toBe(1);
      expect(metrics1?.slowQueries).toHaveLength(0);

      // Verify req2 metrics
      expect(metrics2?.requestId).toBe(req2);
      expect(metrics2?.queryCount).toBe(1);
      expect(metrics2?.slowQueries).toHaveLength(1);

      // Only req2 should have logged a slow query
      expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        '[Slow Query]',
        expect.objectContaining({
          requestId: req2,
        }),
      );
    });

    it('should clean up metrics after request ends', () => {
      const requestId = 'req-cleanup';
      monitor.startRequest(requestId, 'GET', '/api/lojas');
      monitor.recordQuery(requestId, 'SELECT * FROM "Loja"', 50);

      // Metrics should be available before ending
      const metricsBefore = monitor.getMetrics(requestId);
      expect(metricsBefore).not.toBeNull();

      // End request
      const finalMetrics = monitor.endRequest(requestId);
      expect(finalMetrics).not.toBeNull();

      // Metrics should be cleaned up after ending
      const metricsAfter = monitor.getMetrics(requestId);
      expect(metricsAfter).toBeNull();
    });
  });

  describe('Edge Cases', () => {
    it('should handle queries recorded for non-existent request', () => {
      // Should not throw or log
      monitor.recordQuery('non-existent', 'SELECT * FROM "Loja"', 150);

      expect(consoleWarnSpy).not.toHaveBeenCalled();
    });

    it('should handle ending non-existent request', () => {
      const metrics = monitor.endRequest('non-existent');
      expect(metrics).toBeNull();
    });

    it('should handle getting metrics for non-existent request', () => {
      const metrics = monitor.getMetrics('non-existent');
      expect(metrics).toBeNull();
    });

    it('should handle very fast requests (< 1ms)', () => {
      const requestId = 'req-fast';
      monitor.startRequest(requestId, 'GET', '/api/health');

      const metrics = monitor.endRequest(requestId);

      expect(metrics?.duration).toBeGreaterThanOrEqual(0);
    });

    it('should handle requests with many queries', () => {
      const requestId = 'req-many-queries';
      monitor.startRequest(requestId, 'GET', '/api/complex');

      // Record 100 queries
      for (let i = 0; i < 100; i++) {
        monitor.recordQuery(requestId, `SELECT * FROM "Table${i}"`, 50);
      }

      const metrics = monitor.endRequest(requestId);

      expect(metrics?.queryCount).toBe(100);
      expect(metrics?.slowQueries).toHaveLength(0);
    });

    it('should handle requests with all slow queries', () => {
      const requestId = 'req-all-slow';
      monitor.startRequest(requestId, 'GET', '/api/slow-endpoint');

      // Record 5 slow queries
      for (let i = 0; i < 5; i++) {
        monitor.recordQuery(requestId, `SLOW QUERY ${i}`, 150 + i * 10);
      }

      const metrics = monitor.endRequest(requestId);

      expect(metrics?.queryCount).toBe(5);
      expect(metrics?.slowQueries).toHaveLength(5);
      expect(consoleWarnSpy).toHaveBeenCalledTimes(5);
    });
  });

  describe('Performance Thresholds', () => {
    it('should correctly identify threshold boundary at 100ms', () => {
      const requestId = 'req-threshold';
      monitor.startRequest(requestId, 'GET', '/api/test');

      // Test queries at boundary
      monitor.recordQuery(requestId, 'Query at 99ms', 99);
      monitor.recordQuery(requestId, 'Query at 100ms', 100);
      monitor.recordQuery(requestId, 'Query at 101ms', 101);

      const metrics = monitor.endRequest(requestId);

      // Only 101ms should be considered slow
      expect(metrics?.slowQueries).toHaveLength(1);
      expect(metrics?.slowQueries[0].duration).toBe(101);
      expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
    });

    it('should handle extremely slow queries', () => {
      const requestId = 'req-extreme';
      monitor.startRequest(requestId, 'GET', '/api/test');

      monitor.recordQuery(requestId, 'EXTREMELY SLOW QUERY', 5000);

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        '[Slow Query]',
        expect.objectContaining({
          duration: '5000ms',
        }),
      );

      const metrics = monitor.endRequest(requestId);
      expect(metrics?.slowQueries[0].duration).toBe(5000);
    });
  });
});
