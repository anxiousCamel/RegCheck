import { Router } from 'express';
import { FieldService } from '../services/field-service';
import {
  createFieldSchema,
  updateFieldSchema,
  fieldPositionSchema,
  fieldConfigSchema,
} from '@regcheck/validators';
import { idParamSchema } from '@regcheck/validators';
import { z } from 'zod';
import type { ApiResponse } from '@regcheck/shared';

export const fieldRouter = Router();

/** POST /api/templates/:id/fields - Add field to template */
fieldRouter.post('/:id/fields', async (req, res, next) => {
  try {
    const { id } = idParamSchema.parse(req.params);
    const input = createFieldSchema.parse(req.body);
    const field = await FieldService.create(id, input);
    res.status(201).json({ success: true, data: field } satisfies ApiResponse<typeof field>);
  } catch (err) {
    next(err);
  }
});

/** PATCH /api/templates/:templateId/fields/:fieldId - Update field */
fieldRouter.patch('/:id/fields/:fieldId', async (req, res, next) => {
  try {
    const { fieldId } = z
      .object({ id: z.string().uuid(), fieldId: z.string().uuid() })
      .parse(req.params);
    const input = updateFieldSchema.parse(req.body);
    const field = await FieldService.update(fieldId, input);
    res.json({ success: true, data: field } satisfies ApiResponse<typeof field>);
  } catch (err) {
    next(err);
  }
});

/** DELETE /api/templates/:templateId/fields/:fieldId - Delete field */
fieldRouter.delete('/:id/fields/:fieldId', async (req, res, next) => {
  try {
    const { fieldId } = z
      .object({ id: z.string().uuid(), fieldId: z.string().uuid() })
      .parse(req.params);
    await FieldService.delete(fieldId);
    res.json({ success: true } satisfies ApiResponse<never>);
  } catch (err) {
    next(err);
  }
});

/** POST /api/templates/:id/fields/batch-positions - Batch update fields (position + optional scope/slot/binding/config) */
fieldRouter.post('/:id/fields/batch-positions', async (req, res, next) => {
  try {
    const batchSchema = z.object({
      updates: z.array(
        z.object({
          id: z.string().uuid(),
          position: fieldPositionSchema,
          config: fieldConfigSchema.optional(),
          scope: z.enum(['global', 'item']).optional(),
          slotIndex: z.number().int().min(0).nullable().optional(),
          bindingKey: z
            .string()
            .regex(/^(global|eq)\.[a-z][a-z0-9_.]*$/i)
            .nullable()
            .optional(),
        }),
      ),
    });

    const { updates } = batchSchema.parse(req.body);
    // Map validated Zod output to the service's expected types.
    // Conditionally spread each optional property to satisfy exactOptionalPropertyTypes
    // (omit key entirely instead of passing undefined).
    const mapped = updates.map(({ config, scope, slotIndex, bindingKey, ...rest }) => ({
      ...rest,
      ...(config !== undefined ? { config: config as Record<string, unknown> } : {}),
      ...(scope !== undefined ? { scope } : {}),
      ...(slotIndex !== undefined ? { slotIndex } : {}),
      ...(bindingKey !== undefined ? { bindingKey } : {}),
    }));
    await FieldService.batchUpdateFields(mapped);
    res.json({ success: true } satisfies ApiResponse<never>);
  } catch (err) {
    next(err);
  }
});
