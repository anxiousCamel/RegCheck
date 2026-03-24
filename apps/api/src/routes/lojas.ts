import { Router } from 'express';
import { LojaService } from '../services/loja-service';
import { createLojaSchema, updateLojaSchema, paginationSchema, idParamSchema } from '@regcheck/validators';
import type { ApiResponse } from '@regcheck/shared';

export const lojaRouter = Router();

/** GET /api/lojas - List lojas (paginated) */
lojaRouter.get('/', async (req, res, next) => {
  try {
    const { page, pageSize } = paginationSchema.parse(req.query);
    const result = await LojaService.list(page, pageSize);
    res.json({ success: true, data: result } satisfies ApiResponse<typeof result>);
  } catch (err) {
    next(err);
  }
});

/** GET /api/lojas/active - List active lojas (for selects) */
lojaRouter.get('/active', async (_req, res, next) => {
  try {
    const lojas = await LojaService.listActive();
    res.json({ success: true, data: lojas } satisfies ApiResponse<typeof lojas>);
  } catch (err) {
    next(err);
  }
});

/** GET /api/lojas/:id - Get loja by ID */
lojaRouter.get('/:id', async (req, res, next) => {
  try {
    const { id } = idParamSchema.parse(req.params);
    const loja = await LojaService.getById(id);
    res.json({ success: true, data: loja } satisfies ApiResponse<typeof loja>);
  } catch (err) {
    next(err);
  }
});

/** POST /api/lojas - Create loja */
lojaRouter.post('/', async (req, res, next) => {
  try {
    const input = createLojaSchema.parse(req.body);
    const loja = await LojaService.create(input);
    res.status(201).json({ success: true, data: loja } satisfies ApiResponse<typeof loja>);
  } catch (err) {
    next(err);
  }
});

/** PATCH /api/lojas/:id - Update loja */
lojaRouter.patch('/:id', async (req, res, next) => {
  try {
    const { id } = idParamSchema.parse(req.params);
    const input = updateLojaSchema.parse(req.body);
    const loja = await LojaService.update(id, input);
    res.json({ success: true, data: loja } satisfies ApiResponse<typeof loja>);
  } catch (err) {
    next(err);
  }
});

/** PATCH /api/lojas/:id/toggle - Toggle active status */
lojaRouter.patch('/:id/toggle', async (req, res, next) => {
  try {
    const { id } = idParamSchema.parse(req.params);
    const loja = await LojaService.toggleActive(id);
    res.json({ success: true, data: loja } satisfies ApiResponse<typeof loja>);
  } catch (err) {
    next(err);
  }
});

/** DELETE /api/lojas/:id - Delete loja */
lojaRouter.delete('/:id', async (req, res, next) => {
  try {
    const { id } = idParamSchema.parse(req.params);
    await LojaService.delete(id);
    res.json({ success: true } satisfies ApiResponse<never>);
  } catch (err) {
    next(err);
  }
});
