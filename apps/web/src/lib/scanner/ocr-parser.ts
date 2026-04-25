/**
 * OCR Parser — classifica texto bruto em candidatos tipados.
 * Responsabilidade única: receber texto, retornar OCRCandidate[].
 * Nunca decide automaticamente — apenas sugere com confidence.
 */

import type { OCRCandidate } from './types';

// ─── Patterns ────────────────────────────────────────────────────────────────

const PATRIMONIO_PATTERNS = [
  /patrim[oô]nio[:\s]+(\d{4,})/i,
  /pat[:\s]+(\d{4,})/i,
  /tombamento[:\s]+(\d{4,})/i,
];

const SERIAL_PATTERNS = [
  /s[eé]rie[:\s]+([A-Z0-9][\w\-]{4,})/i,
  /s\/n[:\s]+([A-Z0-9][\w\-]{4,})/i,
  /serial(?:\s*(?:no?|number))?[:\s]+([A-Z0-9][\w\-]{4,})/i,
  /sn[:\s]+([A-Z0-9][\w\-]{4,})/i,
];

const MODELO_PATTERNS = [
  /modelo[:\s]+([A-Z0-9][\w\-\s]{2,30})/i,
  /model[:\s]+([A-Z0-9][\w\-\s]{2,30})/i,
  /mod[:\s]+([A-Z0-9][\w\-]{2,20})/i,
];

const NOISE_WORDS = new Set([
  'INPUT',
  'OUTPUT',
  'WARRANTY',
  'POWER',
  'VOLTAGE',
  'WATTS',
  'AMPS',
  'HERTZ',
  'MADE',
  'CHINA',
  'BRAZIL',
  'BRASIL',
  'FABRICADO',
  'TYPE',
  'TIPO',
  'CLASS',
  'RATING',
  'DATE',
  'DATA',
  'BATCH',
  'LOTE',
  'WEIGHT',
  'PESO',
  'CAUTION',
  'WARNING',
]);

// ─── Parser ───────────────────────────────────────────────────────────────────

export function parseOCRText(rawText: string): OCRCandidate[] {
  const candidates: OCRCandidate[] = [];
  const lines = rawText.split('\n');

  // Labeled patterns — alta confiança
  for (const line of lines) {
    for (const pattern of PATRIMONIO_PATTERNS) {
      const match = line.match(pattern);
      if (match?.[1]) {
        candidates.push({ type: 'patrimonio', value: match[1].trim(), confidence: 0.88 });
      }
    }
    for (const pattern of SERIAL_PATTERNS) {
      const match = line.match(pattern);
      if (match?.[1]) {
        candidates.push({ type: 'serial', value: match[1].trim(), confidence: 0.88 });
      }
    }
    for (const pattern of MODELO_PATTERNS) {
      const match = line.match(pattern);
      if (match?.[1]) {
        candidates.push({ type: 'modelo', value: match[1].trim(), confidence: 0.8 });
      }
    }
  }

  // Genéricos — confiança calculada
  candidates.push(...extractGeneric(rawText.toUpperCase()));

  return candidates;
}

function extractGeneric(text: string): OCRCandidate[] {
  const candidates: OCRCandidate[] = [];
  const seen = new Set<string>();

  // Numérico longo → patrimônio
  for (const match of text.matchAll(/\b(\d{6,20})\b/g)) {
    const value = match[1] ?? '';
    if (value && !seen.has(value)) {
      seen.add(value);
      candidates.push({
        type: 'patrimonio',
        value,
        confidence: scoreValue(value, text),
      });
    }
  }

  // Alfanumérico (letras + dígitos) → serial
  for (const match of text.matchAll(/\b([A-Z0-9]{6,20})\b/g)) {
    const value = match[1] ?? '';
    if (value && !seen.has(value) && /\d/.test(value) && /[A-Z]/.test(value)) {
      seen.add(value);
      candidates.push({
        type: 'serial',
        value,
        confidence: scoreValue(value, text),
      });
    }
  }

  return candidates;
}

function scoreValue(value: string, fullText: string): number {
  let score = 0;

  if (/^\d{8,}$/.test(value)) score += 3;
  else if (value.length >= 6 && value.length <= 20) score += 2;

  if (/\d/.test(value)) score += 1;
  if (/[A-Z]/.test(value) && /\d/.test(value)) score += 1;

  for (const word of NOISE_WORDS) {
    if (value.includes(word)) {
      score -= 2;
      break;
    }
  }

  if (value.length < 6) score -= 1;
  if (value.length > 20) score -= 1;

  const idx = fullText.indexOf(value);
  if (idx >= 0) {
    const ctx = fullText.substring(Math.max(0, idx - 30), idx + value.length + 30);
    for (const word of NOISE_WORDS) {
      if (ctx.includes(word)) {
        score -= 0.5;
        break;
      }
    }
  }

  return Math.max(0, Math.min(1, (score + 3) / 10));
}
