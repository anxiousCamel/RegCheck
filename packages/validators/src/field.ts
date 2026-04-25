import { z } from 'zod';

export const fieldTypeSchema = z.enum(['text', 'image', 'signature', 'checkbox']);

export const fieldScopeSchema = z.enum(['global', 'item']);

export const fieldPositionSchema = z.object({
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
  width: z.number().nonnegative().max(1),
  height: z.number().nonnegative().max(1),
});

export const fieldConfigSchema = z.object({
  label: z.string().min(1).max(200),
  required: z.boolean().default(false),
  placeholder: z.string().max(500).optional(),
  defaultValue: z.string().max(1000).optional(),
  fontSize: z.number().min(6).max(72).optional(),
  fontFamily: z.string().max(100).optional(),
  fontColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional(),
  backgroundColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional(),
  borderColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional(),
  borderWidth: z.number().min(0).max(10).optional(),
  textAlign: z.enum(['left', 'center', 'right']).optional(),
  maxLength: z.number().int().min(1).max(10000).optional(),
});

/**
 * Free-form binding key: `<namespace>.<key>`.
 *   - `global.<key>`: document-level value
 *   - `eq.<key>`:     per-item value (e.g. `eq.serie`, `eq.patrimonio`)
 * New namespaces/keys don't require schema changes — just producer side.
 */
export const bindingKeySchema = z.string().regex(/^(global|eq)\.[a-z][a-z0-9_.]*$/i, {
  message: "bindingKey must match '<global|eq>.<key>'",
});

export const createFieldSchema = z
  .object({
    type: fieldTypeSchema,
    pageIndex: z.number().int().min(0),
    position: fieldPositionSchema,
    config: fieldConfigSchema,
    scope: fieldScopeSchema.default('item'),
    /** SX slot on the page (0..N-1). null for scope='global'. */
    slotIndex: z.number().int().min(0).nullable().optional(),
    /** Optional auto-populate binding. null = manual fill. */
    bindingKey: bindingKeySchema.nullable().optional(),
  })
  .transform((v) => {
    // Normalize: if scope='item' and slotIndex is missing, default to 0
    const normalizedSlotIndex =
      v.scope === 'item' && v.slotIndex === undefined ? 0 : (v.slotIndex ?? null);
    const normalizedBindingKey = v.bindingKey ?? null;

    return {
      ...v,
      slotIndex: normalizedSlotIndex,
      bindingKey: normalizedBindingKey,
    };
  })
  .refine(
    (v) => {
      if (v.scope === 'global') {
        return v.slotIndex === null;
      }
      return typeof v.slotIndex === 'number' && v.slotIndex >= 0;
    },
    {
      message:
        "slotIndex must be null when scope='global' and a non-negative number when scope='item'",
      path: ['slotIndex'],
    },
  );

export const updateFieldSchema = z.object({
  type: fieldTypeSchema.optional(),
  pageIndex: z.number().int().min(0).optional(),
  position: fieldPositionSchema.optional(),
  config: fieldConfigSchema.optional(),
  scope: fieldScopeSchema.optional(),
  slotIndex: z.number().int().min(0).nullable().optional(),
  bindingKey: bindingKeySchema.nullable().optional(),
});

export const filledFieldDataSchema = z.object({
  fieldId: z.string().uuid(),
  itemIndex: z.number().int().min(0),
  value: z.union([z.string(), z.boolean()]),
  fileKey: z.string().nullable().optional(),
});

export type CreateFieldInput = z.infer<typeof createFieldSchema>;
export type UpdateFieldInput = z.infer<typeof updateFieldSchema>;
export type FilledFieldDataInput = z.infer<typeof filledFieldDataSchema>;
