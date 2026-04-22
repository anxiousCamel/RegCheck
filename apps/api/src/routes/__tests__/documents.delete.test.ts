import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

// Set test environment before importing server to prevent app.listen()
process.env['NODE_ENV'] = 'test';

// Mock queue/redis to avoid real connections
vi.mock('../../lib/queue', () => ({
  pdfGenerationQueue: { add: vi.fn(), getJob: vi.fn() },
  createPdfWorker: vi.fn(() => ({ on: vi.fn() })),
  getJobStatus: vi.fn(),
}));

vi.mock('../../lib/redis', () => ({
  redis: { get: vi.fn(), set: vi.fn(), del: vi.fn() },
  cachedGet: vi.fn(),
  invalidateCache: vi.fn(),
}));

vi.mock('@regcheck/database', () => ({
  prisma: {
    document: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
    filledField: { deleteMany: vi.fn() },
    $transaction: vi.fn(),
  },
}));

vi.mock('../../services/document-service', () => ({
  DocumentService: {
    list: vi.fn(),
    create: vi.fn(),
    getById: vi.fn(),
    update: vi.fn(),
    saveFilledData: vi.fn(),
    populate: vi.fn(),
    generatePdf: vi.fn(),
    delete: vi.fn(),
  },
}));

import { app } from '../../server';
import { DocumentService } from '../../services/document-service';
import { AppError } from '../../middleware/error-handler';

const VALID_UUID = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('DELETE /api/documents/:id', () => {
  it('returns 204 with no body when document exists', async () => {
    vi.mocked(DocumentService.delete).mockResolvedValueOnce(undefined);

    const res = await request(app).delete(`/api/documents/${VALID_UUID}`);

    expect(res.status).toBe(204);
    expect(res.body).toEqual({});
    expect(DocumentService.delete).toHaveBeenCalledWith(VALID_UUID);
  });

  it('returns 404 NOT_FOUND when document does not exist', async () => {
    vi.mocked(DocumentService.delete).mockRejectedValueOnce(
      new AppError(404, 'Document not found', 'NOT_FOUND'),
    );

    const res = await request(app).delete(`/api/documents/${VALID_UUID}`);

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('NOT_FOUND');
    expect(res.body.error.message).toBe('Document not found');
  });

  it('returns 400 VALIDATION_ERROR when id is not a UUID', async () => {
    const res = await request(app).delete('/api/documents/not-a-uuid');

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(DocumentService.delete).not.toHaveBeenCalled();
  });

  it('returns 500 INTERNAL_ERROR on database failure', async () => {
    vi.mocked(DocumentService.delete).mockRejectedValueOnce(
      new Error('Database connection lost'),
    );

    const res = await request(app).delete(`/api/documents/${VALID_UUID}`);

    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('INTERNAL_ERROR');
  });
});
