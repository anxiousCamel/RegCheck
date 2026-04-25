import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import sharp from 'sharp';
import type { GeneratePdfOptions, FieldOverlay } from './types';

/**
 * Generates final PDF documents by overlaying filled field data
 * onto the original PDF template.
 */
export class PdfGenerator {
  /**
   * Generate a filled PDF from the original template and field overlays.
   * @param options - Generation options with original PDF and field data
   * @returns Buffer of the generated PDF
   */
  static async generate(options: GeneratePdfOptions): Promise<Buffer> {
    const { originalPdf, pages, fieldOverlays } = options;
    const doc = await PDFDocument.load(originalPdf);
    const font = await doc.embedFont(StandardFonts.Helvetica);

    for (const overlay of fieldOverlays) {
      const pageInfo = pages[overlay.pageIndex];
      if (!pageInfo) continue;

      const page = doc.getPage(overlay.pageIndex);
      if (!page) continue;

      const { width: pageWidth, height: pageHeight } = page.getSize();

      // Convert relative coordinates to absolute
      const absX = overlay.position.x * pageWidth;
      const absY =
        pageHeight - overlay.position.y * pageHeight - overlay.position.height * pageHeight;
      const absWidth = overlay.position.width * pageWidth;
      const absHeight = overlay.position.height * pageHeight;

      switch (overlay.type) {
        case 'text':
          await this.renderText(page, font, overlay, absX, absY, absWidth, absHeight);
          break;
        case 'checkbox':
          this.renderCheckbox(page, font, overlay, absX, absY, absHeight);
          break;
        case 'image':
        case 'signature':
          await this.renderImage(doc, page, overlay, absX, absY, absWidth, absHeight);
          break;
      }
    }

    const bytes = await doc.save();
    return Buffer.from(bytes);
  }

  private static async renderText(
    page: ReturnType<PDFDocument['getPage']>,
    font: Awaited<ReturnType<PDFDocument['embedFont']>>,
    overlay: FieldOverlay,
    x: number,
    y: number,
    _width: number,
    height: number,
  ): Promise<void> {
    const fontSize = overlay.fontSize ?? 12;
    const colorHex = overlay.fontColor ?? '#000000';
    const r = parseInt(colorHex.slice(1, 3), 16) / 255;
    const g = parseInt(colorHex.slice(3, 5), 16) / 255;
    const b = parseInt(colorHex.slice(5, 7), 16) / 255;

    page.drawText(overlay.value, {
      x,
      y: y + (height - fontSize) / 2,
      size: fontSize,
      font,
      color: rgb(r, g, b),
    });
  }

  private static renderCheckbox(
    page: ReturnType<PDFDocument['getPage']>,
    _font: Awaited<ReturnType<PDFDocument['embedFont']>>,
    overlay: FieldOverlay,
    x: number,
    y: number,
    height: number,
  ): void {
    const size = Math.min(height, 14);

    // Draw box
    page.drawRectangle({
      x,
      y,
      width: size,
      height: size,
      borderColor: rgb(0, 0, 0),
      borderWidth: 1,
    });

    // Draw checkmark if checked
    if (overlay.checked) {
      // Draw a vector checkmark instead of a character to avoid font encoding issues
      page.drawLine({
        start: { x: x + 2, y: y + size / 2 },
        end: { x: x + size / 3 + 1, y: y + 2 },
        thickness: 1.5,
        color: rgb(0, 0, 0),
      });
      page.drawLine({
        start: { x: x + size / 3 + 1, y: y + 2 },
        end: { x: x + size - 2, y: y + size - 2 },
        thickness: 1.5,
        color: rgb(0, 0, 0),
      });
    }
  }

  private static async renderImage(
    doc: PDFDocument,
    page: ReturnType<PDFDocument['getPage']>,
    overlay: FieldOverlay,
    x: number,
    y: number,
    width: number,
    height: number,
  ): Promise<void> {
    if (!overlay.imageBytes) return;

    const bytes = Buffer.from(overlay.imageBytes);
    const isPng = bytes[0] === 0x89 && bytes[1] === 0x50;
    const isJpeg = bytes[0] === 0xff && bytes[1] === 0xd8;

    let image;
    if (isPng) {
      image = await doc.embedPng(bytes);
    } else if (isJpeg) {
      image = await doc.embedJpg(bytes);
    } else {
      // WebP, HEIC, or unknown format — convert to JPEG via sharp
      const converted = await sharp(bytes).jpeg({ quality: 85 }).toBuffer();
      image = await doc.embedJpg(converted);
    }

    const scaled = image.scaleToFit(width, height);
    page.drawImage(image, {
      x,
      y,
      width: scaled.width,
      height: scaled.height,
    });
  }
}
