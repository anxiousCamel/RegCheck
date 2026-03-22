import type { FilledFieldData } from './field';

/** Status of a filled document */
export type DocumentStatus = 'draft' | 'in_progress' | 'completed' | 'generating' | 'generated' | 'error';

/** A filled document instance based on a template */
export interface Document {
  id: string;
  templateId: string;
  templateVersion: number;
  name: string;
  status: DocumentStatus;
  /** Total number of items being filled */
  totalItems: number;
  /** Filled field data */
  filledFields: FilledFieldData[];
  /** Generated PDF file key (when complete) */
  generatedPdfKey?: string;
  createdAt: string;
  updatedAt: string;
}

/** Summary view for document listing */
export interface DocumentSummary {
  id: string;
  templateId: string;
  templateName: string;
  name: string;
  status: DocumentStatus;
  totalItems: number;
  completedItems: number;
  createdAt: string;
  updatedAt: string;
}
