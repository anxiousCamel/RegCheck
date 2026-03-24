/**
 * OCRService - Performs text recognition with preprocessing.
 * Uses tesseract.js with image preprocessing for better accuracy.
 */

import type { Worker as TesseractWorker } from 'tesseract.js';

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

export class OCRService {
  /** Initialize the OCR worker (lazy, call before recognize) */
  static async initialize(): Promise<void> {
    await initWorker();
  }

  /** Recognize text from a canvas element */
  static async recognize(canvas: HTMLCanvasElement): Promise<string> {
    await initWorker();
    if (!worker) throw new Error('OCR worker not initialized');

    const processed = this.preprocess(canvas);
    const { data } = await worker.recognize(processed);
    return data.text;
  }

  /** Apply image preprocessing for better OCR accuracy */
  private static preprocess(source: HTMLCanvasElement): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = source.width;
    canvas.height = source.height;
    const ctx = canvas.getContext('2d')!;

    // Draw original image
    ctx.drawImage(source, 0, 0);

    // Get pixel data
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const pixels = imageData.data;

    // Step 1: Convert to grayscale
    for (let i = 0; i < pixels.length; i += 4) {
      const gray = pixels[i] * 0.299 + pixels[i + 1] * 0.587 + pixels[i + 2] * 0.114;
      pixels[i] = gray;
      pixels[i + 1] = gray;
      pixels[i + 2] = gray;
    }

    // Step 2: Increase contrast (stretch histogram)
    let min = 255;
    let max = 0;
    for (let i = 0; i < pixels.length; i += 4) {
      if (pixels[i] < min) min = pixels[i];
      if (pixels[i] > max) max = pixels[i];
    }
    const range = max - min || 1;
    for (let i = 0; i < pixels.length; i += 4) {
      const normalized = ((pixels[i] - min) / range) * 255;
      pixels[i] = normalized;
      pixels[i + 1] = normalized;
      pixels[i + 2] = normalized;
    }

    // Step 3: Binary threshold (Otsu-like: use mean as threshold)
    let sum = 0;
    const pixelCount = pixels.length / 4;
    for (let i = 0; i < pixels.length; i += 4) {
      sum += pixels[i];
    }
    const threshold = sum / pixelCount;

    for (let i = 0; i < pixels.length; i += 4) {
      const val = pixels[i] > threshold ? 255 : 0;
      pixels[i] = val;
      pixels[i + 1] = val;
      pixels[i + 2] = val;
    }

    ctx.putImageData(imageData, 0, 0);
    return canvas;
  }

  /** Terminate the OCR worker to free resources */
  static async terminate(): Promise<void> {
    if (worker) {
      await worker.terminate();
      worker = null;
      initPromise = null;
    }
  }
}
