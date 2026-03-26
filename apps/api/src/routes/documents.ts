import { Router } from 'express';
import { DocumentService } from '../services/document-service';
import { createDocumentSchema, updateDocumentSchema, saveFilledDataSchema, populateDocumentSchema } from '@regcheck/validators';
import { paginationSchema, idParamSchema } from '@regcheck/validators';
import type { ApiResponse } from '@regcheck/shared';
import { getPresignedUrl } from '../lib/s3';

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

/** GET /api/documents/:id/download - Download generated PDF */
documentRouter.get('/:id/download', async (req, res, next) => {
  try {
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
