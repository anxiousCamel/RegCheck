/**
 * OCR service usando Tesseract.js.
 * Retorna lista de OCRCandidate[] — nunca decide automaticamente.
 * Quem escolhe é o usuário.
 */

import type { Worker as TesseractWorker } from 'tesseract.js';
import type { OCRCandidate } from '../types';
import { parseOCRText } from '../ocr-parser';
import { deduplicateCandidates } from '../dedupe';

const OCR_TIMEOUT = 30_000;

let worker: TesseractWorker | null = null;
let initPromise: Promise<void> | null = null;

async function initWorker(): Promise<void> {
  if (worker) return;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const { createWorker } = await import('tesseract.js');
    worker = await createWorker('eng+por');
  })();

  return initPromise;
}

export const OCRService = {
  async warmup(): Promise<void> {
    await initWorker();
  },

  /**
   * Reconhece texto e retorna candidatos classificados.
   * Ordenados por confidence DESC, sem duplicatas, sem auto-seleção.
   */
  async recognize(
    canvas: OffscreenCanvas,
    onProgress?: (percent: number) => void,
    signal?: AbortSignal,
  ): Promise<OCRCandidate[]> {
    if (signal?.aborted) throw new DOMException('Cancelled', 'AbortError');

    await initWorker();
    if (!worker) throw new Error('OCR worker failed to initialize');

    const blob = await canvas.convertToBlob({ type: 'image/png' });
    if (signal?.aborted) throw new DOMException('Cancelled', 'AbortError');

    const result = await Promise.race([
      worker.recognize(blob),
      new Promise<never>((_, reject) => {
        const timer = setTimeout(() => reject(new Error('OCR timeout')), OCR_TIMEOUT);
        signal?.addEventListener(
          'abort',
          () => {
            clearTimeout(timer);
            reject(new DOMException('Cancelled', 'AbortError'));
          },
          { once: true },
        );
      }),
    ]);

    onProgress?.(100);

    const rawText = result.data.text;
    const parsed = parseOCRText(rawText);
    const deduped = deduplicateCandidates(parsed);

    console.debug('[OCR] candidatos retornados:', deduped);

    return deduped.slice(0, 8);
  },

  async terminate(): Promise<void> {
    if (worker) {
      await worker.terminate();
      worker = null;
      initPromise = null;
    }
  },

  get isLoaded(): boolean {
    return worker !== null;
  },
};
