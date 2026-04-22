'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useEditorStore } from '@/stores/editor-store';

/**
 * Hook for autosaving data at a configurable interval.
 * Only triggers save when data has changed (dirty flag).
 * Skips save while a batch operation is in progress to prevent
 * race conditions with temporary IDs.
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
  const isSavingRef = useRef(false);

  dataRef.current = data;
  isDirtyRef.current = isDirty;
  saveFnRef.current = saveFn;

  const save = useCallback(async () => {
    if (!isDirtyRef.current) return;
    // Block autosave while batch operations are running (paste, replication)
    // to prevent saving with temporary UUIDs that don't exist in the DB yet
    if (useEditorStore.getState().isBatchOperation) return;
    // Prevent concurrent saves
    if (isSavingRef.current) return;
    isSavingRef.current = true;
    try {
      await saveFnRef.current(dataRef.current);
    } catch (err) {
      console.error('[Autosave] Failed:', err);
    } finally {
      isSavingRef.current = false;
    }
  }, []);

  useEffect(() => {
    const timer = setInterval(save, intervalMs);
    return () => clearInterval(timer);
  }, [save, intervalMs]);

  // Save on unmount
  useEffect(() => {
    return () => {
      if (isDirtyRef.current && !useEditorStore.getState().isBatchOperation) {
        saveFnRef.current(dataRef.current).catch(console.error);
      }
    };
  }, []);

  return { saveNow: save };
}
