/**
 * Extracts equipment identifiers from raw OCR text.
 * Returns typed candidates with confidence scores.
 */

import type { ScanCandidate } from '../types';

// ─── Patterns ────────────────────────────────────────────────────────────────

const SERIE_PATTERNS = [
  /s[eé]rie[:\s]+([A-Z0-9][\w\-]{4,})/i,
  /s\/n[:\s]+([A-Z0-9][\w\-]{4,})/i,
  /serial(?:\s*(?:no?|number))?[:\s]+([A-Z0-9][\w\-]{4,})/i,
  /sn[:\s]+([A-Z0-9][\w\-]{4,})/i,
];

const PATRIMONIO_PATTERNS = [
  /patrim[oô]nio[:\s]+(\d{4,})/i,
  /pat[:\s]+(\d{4,})/i,
  /tombamento[:\s]+(\d{4,})/i,
];

const NOISE_WORDS = new Set([
  'MODEL', 'MODELO', 'INPUT', 'OUTPUT', 'WARRANTY', 'POWER',
  'VOLTAGE', 'WATTS', 'AMPS', 'HERTZ', 'MADE', 'CHINA', 'BRAZIL',
  'BRASIL', 'FABRICADO', 'TYPE', 'TIPO', 'CLASS', 'RATING', 'DATE',
  'DATA', 'BATCH', 'LOTE', 'WEIGHT', 'PESO', 'CAUTION', 'WARNING',
]);

// ─── Service ─────────────────────────────────────────────────────────────────

export const TextExtractorService = {
  extract(rawText: string): ScanCandidate[] {
    const candidates: ScanCandidate[] = [];
    const lines = rawText.split('\n');

    // Labeled patterns (high confidence)
    for (const line of lines) {
      for (const pattern of SERIE_PATTERNS) {
        const match = line.match(pattern);
        if (match?.[1]) {
          candidates.push({
            type: 'serial',
            value: match[1].trim(),
            confidence: 0.85,
            source: 'ocr',
          });
        }
      }
      for (const pattern of PATRIMONIO_PATTERNS) {
        const match = line.match(pattern);
        if (match?.[1]) {
          candidates.push({
            type: 'asset',
            value: match[1].trim(),
            confidence: 0.85,
            source: 'ocr',
          });
        }
      }
    }

    // Generic patterns with scoring
    const generic = this.extractGeneric(rawText.toUpperCase());
    candidates.push(...generic);

    return this.deduplicate(candidates).slice(0, 6);
  },

  extractGeneric(text: string): ScanCandidate[] {
    const candidates: ScanCandidate[] = [];
    const seen = new Set<string>();

    // Long numeric strings → asset (patrimônio)
    for (const match of text.matchAll(/\b(\d{6,20})\b/g)) {
      const value = match[1] ?? '';
      if (value && !seen.has(value)) {
        seen.add(value);
        candidates.push({
          type: 'asset',
          value,
          confidence: this.score(value, text),
          source: 'ocr',
        });
      }
    }

    // Alphanumeric (must have both letters and digits) → serial
    for (const match of text.matchAll(/\b([A-Z0-9]{6,20})\b/g)) {
      const value = match[1] ?? '';
      if (value && !seen.has(value) && /\d/.test(value) && /[A-Z]/.test(value)) {
        seen.add(value);
        candidates.push({
          type: 'serial',
          value,
          confidence: this.score(value, text),
          source: 'ocr',
        });
      }
    }

    return candidates;
  },

  score(value: string, fullText: string): number {
    let score = 0;

    if (/^\d{8,}$/.test(value)) score += 3;
    else if (value.length >= 6 && value.length <= 20) score += 2;

    if (/\d/.test(value)) score += 1;
    if (/[A-Z]/.test(value) && /\d/.test(value)) score += 1;

    for (const word of NOISE_WORDS) {
      if (value.includes(word)) { score -= 2; break; }
    }

    if (value.length < 6) score -= 1;
    if (value.length > 20) score -= 1;

    // Penalize if near noise context
    const idx = fullText.indexOf(value);
    if (idx >= 0) {
      const ctx = fullText.substring(Math.max(0, idx - 30), idx + value.length + 30);
      for (const word of NOISE_WORDS) {
        if (ctx.includes(word) && !['SERIAL', 'SERIE'].some((w) => word.startsWith(w))) {
          score -= 0.5;
          break;
        }
      }
    }

    return Math.max(0, Math.min(1, (score + 3) / 10));
  },

  deduplicate(candidates: ScanCandidate[]): ScanCandidate[] {
    const map = new Map<string, ScanCandidate>();
    for (const c of candidates) {
      const existing = map.get(c.value);
      if (!existing || c.confidence > existing.confidence) {
        map.set(c.value, c);
      }
    }
    return Array.from(map.values()).sort((a, b) => b.confidence - a.confidence);
  },
};
