import type { TemplateField } from './field';

/** Status of a template */
export type TemplateStatus = 'draft' | 'published' | 'archived';

/** A document template definition */
export interface Template {
  id: string;
  name: string;
  description?: string;
  status: TemplateStatus;
  /** Original PDF file storage key */
  pdfFileKey: string;
  /** Number of pages in the original PDF */
  pageCount: number;
  /** Template version for history tracking */
  version: number;
  /** Fields defined on this template */
  fields: TemplateField[];
  createdAt: string;
  updatedAt: string;
}

/** Summary view for template listing */
export interface TemplateSummary {
  id: string;
  name: string;
  description?: string;
  status: TemplateStatus;
  pageCount: number;
  fieldCount: number;
  version: number;
  createdAt: string;
  updatedAt: string;
}
