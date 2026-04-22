import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LojaService } from '../loja-service';
import { cacheService } from '../../lib/cache';
import { prisma } from '@regcheck/database';

// Mock the dependencies
vi.mock('@regcheck/database', () => ({
  prisma: {
    loja: {
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

describe('LojaService - Cache Integration', () => {
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

      await LojaService.list(1, 10);

      expect(cacheService.wrap).toHaveBeenCalledWith(
        'lojas:list:page:1:size:10',
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

      await LojaService.list(2, 20);

      expect(cacheService.wrap).toHaveBeenCalledWith(
        'lojas:list:page:2:size:20',
        expect.any(Function),
        300
      );
    });
  });

  describe('getById()', () => {
    it('should use cache with correct key pattern and TTL', async () => {
      const mockLoja = {
        id: 'test-id',
        nome: 'Test Loja',
        ativo: true,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      };

      vi.mocked(cacheService.wrap).mockResolvedValue(mockLoja);

      await LojaService.getById('test-id');

      expect(cacheService.wrap).toHaveBeenCalledWith(
        'loja:test-id',
        expect.any(Function),
        120 // 2 minutes TTL
      );
    });
  });

  describe('create()', () => {
    it('should invalidate list and active caches', async () => {
      const mockLoja = {
        id: 'new-id',
        nome: 'New Loja',
        ativo: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.loja.create).mockResolvedValue(mockLoja);

      await LojaService.create({ nome: 'New Loja' });

      expect(cacheService.delPattern).toHaveBeenCalledWith('lojas:list:*');
      expect(cacheService.del).toHaveBeenCalledWith('lojas:active');
    });
  });

  describe('update()', () => {
    it('should invalidate list, active, and specific loja caches', async () => {
      const mockLoja = {
        id: 'test-id',
        nome: 'Updated Loja',
        ativo: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.loja.findUnique).mockResolvedValue(mockLoja);
      vi.mocked(prisma.loja.update).mockResolvedValue(mockLoja);

      await LojaService.update('test-id', { nome: 'Updated Loja' });

      expect(cacheService.delPattern).toHaveBeenCalledWith('lojas:list:*');
      expect(cacheService.del).toHaveBeenCalledWith('lojas:active');
      expect(cacheService.del).toHaveBeenCalledWith('loja:test-id');
    });
  });

  describe('toggleActive()', () => {
    it('should invalidate list, active, and specific loja caches', async () => {
      const mockLoja = {
        id: 'test-id',
        nome: 'Test Loja',
        ativo: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.loja.findUnique).mockResolvedValue(mockLoja);
      vi.mocked(prisma.loja.update).mockResolvedValue({ ...mockLoja, ativo: false });

      await LojaService.toggleActive('test-id');

      expect(cacheService.delPattern).toHaveBeenCalledWith('lojas:list:*');
      expect(cacheService.del).toHaveBeenCalledWith('lojas:active');
      expect(cacheService.del).toHaveBeenCalledWith('loja:test-id');
    });
  });

  describe('delete()', () => {
    it('should invalidate list, active, and specific loja caches', async () => {
      const mockLoja = {
        id: 'test-id',
        nome: 'Test Loja',
        ativo: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.loja.findUnique).mockResolvedValue(mockLoja);
      vi.mocked(prisma.equipamento.count).mockResolvedValue(0);
      vi.mocked(prisma.loja.delete).mockResolvedValue(mockLoja);

      await LojaService.delete('test-id');

      expect(cacheService.delPattern).toHaveBeenCalledWith('lojas:list:*');
      expect(cacheService.del).toHaveBeenCalledWith('lojas:active');
      expect(cacheService.del).toHaveBeenCalledWith('loja:test-id');
    });
  });
});
