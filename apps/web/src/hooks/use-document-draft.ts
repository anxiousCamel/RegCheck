'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  getDraftFields,
  saveDraftField,
  saveDraftFields,
  markFieldsSynced,
  savePendingBlob,
  getPendingBlob,
  getAllPendingBlobs,
  deletePendingBlob,
  draftKey,
  type DraftFieldRecord,
} from '@/lib/draft-db';
import { api } from '@/lib/api';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface FieldState {
  value: string | boolean;
  fileKey?: string;
  /** In-memory blob for images/signatures not yet uploaded */
  pendingBlob?: Blob;
  pendingFileName?: string;
  synced: boolean;
}

interface ServerField {
  fieldId: string;
  itemIndex: number;
  value: string;
  fileKey?: string;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Offline-first state management for document fill.
 *
 * Priority order (highest → lowest):
 *  1. Local unsaved changes (synced=false in IndexedDB)
 *  2. Server data (used to populate IndexedDB on first load only)
 *
 * All writes go to IndexedDB immediately.
 * When online, a background sync uploads pending blobs and saves to the API.
 */
export function useDocumentDraft(
  documentId: string,
  serverFields?: ServerField[],
) {
  const [fields, setFields] = useState<Map<string, FieldState>>(new Map());
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true,
  );
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'error'>('idle');
  const [pendingUploads, setPendingUploads] = useState(0);

  // Track whether we've initialised from IndexedDB yet
  const loaded = useRef(false);
  // Prevent concurrent syncs
  const syncing = useRef(false);
  // Keep a stable ref to fields for use in callbacks without stale closures
  const fieldsRef = useRef(fields);
  fieldsRef.current = fields;
  // Track server fields count to detect populate changes
  const lastServerCountRef = useRef<number>(0);
  // Track server fields hash to detect value changes
  const lastServerHashRef = useRef<string>('');

  // Helper to create a hash of server fields
  const hashServerFields = (fields: ServerField[] | undefined): string => {
    if (!fields || fields.length === 0) return '';
    return fields
      .map(f => `${f.fieldId}:${f.itemIndex}:${f.value}:${f.fileKey || ''}`)
      .sort()
      .join('|');
  };

  // ── 1. Load from IndexedDB on mount ────────────────────────────────────────
  useEffect(() => {
    if (loaded.current) return;
    loaded.current = true;

    async function init() {
      try {
        const records = await getDraftFields(documentId);

        if (records.length > 0) {
          // We have local data — restore it
          const map = new Map<string, FieldState>();
          for (const r of records) {
            const mapKey = `${r.fieldId}_${r.itemIndex}`;
            map.set(mapKey, {
              value: r.value,
              fileKey: r.fileKey,
              synced: r.synced,
            });
          }

          // Restore in-memory blobs from IndexedDB blob store
          const blobs = await getAllPendingBlobs(documentId);
          for (const b of blobs) {
            // key = `${documentId}/${fieldId}/${itemIndex}`
            const parts = b.key.split('/');
            if (parts.length === 3) {
              const [, fieldId, rawIdx] = parts;
              const mapKey = `${fieldId}_${rawIdx}`;
              const existing = map.get(mapKey);
              if (existing && !existing.fileKey) {
                map.set(mapKey, {
                  ...existing,
                  pendingBlob: b.blob,
                  pendingFileName: b.fileName,
                });
              }
            }
          }

          setFields(map);
          setPendingUploads(blobs.length);
        } else if (serverFields && serverFields.length > 0) {
          // No local data — seed from server
          const map = new Map<string, FieldState>();
          const records: DraftFieldRecord[] = [];
          const now = Date.now();

          for (const f of serverFields) {
            const mapKey = `${f.fieldId}_${f.itemIndex}`;
            map.set(mapKey, { value: f.value, fileKey: f.fileKey, synced: true });
            records.push({
              key: draftKey(documentId, f.fieldId, f.itemIndex),
              documentId,
              fieldId: f.fieldId,
              itemIndex: f.itemIndex,
              value: String(f.value),
              fileKey: f.fileKey,
              synced: true,
              updatedAt: now,
            });
          }

          setFields(map);
          await saveDraftFields(records);
        }

        lastServerCountRef.current = serverFields?.length ?? 0;
        lastServerHashRef.current = hashServerFields(serverFields);
      } catch (err) {
        console.error('[Draft] Failed to load from IndexedDB:', err);
      }
    }

    init();
  }, [documentId, serverFields]);

