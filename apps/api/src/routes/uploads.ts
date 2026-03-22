import { Router } from 'express';
import multer from 'multer';
import { UploadService } from '../services/upload-service';
import type { ApiResponse, UploadResponse } from '@regcheck/shared';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
});

export const uploadRouter = Router();

/** POST /api/uploads/pdf - Upload a PDF file */
uploadRouter.post('/pdf', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      res.status(400).json({ success: false, error: { code: 'NO_FILE', message: 'No file uploaded' } });
      return;
    }

    const result = await UploadService.uploadPdf(req.file);
    const response: ApiResponse<UploadResponse & { pdfFileId: string }> = {
      success: true,
      data: result,
    };
    res.status(201).json(response);
  } catch (err) {
    next(err);
  }
});

/** POST /api/uploads/image - Upload an image file */
uploadRouter.post('/image', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      res.status(400).json({ success: false, error: { code: 'NO_FILE', message: 'No file uploaded' } });
      return;
    }

    const type = req.query.type === 'signature' ? 'signature' : 'image';
    const result = await UploadService.uploadImage(req.file, type);
    const response: ApiResponse<UploadResponse> = { success: true, data: result };
    res.status(201).json(response);
  } catch (err) {
    next(err);
  }
});
