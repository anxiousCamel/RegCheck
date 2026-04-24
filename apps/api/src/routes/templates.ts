import { Router } from 'express';
import { TemplateService } from '../services/template-service';
import { createTemplateSchema, updateTemplateSchema } from '@regcheck/validators';
import { paginationSchema, idParamSchema } from '@regcheck/validators';
import type { ApiResponse } from '@regcheck/shared';

export const templateRouter = Router();

/** GET /api/templates - List templates */
templateRouter.get('/', async (req, res, next) => {
  try {
    const { page, pageSize } = paginationSchema.parse(req.query);
    const result = await TemplateService.list(page, pageSize);
    res.json({ success: true, data: result } satisfies ApiResponse<typeof result>);
  } catch (err) {
    next(err);
  }
});

/** GET /api/templates/:id - Get template by ID */
templateRouter.get('/:id', async (req, res, next) => {
  try {
    const { id } = idParamSchema.parse(req.params);
    const template = await TemplateService.getById(id);
    res.json({ success: true, data: template } satisfies ApiResponse<typeof template>);
  } catch (err) {
    next(err);
  }
});

/** POST /api/templates - Create template */
templateRouter.post('/', async (req, res, next) => {
  try {
    const input = createTemplateSchema.parse(req.body);
    // Find the PdfFile by fileKey
    const { prisma } = await import('@regcheck/database');
    const pdfFile = await prisma.pdfFile.findUnique({ where: { fileKey: input.pdfFileKey } });
    if (!pdfFile) {
      res.status(400).json({
        success: false,
        error: { code: 'PDF_NOT_FOUND', message: 'PDF file not found. Upload first.' },
      });
      return;
    }
    const template = await TemplateService.create(input, pdfFile.id);
    res.status(201).json({ success: true, data: template } satisfies ApiResponse<typeof template>);
  } catch (err) {
    next(err);
  }
});

/** PATCH /api/templates/:id - Update template */
templateRouter.patch('/:id', async (req, res, next) => {
  try {
    const { id } = idParamSchema.parse(req.params);
    const input = updateTemplateSchema.parse(req.body);
    const template = await TemplateService.update(id, input);
    res.json({ success: true, data: template } satisfies ApiResponse<typeof template>);
  } catch (err) {
    next(err);
  }
});

/** POST /api/templates/:id/publish - Publish template */
templateRouter.post('/:id/publish', async (req, res, next) => {
  try {
    const { id } = idParamSchema.parse(req.params);
    const result = await TemplateService.publish(id);
    res.json({ success: true, data: result } satisfies ApiResponse<typeof result>);
  } catch (err) {
    next(err);
  }
});

/** POST /api/templates/:id/unpublish - Unpublish template */
templateRouter.post('/:id/unpublish', async (req, res, next) => {
  try {
    const { id } = idParamSchema.parse(req.params);
    const result = await TemplateService.unpublish(id);
    res.json({ success: true, data: result } satisfies ApiResponse<typeof result>);
  } catch (err) {
    next(err);
  }
});

/** DELETE /api/templates/:id - Delete template */
templateRouter.delete('/:id', async (req, res, next) => {
  try {
    const { id } = idParamSchema.parse(req.params);
    await TemplateService.delete(id);
    res.json({ success: true } satisfies ApiResponse<never>);
  } catch (err) {
    next(err);
  }
});
