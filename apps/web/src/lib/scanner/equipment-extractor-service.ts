/**
 * EquipmentExtractorService - Orchestrates the barcode + OCR pipeline.
 * Priority: Barcode first (fast, high confidence) → OCR fallback.
 */

import type { ScanResult, ScanCandidate } from '@regcheck/shared';
import { BarcodeService } from './barcode-service';
import { OCRService } from './ocr-service';
import { TextParserService } from './text-parser-service';

export class EquipmentExtractorService {
  /**
   * Extract equipment identifiers from a video frame.
   * @param canvas - A canvas element containing the captured frame.
   * @returns ScanResult with top candidates for serie and patrimonio.
   */
  static async extract(canvas: HTMLCanvasElement): Promise<ScanResult> {
    const raw: string[] = [];

    // Step 1: Try barcode detection first (fast, high confidence)
    const imageBitmap = await createImageBitmap(canvas);
    const barcodes = await BarcodeService.detect(imageBitmap);

    const barcodeCandidates: ScanCandidate[] = barcodes.map((b) => ({
      value: b.value,
      confidence: 0.95,
      source: 'barcode' as const,
    }));

    if (barcodes.length > 0) {
      raw.push(...barcodes.map((b) => `[barcode:${b.format}] ${b.value}`));

      // If barcode found, return immediately with high confidence
      // Barcodes usually encode the serial number
      return {
        serie: barcodeCandidates.slice(0, 3),
        patrimonio: [],
        raw,
      };
    }

    // Step 2: Fallback to OCR
    const ocrText = await OCRService.recognize(canvas);
    raw.push(ocrText);

    // Step 3: Parse OCR text with heuristics and scoring
    const parsed = TextParserService.parse(ocrText);

    return {
      serie: parsed.serie,
      patrimonio: parsed.patrimonio,
      raw,
    };
  }
}
