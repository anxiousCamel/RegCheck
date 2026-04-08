'use client';

/**
 * Web Vitals Client Component
 * 
 * This component initializes Web Vitals tracking on the client side.
 * It must be a client component because web-vitals uses browser APIs.
 * 
 * Requirements: 8.3, 8.4, 8.5
 */

import { useEffect } from 'react';
import { initWebVitals } from '@/lib/performance-monitor';

export function WebVitals() {
  useEffect(() => {
    // Initialize Web Vitals tracking once on mount
    initWebVitals();
  }, []);

  // This component doesn't render anything
  return null;
}
