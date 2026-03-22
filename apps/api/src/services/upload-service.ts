import crypto from 'node:crypto';
import { prisma } from '@regcheck/database';
import { PdfProcessor } from '@regcheck/pdf-engine';
import { ImageCompressor } from '@regcheck/pdf-engine';
import { uploadFile } from '../lib/s3';
import { AppError } from '../middleware/error-handler';

const MAX_FILE_SIZE = (Number(process.env.MAX_FILE_SIZE_MB) || 50) * 1024 * 1024;
const MAX_PAGES = Number(process.env.MAX_PAGES_PER_PDF) || 200;

export class UploadService {
  /** Upload a PDF and create the PdfFile record */
  static async uploadPdf(file: Express.Multer.File) {
    if (file.size > MAX_FILE_SIZE) {
      throw new AppError(400, `File too large. Max: ${MAX_FILE_SIZE / 1024 / 1024}MB`, 'FILE_TOO_LARGE');
    }

    if (file.mimetype !== 'application/pdf') {
      throw new AppError(400, 'Only PDF files are allowed', 'INVALID_FILE_TYPE');
    }

    const pageCount = await PdfProcessor.getPageCount(file.buffer);
    if (pageCount > MAX_PAGES) {
      throw new AppError(400, `PDF has too many pages. Max: ${MAX_PAGES}`, 'TOO_MANY_PAGES');
    }

    const fileKey = `pdfs/${crypto.randomUUID()}.pdf`;
    await uploadFile(fileKey, file.buffer, 'application/pdf');

    const pdfFile = await prisma.pdfFile.create({
      data: {
        fileName: file.originalname,
        fileKey,
        fileSize: file.size,
        mimeType: file.mimetype,
        pageCount,
      },
    });

    return {
      fileKey: pdfFile.fileKey,
      fileName: pdfFile.fileName,
      fileSize: pdfFile.fileSize,
      mimeType: pdfFile.mimeType,
      pageCount: pdfFile.pageCount,
      pdfFileId: pdfFile.id,
    };
  }

  /** Upload an image (for image fields or signatures) */
  static async uploadImage(file: Express.Multer.File, type: 'image' | 'signature') {
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      throw new AppError(400, 'Image too large. Max: 10MB', 'FILE_TOO_LARGE');
    }

    const allowedTypes = ['image/png', 'image/jpeg', 'image/webp'];
    if (!allowedTypes.includes(file.mimetype)) {
      throw new AppError(400, 'Only PNG, JPEG, and WebP images are allowed', 'INVALID_FILE_TYPE');
    }

    // Compress the image
    const compressed =
      type === 'signature'
        ? await ImageCompressor.compressSignature(file.buffer)
        : await ImageCompressor.compress(file.buffer);

    const ext = type === 'signature' ? 'png' : 'jpg';
    const fileKey = `${type}s/${crypto.randomUUID()}.${ext}`;
    const contentType = type === 'signature' ? 'image/png' : 'image/jpeg';

    await uploadFile(fileKey, compressed, contentType);

    return {
      fileKey,
      fileName: file.originalname,
      fileSize: compressed.length,
      mimeType: contentType,
    };
  }
}
