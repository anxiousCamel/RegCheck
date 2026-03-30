import { describe, it, expect, beforeEach } from 'vitest';
import { AdaptiveOCRService } from '@/lib/scanner/services/adaptive-ocr.service';

describe('AdaptiveOCRService', () => {
  beforeEach(() => {
    AdaptiveOCRService.reset();
  });

  describe('getParams', () => {
    it('returns default params on attempt 0', () => {
      const p = AdaptiveOCRService.getParams(0);
      expect(p.threshold).toBe(0);
      expect(p.contrast).toBe(1.0);
      expect(p.maxWidth).toBe(800);
    });

    it('returns higher contrast on attempt 1', () => {
      const p = AdaptiveOCRService.getParams(1);
      expect(p.contrast).toBeGreaterThan(1.0);
    });

    it('returns fixed threshold on attempt 2', () => {
      const p = AdaptiveOCRService.getParams(2);
      expect(p.threshold).toBeGreaterThan(0);
    });

    it('clamps to last variation for attempts beyond max', () => {
      const p2 = AdaptiveOCRService.getParams(2);
      const p99 = AdaptiveOCRService.getParams(99);
      expect(p99.contrast).toBe(p2.contrast);
    });
  });

  describe('getAdjustedDefaults', () => {
    it('returns standard defaults with no failures', () => {
      const p = AdaptiveOCRService.getAdjustedDefaults();
      expect(p.contrast).toBe(1.0);
    });

    it('returns elevated defaults after 3+ failures', () => {
      AdaptiveOCRService.recordFailure();
      AdaptiveOCRService.recordFailure();
      AdaptiveOCRService.recordFailure();
      const p = AdaptiveOCRService.getAdjustedDefaults();
      expect(p.contrast).toBeGreaterThan(1.0);
    });
  });

  describe('recordSuccess / recordFailure', () => {
    it('failure count does not go below 0', () => {
      AdaptiveOCRService.recordSuccess(); // should not throw
      const p = AdaptiveOCRService.getAdjustedDefaults();
      expect(p.contrast).toBe(1.0);
    });

    it('success decrements failure count', () => {
      AdaptiveOCRService.recordFailure();
      AdaptiveOCRService.recordFailure();
      AdaptiveOCRService.recordFailure();
      AdaptiveOCRService.recordSuccess();
      // 2 failures remaining — still below threshold of 3
      const p = AdaptiveOCRService.getAdjustedDefaults();
      expect(p.contrast).toBe(1.0);
    });
  });
});
