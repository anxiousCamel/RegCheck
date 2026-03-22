import { z } from 'zod';

export const repetitionConfigSchema = z.object({
  itemsPerPage: z.number().int().min(1).max(50),
  columns: z.number().int().min(1).max(10),
  rows: z.number().int().min(1).max(10),
  offsetX: z.number().min(0).max(1),
  offsetY: z.number().min(0).max(1),
  startX: z.number().min(0).max(1).optional(),
  startY: z.number().min(0).max(1).optional(),
});

export const createTemplateSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  pdfFileKey: z.string().min(1),
});

export const updateTemplateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  status: z.enum(['draft', 'published', 'archived']).optional(),
  repetition: repetitionConfigSchema.optional(),
});

export const publishTemplateSchema = z.object({
  /** Confirm publish - will create a new version */
  confirm: z.literal(true),
});

export type CreateTemplateInput = z.infer<typeof createTemplateSchema>;
export type UpdateTemplateInput = z.infer<typeof updateTemplateSchema>;
export type RepetitionConfigInput = z.infer<typeof repetitionConfigSchema>;
