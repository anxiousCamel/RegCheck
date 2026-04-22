import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TemplateService } from '../template-service';
import { cacheService } from '../../lib/cache';
import { prisma } from '@regcheck/database';

// Mock the dependencies
vi.mock('@regcheck/database', () => ({
  prisma: {
    template: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      $transaction: vi.fn(),
    },
    templateVersion: {
      create: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock('../../lib/cache', () => ({
  cacheService: {
    wrap: vi.fn(),
    del: vi.fn(),
    delPattern: vi.fn(),
  },
}));

describe('TemplateService - Cache Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('list()', () => {
    it('should use cache with correct key pattern and TTL', async () => {
      const mockResult = {
        items: [],
        total: 0,
        page: 1,
        pageSize: 10,
        totalPages: 0,
      };

      vi.mocked(cacheService.wrap).mockResolvedValue(mockResult);

      await TemplateService.list(1, 10);

      expect(cacheService.wrap).toHaveBeenCalledWith(
        'templates:list:page:1:size:10',
        expect.any(Function),
        300 // 5 minutes TTL
      );
    });

    it('should use different cache keys for different pagination', async () => {
      const mockResult = {
        items: [],
        total: 0,
        page: 2,
        pageSize: 20,
        totalPages: 0,
      };

      vi.mocked(cacheService.wrap).mockResolvedValue(mockResult);

      await TemplateService.list(2, 20);

      expect(cacheService.wrap).toHaveBeenCalledWith(
        'templates:list:page:2:size:20',
        expect.any(Function),
        300
      );
    });
  });

  describe('getById()', () => {
    it('should use cache with correct key pattern and TTL', async () => {
      const mockTemplate = {
        id: 'test-id',
        name: 'Test Template',
        description: 'Test Description',
        status: 'DRAFT',
        version: 1,
        pdfFileId: 'pdf-id',
        createdAt: new Date(),
        updatedAt: new Date(),
        pdfFile: {
          id: 'pdf-id',
          pageCount: 5,
        },
        fields: [],
      };

      vi.mocked(cacheService.wrap).mockResolvedValue(mockTemplate);

      await TemplateService.getById('test-id');

      expect(cacheService.wrap).toHaveBeenCalledWith(
        'template:test-id',
        expect.any(Function),
        120 // 2 minutes TTL
      );
    });
  });

  describe('create()', () => {
    it('should invalidate list caches', async () => {
      const mockTemplate = {
        id: 'new-id',
        name: 'New Template',
        description: 'New Description',
        status: 'DRAFT',
        version: 1,
        pdfFileId: 'pdf-id',
        createdAt: new Date(),
        updatedAt: new Date(),
        repetitionConfig: null,
        pdfFile: {
          id: 'pdf-id',
          pageCount: 5,
        },
      };

      vi.mocked(prisma.template.create).mockResolvedValue(mockTemplate as any);

      await TemplateService.create(
        { name: 'New Template', description: 'New Description' },
        'pdf-id'
      );

      expect(cacheService.delPattern).toHaveBeenCalledWith('templates:list:*');
    });
  });

  describe('update()', () => {
    it('should invalidate list and specific template caches', async () => {
      const mockTemplate = {
        id: 'test-id',
        name: 'Updated Template',
        description: 'Updated Description',
        status: 'DRAFT',
        version: 1,
        pdfFileId: 'pdf-id',
        createdAt: new Date(),
        updatedAt: new Date(),
        repetitionConfig: null,
      };

      vi.mocked(prisma.template.findUnique).mockResolvedValue(mockTemplate as any);
      vi.mocked(prisma.template.update).mockResolvedValue({
        ...mockTemplate,
        pdfFile: { id: 'pdf-id', pageCount: 5 },
        fields: [],
      } as any);

      await TemplateService.update('test-id', { name: 'Updated Template' });

      expect(cacheService.delPattern).toHaveBeenCalledWith('templates:list:*');
      expect(cacheService.del).toHaveBeenCalledWith('template:test-id');
    });
  });

  describe('publish()', () => {
    it('should invalidate list and specific template caches', async () => {
      const mockTemplate = {
        id: 'test-id',
        name: 'Test Template',
        description: 'Test Description',
        status: 'DRAFT',
        version: 1,
        pdfFileId: 'pdf-id',
        createdAt: new Date(),
        updatedAt: new Date(),
        repetitionConfig: null,
        fields: [],
      };

      const mockPublished = {
        ...mockTemplate,
        status: 'PUBLISHED',
        version: 2,
      };

      vi.mocked(prisma.template.findUnique).mockResolvedValue(mockTemplate as any);
      vi.mocked(prisma.$transaction).mockResolvedValue([mockPublished] as any);

      await TemplateService.publish('test-id');

      expect(cacheService.delPattern).toHaveBeenCalledWith('templates:list:*');
      expect(cacheService.del).toHaveBeenCalledWith('template:test-id');
    });
  });

  describe('delete()', () => {
    it('should invalidate list and specific template caches', async () => {
      const mockTemplate = {
        id: 'test-id',
        name: 'Test Template',
        description: 'Test Description',
        status: 'DRAFT',
        version: 1,
        pdfFileId: 'pdf-id',
        createdAt: new Date(),
        updatedAt: new Date(),
        repetitionConfig: null,
      };

      vi.mocked(prisma.template.findUnique).mockResolvedValue(mockTemplate as any);
      vi.mocked(prisma.template.delete).mockResolvedValue(mockTemplate as any);

      await TemplateService.delete('test-id');

      expect(cacheService.delPattern).toHaveBeenCalledWith('templates:list:*');
      expect(cacheService.del).toHaveBeenCalledWith('template:test-id');
    });
  });
});
