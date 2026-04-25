import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { PerformanceMonitor } from '../performance';

describe('PerformanceMonitor', () => {
  let monitor: PerformanceMonitor;
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    monitor = new PerformanceMonitor();
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
  });

  describe('startRequest', () => {
    it('should start tracking a request', () => {
      monitor.startRequest('req-1', 'GET', '/api/lojas');

      const metrics = monitor.getMetrics('req-1');
      expect(metrics).not.toBeNull();
      expect(metrics?.requestId).toBe('req-1');
      expect(metrics?.method).toBe('GET');
      expect(metrics?.path).toBe('/api/lojas');
      expect(metrics?.queryCount).toBe(0);
      expect(metrics?.slowQueries).toEqual([]);
    });
  });

  describe('recordQuery', () => {
    beforeEach(() => {
      monitor.startRequest('req-1', 'GET', '/api/lojas');
    });

    it('should increment query count', () => {
      monitor.recordQuery('req-1', 'SELECT * FROM lojas', 50);

      const metrics = monitor.getMetrics('req-1');
      expect(metrics?.queryCount).toBe(1);
    });

    it('should not log fast queries', () => {
      monitor.recordQuery('req-1', 'SELECT * FROM lojas', 50);

      expect(consoleWarnSpy).not.toHaveBeenCalled();
      const metrics = monitor.getMetrics('req-1');
      expect(metrics?.slowQueries).toHaveLength(0);
    });

    it('should log slow queries (> 100ms)', () => {
      monitor.recordQuery('req-1', 'SELECT * FROM lojas', 150);

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        '[Slow Query]',
        expect.objectContaining({
          requestId: 'req-1',
          query: 'SELECT * FROM lojas',
          duration: '150ms',
        }),
      );

      const metrics = monitor.getMetrics('req-1');
      expect(metrics?.slowQueries).toHaveLength(1);
      expect(metrics?.slowQueries[0].query).toBe('SELECT * FROM lojas');
      expect(metrics?.slowQueries[0].duration).toBe(150);
    });

    it('should include query parameters in slow query log', () => {
      const params = { id: 123 };
      monitor.recordQuery('req-1', 'SELECT * FROM lojas WHERE id = ?', 150, params);

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        '[Slow Query]',
        expect.objectContaining({
          params,
        }),
      );

      const metrics = monitor.getMetrics('req-1');
      expect(metrics?.slowQueries[0].params).toEqual(params);
    });

    it('should track multiple queries', () => {
      monitor.recordQuery('req-1', 'SELECT * FROM lojas', 50);
      monitor.recordQuery('req-1', 'SELECT * FROM setores', 60);
      monitor.recordQuery('req-1', 'SELECT * FROM equipamentos', 150);

      const metrics = monitor.getMetrics('req-1');
      expect(metrics?.queryCount).toBe(3);
      expect(metrics?.slowQueries).toHaveLength(1);
    });

    it('should handle queries for non-existent request gracefully', () => {
      monitor.recordQuery('non-existent', 'SELECT * FROM lojas', 150);

      // Should not throw or log
      expect(consoleWarnSpy).not.toHaveBeenCalled();
    });
  });

  describe('endRequest', () => {
    it('should return metrics and clean up', () => {
      monitor.startRequest('req-1', 'GET', '/api/lojas');
      monitor.recordQuery('req-1', 'SELECT * FROM lojas', 50);

      const metrics = monitor.endRequest('req-1');

      expect(metrics).not.toBeNull();
      expect(metrics?.requestId).toBe('req-1');
      expect(metrics?.method).toBe('GET');
      expect(metrics?.path).toBe('/api/lojas');
      expect(metrics?.queryCount).toBe(1);
      expect(metrics?.duration).toBeGreaterThanOrEqual(0);

      // Should be cleaned up
      const metricsAfter = monitor.getMetrics('req-1');
      expect(metricsAfter).toBeNull();
    });

    it('should return null for non-existent request', () => {
      const metrics = monitor.endRequest('non-existent');
      expect(metrics).toBeNull();
    });

    it('should calculate duration correctly', async () => {
      monitor.startRequest('req-1', 'GET', '/api/lojas');

      // Wait a bit
      await new Promise((resolve) => setTimeout(resolve, 50));

      const metrics = monitor.endRequest('req-1');
      expect(metrics?.duration).toBeGreaterThanOrEqual(50);
    });
  });

  describe('getMetrics', () => {
    it('should return current metrics without ending tracking', () => {
      monitor.startRequest('req-1', 'GET', '/api/lojas');
      monitor.recordQuery('req-1', 'SELECT * FROM lojas', 50);

      const metrics1 = monitor.getMetrics('req-1');
      expect(metrics1).not.toBeNull();

      // Should still be tracked
      const metrics2 = monitor.getMetrics('req-1');
      expect(metrics2).not.toBeNull();
      expect(metrics2?.queryCount).toBe(1);
    });

    it('should return null for non-existent request', () => {
      const metrics = monitor.getMetrics('non-existent');
      expect(metrics).toBeNull();
    });
  });

  describe('slow query threshold', () => {
    it('should log queries at exactly 101ms as slow', () => {
      monitor.startRequest('req-1', 'GET', '/api/lojas');
      monitor.recordQuery('req-1', 'SELECT * FROM lojas', 101);

      expect(consoleWarnSpy).toHaveBeenCalled();
      const metrics = monitor.getMetrics('req-1');
      expect(metrics?.slowQueries).toHaveLength(1);
    });

    it('should not log queries at exactly 100ms as slow', () => {
      monitor.startRequest('req-1', 'GET', '/api/lojas');
      monitor.recordQuery('req-1', 'SELECT * FROM lojas', 100);

      expect(consoleWarnSpy).not.toHaveBeenCalled();
      const metrics = monitor.getMetrics('req-1');
      expect(metrics?.slowQueries).toHaveLength(0);
    });
  });

  describe('concurrent requests', () => {
    it('should track multiple requests independently', () => {
      monitor.startRequest('req-1', 'GET', '/api/lojas');
      monitor.startRequest('req-2', 'POST', '/api/equipamentos');

      monitor.recordQuery('req-1', 'SELECT * FROM lojas', 50);
      monitor.recordQuery('req-2', 'INSERT INTO equipamentos', 150);

      const metrics1 = monitor.getMetrics('req-1');
      const metrics2 = monitor.getMetrics('req-2');

      expect(metrics1?.queryCount).toBe(1);
      expect(metrics1?.slowQueries).toHaveLength(0);

      expect(metrics2?.queryCount).toBe(1);
      expect(metrics2?.slowQueries).toHaveLength(1);
    });
  });
});
