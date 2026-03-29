/**
 * Adapts preprocessing parameters based on previous OCR failures.
 * Each retry uses different settings for better results.
 */

import type { AdaptiveParams } from '../types';

const DEFAULTS: AdaptiveParams = {
  threshold: 0, // 0 = auto (mean-based)
  contrast: 1.0,
  maxWidth: 800,
};

const VARIATIONS: AdaptiveParams[] = [
  { threshold: 0, contrast: 1.3, maxWidth: 1000 },
  { threshold: 140, contrast: 1.5, maxWidth: 1200 },
];

let failureCount = 0;

export const AdaptiveOCRService = {
  getParams(attempt: number): AdaptiveParams {
    if (attempt === 0) return { ...DEFAULTS };
    const variation = VARIATIONS[Math.min(attempt - 1, VARIATIONS.length - 1)];
    return variation ? { ...variation } : { ...DEFAULTS };
  },

  recordFailure(): void {
    failureCount++;
  },

  recordSuccess(): void {
    failureCount = Math.max(0, failureCount - 1);
  },

  getAdjustedDefaults(): AdaptiveParams {
    if (failureCount >= 3) {
      return { threshold: 0, contrast: 1.3, maxWidth: 1000 };
    }
    return { ...DEFAULTS };
  },

  reset(): void {
    failureCount = 0;
  },
};
