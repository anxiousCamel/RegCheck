import type { TemplateField } from './field';

/** Status of a template */
export type TemplateStatus = 'draft' | 'published' | 'archived';

/** Fill mode for document generation */
export type FillMode = 'AUTOMATICO' | 'SELECAO_MANUAL';

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
  /** How equipment is assigned to document slots */
  fillMode: FillMode;
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
  fillMode: FillMode;
  createdAt: string;
  updatedAt: string;
}
