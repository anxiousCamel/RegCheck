/**
 * Deduplicação pura de candidatos OCR.
 * Remove duplicatas por valor, mantendo o de maior confidence.
 * Ordena por confidence DESC.
 */

import type { OCRCandidate } from './types';

export function deduplicateCandidates(candidates: OCRCandidate[]): OCRCandidate[] {
  const map = new Map<string, OCRCandidate>();

  for (const c of candidates) {
    const key = `${c.type}:${c.value}`;
    const existing = map.get(key);
    if (!existing || c.confidence > existing.confidence) {
      map.set(key, c);
    }
  }

  return Array.from(map.values()).sort((a, b) => b.confidence - a.confidence);
}
