import { Router } from 'express';
import { FieldService } from '../services/field-service';
import { createFieldSchema, updateFieldSchema } from '@regcheck/validators';
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
    const { fieldId } = z.object({ id: z.string().uuid(), fieldId: z.string().uuid() }).parse(req.params);
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
    const { fieldId } = z.object({ id: z.string().uuid(), fieldId: z.string().uuid() }).parse(req.params);
    await FieldService.delete(fieldId);
    res.json({ success: true } satisfies ApiResponse<never>);
  } catch (err) {
    next(err);
  }
});

/** POST /api/templates/:id/fields/batch-positions - Batch update positions */
fieldRouter.post('/:id/fields/batch-positions', async (req, res, next) => {
  try {
    const batchSchema = z.object({
      updates: z.array(
        z.object({
          id: z.string().uuid(),
          position: z.object({
            x: z.number().min(0).max(1),
            y: z.number().min(0).max(1),
            width: z.number().min(0.01).max(1),
            height: z.number().min(0.01).max(1),
          }),
        }),
      ),
    });

    const { updates } = batchSchema.parse(req.body);
    await FieldService.batchUpdatePositions(updates);
    res.json({ success: true } satisfies ApiResponse<never>);
  } catch (err) {
    next(err);
  }
});
