/**
 * IndexedDB persistence layer for offline-first document filling.
 * Stores field values and image/signature blobs locally so the fill
 * page works without network connectivity.
 */

const DB_NAME = 'regcheck_drafts';
const DB_VERSION = 1;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DraftFieldRecord {
  /** `${documentId}/${fieldId}/${itemIndex}` */
  key: string;
  documentId: string;
  fieldId: string;
  itemIndex: number;
  /** Serialised value (string for text/signature data-url, 'true'/'false' for checkbox) */
  value: string;
  /** S3 file key — set once the file has been successfully uploaded */
  fileKey?: string;
  /** Whether this record has been saved to the server */
  synced: boolean;
  updatedAt: number;
}

export interface PendingBlobRecord {
  /** Same key as DraftFieldRecord */
  key: string;
  blob: Blob;
  fileName: string;
}

// ─── DB singleton ─────────────────────────────────────────────────────────────

let dbPromise: Promise<IDBDatabase> | null = null;

function getDb(): Promise<IDBDatabase> {
  if (typeof window === 'undefined') return Promise.reject(new Error('No window'));
  if (!dbPromise) {
    dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);

      req.onupgradeneeded = (e) => {
        const db = (e.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains('fields')) {
          const s = db.createObjectStore('fields', { keyPath: 'key' });
          s.createIndex('documentId', 'documentId', { unique: false });
        }
        if (!db.objectStoreNames.contains('blobs')) {
          db.createObjectStore('blobs', { keyPath: 'key' });
        }
      };

      req.onsuccess = (e) => resolve((e.target as IDBOpenDBRequest).result);
      req.onerror = () => {
        dbPromise = null;
        reject(req.error);
      };
    });
  }
  return dbPromise;
}

// ─── Field operations ─────────────────────────────────────────────────────────

export async function getDraftFields(documentId: string): Promise<DraftFieldRecord[]> {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('fields', 'readonly');
    const req = tx.objectStore('fields').index('documentId').getAll(documentId);
    req.onsuccess = () => resolve(req.result as DraftFieldRecord[]);
    req.onerror = () => reject(req.error);
  });
}

export async function saveDraftField(record: DraftFieldRecord): Promise<void> {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('fields', 'readwrite');
    tx.objectStore('fields').put(record);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function saveDraftFields(records: DraftFieldRecord[]): Promise<void> {
  if (records.length === 0) return;
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('fields', 'readwrite');
    const store = tx.objectStore('fields');
    for (const r of records) store.put(r);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function markFieldsSynced(keys: string[]): Promise<void> {
  if (keys.length === 0) return;
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('fields', 'readwrite');
    const store = tx.objectStore('fields');
    let pending = keys.length;
    const done = () => {
      if (--pending === 0) resolve();
    };

    for (const key of keys) {
      const req = store.get(key);
      req.onsuccess = () => {
        if (req.result) store.put({ ...req.result, synced: true });
        done();
      };
      req.onerror = () => done(); // best-effort
    }

    tx.onerror = () => reject(tx.error);
  });
}

// ─── Blob operations ──────────────────────────────────────────────────────────

export async function savePendingBlob(key: string, blob: Blob, fileName: string): Promise<void> {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('blobs', 'readwrite');
    tx.objectStore('blobs').put({ key, blob, fileName });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getPendingBlob(key: string): Promise<PendingBlobRecord | null> {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('blobs', 'readonly');
    const req = tx.objectStore('blobs').get(key);
    req.onsuccess = () => resolve((req.result as PendingBlobRecord) ?? null);
    req.onerror = () => reject(req.error);
  });
}

export async function getAllPendingBlobs(documentId: string): Promise<PendingBlobRecord[]> {
  const db = await getDb();
  // Blobs are keyed by `${documentId}/${fieldId}/${itemIndex}` — filter by prefix
  return new Promise((resolve, reject) => {
    const tx = db.transaction('blobs', 'readonly');
    const req = tx.objectStore('blobs').getAll();
    req.onsuccess = () => {
      const all = req.result as PendingBlobRecord[];
      resolve(all.filter((r) => r.key.startsWith(`${documentId}/`)));
    };
    req.onerror = () => reject(req.error);
  });
}

export async function deletePendingBlob(key: string): Promise<void> {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('blobs', 'readwrite');
    tx.objectStore('blobs').delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function draftKey(documentId: string, fieldId: string, itemIndex: number): string {
  return `${documentId}/${fieldId}/${itemIndex}`;
}
