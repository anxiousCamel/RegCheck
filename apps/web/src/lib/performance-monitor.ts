/**
 * Performance Monitoring Utility
 * 
 * Tracks Core Web Vitals and other performance metrics:
 * - LCP (Largest Contentful Paint): Measures loading performance
 * - FID (First Input Delay): Measures interactivity
 * - CLS (Cumulative Layout Shift): Measures visual stability
 * - TTFB (Time to First Byte): Measures server response time
 * - FCP (First Contentful Paint): Measures perceived load speed
 * 
 * Requirements: 8.3, 8.4
 */

import { onCLS, onFCP, onFID, onLCP, onTTFB, type Metric } from 'web-vitals';

export interface WebVitalsMetric {
  id: string;
  name: 'CLS' | 'FCP' | 'FID' | 'LCP' | 'TTFB';
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  delta: number;
  navigationType: string;
}

/**
 * Reports Web Vitals metrics
 * - Logs to console in development
 * - Sends to analytics in production (non-blocking)
 */
export function reportWebVitals(metric: Metric): void {
  try {
    const webVitalsMetric: WebVitalsMetric = {
      id: metric.id,
      name: metric.name as WebVitalsMetric['name'],
      value: metric.value,
      rating: metric.rating,
      delta: metric.delta,
      navigationType: metric.navigationType,
    };

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log('[Web Vitals]', {
        metric: webVitalsMetric.name,
        value: Math.round(webVitalsMetric.value),
        rating: webVitalsMetric.rating,
      });
    }

    // Send to analytics in production (non-blocking)
    if (process.env.NODE_ENV === 'production') {
      // Use sendBeacon for non-blocking analytics
      // Falls back to fetch with keepalive if sendBeacon is not available
      const body = JSON.stringify(webVitalsMetric);

      if (navigator.sendBeacon) {
        navigator.sendBeacon('/api/analytics/web-vitals', body);
      } else {
        fetch('/api/analytics/web-vitals', {
          method: 'POST',
          body,
          headers: { 'Content-Type': 'application/json' },
          keepalive: true,
        }).catch((error) => {
          // Silent failure - don't impact user experience
          console.error('[Web Vitals] Failed to report metrics:', error);
        });
      }
    }
  } catch (error) {
    // Silent failure - monitoring errors shouldn't break the app
    console.error('[Web Vitals] Reporting error:', error);
  }
}

/**
 * Initialize Web Vitals tracking
 * Call this once when the app loads
 */
export function initWebVitals(): void {
  try {
    onCLS(reportWebVitals);
    onFCP(reportWebVitals);
    onFID(reportWebVitals);
    onLCP(reportWebVitals);
    onTTFB(reportWebVitals);
  } catch (error) {
    console.error('[Web Vitals] Initialization error:', error);
  }
}
