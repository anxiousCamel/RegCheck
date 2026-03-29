/**
 * Two-tier cache: memory (fast) + IndexedDB (persistent, 24h TTL).
 */

import type { CachedResult, ScanCandidate } from '../types';

const TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const DB_NAME = 'regcheck_scan_cache';
const DB_VERSION = 1;
const STORE_NAME = 'results';

// ─── Memory cache ────────────────────────────────────────────────────────────

const memCache = new Map<string, CachedResult>();

// ─── IndexedDB ───────────────────────────────────────────────────────────────

let dbPromise: Promise<IDBDatabase> | null = null;

function getDb(): Promise<IDBDatabase> {
  if (typeof globalThis === 'undefined') return Promise.reject(new Error('No globalThis'));
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = (e) => {
        const db = (e.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'hash' });
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

function isExpired(entry: CachedResult): boolean {
  return Date.now() - entry.createdAt > TTL_MS;
}

export const ResultCacheService = {
  async get(hash: string): Promise<CachedResult | null> {
    // Check memory first
    const mem = memCache.get(hash);
    if (mem && !isExpired(mem)) return mem;
    if (mem) memCache.delete(hash);

    // Check IndexedDB
    try {
      const db = await getDb();
      const entry = await new Promise<CachedResult | undefined>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const req = tx.objectStore(STORE_NAME).get(hash);
        req.onsuccess = () => resolve(req.result as CachedResult | undefined);
        req.onerror = () => reject(req.error);
      });

      if (!entry) return null;
      if (isExpired(entry)) {
        this.delete(hash);
        return null;
      }

      // Promote to memory
      memCache.set(hash, entry);
      return entry;
    } catch {
      return null;
    }
  },

  async set(hash: string, candidates: ScanCandidate[]): Promise<void> {
    const entry: CachedResult = { candidates, hash, createdAt: Date.now() };
    memCache.set(hash, entry);

    try {
      const db = await getDb();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).put(entry);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch {
      // Memory cache is enough as fallback
    }
  },

  async delete(hash: string): Promise<void> {
    memCache.delete(hash);
    try {
      const db = await getDb();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).delete(hash);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch {
      // Best effort
    }
  },

  clear(): void {
    memCache.clear();
  },
};
