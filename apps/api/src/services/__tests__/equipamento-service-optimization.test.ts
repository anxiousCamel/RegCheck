import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EquipamentoService } from '../equipamento-service';
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

vi.mock('@regcheck/database', () => ({
  prisma: {
    equipamento: {
      findMany: vi.fn(),
      count: vi.fn(),
      findUnique: vi.fn(),
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

describe('EquipamentoService - Query Optimization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Pagination Limit (Requirement 5.2)', () => {
    it('should enforce max page size of 100 items', async () => {
      vi.mocked(prisma.equipamento.findMany).mockResolvedValue([]);
      vi.mocked(prisma.equipamento.count).mockResolvedValue(0);

      const filters = {};
      await EquipamentoService.list(1, 200, filters); // Request 200 items

      // Verify that findMany was called with take: 100 (max limit)
      expect(prisma.equipamento.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 100, // Should be capped at 100
        })
      );
    });

    it('should allow page sizes under 100', async () => {
      vi.mocked(prisma.equipamento.findMany).mockResolvedValue([]);
      vi.mocked(prisma.equipamento.count).mockResolvedValue(0);

      const filters = {};
      await EquipamentoService.list(1, 50, filters); // Request 50 items

      // Verify that findMany was called with take: 50
      expect(prisma.equipamento.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 50,
        })
      );
    });

    it('should return effective page size in response', async () => {
      vi.mocked(prisma.equipamento.findMany).mockResolvedValue([]);
      vi.mocked(prisma.equipamento.count).mockResolvedValue(0);

      const filters = {};
      const result = await EquipamentoService.list(1, 200, filters);

      // Response should reflect the capped page size
      expect(result.pageSize).toBe(100);
    });
  });

  describe('Optimized Select (Requirements 5.3, 5.4)', () => {
    it('should use select instead of include for list queries', async () => {
      vi.mocked(prisma.equipamento.findMany).mockResolvedValue([]);
      vi.mocked(prisma.equipamento.count).mockResolvedValue(0);

      const filters = {};
      await EquipamentoService.list(1, 10, filters);

      // Verify that findMany was called with select (not include)
      const call = vi.mocked(prisma.equipamento.findMany).mock.calls[0][0];
      expect(call).toHaveProperty('select');
      expect(call).not.toHaveProperty('include');
      
      // Verify select includes relations with nested select
      expect(call.select).toHaveProperty('loja');
      expect(call.select).toHaveProperty('setor');
      expect(call.select).toHaveProperty('tipo');
      expect(call.select.loja).toHaveProperty('select');
      expect(call.select.setor).toHaveProperty('select');
      expect(call.select.tipo).toHaveProperty('select');
    });

    it('should use select for getById queries', async () => {
      const mockEquipamento = {
        id: 'test-id',
        lojaId: 'loja-1',
        setorId: 'setor-1',
        tipoId: 'tipo-1',
        numeroEquipamento: 'EQ-001',
        serie: 'S001',
        patrimonio: 'P001',
        glpiId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        loja: { id: 'loja-1', nome: 'Loja 1', ativo: true, createdAt: new Date(), updatedAt: new Date() },
        setor: { id: 'setor-1', nome: 'Setor 1', ativo: true, createdAt: new Date(), updatedAt: new Date() },
        tipo: { id: 'tipo-1', nome: 'Tipo 1', ativo: true, createdAt: new Date(), updatedAt: new Date() },
      };
      
      vi.mocked(prisma.equipamento.findUnique).mockResolvedValue(mockEquipamento);

      await EquipamentoService.getById('test-id');

      // Verify that findUnique was called with select (not include)
      const call = vi.mocked(prisma.equipamento.findUnique).mock.calls[0][0];
      expect(call).toHaveProperty('select');
      expect(call).not.toHaveProperty('include');
    });

    it('should select only necessary fields from relations', async () => {
      vi.mocked(prisma.equipamento.findMany).mockResolvedValue([]);
      vi.mocked(prisma.equipamento.count).mockResolvedValue(0);

      const filters = {};
      await EquipamentoService.list(1, 10, filters);

      const call = vi.mocked(prisma.equipamento.findMany).mock.calls[0][0];
      
      // Verify loja relation only selects necessary fields
      expect(call.select.loja.select).toEqual({
        id: true,
        nome: true,
        ativo: true,
        createdAt: true,
        updatedAt: true,
      });

      // Verify setor relation only selects necessary fields
      expect(call.select.setor.select).toEqual({
        id: true,
        nome: true,
        ativo: true,
        createdAt: true,
        updatedAt: true,
      });

      // Verify tipo relation only selects necessary fields
      expect(call.select.tipo.select).toEqual({
        id: true,
        nome: true,
        ativo: true,
        createdAt: true,
        updatedAt: true,
      });
    });
  });

  describe('Single Query with JOINs (Requirement 1.5)', () => {
    it('should fetch equipamentos with relations in a single query', async () => {
      const mockEquipamento = {
        id: 'test-id',
        lojaId: 'loja-1',
        setorId: 'setor-1',
        tipoId: 'tipo-1',
        numeroEquipamento: 'EQ-001',
        serie: 'S001',
        patrimonio: 'P001',
        glpiId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        loja: { id: 'loja-1', nome: 'Loja 1', ativo: true, createdAt: new Date(), updatedAt: new Date() },
        setor: { id: 'setor-1', nome: 'Setor 1', ativo: true, createdAt: new Date(), updatedAt: new Date() },
        tipo: { id: 'tipo-1', nome: 'Tipo 1', ativo: true, createdAt: new Date(), updatedAt: new Date() },
      };

      vi.mocked(prisma.equipamento.findMany).mockResolvedValue([mockEquipamento]);
      vi.mocked(prisma.equipamento.count).mockResolvedValue(1);

      const filters = {};
      await EquipamentoService.list(1, 10, filters);

      // Should only call findMany once (with relations included via select)
      expect(prisma.equipamento.findMany).toHaveBeenCalledTimes(1);
      
      // Should not make separate queries for loja, setor, or tipo
      expect(prisma.loja.findUnique).not.toHaveBeenCalled();
      expect(prisma.setor.findUnique).not.toHaveBeenCalled();
      expect(prisma.tipoEquipamento.findUnique).not.toHaveBeenCalled();
    });
  });
});
