import { z } from 'zod';
import { filledFieldDataSchema } from './field';

export const createDocumentSchema = z.object({
  templateId: z.string().uuid(),
  name: z.string().min(1).max(200),
  totalItems: z.number().int().min(1).max(10000).default(1),
});

export const updateDocumentSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  status: z.enum(['draft', 'in_progress', 'completed']).optional(),
  totalItems: z.number().int().min(1).max(10000).optional(),
});

export const populateDocumentSchema = z.object({
  tipoId: z.string().uuid(),
  lojaId: z.string().uuid(),
});

export const saveFilledDataSchema = z.object({
  fields: z.array(filledFieldDataSchema).min(1).max(10000),
});

export const generatePdfSchema = z.object({
  /** Confirm generation */
  confirm: z.literal(true),
});

export type CreateDocumentInput = z.infer<typeof createDocumentSchema>;
export type UpdateDocumentInput = z.infer<typeof updateDocumentSchema>;
export type SaveFilledDataInput = z.infer<typeof saveFilledDataSchema>;
export type PopulateDocumentInput = z.infer<typeof populateDocumentSchema>;
