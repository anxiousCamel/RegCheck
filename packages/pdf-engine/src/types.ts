import type { FieldType, FieldPosition } from '@regcheck/shared';

/** Information about a single PDF page */
export interface PdfPageInfo {
  pageIndex: number;
  width: number;
  height: number;
}

/** Options for generating a filled PDF */
export interface GeneratePdfOptions {
  /** Original PDF bytes */
  originalPdf: Buffer;
  /** Page dimensions */
  pages: PdfPageInfo[];
  /** Fields to render on the PDF */
  fieldOverlays: FieldOverlay[];
}

/** A field overlay to render on the PDF */
export interface FieldOverlay {
  pageIndex: number;
  type: FieldType;
  position: FieldPosition;
  /** Text value, or base64 image data */
  value: string;
  /** For checkboxes */
  checked?: boolean;
  /** Image bytes for image/signature fields */
  imageBytes?: Buffer;
  fontSize?: number;
  fontColor?: string;
}
