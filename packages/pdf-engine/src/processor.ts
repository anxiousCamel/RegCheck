import { PDFDocument } from 'pdf-lib';
import type { PdfPageInfo } from './types';

/**
 * Handles PDF file processing: page counting, dimension extraction,
 * and page-level operations.
 */
export class PdfProcessor {
  /**
   * Extract page information from a PDF buffer.
   * @param pdfBytes - Raw PDF file bytes
   * @returns Array of page info with dimensions
   */
  static async getPageInfo(pdfBytes: Buffer): Promise<PdfPageInfo[]> {
    const doc = await PDFDocument.load(pdfBytes);
    const pages = doc.getPages();

    return pages.map((page, index) => {
      const { width, height } = page.getSize();
      return {
        pageIndex: index,
        width,
        height,
      };
    });
  }

  /**
   * Get the total page count of a PDF.
   * @param pdfBytes - Raw PDF file bytes
   */
  static async getPageCount(pdfBytes: Buffer): Promise<number> {
    const doc = await PDFDocument.load(pdfBytes);
    return doc.getPageCount();
  }

  /**
   * Extract a single page from a PDF as a new PDF buffer.
   * Used for rendering individual page previews.
   * @param pdfBytes - Raw PDF file bytes
   * @param pageIndex - Zero-based page index
   */
  static async extractPage(pdfBytes: Buffer, pageIndex: number): Promise<Buffer> {
    const srcDoc = await PDFDocument.load(pdfBytes);
    const destDoc = await PDFDocument.create();
    const [copiedPage] = await destDoc.copyPages(srcDoc, [pageIndex]);

    if (!copiedPage) {
      throw new Error(`Page index ${pageIndex} does not exist in PDF`);
    }

    destDoc.addPage(copiedPage);
    const bytes = await destDoc.save();
    return Buffer.from(bytes);
  }

  /**
   * Duplicate pages in a PDF to accommodate repeated items.
   * @param pdfBytes - Original PDF bytes
   * @param totalPages - Total pages needed (repeating original pages cyclically)
   * @param originalPageCount - Number of pages in the original PDF
   */
  static async duplicatePages(
    pdfBytes: Buffer,
    totalPages: number,
    originalPageCount: number,
  ): Promise<Buffer> {
    const srcDoc = await PDFDocument.load(pdfBytes);
    const destDoc = await PDFDocument.create();

    for (let i = 0; i < totalPages; i++) {
      const srcPageIndex = i % originalPageCount;
      const [copiedPage] = await destDoc.copyPages(srcDoc, [srcPageIndex]);
      if (copiedPage) {
        destDoc.addPage(copiedPage);
      }
    }

    const bytes = await destDoc.save();
    return Buffer.from(bytes);
  }
}
