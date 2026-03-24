/**
 * BarcodeService - Detects barcodes from image data.
 * Uses the native BarcodeDetector API (Chrome/Edge).
 * If not available, returns empty (falls through to OCR).
 */

interface BarcodeResult {
  format: string;
  value: string;
}

let detector: BarcodeDetector | null = null;
let supported: boolean | null = null;

function isSupported(): boolean {
  if (supported === null) {
    supported = 'BarcodeDetector' in globalThis;
  }
  return supported;
}

function getDetector(): BarcodeDetector | null {
  if (!isSupported()) return null;
  if (!detector) {
    detector = new BarcodeDetector({
      formats: ['code_128', 'code_39', 'ean_13', 'ean_8', 'qr_code'],
    });
  }
  return detector;
}

export class BarcodeService {
  /**
   * Detect barcodes from an image source.
   * Returns empty array if BarcodeDetector is not available (Firefox/Safari).
   */
  static async detect(source: ImageBitmapSource): Promise<BarcodeResult[]> {
    try {
      const det = getDetector();
      if (!det) return [];

      const results = await det.detect(source);
      return results.map((r) => ({
        format: r.format,
        value: r.rawValue,
      }));
    } catch (err) {
      console.warn('[BarcodeService] Detection failed:', err);
      return [];
    }
  }
}

// Type declaration for BarcodeDetector (not in all TS libs)
declare class BarcodeDetector {
  constructor(options?: { formats: string[] });
  detect(source: ImageBitmapSource): Promise<Array<{ format: string; rawValue: string }>>;
}
