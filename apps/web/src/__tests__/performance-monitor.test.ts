import { describe, it, expect, vi, beforeEach } from 'vitest';
import { reportWebVitals, initWebVitals } from '@/lib/performance-monitor';
import type { Metric } from 'web-vitals';

// Mock web-vitals functions
vi.mock('web-vitals', () => ({
  onCLS: vi.fn((callback) => callback),
  onFCP: vi.fn((callback) => callback),
  onFID: vi.fn((callback) => callback),
  onLCP: vi.fn((callback) => callback),
  onTTFB: vi.fn((callback) => callback),
}));

describe('Performance Monitor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock console methods
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  describe('reportWebVitals', () => {
    it('should handle metric reporting without throwing', () => {
      const mockMetric: Metric = {
        id: 'test-id',
        name: 'LCP',
        value: 1500,
        rating: 'good',
        delta: 1500,
        navigationType: 'navigate',
        entries: [],
      };

      expect(() => reportWebVitals(mockMetric)).not.toThrow();
    });

    it('should log metrics in development mode', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const mockMetric: Metric = {
        id: 'test-id',
        name: 'FCP',
        value: 800,
        rating: 'good',
        delta: 800,
        navigationType: 'navigate',
        entries: [],
      };

      reportWebVitals(mockMetric);

      expect(console.log).toHaveBeenCalledWith(
        '[Web Vitals]',
        expect.objectContaining({
          metric: 'FCP',
          value: 800,
          rating: 'good',
        })
      );

      process.env.NODE_ENV = originalEnv;
    });

    it('should handle errors gracefully', () => {
      const invalidMetric = null as unknown as Metric;

      expect(() => reportWebVitals(invalidMetric)).not.toThrow();
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('initWebVitals', () => {
    it('should initialize without throwing', () => {
      expect(() => initWebVitals()).not.toThrow();
    });
  });
});
