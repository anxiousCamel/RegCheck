import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EquipamentoService } from '../equipamento-service';
import { cacheService } from '../../lib/cache';
import { prisma } from '@regcheck/database';

// Mock the dependencies
vi.mock('@regcheck/database', () => ({
  prisma: {
    equipamento: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    loja: {
      findUnique: vi.fn(),
    },
    setor: {
      findUnique: vi.fn(),
    },
    tipoEquipamento: {
      findUnique: vi.fn(),
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

describe('EquipamentoService - Cache Integration', () => {
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

      const filters = {};
      await EquipamentoService.list(1, 10, filters);

      expect(cacheService.wrap).toHaveBeenCalledWith(
        'equipamentos:list:page:1:size:10:filters:{}',
        expect.any(Function),
        120 // 2 minutes TTL
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

      const filters = {};
      await EquipamentoService.list(2, 20, filters);

      expect(cacheService.wrap).toHaveBeenCalledWith(
        'equipamentos:list:page:2:size:20:filters:{}',
        expect.any(Function),
        120
      );
    });

    it('should use different cache keys for different filters', async () => {
      const mockResult = {
        items: [],
        total: 0,
        page: 1,
        pageSize: 10,
        totalPages: 0,
      };

      vi.mocked(cacheService.wrap).mockResolvedValue(mockResult);

      const filters = { lojaId: 'loja-1', tipoId: 'tipo-1' };
      await EquipamentoService.list(1, 10, filters);

      expect(cacheService.wrap).toHaveBeenCalledWith(
        `equipamentos:list:page:1:size:10:filters:${JSON.stringify(filters)}`,
        expect.any(Function),
        120
      );
    });
  });

  describe('getById()', () => {
    it('should use cache with correct key pattern and TTL', async () => {
      const mockEquipamento = {
        id: 'test-id',
        lojaId: 'loja-1',
        setorId: 'setor-1',
        tipoId: 'tipo-1',
        numeroEquipamento: 'EQ001',
        serie: 'SN123',
        patrimonio: 'PAT456',
        glpiId: 'GLPI789',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      };

      vi.mocked(cacheService.wrap).mockResolvedValue(mockEquipamento);

      await EquipamentoService.getById('test-id');

      expect(cacheService.wrap).toHaveBeenCalledWith(
        'equipamento:test-id',
        expect.any(Function),
        120 // 2 minutes TTL
      );
    });
  });

  describe('create()', () => {
    it('should invalidate list caches', async () => {
      const mockEquipamento = {
        id: 'new-id',
        lojaId: 'loja-1',
        setorId: 'setor-1',
        tipoId: 'tipo-1',
        numeroEquipamento: 'EQ001',
        serie: null,
        patrimonio: null,
        glpiId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockLoja = { id: 'loja-1', nome: 'Loja 1', ativo: true, createdAt: new Date(), updatedAt: new Date() };
      const mockSetor = { id: 'setor-1', nome: 'Setor 1', ativo: true, createdAt: new Date(), updatedAt: new Date() };
      const mockTipo = { id: 'tipo-1', nome: 'Tipo 1', ativo: true, createdAt: new Date(), updatedAt: new Date() };

      vi.mocked(prisma.loja.findUnique).mockResolvedValue(mockLoja);
      vi.mocked(prisma.setor.findUnique).mockResolvedValue(mockSetor);
      vi.mocked(prisma.tipoEquipamento.findUnique).mockResolvedValue(mockTipo);
      vi.mocked(prisma.equipamento.create).mockResolvedValue(mockEquipamento);

      await EquipamentoService.create({
        lojaId: 'loja-1',
        setorId: 'setor-1',
        tipoId: 'tipo-1',
        numeroEquipamento: 'EQ001',
      });

      expect(cacheService.delPattern).toHaveBeenCalledWith('equipamentos:list:*');
    });
  });

  describe('update()', () => {
    it('should invalidate list and specific equipamento caches', async () => {
      const mockEquipamento = {
        id: 'test-id',
        lojaId: 'loja-1',
        setorId: 'setor-1',
        tipoId: 'tipo-1',
        numeroEquipamento: 'EQ001',
        serie: 'SN123',
        patrimonio: null,
        glpiId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.equipamento.findUnique).mockResolvedValue(mockEquipamento);
      vi.mocked(prisma.equipamento.update).mockResolvedValue(mockEquipamento);

      await EquipamentoService.update('test-id', { serie: 'SN456' });

      expect(cacheService.delPattern).toHaveBeenCalledWith('equipamentos:list:*');
      expect(cacheService.del).toHaveBeenCalledWith('equipamento:test-id');
    });
  });

  describe('delete()', () => {
    it('should invalidate list and specific equipamento caches', async () => {
      const mockEquipamento = {
        id: 'test-id',
        lojaId: 'loja-1',
        setorId: 'setor-1',
        tipoId: 'tipo-1',
        numeroEquipamento: 'EQ001',
        serie: null,
        patrimonio: null,
        glpiId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.equipamento.findUnique).mockResolvedValue(mockEquipamento);
      vi.mocked(prisma.equipamento.delete).mockResolvedValue(mockEquipamento);

      await EquipamentoService.delete('test-id');

      expect(cacheService.delPattern).toHaveBeenCalledWith('equipamentos:list:*');
      expect(cacheService.del).toHaveBeenCalledWith('equipamento:test-id');
    });
  });
});
