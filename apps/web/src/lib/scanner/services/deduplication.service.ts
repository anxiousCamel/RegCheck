/**
 * Prevents duplicate reads within a session.
 * Deduplicates by image hash or extracted value.
 */

import type { ScanCandidate } from '../types';
import { ImageHashService } from './image-hash.service';

const HASH_DISTANCE_THRESHOLD = 5; // Max hamming distance to consider duplicate

interface DedupEntry {
  hash: string;
  candidates: ScanCandidate[];
  timestamp: number;
}

const seen: DedupEntry[] = [];

export const DeduplicationService = {
  /** Check if this hash was already scanned (similar image). */
  isDuplicate(hash: string): boolean {
    return seen.some(
      (entry) => ImageHashService.distance(entry.hash, hash) <= HASH_DISTANCE_THRESHOLD,
    );
  },

  /** Get the result from a previously seen similar image. */
  get(hash: string): ScanCandidate[] | null {
    const match = seen.find(
      (entry) => ImageHashService.distance(entry.hash, hash) <= HASH_DISTANCE_THRESHOLD,
    );
    return match?.candidates ?? null;
  },

  /** Record a result for deduplication. */
  add(hash: string, candidates: ScanCandidate[]): void {
    // Avoid storing too many entries
    if (seen.length >= 100) {
      seen.shift();
    }
    seen.push({ hash, candidates, timestamp: Date.now() });
  },

  /** Clear dedup history (e.g. when starting a new batch session). */
  clear(): void {
    seen.length = 0;
  },
};
