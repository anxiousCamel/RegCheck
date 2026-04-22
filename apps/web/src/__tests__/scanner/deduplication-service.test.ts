import { describe, it, expect, beforeEach } from 'vitest';
import { DeduplicationService } from '@/lib/scanner/services/deduplication.service';
import type { ScanCandidate } from '@/lib/scanner/types';

const candidates: ScanCandidate[] = [
  { type: 'serial', value: 'ABC123', confidence: 0.9, source: 'barcode' },
];

beforeEach(() => {
  DeduplicationService.clear();
});

describe('DeduplicationService', () => {
  it('returns false for unseen hash', () => {
    expect(DeduplicationService.isDuplicate('abcdef1234567890')).toBe(false);
  });

  it('returns true for exact same hash', () => {
    DeduplicationService.add('abcdef1234567890', candidates);
    expect(DeduplicationService.isDuplicate('abcdef1234567890')).toBe(true);
  });

  it('returns true for hash within hamming distance threshold', () => {
    // Hashes that differ by 1 bit should be considered duplicates
    DeduplicationService.add('0000000000000000', candidates);
    // '0000000000000001' differs by 1 bit from '0000000000000000'
    expect(DeduplicationService.isDuplicate('0000000000000001')).toBe(true);
  });

  it('returns false for hash beyond hamming distance threshold', () => {
    DeduplicationService.add('0000000000000000', candidates);
    // 'ffffffffffffffff' is maximally different
    expect(DeduplicationService.isDuplicate('ffffffffffffffff')).toBe(false);
  });

  it('get returns candidates for known hash', () => {
    DeduplicationService.add('abcdef1234567890', candidates);
    const result = DeduplicationService.get('abcdef1234567890');
    expect(result).toEqual(candidates);
  });

  it('get returns null for unknown hash', () => {
    expect(DeduplicationService.get('unknown0000000000')).toBeNull();
  });

  it('clear removes all entries', () => {
    DeduplicationService.add('abcdef1234567890', candidates);
    DeduplicationService.clear();
    expect(DeduplicationService.isDuplicate('abcdef1234567890')).toBe(false);
  });
});
