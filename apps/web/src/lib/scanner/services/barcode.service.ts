/**
 * Barcode detection with native BarcodeDetector + ZXing WASM fallback.
 * If barcode is found, the pipeline stops — no OCR needed.
 */

import type { ScanCandidate } from '../types';

// ─── Native BarcodeDetector ──────────────────────────────────────────────────

let nativeDetector: BarcodeDetector | null = null;
let nativeSupported: boolean | null = null;

function getNativeDetector(): BarcodeDetector | null {
  if (nativeSupported === null) {
    nativeSupported = 'BarcodeDetector' in globalThis;
  }
  if (!nativeSupported) return null;
  if (!nativeDetector) {
    nativeDetector = new BarcodeDetector({
      formats: ['code_128', 'code_39', 'ean_13', 'ean_8', 'qr_code', 'data_matrix'],
    });
  }
  return nativeDetector;
}

// ─── ZXing WASM fallback ─────────────────────────────────────────────────────

let zxingReady: Promise<typeof import('zxing-wasm')> | null = null;

function getZxing(): Promise<typeof import('zxing-wasm')> {
  if (!zxingReady) {
    zxingReady = import('zxing-wasm');
  }
  return zxingReady;
}

// ─── Service ─────────────────────────────────────────────────────────────────

export const BarcodeService = {
  async detect(image: ImageBitmap, signal?: AbortSignal): Promise<ScanCandidate[]> {
    if (signal?.aborted) throw new DOMException('Cancelled', 'AbortError');

    // Try native first (fastest)
    const native = await this.detectNative(image);
    if (native.length > 0) return native;

    // Fallback to ZXing WASM
    return this.detectZxing(image, signal);
  },

  async detectNative(image: ImageBitmap): Promise<ScanCandidate[]> {
    const detector = getNativeDetector();
    if (!detector) return [];

    try {
      const results = await detector.detect(image);
      return results.map((r) => ({
        type: 'serial' as const,
        value: r.rawValue,
        confidence: 0.95,
        source: 'barcode' as const,
      }));
    } catch {
      return [];
    }
  },

  async detectZxing(image: ImageBitmap, signal?: AbortSignal): Promise<ScanCandidate[]> {
    try {
      const zxing = await getZxing();
      if (signal?.aborted) throw new DOMException('Cancelled', 'AbortError');

      // Convert ImageBitmap to ImageData for ZXing
      const canvas = new OffscreenCanvas(image.width, image.height);
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(image, 0, 0);
      const imageData = ctx.getImageData(0, 0, image.width, image.height);

      const results = await zxing.readBarcodesFromImageData(imageData, {
        tryHarder: true,
        formats: ['Code128', 'Code39', 'EAN-13', 'EAN-8', 'QRCode', 'DataMatrix'],
        maxNumberOfSymbols: 5,
      });

      return results
        .filter((r) => r.text.length > 0)
        .map((r) => ({
          type: 'serial' as const,
          value: r.text,
          confidence: 0.9,
          source: 'barcode' as const,
        }));
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') throw err;
      console.warn('[BarcodeService] ZXing fallback failed:', err);
      return [];
    }
  },
};

// ─── Type declaration ────────────────────────────────────────────────────────

declare class BarcodeDetector {
  constructor(options?: { formats: string[] });
  detect(source: ImageBitmapSource): Promise<Array<{ format: string; rawValue: string }>>;
}
