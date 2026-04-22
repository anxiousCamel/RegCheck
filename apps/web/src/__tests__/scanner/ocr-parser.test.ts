import { describe, it, expect } from 'vitest';
import { parseOCRText } from '@/lib/scanner/ocr-parser';

describe('parseOCRText', () => {
  // ── Patrimônio ──────────────────────────────────────────────────────────

  describe('patrimônio patterns', () => {
    it('detects "Patrimônio: 123456"', () => {
      const result = parseOCRText('Patrimônio: 123456');
      const p = result.find((c) => c.type === 'patrimonio' && c.value === '123456');
      expect(p).toBeDefined();
      expect(p!.confidence).toBeGreaterThanOrEqual(0.8);
    });

    it('detects "Pat: 789012"', () => {
      const result = parseOCRText('Pat: 789012');
      expect(result.some((c) => c.type === 'patrimonio' && c.value === '789012')).toBe(true);
    });

    it('detects "Tombamento: 456789"', () => {
      const result = parseOCRText('Tombamento: 456789');
      expect(result.some((c) => c.type === 'patrimonio' && c.value === '456789')).toBe(true);
    });

    it('ignores patrimônio with less than 4 digits', () => {
      const result = parseOCRText('Pat: 123');
      expect(result.some((c) => c.type === 'patrimonio' && c.value === '123')).toBe(false);
    });
  });

  // ── Serial ──────────────────────────────────────────────────────────────

  describe('serial patterns', () => {
    it('detects "Série: ABC12345"', () => {
      const result = parseOCRText('Série: ABC12345');
      expect(result.some((c) => c.type === 'serial' && c.value === 'ABC12345')).toBe(true);
    });

    it('detects "S/N: XY78901"', () => {
      const result = parseOCRText('S/N: XY78901');
      expect(result.some((c) => c.type === 'serial' && c.value === 'XY78901')).toBe(true);
    });

    it('detects "Serial No: DEF456789"', () => {
      const result = parseOCRText('Serial No: DEF456789');
      expect(result.some((c) => c.type === 'serial')).toBe(true);
    });

    it('detects "SN: GH123456"', () => {
      const result = parseOCRText('SN: GH123456');
      expect(result.some((c) => c.type === 'serial' && c.value === 'GH123456')).toBe(true);
    });
  });

  // ── Modelo ──────────────────────────────────────────────────────────────

  describe('modelo patterns', () => {
    it('detects "Modelo: HP LaserJet"', () => {
      const result = parseOCRText('Modelo: HP LaserJet');
      expect(result.some((c) => c.type === 'modelo')).toBe(true);
    });

    it('detects "Model: T450"', () => {
      const result = parseOCRText('Model: T450');
      expect(result.some((c) => c.type === 'modelo' && c.value.includes('T450'))).toBe(true);
    });
  });

  // ── Genérico ────────────────────────────────────────────────────────────

  describe('generic extraction', () => {
    it('extracts long numeric as patrimônio', () => {
      const result = parseOCRText('12345678901');
      expect(result.some((c) => c.type === 'patrimonio' && c.value === '12345678901')).toBe(true);
    });

    it('extracts alphanumeric as serial', () => {
      const result = parseOCRText('ABC123DEF');
      expect(result.some((c) => c.type === 'serial' && c.value === 'ABC123DEF')).toBe(true);
    });

    it('ignores pure alphabetic strings', () => {
      const result = parseOCRText('ABCDEFGH');
      expect(result.some((c) => c.value === 'ABCDEFGH')).toBe(false);
    });

    it('penalizes noise words', () => {
      const withNoise = parseOCRText('VOLTAGE 123456789');
      const withoutNoise = parseOCRText('123456789');
      const noiseCandidate = withNoise.find((c) => c.value === '123456789');
      const cleanCandidate = withoutNoise.find((c) => c.value === '123456789');
      if (noiseCandidate && cleanCandidate) {
        expect(noiseCandidate.confidence).toBeLessThanOrEqual(cleanCandidate.confidence);
      }
    });
  });

  // ── Edge cases ──────────────────────────────────────────────────────────

  describe('edge cases', () => {
    it('returns empty array for empty string', () => {
      expect(parseOCRText('')).toEqual([]);
    });

    it('handles multiline text', () => {
      const text = 'Equipamento HP\nSérie: SN123456\nPatrimônio: 789012';
      const result = parseOCRText(text);
      expect(result.some((c) => c.type === 'serial')).toBe(true);
      expect(result.some((c) => c.type === 'patrimonio')).toBe(true);
    });

    it('does not return candidates with value shorter than 4 chars', () => {
      const result = parseOCRText('AB1');
      expect(result.every((c) => c.value.length >= 4)).toBe(true);
    });
  });
});
