/**
 * Non-blocking analytics for scan pipeline.
 * Stores events in memory for session analysis. Fire-and-forget.
 */

import type { AnalyticsEvent } from '../types';

const events: AnalyticsEvent[] = [];
const MAX_EVENTS = 500;

export const AnalyticsService = {
  /** Track an event. Non-blocking, never throws. */
  track(event: AnalyticsEvent): void {
    if (events.length >= MAX_EVENTS) events.shift();
    events.push(event);
  },

  /** Get session stats summary. */
  getStats(): {
    totalScans: number;
    successRate: number;
    avgDuration: number;
    cacheHitRate: number;
    barcodeSuccessRate: number;
  } {
    const scans = events.filter((e) => e.type === 'success' || e.type === 'failure');
    const successes = events.filter((e) => e.type === 'success');
    const cacheHits = events.filter((e) => e.type === 'cache_hit');
    const barcodeSuccesses = successes.filter((e) => e.metadata?.method === 'barcode');

    const total = scans.length || 1;
    const avgDuration = successes.reduce((sum, e) => sum + e.duration, 0) / (successes.length || 1);

    return {
      totalScans: scans.length,
      successRate: successes.length / total,
      avgDuration: Math.round(avgDuration),
      cacheHitRate: cacheHits.length / total,
      barcodeSuccessRate: barcodeSuccesses.length / (successes.length || 1),
    };
  },

  /** Get raw events for debugging. */
  getEvents(): readonly AnalyticsEvent[] {
    return events;
  },

  clear(): void {
    events.length = 0;
  },
};
