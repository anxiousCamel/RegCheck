// Feature: document-deletion, Property 1: Exclusão remove documento e todos os FilledFields

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fc from 'fast-check';

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
    document: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    filledField: {
      deleteMany: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

import { prisma } from '@regcheck/database';
import { DocumentService } from '../document-service';

const VALID_UUID = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d';

beforeEach(() => {
  vi.clearAllMocks();
});

/**
 * Validates: Requirements 1.4
 *
 * Property 1: Exclusão remove documento e todos os FilledFields
 *
 * For any document with N randomly generated FilledFields, after
 * DocumentService.delete(id), the transaction must include operations
 * to delete all FilledFields (deleteMany) and the document itself (delete).
 */
describe('DocumentService.delete — Property 1', () => {
  it('always calls $transaction with filledField.deleteMany and document.delete for any set of FilledFields', async () => {
    const filledFieldArb = fc.record({
      id: fc.uuid(),
      documentId: fc.constant(VALID_UUID),
      fieldId: fc.uuid(),
      itemIndex: fc.nat({ max: 100 }),
      value: fc.string(),
    });

    await fc.assert(
      fc.asyncProperty(fc.array(filledFieldArb), async (filledFields) => {
        vi.clearAllMocks();

        // Set up: document exists
        vi.mocked(prisma.document.findUnique).mockResolvedValueOnce({
          id: VALID_UUID,
          name: 'Test Document',
          templateId: 'template-id',
          templateVersion: 1,
          status: 'DRAFT',
          totalItems: filledFields.length,
          metadata: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        } as never);

        // Set up: transaction resolves successfully
        vi.mocked(prisma.$transaction).mockResolvedValueOnce(undefined as never);

        await DocumentService.delete(VALID_UUID);

        // Assert $transaction was called once
        expect(prisma.$transaction).toHaveBeenCalledTimes(1);

        const transactionArgs = vi.mocked(prisma.$transaction).mock.calls[0]![0] as unknown[];

        // The transaction must be called with an array of operations
        expect(Array.isArray(transactionArgs)).toBe(true);

        // Assert filledField.deleteMany was called with documentId
        expect(prisma.filledField.deleteMany).toHaveBeenCalledWith({
          where: { documentId: VALID_UUID },
        });

        // Assert document.delete was called with the document id
        expect(prisma.document.delete).toHaveBeenCalledWith({
          where: { id: VALID_UUID },
        });
      }),
      { numRuns: 100 },
    );
  });
});
