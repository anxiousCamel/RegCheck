import { Router } from 'express';
import { prisma } from '@regcheck/database';
import { DocumentService } from '../services/document-service';
import { createDocumentSchema, updateDocumentSchema, saveFilledDataSchema, populateDocumentSchema, manualSelectSchema } from '@regcheck/validators';
import { paginationSchema, idParamSchema } from '@regcheck/validators';
import type { ApiResponse } from '@regcheck/shared';
import { getPresignedUrl } from '../lib/s3';
import { getJobStatus } from '../lib/queue';

export const documentRouter = Router();

/** GET /api/documents - List documents */
documentRouter.get('/', async (req, res, next) => {
  try {
    const { page, pageSize } = paginationSchema.parse(req.query);
    const result = await DocumentService.list(page, pageSize);
    res.json({ success: true, data: result } satisfies ApiResponse<typeof result>);
  } catch (err) {
    next(err);
  }
});

/** POST /api/documents - Create document from template */
documentRouter.post('/', async (req, res, next) => {
  try {
    const input = createDocumentSchema.parse(req.body);
    const doc = await DocumentService.create(input);
    res.status(201).json({ success: true, data: doc } satisfies ApiResponse<typeof doc>);
  } catch (err) {
    next(err);
  }
});

/** POST /api/documents/:id/populate - Populate document with equipment data */
documentRouter.post('/:id/populate', async (req, res, next) => {
  try {
    const { id } = idParamSchema.parse(req.params);
    const input = populateDocumentSchema.parse(req.body);
    const result = await DocumentService.populate(id, input);
    res.json({ success: true, data: result } satisfies ApiResponse<typeof result>);
  } catch (err) {
    next(err);
  }
});

/** POST /api/documents/:id/select-equipment - Populate 1 slot with equipment data (SELECAO_MANUAL) */
documentRouter.post('/:id/select-equipment', async (req, res, next) => {
  try {
    const { id } = idParamSchema.parse(req.params);
    const input = manualSelectSchema.parse(req.body);
    const result = await DocumentService.selectEquipmentForSlot(id, input);
    res.json({ success: true, data: result } satisfies ApiResponse<typeof result>);
  } catch (err) {
    next(err);
  }
});

/** POST /api/documents/:id/fill - Save filled data (autosave) */
documentRouter.post('/:id/fill', async (req, res, next) => {
  try {
    const { id } = idParamSchema.parse(req.params);
    const input = saveFilledDataSchema.parse(req.body);
    await DocumentService.saveFilledData(id, input);
    res.json({ success: true } satisfies ApiResponse<never>);
  } catch (err) {
    next(err);
  }
});

/** POST /api/documents/:id/generate - Queue PDF generation */
documentRouter.post('/:id/generate', async (req, res, next) => {
  try {
    const { id } = idParamSchema.parse(req.params);
    const result = await DocumentService.generatePdf(id);
    res.json({ success: true, data: result } satisfies ApiResponse<typeof result>);
  } catch (err) {
    next(err);
  }
});

/** GET /api/documents/:id/status - Get document + job status for polling */
documentRouter.get('/:id/status', async (req, res, next) => {
  try {
    const { id } = idParamSchema.parse(req.params);
    const doc = await DocumentService.getById(id);
    const job = await getJobStatus(id).catch(() => null);

    // Auto-recover stuck GENERATING: if no active job and stuck > 10 min, reset to ERROR
    if (doc.status === 'GENERATING' && !job) {
      const elapsed = Date.now() - new Date(doc.updatedAt).getTime();
      if (elapsed > 10 * 60 * 1000) {
        await prisma.document.update({
          where: { id },
          data: { status: 'ERROR' },
        });
        const result = { status: 'ERROR', generatedPdfKey: doc.generatedPdfKey, job: undefined };
        res.json({ success: true, data: result } satisfies ApiResponse<typeof result>);
        return;
      }
    }

    const result = {
      status: doc.status,
      generatedPdfKey: doc.generatedPdfKey,
      job: job ?? undefined,
    };

    res.json({ success: true, data: result } satisfies ApiResponse<typeof result>);
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/documents/:id — Exclui permanentemente um documento e todos os seus FilledFields.
 *
 * @param {string} req.params.id - UUID do documento a ser excluído (validado por `idParamSchema`)
 *
 * @returns {204} Sem corpo — exclusão realizada com sucesso
 * @returns {400} VALIDATION_ERROR — `id` não é um UUID v4 válido
 * @returns {404} NOT_FOUND — documento não encontrado
 * @returns {500} INTERNAL_ERROR — falha inesperada no banco de dados
 */
documentRouter.delete('/:id', async (req, res, next) => {
  try {
    const { id } = idParamSchema.parse(req.params);
    await DocumentService.delete(id);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

/** GET /api/documents/:id/download - Download generated PDF */
documentRouter.get('/:id/download', async (req, res, next) => {  try {
    const { id } = idParamSchema.parse(req.params);
    const doc = await DocumentService.getById(id);

    if (!doc.generatedPdfKey) {
      res.status(400).json({
        success: false,
        error: { code: 'PDF_NOT_GENERATED', message: 'PDF has not been generated yet' },
      });
      return;
    }

    const url = await getPresignedUrl(doc.generatedPdfKey);
    res.json({ success: true, data: { downloadUrl: url } } satisfies ApiResponse<{ downloadUrl: string }>);
  } catch (err) {
    next(err);
  }
});

/** GET /api/documents/:id - Get document */
documentRouter.get('/:id', async (req, res, next) => {
  try {
    const { id } = idParamSchema.parse(req.params);
    const doc = await DocumentService.getById(id);
    res.json({ success: true, data: doc } satisfies ApiResponse<typeof doc>);
  } catch (err) {
    next(err);
  }
});

/** PATCH /api/documents/:id - Update document */
documentRouter.patch('/:id', async (req, res, next) => {
  try {
    const { id } = idParamSchema.parse(req.params);
    const input = updateDocumentSchema.parse(req.body);
    const doc = await DocumentService.update(id, input);
    res.json({ success: true, data: doc } satisfies ApiResponse<typeof doc>);
  } catch (err) {
    next(err);
  }
});

/** DELETE /api/documents/:id - Delete document */
documentRouter.delete('/:id', async (req, res, next) => {
  try {
    const { id } = idParamSchema.parse(req.params);
    const result = await DocumentService.delete(id);
    res.json({ success: true, data: result } satisfies ApiResponse<typeof result>);
  } catch (err) {
    next(err);
  }
});
