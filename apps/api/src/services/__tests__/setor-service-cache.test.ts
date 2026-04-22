import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SetorService } from '../setor-service';
import { cacheService } from '../../lib/cache';
import { prisma } from '@regcheck/database';

// Mock the dependencies
vi.mock('@regcheck/database', () => ({
  prisma: {
    setor: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    equipamento: {
      count: vi.fn(),
    },
  },
}));

vi.mock('../../lib/cache', () => ({
  cacheService: {
    wrap: vi.fn(),
    del: vi.fn(),
    delPattern: vi.fn(),
  },
}));

describe('SetorService - Cache Integration', () => {
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

      await SetorService.list(1, 10);

      expect(cacheService.wrap).toHaveBeenCalledWith(
        'setores:list:page:1:size:10',
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

      await SetorService.list(2, 20);

      expect(cacheService.wrap).toHaveBeenCalledWith(
        'setores:list:page:2:size:20',
        expect.any(Function),
        300
      );
    });
  });

  describe('listActive()', () => {
    it('should use cache with correct key and TTL', async () => {
      const mockSetores = [
        {
          id: 'test-id',
          nome: 'Test Setor',
          ativo: true,
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
        },
      ];

      vi.mocked(cacheService.wrap).mockResolvedValue(mockSetores);

      await SetorService.listActive();

      expect(cacheService.wrap).toHaveBeenCalledWith(
        'setores:active',
        expect.any(Function),
        300 // 5 minutes TTL
      );
    });
  });

  describe('getById()', () => {
    it('should use cache with correct key pattern and TTL', async () => {
      const mockSetor = {
        id: 'test-id',
        nome: 'Test Setor',
        ativo: true,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      };

      vi.mocked(cacheService.wrap).mockResolvedValue(mockSetor);

      await SetorService.getById('test-id');

      expect(cacheService.wrap).toHaveBeenCalledWith(
        'setor:test-id',
        expect.any(Function),
        120 // 2 minutes TTL
      );
    });
  });

  describe('create()', () => {
    it('should invalidate list and active caches', async () => {
      const mockSetor = {
        id: 'new-id',
        nome: 'New Setor',
        ativo: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.setor.create).mockResolvedValue(mockSetor);

      await SetorService.create({ nome: 'New Setor' });

      expect(cacheService.delPattern).toHaveBeenCalledWith('setores:list:*');
      expect(cacheService.del).toHaveBeenCalledWith('setores:active');
    });
  });

  describe('update()', () => {
    it('should invalidate list, active, and specific setor caches', async () => {
      const mockSetor = {
        id: 'test-id',
        nome: 'Updated Setor',
        ativo: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.setor.findUnique).mockResolvedValue(mockSetor);
      vi.mocked(prisma.setor.update).mockResolvedValue(mockSetor);

      await SetorService.update('test-id', { nome: 'Updated Setor' });

      expect(cacheService.delPattern).toHaveBeenCalledWith('setores:list:*');
      expect(cacheService.del).toHaveBeenCalledWith('setores:active');
      expect(cacheService.del).toHaveBeenCalledWith('setor:test-id');
    });
  });

  describe('toggleActive()', () => {
    it('should invalidate list, active, and specific setor caches', async () => {
      const mockSetor = {
        id: 'test-id',
        nome: 'Test Setor',
        ativo: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.setor.findUnique).mockResolvedValue(mockSetor);
      vi.mocked(prisma.setor.update).mockResolvedValue({ ...mockSetor, ativo: false });

      await SetorService.toggleActive('test-id');

      expect(cacheService.delPattern).toHaveBeenCalledWith('setores:list:*');
      expect(cacheService.del).toHaveBeenCalledWith('setores:active');
      expect(cacheService.del).toHaveBeenCalledWith('setor:test-id');
    });
  });

  describe('delete()', () => {
    it('should invalidate list, active, and specific setor caches', async () => {
      const mockSetor = {
        id: 'test-id',
        nome: 'Test Setor',
        ativo: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.setor.findUnique).mockResolvedValue(mockSetor);
      vi.mocked(prisma.equipamento.count).mockResolvedValue(0);
      vi.mocked(prisma.setor.delete).mockResolvedValue(mockSetor);

      await SetorService.delete('test-id');

      expect(cacheService.delPattern).toHaveBeenCalledWith('setores:list:*');
      expect(cacheService.del).toHaveBeenCalledWith('setores:active');
      expect(cacheService.del).toHaveBeenCalledWith('setor:test-id');
    });
  });
});
