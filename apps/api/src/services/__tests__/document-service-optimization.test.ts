import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DocumentService } from '../document-service';
import { cacheService } from '../../lib/cache';
import { prisma } from '@regcheck/database';

// Mock dependencies
vi.mock('../../lib/cache', () => ({
  cacheService: {
    wrap: vi.fn((key, fn) => fn()),
    del: vi.fn(),
    delPattern: vi.fn(),
  },
}));

vi.mock('../../lib/queue', () => ({
  pdfGenerationQueue: {
    add: vi.fn(),
  },
}));

vi.mock('@regcheck/database', () => ({
  prisma: {
    document: {
      findMany: vi.fn(),
      count: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    template: {
      findUnique: vi.fn(),
    },
    filledField: {
      upsert: vi.fn(),
      deleteMany: vi.fn(),
      createMany: vi.fn(),
    },
    equipamento: {
      findMany: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

describe('DocumentService - Query Optimization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Optimized Select for list() (Requirements 5.3, 5.4)', () => {
    it('should use select instead of include for list queries', async () => {
      vi.mocked(prisma.document.findMany).mockResolvedValue([]);
      vi.mocked(prisma.document.count).mockResolvedValue(0);

      await DocumentService.list(1, 10);

      // Verify that findMany was called with select (not include)
      const call = vi.mocked(prisma.document.findMany).mock.calls[0][0];
      expect(call).toHaveProperty('select');
      expect(call).not.toHaveProperty('include');
    });

    it('should select only necessary fields for list view', async () => {
      vi.mocked(prisma.document.findMany).mockResolvedValue([]);
      vi.mocked(prisma.document.count).mockResolvedValue(0);

      await DocumentService.list(1, 10);

      const call = vi.mocked(prisma.document.findMany).mock.calls[0][0];
      
      // Verify only necessary fields are selected
      expect(call.select).toEqual({
        id: true,
        name: true,
        status: true,
        totalItems: true,
        templateId: true,
        createdAt: true,
        updatedAt: true,
        template: {
          select: { name: true },
        },
        _count: {
          select: { filledFields: true },
        },
      });
    });

    it('should not select heavy fields like metadata, generatedPdfKey, templateVersion in list', async () => {
      vi.mocked(prisma.document.findMany).mockResolvedValue([]);
      vi.mocked(prisma.document.count).mockResolvedValue(0);

      await DocumentService.list(1, 10);

      const call = vi.mocked(prisma.document.findMany).mock.calls[0][0];
      
      // Verify heavy fields are not selected
      expect(call.select).not.toHaveProperty('metadata');
      expect(call.select).not.toHaveProperty('generatedPdfKey');
      expect(call.select).not.toHaveProperty('templateVersion');
    });

    it('should use eager loading for template relation', async () => {
      vi.mocked(prisma.document.findMany).mockResolvedValue([]);
      vi.mocked(prisma.document.count).mockResolvedValue(0);

      await DocumentService.list(1, 10);

      const call = vi.mocked(prisma.document.findMany).mock.calls[0][0];
      
      // Verify template is loaded with select (eager loading)
      expect(call.select).toHaveProperty('template');
      expect(call.select.template).toHaveProperty('select');
      expect(call.select.template.select).toEqual({ name: true });
    });
  });

  describe('Optimized Select for getById() (Requirements 5.3, 5.4)', () => {
    it('should use select instead of include for getById queries', async () => {
      const mockDocument = {
        id: 'test-id',
        name: 'Test Document',
        status: 'DRAFT',
        totalItems: 1,
        templateId: 'template-id',
        templateVersion: 1,
        generatedPdfKey: null,
        metadata: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        template: {
          id: 'template-id',
          name: 'Test Template',
          status: 'PUBLISHED',
          version: 1,
          repetitionConfig: null,
          pdfFile: null,
          fields: [],
        },
        filledFields: [],
      };
      
      vi.mocked(prisma.document.findUnique).mockResolvedValue(mockDocument);

      await DocumentService.getById('test-id');

      // Verify that findUnique was called with select (not include)
      const call = vi.mocked(prisma.document.findUnique).mock.calls[0][0];
      expect(call).toHaveProperty('select');
      expect(call).not.toHaveProperty('include');
    });

    it('should select all necessary fields for detail view', async () => {
      const mockDocument = {
        id: 'test-id',
        name: 'Test Document',
        status: 'DRAFT',
        totalItems: 1,
        templateId: 'template-id',
        templateVersion: 1,
        generatedPdfKey: null,
        metadata: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        template: {
          id: 'template-id',
          name: 'Test Template',
          status: 'PUBLISHED',
          version: 1,
          repetitionConfig: null,
          pdfFile: null,
          fields: [],
        },
        filledFields: [],
      };
      
      vi.mocked(prisma.document.findUnique).mockResolvedValue(mockDocument);

      await DocumentService.getById('test-id');

      const call = vi.mocked(prisma.document.findUnique).mock.calls[0][0];
      
      // Verify all necessary document fields are selected
      expect(call.select).toHaveProperty('id');
      expect(call.select).toHaveProperty('name');
      expect(call.select).toHaveProperty('status');
      expect(call.select).toHaveProperty('totalItems');
      expect(call.select).toHaveProperty('templateId');
      expect(call.select).toHaveProperty('templateVersion');
      expect(call.select).toHaveProperty('generatedPdfKey');
      expect(call.select).toHaveProperty('metadata');
      expect(call.select).toHaveProperty('createdAt');
      expect(call.select).toHaveProperty('updatedAt');
    });

    it('should use eager loading for template relation with nested fields', async () => {
      const mockDocument = {
        id: 'test-id',
        name: 'Test Document',
        status: 'DRAFT',
        totalItems: 1,
        templateId: 'template-id',
        templateVersion: 1,
        generatedPdfKey: null,
        metadata: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        template: {
          id: 'template-id',
          name: 'Test Template',
          status: 'PUBLISHED',
          version: 1,
          repetitionConfig: null,
          pdfFile: null,
          fields: [],
        },
        filledFields: [],
      };
      
      vi.mocked(prisma.document.findUnique).mockResolvedValue(mockDocument);

      await DocumentService.getById('test-id');

      const call = vi.mocked(prisma.document.findUnique).mock.calls[0][0];
      
      // Verify template is loaded with select (eager loading)
      expect(call.select).toHaveProperty('template');
      expect(call.select.template).toHaveProperty('select');
      
      // Verify template fields are selected
      expect(call.select.template.select).toHaveProperty('id');
      expect(call.select.template.select).toHaveProperty('name');
      expect(call.select.template.select).toHaveProperty('status');
      expect(call.select.template.select).toHaveProperty('version');
      expect(call.select.template.select).toHaveProperty('repetitionConfig');
      expect(call.select.template.select).toHaveProperty('pdfFile');
      expect(call.select.template.select).toHaveProperty('fields');
    });

    it('should use eager loading for pdfFile relation', async () => {
      const mockDocument = {
        id: 'test-id',
        name: 'Test Document',
        status: 'DRAFT',
        totalItems: 1,
        templateId: 'template-id',
        templateVersion: 1,
        generatedPdfKey: null,
        metadata: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        template: {
          id: 'template-id',
          name: 'Test Template',
          status: 'PUBLISHED',
          version: 1,
          repetitionConfig: null,
          pdfFile: {
            id: 'file-id',
            key: 'file-key',
            url: 'https://example.com/file.pdf',
            filename: 'file.pdf',
          },
          fields: [],
        },
        filledFields: [],
      };
      
      vi.mocked(prisma.document.findUnique).mockResolvedValue(mockDocument);

      await DocumentService.getById('test-id');

      const call = vi.mocked(prisma.document.findUnique).mock.calls[0][0];
      
      // Verify pdfFile is loaded with select
      expect(call.select.template.select).toHaveProperty('pdfFile');
      expect(call.select.template.select.pdfFile).toHaveProperty('select');
      expect(call.select.template.select.pdfFile.select).toEqual({
        id: true,
        key: true,
        url: true,
        filename: true,
      });
    });

    it('should use eager loading for fields relation with ordering', async () => {
      const mockDocument = {
        id: 'test-id',
        name: 'Test Document',
        status: 'DRAFT',
        totalItems: 1,
        templateId: 'template-id',
        templateVersion: 1,
        generatedPdfKey: null,
        metadata: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        template: {
          id: 'template-id',
          name: 'Test Template',
          status: 'PUBLISHED',
          version: 1,
          repetitionConfig: null,
          pdfFile: null,
          fields: [],
        },
        filledFields: [],
      };
      
      vi.mocked(prisma.document.findUnique).mockResolvedValue(mockDocument);

      await DocumentService.getById('test-id');

      const call = vi.mocked(prisma.document.findUnique).mock.calls[0][0];
      
      // Verify fields are loaded with select and orderBy
      expect(call.select.template.select).toHaveProperty('fields');
      expect(call.select.template.select.fields).toHaveProperty('select');
      expect(call.select.template.select.fields).toHaveProperty('orderBy');
      expect(call.select.template.select.fields.orderBy).toEqual({ page: 'asc' });
      
      // Verify only necessary field properties are selected
      expect(call.select.template.select.fields.select).toEqual({
        id: true,
        type: true,
        config: true,
        page: true,
        x: true,
        y: true,
        width: true,
        height: true,
      });
    });

    it('should use eager loading for filledFields relation', async () => {
      const mockDocument = {
        id: 'test-id',
        name: 'Test Document',
        status: 'DRAFT',
        totalItems: 1,
        templateId: 'template-id',
        templateVersion: 1,
        generatedPdfKey: null,
        metadata: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        template: {
          id: 'template-id',
          name: 'Test Template',
          status: 'PUBLISHED',
          version: 1,
          repetitionConfig: null,
          pdfFile: null,
          fields: [],
        },
        filledFields: [],
      };
      
      vi.mocked(prisma.document.findUnique).mockResolvedValue(mockDocument);

      await DocumentService.getById('test-id');

      const call = vi.mocked(prisma.document.findUnique).mock.calls[0][0];
      
      // Verify filledFields are loaded with select
      expect(call.select).toHaveProperty('filledFields');
      expect(call.select.filledFields).toHaveProperty('select');
      expect(call.select.filledFields.select).toEqual({
        id: true,
        fieldId: true,
        itemIndex: true,
        value: true,
        fileKey: true,
      });
    });
  });

  describe('Single Query with JOINs (Requirement 1.5)', () => {
    it('should fetch document with all relations in a single query', async () => {
      const mockDocument = {
        id: 'test-id',
        name: 'Test Document',
        status: 'DRAFT',
        totalItems: 1,
        templateId: 'template-id',
        templateVersion: 1,
        generatedPdfKey: null,
        metadata: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        template: {
          id: 'template-id',
          name: 'Test Template',
          status: 'PUBLISHED',
          version: 1,
          repetitionConfig: null,
          pdfFile: {
            id: 'file-id',
            key: 'file-key',
            url: 'https://example.com/file.pdf',
            filename: 'file.pdf',
          },
          fields: [
            {
              id: 'field-1',
              type: 'TEXT',
              config: { label: 'Field 1' },
              page: 1,
              x: 100,
              y: 100,
              width: 200,
              height: 50,
            },
          ],
        },
        filledFields: [
          {
            id: 'filled-1',
            fieldId: 'field-1',
            itemIndex: 0,
            value: 'Test Value',
            fileKey: null,
          },
        ],
      };

      vi.mocked(prisma.document.findUnique).mockResolvedValue(mockDocument);

      await DocumentService.getById('test-id');

      // Should only call findUnique once (with all relations included via select)
      expect(prisma.document.findUnique).toHaveBeenCalledTimes(1);
      
      // Should not make separate queries for template or filledFields
      expect(prisma.template.findUnique).not.toHaveBeenCalled();
      expect(prisma.filledField.deleteMany).not.toHaveBeenCalled();
    });
  });
});
