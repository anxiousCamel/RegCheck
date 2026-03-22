import { z } from 'zod';

export const fieldTypeSchema = z.enum(['text', 'image', 'signature', 'checkbox']);

export const fieldPositionSchema = z.object({
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
  width: z.number().min(0.01).max(1),
  height: z.number().min(0.01).max(1),
});

export const fieldConfigSchema = z.object({
  label: z.string().min(1).max(200),
  required: z.boolean().default(false),
  placeholder: z.string().max(500).optional(),
  defaultValue: z.string().max(1000).optional(),
  fontSize: z.number().min(6).max(72).optional(),
  fontFamily: z.string().max(100).optional(),
  fontColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  backgroundColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  borderColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  borderWidth: z.number().min(0).max(10).optional(),
  textAlign: z.enum(['left', 'center', 'right']).optional(),
  maxLength: z.number().int().min(1).max(10000).optional(),
});

export const createFieldSchema = z.object({
  type: fieldTypeSchema,
  pageIndex: z.number().int().min(0),
  position: fieldPositionSchema,
  config: fieldConfigSchema,
  repetitionGroupId: z.string().uuid().optional(),
});

export const updateFieldSchema = createFieldSchema.partial();

export const filledFieldDataSchema = z.object({
  fieldId: z.string().uuid(),
  itemIndex: z.number().int().min(0),
  value: z.union([z.string(), z.boolean()]),
  fileKey: z.string().optional(),
});

export type CreateFieldInput = z.infer<typeof createFieldSchema>;
export type UpdateFieldInput = z.infer<typeof updateFieldSchema>;
export type FilledFieldDataInput = z.infer<typeof filledFieldDataSchema>;
