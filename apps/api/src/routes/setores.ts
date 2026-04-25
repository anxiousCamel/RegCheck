import { Router } from 'express';
import { SetorService } from '../services/setor-service';
import {
  createSetorSchema,
  updateSetorSchema,
  paginationSchema,
  idParamSchema,
} from '@regcheck/validators';
import type { ApiResponse } from '@regcheck/shared';

export const setorRouter = Router();

/** GET /api/setores - List setores (paginated) */
setorRouter.get('/', async (req, res, next) => {
  try {
    const { page, pageSize } = paginationSchema.parse(req.query);
    const result = await SetorService.list(page, pageSize);
    res.json({ success: true, data: result } satisfies ApiResponse<typeof result>);
  } catch (err) {
    next(err);
  }
});

/** GET /api/setores/active - List active setores (for selects) */
setorRouter.get('/active', async (_req, res, next) => {
  try {
    const setores = await SetorService.listActive();
    res.json({ success: true, data: setores } satisfies ApiResponse<typeof setores>);
  } catch (err) {
    next(err);
  }
});

/** GET /api/setores/:id - Get setor by ID */
setorRouter.get('/:id', async (req, res, next) => {
  try {
    const { id } = idParamSchema.parse(req.params);
    const setor = await SetorService.getById(id);
    res.json({ success: true, data: setor } satisfies ApiResponse<typeof setor>);
  } catch (err) {
    next(err);
  }
});

/** POST /api/setores - Create setor */
setorRouter.post('/', async (req, res, next) => {
  try {
    const input = createSetorSchema.parse(req.body);
    const setor = await SetorService.create(input);
    res.status(201).json({ success: true, data: setor } satisfies ApiResponse<typeof setor>);
  } catch (err) {
    next(err);
  }
});

/** PATCH /api/setores/:id - Update setor */
setorRouter.patch('/:id', async (req, res, next) => {
  try {
    const { id } = idParamSchema.parse(req.params);
    const input = updateSetorSchema.parse(req.body);
    const setor = await SetorService.update(id, input);
    res.json({ success: true, data: setor } satisfies ApiResponse<typeof setor>);
  } catch (err) {
    next(err);
  }
});

/** PATCH /api/setores/:id/toggle - Toggle active status */
setorRouter.patch('/:id/toggle', async (req, res, next) => {
  try {
    const { id } = idParamSchema.parse(req.params);
    const setor = await SetorService.toggleActive(id);
    res.json({ success: true, data: setor } satisfies ApiResponse<typeof setor>);
  } catch (err) {
    next(err);
  }
});

/** DELETE /api/setores/:id - Delete setor */
setorRouter.delete('/:id', async (req, res, next) => {
  try {
    const { id } = idParamSchema.parse(req.params);
    await SetorService.delete(id);
    res.json({ success: true } satisfies ApiResponse<never>);
  } catch (err) {
    next(err);
  }
});
