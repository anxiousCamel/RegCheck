import { describe, it, expect } from 'vitest';
import { deduplicateCandidates } from '@/lib/scanner/dedupe';
import type { OCRCandidate } from '@/lib/scanner/types';

describe('deduplicateCandidates', () => {
  it('removes exact duplicates keeping highest confidence', () => {
    const candidates: OCRCandidate[] = [
      { type: 'serial', value: 'ABC123', confidence: 0.7 },
      { type: 'serial', value: 'ABC123', confidence: 0.9 },
    ];
    const result = deduplicateCandidates(candidates);
    expect(result).toHaveLength(1);
    expect(result[0]!.confidence).toBe(0.9);
  });

  it('keeps candidates with same value but different type', () => {
    const candidates: OCRCandidate[] = [
      { type: 'serial', value: '123456', confidence: 0.8 },
      { type: 'patrimonio', value: '123456', confidence: 0.8 },
    ];
    const result = deduplicateCandidates(candidates);
    expect(result).toHaveLength(2);
  });

  it('sorts by confidence descending', () => {
    const candidates: OCRCandidate[] = [
      { type: 'serial', value: 'A1', confidence: 0.5 },
      { type: 'serial', value: 'B2', confidence: 0.9 },
      { type: 'serial', value: 'C3', confidence: 0.7 },
    ];
    const result = deduplicateCandidates(candidates);
    expect(result[0]!.confidence).toBe(0.9);
    expect(result[1]!.confidence).toBe(0.7);
    expect(result[2]!.confidence).toBe(0.5);
  });

  it('returns empty array for empty input', () => {
    expect(deduplicateCandidates([])).toEqual([]);
  });

  it('handles single candidate', () => {
    const candidates: OCRCandidate[] = [{ type: 'patrimonio', value: '999888', confidence: 0.85 }];
    expect(deduplicateCandidates(candidates)).toHaveLength(1);
  });
});
