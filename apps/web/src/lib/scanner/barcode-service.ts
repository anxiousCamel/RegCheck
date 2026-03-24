/**
 * BarcodeService - Detects barcodes from image data.
 * Uses the native BarcodeDetector API (Chrome) with barcode-detector polyfill fallback.
 */

interface BarcodeResult {
  format: string;
  value: string;
}

let detectorPromise: Promise<BarcodeDetector> | null = null;

async function getDetector(): Promise<BarcodeDetector> {
  if (!detectorPromise) {
    detectorPromise = (async () => {
      // Use native BarcodeDetector if available, otherwise load polyfill
      if (!('BarcodeDetector' in globalThis)) {
        const { BarcodeDetector: Polyfill } = await import('barcode-detector');
        (globalThis as Record<string, unknown>).BarcodeDetector = Polyfill;
      }
      return new BarcodeDetector({
        formats: ['code_128', 'code_39', 'ean_13', 'ean_8', 'qr_code'],
      });
    })();
  }
  return detectorPromise;
}

export class BarcodeService {
  /**
   * Detect barcodes from an image source.
   * Returns an array of detected barcode values with their format.
   */
  static async detect(source: ImageBitmapSource): Promise<BarcodeResult[]> {
    try {
      const detector = await getDetector();
      const results = await detector.detect(source);
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
