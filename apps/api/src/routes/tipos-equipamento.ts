import { Router } from 'express';
import { TipoEquipamentoService } from '../services/tipo-equipamento-service';
import {
  createTipoEquipamentoSchema,
  updateTipoEquipamentoSchema,
  paginationSchema,
  idParamSchema,
} from '@regcheck/validators';
import type { ApiResponse } from '@regcheck/shared';

export const tipoEquipamentoRouter = Router();

/** GET /api/tipos-equipamento - List tipos (paginated) */
tipoEquipamentoRouter.get('/', async (req, res, next) => {
  try {
    const { page, pageSize } = paginationSchema.parse(req.query);
    const result = await TipoEquipamentoService.list(page, pageSize);
    res.json({ success: true, data: result } satisfies ApiResponse<typeof result>);
  } catch (err) {
    next(err);
  }
});

/** GET /api/tipos-equipamento/active - List active tipos (for selects) */
tipoEquipamentoRouter.get('/active', async (_req, res, next) => {
  try {
    const tipos = await TipoEquipamentoService.listActive();
    res.json({ success: true, data: tipos } satisfies ApiResponse<typeof tipos>);
  } catch (err) {
    next(err);
  }
});

/** GET /api/tipos-equipamento/:id - Get tipo by ID */
tipoEquipamentoRouter.get('/:id', async (req, res, next) => {
  try {
    const { id } = idParamSchema.parse(req.params);
    const tipo = await TipoEquipamentoService.getById(id);
    res.json({ success: true, data: tipo } satisfies ApiResponse<typeof tipo>);
  } catch (err) {
    next(err);
  }
});

/** POST /api/tipos-equipamento - Create tipo */
tipoEquipamentoRouter.post('/', async (req, res, next) => {
  try {
    const input = createTipoEquipamentoSchema.parse(req.body);
    const tipo = await TipoEquipamentoService.create(input);
    res.status(201).json({ success: true, data: tipo } satisfies ApiResponse<typeof tipo>);
  } catch (err) {
    next(err);
  }
});

/** PATCH /api/tipos-equipamento/:id - Update tipo */
tipoEquipamentoRouter.patch('/:id', async (req, res, next) => {
  try {
    const { id } = idParamSchema.parse(req.params);
    const input = updateTipoEquipamentoSchema.parse(req.body);
    const tipo = await TipoEquipamentoService.update(id, input);
    res.json({ success: true, data: tipo } satisfies ApiResponse<typeof tipo>);
  } catch (err) {
    next(err);
  }
});

/** PATCH /api/tipos-equipamento/:id/toggle - Toggle active status */
tipoEquipamentoRouter.patch('/:id/toggle', async (req, res, next) => {
  try {
    const { id } = idParamSchema.parse(req.params);
    const tipo = await TipoEquipamentoService.toggleActive(id);
    res.json({ success: true, data: tipo } satisfies ApiResponse<typeof tipo>);
  } catch (err) {
    next(err);
  }
});

/** DELETE /api/tipos-equipamento/:id - Delete tipo */
tipoEquipamentoRouter.delete('/:id', async (req, res, next) => {
  try {
    const { id } = idParamSchema.parse(req.params);
    await TipoEquipamentoService.delete(id);
    res.json({ success: true } satisfies ApiResponse<never>);
  } catch (err) {
    next(err);
  }
});
