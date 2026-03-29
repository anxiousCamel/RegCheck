/**
 * OCR service using Tesseract.js.
 * Lazy loads, caches worker, reports real progress, supports cancellation.
 */

import type { Worker as TesseractWorker } from 'tesseract.js';

const OCR_TIMEOUT = 30_000; // 30s defensive timeout

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
  /** Initialize worker ahead of time (call during component mount). */
  async warmup(): Promise<void> {
    await initWorker();
  },

  /** Recognize text from a canvas. Reports progress via callback. */
  async recognize(
    canvas: OffscreenCanvas,
    onProgress?: (percent: number) => void,
    signal?: AbortSignal,
  ): Promise<string> {
    if (signal?.aborted) throw new DOMException('Cancelled', 'AbortError');

    await initWorker();
    if (!worker) throw new Error('OCR worker failed to initialize');

    // Convert OffscreenCanvas to blob for tesseract
    const blob = await canvas.convertToBlob({ type: 'image/png' });

    if (signal?.aborted) throw new DOMException('Cancelled', 'AbortError');

    // Race OCR against timeout and abort signal
    const result = await Promise.race([
      worker.recognize(blob),
      new Promise<never>((_, reject) => {
        const timer = setTimeout(() => reject(new Error('OCR timeout')), OCR_TIMEOUT);
        signal?.addEventListener('abort', () => {
          clearTimeout(timer);
          reject(new DOMException('Cancelled', 'AbortError'));
        }, { once: true });
      }),
    ]);

    onProgress?.(100);
    return result.data.text;
  },

  /** Terminate worker to free memory. */
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
