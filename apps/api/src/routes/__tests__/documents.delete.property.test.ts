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

/**
 * Zod's z.string().uuid() accepts any UUID format (v1-v5, nil, etc.).
 * This regex matches what Zod considers a valid UUID.
 */
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidUuid(s: string): boolean {
  return UUID_REGEX.test(s);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('Property 2: Inputs inválidos são rejeitados com VALIDATION_ERROR', () => {
  it('returns 400 VALIDATION_ERROR for any non-UUID v4 string', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Filter out valid UUIDs (any format) and empty strings (which don't hit the /:id route)
        fc.string().filter((s) => s.length > 0 && !isValidUuid(s)),
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
          fc.constant('not-a-uuid'),
          fc.constant('123'),
          fc.constant('a1b2c3d4e5f64a7b8c9d0e1f2a3b4c5d'), // no dashes (32 hex chars)
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
