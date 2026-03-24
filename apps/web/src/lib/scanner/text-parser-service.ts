/**
 * TextParserService - Extracts equipment identifiers from raw OCR text.
 * Implements regex patterns, heuristics, and scoring system.
 */

import type { ScanCandidate } from '@regcheck/shared';

// Common irrelevant words found on equipment labels
const IRRELEVANT_WORDS = new Set([
  'MODEL', 'MODELO', 'INPUT', 'OUTPUT', 'SERIAL', 'WARRANTY', 'POWER',
  'VOLTAGE', 'WATTS', 'AMPS', 'HERTZ', 'MADE', 'CHINA', 'BRAZIL',
  'BRASIL', 'FABRICADO', 'MANUFACTURED', 'TYPE', 'TIPO', 'CLASS',
  'CLASSE', 'RATING', 'RATED', 'DATE', 'DATA', 'BATCH', 'LOTE',
  'WEIGHT', 'PESO', 'CAUTION', 'WARNING', 'DANGER', 'ATTENTION',
]);

// Labeled field patterns (higher confidence)
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
  /patrimony[:\s]+(\d{4,})/i,
];

// Generic alphanumeric patterns
const LONG_NUMBER_PATTERN = /\b(\d{6,20})\b/g;
const ALPHANUM_PATTERN = /\b([A-Z0-9]{6,20})\b/gi;

export class TextParserService {
  /**
   * Parse raw OCR text and return top candidates for serie and patrimonio.
   */
  static parse(rawText: string): { serie: ScanCandidate[]; patrimonio: ScanCandidate[] } {
    const serieCandidates: ScanCandidate[] = [];
    const patrimonioCandidates: ScanCandidate[] = [];

    const lines = rawText.split('\n');

    // Step 1: Try labeled patterns (high confidence)
    for (const line of lines) {
      for (const pattern of SERIE_PATTERNS) {
        const match = line.match(pattern);
        if (match && match[1]) {
          serieCandidates.push({
            value: match[1].trim(),
            confidence: 0.85,
            source: 'ocr',
          });
        }
      }

      for (const pattern of PATRIMONIO_PATTERNS) {
        const match = line.match(pattern);
        if (match && match[1]) {
          patrimonioCandidates.push({
            value: match[1].trim(),
            confidence: 0.85,
            source: 'ocr',
          });
        }
      }
    }

    // Step 2: Generic pattern extraction with scoring
    const fullText = rawText.toUpperCase();
    const genericCandidates = this.extractGenericCandidates(fullText);

    // Distribute generic candidates: pure numbers → patrimonio, mixed → serie
    for (const candidate of genericCandidates) {
      if (/^\d+$/.test(candidate.value)) {
        patrimonioCandidates.push(candidate);
      } else {
        serieCandidates.push(candidate);
      }
    }

    // Deduplicate and sort by confidence
    return {
      serie: this.deduplicateAndSort(serieCandidates).slice(0, 3),
      patrimonio: this.deduplicateAndSort(patrimonioCandidates).slice(0, 3),
    };
  }

  private static extractGenericCandidates(text: string): ScanCandidate[] {
    const candidates: ScanCandidate[] = [];
    const seen = new Set<string>();

    // Long numeric strings
    let match;
    const numPattern = new RegExp(LONG_NUMBER_PATTERN.source, 'g');
    while ((match = numPattern.exec(text)) !== null) {
      const value = match[1];
      if (!seen.has(value)) {
        seen.add(value);
        candidates.push({
          value,
          confidence: this.scoreCandidate(value, text),
          source: 'ocr',
        });
      }
    }

    // Alphanumeric strings (must contain at least one digit)
    const alphaPattern = new RegExp(ALPHANUM_PATTERN.source, 'gi');
    while ((match = alphaPattern.exec(text)) !== null) {
      const value = match[1].toUpperCase();
      if (!seen.has(value) && /\d/.test(value) && /[A-Z]/.test(value)) {
        seen.add(value);
        candidates.push({
          value,
          confidence: this.scoreCandidate(value, text),
          source: 'ocr',
        });
      }
    }

    return candidates;
  }

  private static scoreCandidate(value: string, fullText: string): number {
    let score = 0;

    // +3: Long numeric pattern (likely patrimonio or serial)
    if (/^\d{8,}$/.test(value)) score += 3;
    // +2: Valid alphanumeric (6-20 chars)
    else if (value.length >= 6 && value.length <= 20) score += 2;

    // +1: Contains numbers
    if (/\d/.test(value)) score += 1;

    // +1: Mix of letters and numbers
    if (/[A-Z]/.test(value) && /\d/.test(value)) score += 1;

    // -2: Contains irrelevant word
    for (const word of IRRELEVANT_WORDS) {
      if (value.includes(word)) {
        score -= 2;
        break;
      }
    }

    // -1: Too short or too long
    if (value.length < 6) score -= 1;
    if (value.length > 20) score -= 1;

    // -1: Near irrelevant context
    const valueIndex = fullText.indexOf(value);
    if (valueIndex >= 0) {
      const surrounding = fullText.substring(Math.max(0, valueIndex - 30), valueIndex + value.length + 30);
      for (const word of IRRELEVANT_WORDS) {
        if (surrounding.includes(word) && !['SERIAL', 'SERIE'].some(w => word.startsWith(w))) {
          score -= 0.5;
          break;
        }
      }
    }

    // Normalize to 0-1 range (max raw score ~7, min ~-3)
    return Math.max(0, Math.min(1, (score + 3) / 10));
  }

  private static deduplicateAndSort(candidates: ScanCandidate[]): ScanCandidate[] {
    const map = new Map<string, ScanCandidate>();
    for (const c of candidates) {
      const existing = map.get(c.value);
      if (!existing || c.confidence > existing.confidence) {
        map.set(c.value, c);
      }
    }
    return Array.from(map.values()).sort((a, b) => b.confidence - a.confidence);
  }
}
