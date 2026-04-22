import { prisma } from '@regcheck/database';
import type { Prisma } from '@regcheck/database';
import type { EquipamentoDTO } from '@regcheck/shared';
import type { CreateEquipamentoInput, UpdateEquipamentoInput, EquipamentoFilterInput } from '@regcheck/validators';
import { AppError } from '../middleware/error-handler';
import { cacheService } from '../lib/cache';

// Optimized select for list queries - only necessary fields
const listSelect = {
  id: true,
  lojaId: true,
  setorId: true,
  tipoId: true,
  numeroEquipamento: true,
  serie: true,
  patrimonio: true,
  glpiId: true,
  createdAt: true,
  updatedAt: true,
  loja: {
    select: {
      id: true,
      nome: true,
      ativo: true,
      createdAt: true,
      updatedAt: true,
    },
  },
  setor: {
    select: {
      id: true,
      nome: true,
      ativo: true,
      createdAt: true,
      updatedAt: true,
    },
  },
  tipo: {
    select: {
      id: true,
      nome: true,
      ativo: true,
      createdAt: true,
      updatedAt: true,
    },
  },
} as const;

// For detail queries, use the same optimized select
const detailSelect = listSelect;

function toDTO(eq: {
  id: string;
  lojaId: string;
  setorId: string;
  tipoId: string;
  numeroEquipamento: string;
  serie: string | null;
  patrimonio: string | null;
  modelo: string | null;
  ip: string | null;
  glpiId: string | null;
  createdAt: Date;
  updatedAt: Date;
  loja?: { id: string; nome: string; ativo: boolean; createdAt: Date; updatedAt: Date };
  setor?: { id: string; nome: string; ativo: boolean; createdAt: Date; updatedAt: Date };
  tipo?: { id: string; nome: string; ativo: boolean; createdAt: Date; updatedAt: Date };
}): EquipamentoDTO {
  return {
    id: eq.id,
    lojaId: eq.lojaId,
    setorId: eq.setorId,
    tipoId: eq.tipoId,
    numeroEquipamento: eq.numeroEquipamento,
    serie: eq.serie,
    patrimonio: eq.patrimonio,
    modelo: eq.modelo,
    ip: eq.ip,
    glpiId: eq.glpiId,
    createdAt: eq.createdAt.toISOString(),
    updatedAt: eq.updatedAt.toISOString(),
    loja: eq.loja ? {
      id: eq.loja.id,
      nome: eq.loja.nome,
      ativo: eq.loja.ativo,
      createdAt: eq.loja.createdAt.toISOString(),
      updatedAt: eq.loja.updatedAt.toISOString(),
    } : undefined,
    setor: eq.setor ? {
      id: eq.setor.id,
      nome: eq.setor.nome,
      ativo: eq.setor.ativo,
      createdAt: eq.setor.createdAt.toISOString(),
      updatedAt: eq.setor.updatedAt.toISOString(),
    } : undefined,
    tipo: eq.tipo ? {
      id: eq.tipo.id,
      nome: eq.tipo.nome,
      ativo: eq.tipo.ativo,
      createdAt: eq.tipo.createdAt.toISOString(),
      updatedAt: eq.tipo.updatedAt.toISOString(),
    } : undefined,
  };
}

export class EquipamentoService {
  /** List equipamentos with pagination and filters */
  static async list(page: number, pageSize: number, filters: EquipamentoFilterInput) {
    // Enforce max page size of 100 items (Requirement 5.2)
    const effectivePageSize = Math.min(pageSize, 100);
    
    // Create cache key including filters for proper cache segmentation
    const filterKey = JSON.stringify(filters);
    const cacheKey = `equipamentos:list:page:${page}:size:${effectivePageSize}:filters:${filterKey}`;
    
    return cacheService.wrap(cacheKey, async () => {
      const skip = (page - 1) * effectivePageSize;
      const where: Prisma.EquipamentoWhereInput = {};

      if (filters.lojaId) where.lojaId = filters.lojaId;
      if (filters.setorId) where.setorId = filters.setorId;
      if (filters.tipoId) where.tipoId = filters.tipoId;
      if (filters.numeroEquipamento) {
        where.numeroEquipamento = { contains: filters.numeroEquipamento, mode: 'insensitive' };
      }
      if (filters.serie) {
        where.serie = { contains: filters.serie, mode: 'insensitive' };
      }
      if (filters.search) {
        where.OR = [
          { numeroEquipamento: { contains: filters.search, mode: 'insensitive' } },
          { serie: { contains: filters.search, mode: 'insensitive' } },
          { patrimonio: { contains: filters.search, mode: 'insensitive' } },
          { glpiId: { contains: filters.search, mode: 'insensitive' } },
        ];
      }

      const [items, total] = await Promise.all([
        prisma.equipamento.findMany({
          where,
          skip,
          take: effectivePageSize,
          orderBy: { createdAt: 'desc' },
          select: listSelect,
        }),
        prisma.equipamento.count({ where }),
      ]);

      return {
        items: items.map(toDTO),
        total,
        page,
        pageSize: effectivePageSize,
        totalPages: Math.ceil(total / effectivePageSize),
      };
    }, 120); // 2 minutes TTL (more dynamic data)
  }

