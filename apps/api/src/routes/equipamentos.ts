import { Router } from 'express';
import { EquipamentoService } from '../services/equipamento-service';
import {
  createEquipamentoSchema,
  updateEquipamentoSchema,
  equipamentoFilterSchema,
  paginationSchema,
  idParamSchema,
} from '@regcheck/validators';
import type { ApiResponse } from '@regcheck/shared';

export const equipamentoRouter = Router();

/** GET /api/equipamentos - List equipamentos (paginated + filters) */
equipamentoRouter.get('/', async (req, res, next) => {
  try {
    const { page, pageSize } = paginationSchema.parse(req.query);
    const filters = equipamentoFilterSchema.parse(req.query);
    const result = await EquipamentoService.list(page, pageSize, filters);
    res.json({ success: true, data: result } satisfies ApiResponse<typeof result>);
  } catch (err) {
    next(err);
  }
});

/** GET /api/equipamentos/:id - Get equipamento by ID */
equipamentoRouter.get('/:id', async (req, res, next) => {
  try {
    const { id } = idParamSchema.parse(req.params);
    const equipamento = await EquipamentoService.getById(id);
    res.json({ success: true, data: equipamento } satisfies ApiResponse<typeof equipamento>);
  } catch (err) {
    next(err);
  }
});

/** POST /api/equipamentos - Create equipamento */
equipamentoRouter.post('/', async (req, res, next) => {
  try {
    const input = createEquipamentoSchema.parse(req.body);
    const equipamento = await EquipamentoService.create(input);
    res
      .status(201)
      .json({ success: true, data: equipamento } satisfies ApiResponse<typeof equipamento>);
  } catch (err) {
    next(err);
  }
});

/** PATCH /api/equipamentos/:id - Update equipamento */
equipamentoRouter.patch('/:id', async (req, res, next) => {
  try {
    const { id } = idParamSchema.parse(req.params);
    const input = updateEquipamentoSchema.parse(req.body);
    const equipamento = await EquipamentoService.update(id, input);
    res.json({ success: true, data: equipamento } satisfies ApiResponse<typeof equipamento>);
  } catch (err) {
    next(err);
  }
});

/** DELETE /api/equipamentos/:id - Delete equipamento */
equipamentoRouter.delete('/:id', async (req, res, next) => {
  try {
    const { id } = idParamSchema.parse(req.params);
    await EquipamentoService.delete(id);
    res.json({ success: true } satisfies ApiResponse<never>);
  } catch (err) {
    next(err);
  }
});
