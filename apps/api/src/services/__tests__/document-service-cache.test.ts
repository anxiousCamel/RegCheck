import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DocumentService } from '../document-service';
import { cacheService } from '../../lib/cache';
import { prisma } from '@regcheck/database';

// Mock the dependencies
vi.mock('@regcheck/database', () => ({
  prisma: {
    document: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      count: vi.fn(),
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

vi.mock('../../lib/cache', () => ({
  cacheService: {
    wrap: vi.fn(),
    del: vi.fn(),
    delPattern: vi.fn(),
  },
}));

vi.mock('../../lib/queue', () => ({
  pdfGenerationQueue: {
    add: vi.fn(),
  },
}));

describe('DocumentService - Cache Integration', () => {
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

      await DocumentService.list(1, 10);

      expect(cacheService.wrap).toHaveBeenCalledWith(
        'documents:list:page:1:size:10',
        expect.any(Function),
        60, // 1 minute TTL (highly dynamic data)
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

      await DocumentService.list(2, 20);

      expect(cacheService.wrap).toHaveBeenCalledWith(
        'documents:list:page:2:size:20',
        expect.any(Function),
        60,
      );
    });
  });

  describe('getById()', () => {
    it('should use cache with correct key pattern and TTL', async () => {
      const mockDocument = {
        id: 'test-id',
        name: 'Test Document',
        templateId: 'template-id',
        templateVersion: 1,
        status: 'DRAFT',
        totalItems: 1,
        metadata: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        template: {
          id: 'template-id',
          name: 'Test Template',
          pdfFile: null,
          fields: [],
        },
        filledFields: [],
      };

      vi.mocked(cacheService.wrap).mockResolvedValue(mockDocument);

      await DocumentService.getById('test-id');

      expect(cacheService.wrap).toHaveBeenCalledWith(
        'document:test-id',
        expect.any(Function),
        60, // 1 minute TTL (highly dynamic data)
      );
    });
  });

  describe('create()', () => {
    it('should invalidate list cache', async () => {
      const mockTemplate = {
        id: 'template-id',
        name: 'Test Template',
        status: 'PUBLISHED',
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockDocument = {
        id: 'new-id',
        name: 'New Document',
        templateId: 'template-id',
        templateVersion: 1,
        status: 'DRAFT',
        totalItems: 1,
        metadata: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.template.findUnique).mockResolvedValue(mockTemplate as any);
      vi.mocked(prisma.document.create).mockResolvedValue(mockDocument as any);

      await DocumentService.create({
        name: 'New Document',
        templateId: 'template-id',
        totalItems: 1,
      });

      expect(cacheService.delPattern).toHaveBeenCalledWith('documents:list:*');
    });
  });

  describe('update()', () => {
    it('should invalidate list and specific document caches', async () => {
      const mockDocument = {
        id: 'test-id',
        name: 'Updated Document',
        templateId: 'template-id',
        templateVersion: 1,
        status: 'IN_PROGRESS',
        totalItems: 1,
        metadata: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.document.update).mockResolvedValue(mockDocument as any);

      await DocumentService.update('test-id', { name: 'Updated Document' });

      expect(cacheService.del).toHaveBeenCalledWith('document:test-id');
      expect(cacheService.delPattern).toHaveBeenCalledWith('documents:list:*');
    });
  });

  describe('saveFilledData()', () => {
    it('should invalidate list and specific document caches', async () => {
      const mockDocument = {
        id: 'test-id',
        name: 'Test Document',
        templateId: 'template-id',
        templateVersion: 1,
        status: 'DRAFT',
        totalItems: 1,
        metadata: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.document.findUnique).mockResolvedValue(mockDocument as any);
      vi.mocked(prisma.$transaction).mockResolvedValue([]);

      await DocumentService.saveFilledData('test-id', {
        fields: [{ fieldId: 'field-id', itemIndex: 0, value: 'test' }],
      });

      expect(cacheService.del).toHaveBeenCalledWith('document:test-id');
      expect(cacheService.delPattern).toHaveBeenCalledWith('documents:list:*');
    });
  });

  describe('populate()', () => {
    it('should invalidate list and specific document caches', async () => {
      const mockDocument = {
        id: 'test-id',
        name: 'Test Document',
        templateId: 'template-id',
        templateVersion: 1,
        status: 'DRAFT',
        totalItems: 1,
        metadata: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        template: {
          id: 'template-id',
          name: 'Test Template',
          repetitionConfig: { itemsPerPage: 1 },
          fields: [],
        },
      };

      const mockEquipamentos = [
        {
          id: 'eq-1',
          numeroEquipamento: '001',
          serie: 'S001',
          patrimonio: 'P001',
          tipoId: 'tipo-id',
          lojaId: 'loja-id',
          setorId: 'setor-id',
          setor: { id: 'setor-id', nome: 'Setor A' },
        },
      ];

      vi.mocked(prisma.document.findUnique).mockResolvedValue(mockDocument as any);
      vi.mocked(prisma.equipamento.findMany).mockResolvedValue(mockEquipamentos as any);
      vi.mocked(prisma.filledField.deleteMany).mockResolvedValue({ count: 0 });
      vi.mocked(prisma.filledField.createMany).mockResolvedValue({ count: 0 });
      vi.mocked(prisma.document.update).mockResolvedValue(mockDocument as any);

      await DocumentService.populate('test-id', { tipoId: 'tipo-id', lojaId: 'loja-id' });

      expect(cacheService.del).toHaveBeenCalledWith('document:test-id');
      expect(cacheService.delPattern).toHaveBeenCalledWith('documents:list:*');
    });
  });

  describe('delete()', () => {
    it('should invalidate list and specific document caches', async () => {
      const mockDocument = {
        id: 'test-id',
        name: 'Test Document',
        templateId: 'template-id',
        templateVersion: 1,
        status: 'DRAFT',
        totalItems: 1,
        metadata: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.document.findUnique).mockResolvedValue(mockDocument as any);
      vi.mocked(prisma.$transaction).mockResolvedValue([{ count: 0 }, mockDocument]);

      await DocumentService.delete('test-id');

      expect(cacheService.del).toHaveBeenCalledWith('document:test-id');
      expect(cacheService.delPattern).toHaveBeenCalledWith('documents:list:*');
    });
  });

  describe('generatePdf()', () => {
    it('should invalidate list and specific document caches', async () => {
      const mockDocument = {
        id: 'test-id',
        name: 'Test Document',
        templateId: 'template-id',
        templateVersion: 1,
        status: 'COMPLETED',
        totalItems: 1,
        metadata: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.document.findUnique).mockResolvedValue(mockDocument as any);
      vi.mocked(prisma.document.update).mockResolvedValue({
        ...mockDocument,
        status: 'GENERATING',
      } as any);

      await DocumentService.generatePdf('test-id');

      expect(cacheService.del).toHaveBeenCalledWith('document:test-id');
      expect(cacheService.delPattern).toHaveBeenCalledWith('documents:list:*');
    });
  });
});