  // ── 1b. Merge server data when it changes (e.g. after populate) ────────────
  // Detects when serverFields changes significantly and merges values for
  // fields that the user hasn't locally modified (synced=true or absent).
  useEffect(() => {
    if (!loaded.current || !serverFields) return;
    const prevCount = lastServerCountRef.current;
    const newCount = serverFields.length;
    const prevHash = lastServerHashRef.current;
    const newHash = hashServerFields(serverFields);
    
    // Trigger merge when count changes OR hash changes (values changed)
    if ((newCount === prevCount && newHash === prevHash) || newCount === 0) return;
    
    lastServerCountRef.current = newCount;
    lastServerHashRef.current = newHash;

    async function mergeServerData() {
      try {
        const map = new Map(fieldsRef.current);
        const records: DraftFieldRecord[] = [];
        const now = Date.now();
        let changed = false;

        for (const f of serverFields!) {
          const mapKey = `${f.fieldId}_${f.itemIndex}`;
          const existing = map.get(mapKey);

          // Only overwrite if: no local data, or local data is synced (not user-modified)
          if (!existing || existing.synced) {
            map.set(mapKey, { value: f.value, fileKey: f.fileKey, synced: true });
            records.push({
              key: draftKey(documentId, f.fieldId, f.itemIndex),
              documentId,
              fieldId: f.fieldId,
              itemIndex: f.itemIndex,
              value: String(f.value),
              fileKey: f.fileKey,
              synced: true,
              updatedAt: now,
            });
            changed = true;
          }
        }

        if (changed) {
          setFields(map);
          if (records.length > 0) {
            await saveDraftFields(records);
          }
          console.debug('[Draft] Merged', records.length, 'fields from server after populate/select');
        }
      } catch (err) {
        console.error('[Draft] Failed to merge server data:', err);
      }
    }

    mergeServerData();
  }, [documentId, serverFields, hashServerFields]);

  // ── 2. Online / offline detection ─────────────────────────────────────────
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Auto-sync when connection is restored
      syncToServer();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── 3. Update a text / checkbox / signature field ──────────────────────────
  const updateField = useCallback(
    async (fieldId: string, itemIndex: number, value: string | boolean) => {
      const mapKey = `${fieldId}_${itemIndex}`;

      setFields((prev) => {
        const next = new Map(prev);
        const existing = prev.get(mapKey);
        next.set(mapKey, { ...existing, value, synced: false });
        return next;
      });

      try {
        await saveDraftField({
          key: draftKey(documentId, fieldId, itemIndex),
          documentId,
          fieldId,
          itemIndex,
          value: String(value),
          fileKey: fieldsRef.current.get(mapKey)?.fileKey,
          synced: false,
          updatedAt: Date.now(),
        });
      } catch (err) {
        console.error('[Draft] Failed to save field to IndexedDB:', err);
      }
    },
    [documentId],
  );

  // ── 4. Update an image field ───────────────────────────────────────────────
  const updateImageField = useCallback(
    async (fieldId: string, itemIndex: number, file: File) => {
      const mapKey = `${fieldId}_${itemIndex}`;
      const blobKey = draftKey(documentId, fieldId, itemIndex);

      // Always persist blob locally first
      await savePendingBlob(blobKey, file, file.name);
      setPendingUploads((n) => n + 1);

      setFields((prev) => {
        const next = new Map(prev);
        next.set(mapKey, {
          value: file.name,
          pendingBlob: file,
          pendingFileName: file.name,
          synced: false,
        });
        return next;
      });

      await saveDraftField({
        key: blobKey,
        documentId,
        fieldId,
        itemIndex,
        value: file.name,
        synced: false,
        updatedAt: Date.now(),
      });

      // If online, upload immediately
      if (navigator.onLine) {
        try {
          const result = await api.uploadImage(file, 'image');
          // Update state with fileKey
          setFields((prev) => {
            const next = new Map(prev);
            const existing = prev.get(mapKey);
            next.set(mapKey, {
              ...existing,
              fileKey: result.fileKey,
              pendingBlob: undefined,
              pendingFileName: undefined,
              synced: false,
            });
            return next;
          });
          // Update IndexedDB record with fileKey, remove blob
          await saveDraftField({
            key: blobKey,
            documentId,
            fieldId,
            itemIndex,
            value: file.name,
            fileKey: result.fileKey,
            synced: false,
            updatedAt: Date.now(),
          });
          await deletePendingBlob(blobKey);
          setPendingUploads((n) => Math.max(0, n - 1));
        } catch (err) {
          console.error('[Draft] Image upload failed, will retry when online:', err);
        }
      }
    },
    [documentId],
  );