  /** Get equipamento by ID */
  static async getById(id: string): Promise<EquipamentoDTO> {
    const cacheKey = `equipamento:${id}`;
    
    return cacheService.wrap(cacheKey, async () => {
      const eq = await prisma.equipamento.findUnique({
        where: { id },
        select: detailSelect,
      });
      if (!eq) throw new AppError(404, 'Equipamento não encontrado', 'NOT_FOUND');
      return toDTO(eq);
    }, 120); // 2 minutes TTL
  }

  /** Create a new equipamento */
  static async create(input: CreateEquipamentoInput): Promise<EquipamentoDTO> {
    // Validate FK existence
    const [loja, setor, tipo] = await Promise.all([
      prisma.loja.findUnique({ where: { id: input.lojaId } }),
      prisma.setor.findUnique({ where: { id: input.setorId } }),
      prisma.tipoEquipamento.findUnique({ where: { id: input.tipoId } }),
    ]);

    if (!loja || !loja.ativo) throw new AppError(400, 'Loja não encontrada ou inativa', 'INVALID_LOJA');
    if (!setor || !setor.ativo) throw new AppError(400, 'Setor não encontrado ou inativo', 'INVALID_SETOR');
    if (!tipo || !tipo.ativo) throw new AppError(400, 'Tipo não encontrado ou inativo', 'INVALID_TIPO');

    const eq = await prisma.equipamento.create({
      data: {
        lojaId: input.lojaId,
        setorId: input.setorId,
        tipoId: input.tipoId,
        numeroEquipamento: input.numeroEquipamento,
        serie: input.serie ?? null,
        patrimonio: input.patrimonio ?? null,
        modelo: input.modelo ?? null,
        ip: input.ip ?? null,
        glpiId: input.glpiId ?? null,
      },
      select: detailSelect,
    });

    // Invalidate all list caches
    await cacheService.delPattern('equipamentos:list:*');

    return toDTO(eq);
  }

  /** Update an equipamento */
  static async update(id: string, input: UpdateEquipamentoInput): Promise<EquipamentoDTO> {
    const existing = await prisma.equipamento.findUnique({ where: { id } });
    if (!existing) throw new AppError(404, 'Equipamento não encontrado', 'NOT_FOUND');

    // Validate FK changes
    if (input.lojaId) {
      const loja = await prisma.loja.findUnique({ where: { id: input.lojaId } });
      if (!loja || !loja.ativo) throw new AppError(400, 'Loja não encontrada ou inativa', 'INVALID_LOJA');
    }
    if (input.setorId) {
      const setor = await prisma.setor.findUnique({ where: { id: input.setorId } });
      if (!setor || !setor.ativo) throw new AppError(400, 'Setor não encontrado ou inativo', 'INVALID_SETOR');
    }
    if (input.tipoId) {
      const tipo = await prisma.tipoEquipamento.findUnique({ where: { id: input.tipoId } });
      if (!tipo || !tipo.ativo) throw new AppError(400, 'Tipo não encontrado ou inativo', 'INVALID_TIPO');
    }

    const eq = await prisma.equipamento.update({
      where: { id },
      data: input,
      select: detailSelect,
    });

    // Invalidate all list caches and the specific equipamento cache
    await cacheService.delPattern('equipamentos:list:*');
    await cacheService.del(`equipamento:${id}`);

    return toDTO(eq);
  }

  /** Delete an equipamento */
  static async delete(id: string): Promise<void> {
    const existing = await prisma.equipamento.findUnique({ where: { id } });
    if (!existing) throw new AppError(404, 'Equipamento não encontrado', 'NOT_FOUND');

    await prisma.equipamento.delete({ where: { id } });

    // Invalidate all list caches and the specific equipamento cache
    await cacheService.delPattern('equipamentos:list:*');
    await cacheService.del(`equipamento:${id}`);
  }
}
