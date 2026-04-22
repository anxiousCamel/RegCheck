import { describe, it, expect, beforeEach } from 'vitest';
import { AnalyticsService } from '@/lib/scanner/services/analytics.service';

beforeEach(() => {
  AnalyticsService.clear();
});

describe('AnalyticsService', () => {
  it('tracks events', () => {
    AnalyticsService.track({ type: 'success', stage: 'complete', duration: 500 });
    expect(AnalyticsService.getEvents()).toHaveLength(1);
  });

  it('calculates success rate correctly', () => {
    AnalyticsService.track({ type: 'success', stage: 'complete', duration: 500 });
    AnalyticsService.track({ type: 'success', stage: 'complete', duration: 600 });
    AnalyticsService.track({ type: 'failure', stage: 'ocr', duration: 200 });
    const stats = AnalyticsService.getStats();
    expect(stats.totalScans).toBe(3);
    expect(stats.successRate).toBeCloseTo(2 / 3);
  });

  it('calculates average duration', () => {
    AnalyticsService.track({ type: 'success', stage: 'complete', duration: 400 });
    AnalyticsService.track({ type: 'success', stage: 'complete', duration: 600 });
    const stats = AnalyticsService.getStats();
    expect(stats.avgDuration).toBe(500);
  });

  it('calculates cache hit rate', () => {
    AnalyticsService.track({ type: 'cache_hit', stage: 'cache', duration: 5 });
    AnalyticsService.track({ type: 'success', stage: 'complete', duration: 500 });
    AnalyticsService.track({ type: 'failure', stage: 'ocr', duration: 100 });
    const stats = AnalyticsService.getStats();
    // cacheHits(1) / total scans(2: success+failure) = 0.5
    expect(stats.cacheHitRate).toBeCloseTo(0.5);
  });

  it('calculates barcode success rate', () => {
    AnalyticsService.track({ type: 'success', stage: 'complete', duration: 200, metadata: { method: 'barcode' } });
    AnalyticsService.track({ type: 'success', stage: 'complete', duration: 1500, metadata: { method: 'ocr' } });
    const stats = AnalyticsService.getStats();
    expect(stats.barcodeSuccessRate).toBeCloseTo(0.5);
  });

  it('caps events at 500', () => {
    for (let i = 0; i < 600; i++) {
      AnalyticsService.track({ type: 'success', stage: 'complete', duration: i });
    }
    expect(AnalyticsService.getEvents().length).toBeLessThanOrEqual(500);
  });

  it('returns zero stats when no events', () => {
    const stats = AnalyticsService.getStats();
    expect(stats.totalScans).toBe(0);
    expect(stats.successRate).toBe(0);
  });

  it('never throws on track', () => {
    expect(() => {
      AnalyticsService.track({ type: 'failure', stage: 'unknown', duration: 0 });
    }).not.toThrow();
  });
});