  // ── 5. Sync to server ──────────────────────────────────────────────────────
  const syncToServer = useCallback(async () => {
    if (syncing.current || !navigator.onLine) return;
    syncing.current = true;
    setSyncStatus('syncing');

    try {
      // 5a. Upload pending blobs first
      const pendingBlobs = await getAllPendingBlobs(documentId);
      for (const pb of pendingBlobs) {
        try {
          const result = await api.uploadImage(pb.blob, 'image');
          const parts = pb.key.split('/');
          if (parts.length === 3) {
            const [, fieldId, rawIdx] = parts;
            const itemIndex = Number(rawIdx);
            const mapKey = `${fieldId}_${itemIndex}`;

            setFields((prev) => {
              const next = new Map(prev);
              const existing = prev.get(mapKey);
              next.set(mapKey, {
                ...existing,
                value: existing?.value ?? '',
                fileKey: result.fileKey,
                pendingBlob: undefined,
                pendingFileName: undefined,
                synced: false,
              });
              return next;
            });

            await saveDraftField({
              key: pb.key,
              documentId,
              fieldId,
              itemIndex,
              value: String(fieldsRef.current.get(mapKey)?.value ?? ''),
              fileKey: result.fileKey,
              synced: false,
              updatedAt: Date.now(),
            });
            await deletePendingBlob(pb.key);
            setPendingUploads((n) => Math.max(0, n - 1));
          }
        } catch (err) {
          console.error('[Draft] Blob upload failed during sync:', err);
        }
      }

      // 5b. Collect all unsynced fields
      const allRecords = await getDraftFields(documentId);
      const unsynced = allRecords.filter((r) => !r.synced);
      if (unsynced.length === 0) {
        setSyncStatus('idle');
        return;
      }

      // 5c. Save to server
      const payload = unsynced.map((r) => ({
        fieldId: r.fieldId,
        itemIndex: r.itemIndex,
        value: r.value,
        fileKey: r.fileKey,
      }));

      await api.saveFilledData(documentId, payload);

      // 5d. Mark synced in IndexedDB
      await markFieldsSynced(unsynced.map((r) => r.key));

      // Update in-memory synced flags
      setFields((prev) => {
        const next = new Map(prev);
        for (const r of unsynced) {
          const mapKey = `${r.fieldId}_${r.itemIndex}`;
          const existing = prev.get(mapKey);
          if (existing) next.set(mapKey, { ...existing, synced: true });
        }
        return next;
      });

      setSyncStatus('idle');
    } catch (err) {
      console.error('[Draft] Sync failed:', err);
      setSyncStatus('error');
    } finally {
      syncing.current = false;
    }
  }, [documentId]);

  // ── 6. Periodic autosave when online ──────────────────────────────────────
  useEffect(() => {
    const interval = setInterval(() => {
      if (navigator.onLine) syncToServer();
    }, 5000);
    return () => clearInterval(interval);
  }, [syncToServer]);

  // ── Helpers ────────────────────────────────────────────────────────────────
  const getValue = useCallback(
    (fieldId: string, itemIndex: number): string | boolean =>
      fieldsRef.current.get(`${fieldId}_${itemIndex}`)?.value ?? '',
    [],
  );

  const getFileKey = useCallback(
    (fieldId: string, itemIndex: number): string | undefined =>
      fieldsRef.current.get(`${fieldId}_${itemIndex}`)?.fileKey,
    [],
  );

  const getPendingBlobForField = useCallback(
    (fieldId: string, itemIndex: number): Blob | undefined =>
      fieldsRef.current.get(`${fieldId}_${itemIndex}`)?.pendingBlob,
    [],
  );

  const hasPendingChanges = Array.from(fields.values()).some((f) => !f.synced);

  return {
    fields,
    getValue,
    getFileKey,
    getPendingBlobForField,
    updateField,
    updateImageField,
    syncToServer,
    isOnline,
    syncStatus,
    pendingUploads,
    hasPendingChanges,
  };
}
