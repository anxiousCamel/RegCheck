// Feature: document-deletion, Property 2: Inputs inválidos são rejeitados com VALIDATION_ERROR

/**
 * Validates: Requirements 1.3
 *
 * Property 2: For any string that is NOT a valid UUID v4, the endpoint
 * DELETE /api/documents/:id must return HTTP 400 with code: 'VALIDATION_ERROR'.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import * as fc from 'fast-check';

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

/** UUID v4 regex used for validation */
const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuidV4(s: string): boolean {
  return UUID_V4_REGEX.test(s);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('Property 2: Inputs inválidos são rejeitados com VALIDATION_ERROR', () => {
  it('returns 400 VALIDATION_ERROR for any non-UUID v4 string', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string().filter((s) => !isUuidV4(s)),
        async (invalidId) => {
          const res = await request(app).delete(`/api/documents/${encodeURIComponent(invalidId)}`);

          expect(res.status).toBe(400);
          expect(res.body.success).toBe(false);
          expect(res.body.error.code).toBe('VALIDATION_ERROR');
          expect(DocumentService.delete).not.toHaveBeenCalled();
        },
      ),
      { numRuns: 100 },
    );
  });

  it('returns 400 VALIDATION_ERROR for common non-UUID formats', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.oneof(
          fc.constant(''),
          fc.constant('not-a-uuid'),
          fc.constant('123'),
          fc.constant('00000000-0000-0000-0000-000000000000'), // UUID v0, not v4
          fc.constant('a1b2c3d4-e5f6-3a7b-8c9d-0e1f2a3b4c5d'), // version 3, not v4
          fc.integer({ min: 1, max: 999999 }).map(String),
          fc.hexaString({ minLength: 32, maxLength: 32 }), // no dashes
        ),
        async (invalidId) => {
          const res = await request(app).delete(`/api/documents/${encodeURIComponent(invalidId)}`);

          expect(res.status).toBe(400);
          expect(res.body.success).toBe(false);
          expect(res.body.error.code).toBe('VALIDATION_ERROR');
          expect(DocumentService.delete).not.toHaveBeenCalled();
        },
      ),
      { numRuns: 100 },
    );
  });
});
