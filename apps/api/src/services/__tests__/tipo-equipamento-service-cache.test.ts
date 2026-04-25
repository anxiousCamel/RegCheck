import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TipoEquipamentoService } from '../tipo-equipamento-service';
import { cacheService } from '../../lib/cache';
import { prisma } from '@regcheck/database';

// Mock the dependencies
vi.mock('@regcheck/database', () => ({
  prisma: {
    tipoEquipamento: {
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

describe('TipoEquipamentoService - Cache Integration', () => {
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

      await TipoEquipamentoService.list(1, 10);

      expect(cacheService.wrap).toHaveBeenCalledWith(
        'tipos:list:page:1:size:10',
        expect.any(Function),
        300, // 5 minutes TTL
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

      await TipoEquipamentoService.list(2, 20);

      expect(cacheService.wrap).toHaveBeenCalledWith(
        'tipos:list:page:2:size:20',
        expect.any(Function),
        300,
      );
    });
  });

  describe('listActive()', () => {
    it('should use cache with correct key and TTL', async () => {
      const mockTipos = [
        {
          id: 'tipo-1',
          nome: 'Tipo 1',
          ativo: true,
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
        },
      ];

      vi.mocked(cacheService.wrap).mockResolvedValue(mockTipos);

      await TipoEquipamentoService.listActive();

      expect(cacheService.wrap).toHaveBeenCalledWith(
        'tipos:active',
        expect.any(Function),
        300, // 5 minutes TTL
      );
    });
  });

  describe('getById()', () => {
    it('should use cache with correct key pattern and TTL', async () => {
      const mockTipo = {
        id: 'test-id',
        nome: 'Test Tipo',
        ativo: true,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      };

      vi.mocked(cacheService.wrap).mockResolvedValue(mockTipo);

      await TipoEquipamentoService.getById('test-id');

      expect(cacheService.wrap).toHaveBeenCalledWith(
        'tipo:test-id',
        expect.any(Function),
        120, // 2 minutes TTL
      );
    });
  });

  describe('create()', () => {
    it('should invalidate list and active caches', async () => {
      const mockTipo = {
        id: 'new-id',
        nome: 'New Tipo',
        ativo: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.tipoEquipamento.create).mockResolvedValue(mockTipo);

      await TipoEquipamentoService.create({ nome: 'New Tipo' });

      expect(cacheService.delPattern).toHaveBeenCalledWith('tipos:list:*');
      expect(cacheService.del).toHaveBeenCalledWith('tipos:active');
    });
  });

  describe('update()', () => {
    it('should invalidate list, active, and specific tipo caches', async () => {
      const mockTipo = {
        id: 'test-id',
        nome: 'Updated Tipo',
        ativo: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.tipoEquipamento.findUnique).mockResolvedValue(mockTipo);
      vi.mocked(prisma.tipoEquipamento.update).mockResolvedValue(mockTipo);

      await TipoEquipamentoService.update('test-id', { nome: 'Updated Tipo' });

      expect(cacheService.delPattern).toHaveBeenCalledWith('tipos:list:*');
      expect(cacheService.del).toHaveBeenCalledWith('tipos:active');
      expect(cacheService.del).toHaveBeenCalledWith('tipo:test-id');
    });
  });

  describe('toggleActive()', () => {
    it('should invalidate list, active, and specific tipo caches', async () => {
      const mockTipo = {
        id: 'test-id',
        nome: 'Test Tipo',
        ativo: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.tipoEquipamento.findUnique).mockResolvedValue(mockTipo);
      vi.mocked(prisma.tipoEquipamento.update).mockResolvedValue({ ...mockTipo, ativo: false });

      await TipoEquipamentoService.toggleActive('test-id');

      expect(cacheService.delPattern).toHaveBeenCalledWith('tipos:list:*');
      expect(cacheService.del).toHaveBeenCalledWith('tipos:active');
      expect(cacheService.del).toHaveBeenCalledWith('tipo:test-id');
    });
  });

  describe('delete()', () => {
    it('should invalidate list, active, and specific tipo caches', async () => {
      const mockTipo = {
        id: 'test-id',
        nome: 'Test Tipo',
        ativo: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.tipoEquipamento.findUnique).mockResolvedValue(mockTipo);
      vi.mocked(prisma.equipamento.count).mockResolvedValue(0);
      vi.mocked(prisma.tipoEquipamento.delete).mockResolvedValue(mockTipo);

      await TipoEquipamentoService.delete('test-id');

      expect(cacheService.delPattern).toHaveBeenCalledWith('tipos:list:*');
      expect(cacheService.del).toHaveBeenCalledWith('tipos:active');
      expect(cacheService.del).toHaveBeenCalledWith('tipo:test-id');
    });
  });
});
