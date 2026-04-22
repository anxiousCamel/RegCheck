import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TemplateService } from '../template-service';
import { prisma } from '@regcheck/database';
import { cacheService } from '../../lib/cache';

// Mock the dependencies
vi.mock('@regcheck/database', () => ({
  prisma: {
    template: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      count: vi.fn(),
    },
  },
}));

vi.mock('../../lib/cache', () => ({
  cacheService: {
    wrap: vi.fn((key, fn) => fn()),
  },
}));

describe('TemplateService - Query Optimization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('list() - Query Optimization', () => {
    it('should use select to limit fields from pdfFile', async () => {
      const mockTemplates = [
        {
          id: 'template-1',
          name: 'Template 1',
          description: 'Description 1',
          status: 'DRAFT',
          version: 1,
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
          pdfFile: {
            pageCount: 5,
          },
          _count: {
            fields: 3,
          },
        },
      ];

      vi.mocked(prisma.template.findMany).mockResolvedValue(mockTemplates as any);
      vi.mocked(prisma.template.count).mockResolvedValue(1);

      await TemplateService.list(1, 10);

      // Verify that select is used with specific fields
      expect(prisma.template.findMany).toHaveBeenCalledWith({
        skip: 0,
        take: 10,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          description: true,
          status: true,
          version: true,
          createdAt: true,
          updatedAt: true,
          pdfFile: {
            select: {
              pageCount: true,
            },
          },
          _count: {
            select: { fields: true },
          },
        },
      });
    });

    it('should return only necessary fields in the response', async () => {
      const mockTemplates = [
        {
          id: 'template-1',
          name: 'Template 1',
          description: 'Description 1',
          status: 'DRAFT',
          version: 1,
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
          pdfFile: {
            pageCount: 5,
          },
          _count: {
            fields: 3,
          },
        },
      ];

      vi.mocked(prisma.template.findMany).mockResolvedValue(mockTemplates as any);
      vi.mocked(prisma.template.count).mockResolvedValue(1);

      const result = await TemplateService.list(1, 10);

      expect(result.items).toHaveLength(1);
      expect(result.items[0]).toEqual({
        id: 'template-1',
        name: 'Template 1',
        description: 'Description 1',
        status: 'draft',
        version: 1,
        pageCount: 5,
        fieldCount: 3,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      });
    });
  });

  describe('getById() - Eager Loading', () => {
    it('should use include for eager loading of relations', async () => {
      const mockTemplate = {
        id: 'template-1',
        name: 'Template 1',
        description: 'Description 1',
        status: 'DRAFT',
        version: 1,
        pdfFileId: 'pdf-1',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        repetitionConfig: null,
        pdfFile: {
          id: 'pdf-1',
          pageCount: 5,
          s3Key: 'test.pdf',
          s3Bucket: 'bucket',
          fileName: 'test.pdf',
          fileSize: 1024,
          createdAt: new Date('2024-01-01'),
        },
        fields: [
          {
            id: 'field-1',
            templateId: 'template-1',
            type: 'TEXT',
            pageIndex: 0,
            position: { x: 0, y: 0, width: 100, height: 50 },
            config: { label: 'Field 1' },
            repetitionGroupId: null,
            repetitionIndex: null,
            createdAt: new Date('2024-01-01'),
            updatedAt: new Date('2024-01-01'),
          },
        ],
      };

      vi.mocked(prisma.template.findUnique).mockResolvedValue(mockTemplate as any);

      await TemplateService.getById('template-1');

      // Verify that include is used for eager loading
      expect(prisma.template.findUnique).toHaveBeenCalledWith({
        where: { id: 'template-1' },
        include: {
          pdfFile: true,
          fields: { orderBy: { createdAt: 'asc' } },
        },
      });
    });

    it('should return template with all related data in single query', async () => {
      const mockTemplate = {
        id: 'template-1',
        name: 'Template 1',
        description: 'Description 1',
        status: 'DRAFT',
        version: 1,
        pdfFileId: 'pdf-1',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        repetitionConfig: null,
        pdfFile: {
          id: 'pdf-1',
          pageCount: 5,
          s3Key: 'test.pdf',
          s3Bucket: 'bucket',
          fileName: 'test.pdf',
          fileSize: 1024,
          createdAt: new Date('2024-01-01'),
        },
        fields: [
          {
            id: 'field-1',
            templateId: 'template-1',
            type: 'TEXT',
            pageIndex: 0,
            position: { x: 0, y: 0, width: 100, height: 50 },
            config: { label: 'Field 1' },
            repetitionGroupId: null,
            repetitionIndex: null,
            createdAt: new Date('2024-01-01'),
            updatedAt: new Date('2024-01-01'),
          },
        ],
      };

      vi.mocked(prisma.template.findUnique).mockResolvedValue(mockTemplate as any);

      const result = await TemplateService.getById('template-1');

      // Verify all relations are loaded
      expect(result).toHaveProperty('pdfFile');
      expect(result).toHaveProperty('fields');
      expect(result.pdfFile).toEqual(mockTemplate.pdfFile);
      expect(result.fields).toHaveLength(1);
      expect(result.fields[0]).toEqual(mockTemplate.fields[0]);
    });
  });
});
