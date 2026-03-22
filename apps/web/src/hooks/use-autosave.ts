'use client';

import { useEffect, useRef, useCallback } from 'react';

/**
 * Hook for autosaving data at a configurable interval.
 * Only triggers save when data has changed (dirty flag).
 */
export function useAutosave<T>(
  data: T,
  isDirty: boolean,
  saveFn: (data: T) => Promise<void>,
  intervalMs = 5000,
) {
  const dataRef = useRef(data);
  const isDirtyRef = useRef(isDirty);
  const saveFnRef = useRef(saveFn);

  dataRef.current = data;
  isDirtyRef.current = isDirty;
  saveFnRef.current = saveFn;

  const save = useCallback(async () => {
    if (!isDirtyRef.current) return;
    try {
      await saveFnRef.current(dataRef.current);
    } catch (err) {
      console.error('[Autosave] Failed:', err);
    }
  }, []);

  useEffect(() => {
    const timer = setInterval(save, intervalMs);
    return () => clearInterval(timer);
  }, [save, intervalMs]);

  // Save on unmount
  useEffect(() => {
    return () => {
      if (isDirtyRef.current) {
        saveFnRef.current(dataRef.current).catch(console.error);
      }
    };
  }, []);

  return { saveNow: save };
}
