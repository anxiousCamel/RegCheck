import { prisma } from '@regcheck/database';
import type { Prisma } from '@regcheck/database';
import type { TipoEquipamentoDTO } from '@regcheck/shared';
import type { CreateTipoEquipamentoInput, UpdateTipoEquipamentoInput } from '@regcheck/validators';
import { AppError } from '../middleware/error-handler';
import { cacheService } from '../lib/cache';

function toDTO(tipo: {
  id: string;
  nome: string;
  ativo: boolean;
  createdAt: Date;
  updatedAt: Date;
}): TipoEquipamentoDTO {
  return {
    id: tipo.id,
    nome: tipo.nome,
    ativo: tipo.ativo,
    createdAt: tipo.createdAt.toISOString(),
    updatedAt: tipo.updatedAt.toISOString(),
  };
}

export class TipoEquipamentoService {
  /** List tipos with pagination */
  static async list(page: number, pageSize: number) {
    const cacheKey = `tipos:list:page:${page}:size:${pageSize}`;

    return cacheService.wrap(
      cacheKey,
      async () => {
        const skip = (page - 1) * pageSize;

        const [items, total] = await Promise.all([
          prisma.tipoEquipamento.findMany({
            skip,
            take: pageSize,
            orderBy: { nome: 'asc' },
          }),
          prisma.tipoEquipamento.count(),
        ]);

        return {
          items: items.map(toDTO),
          total,
          page,
          pageSize,
          totalPages: Math.ceil(total / pageSize),
        };
      },
      300,
    ); // 5 minutes TTL
  }

  /** List active tipos (for select dropdowns), cached */
  static async listActive(): Promise<TipoEquipamentoDTO[]> {
    return cacheService.wrap(
      'tipos:active',
      async () => {
        const tipos = await prisma.tipoEquipamento.findMany({
          where: { ativo: true },
          orderBy: { nome: 'asc' },
        });
        return tipos.map(toDTO);
      },
      300,
    ); // 5 minutes TTL
  }

  /** Get tipo by ID */
  static async getById(id: string): Promise<TipoEquipamentoDTO> {
    const cacheKey = `tipo:${id}`;

    return cacheService.wrap(
      cacheKey,
      async () => {
        const tipo = await prisma.tipoEquipamento.findUnique({ where: { id } });
        if (!tipo) throw new AppError(404, 'Tipo de equipamento não encontrado', 'NOT_FOUND');
        return toDTO(tipo);
      },
      120,
    ); // 2 minutes TTL
  }

  /** Create a new tipo */
  static async create(input: CreateTipoEquipamentoInput): Promise<TipoEquipamentoDTO> {
    const tipo = await prisma.tipoEquipamento.create({ data: { nome: input.nome } });

    // Invalidate all list caches
    await cacheService.delPattern('tipos:list:*');
    await cacheService.del('tipos:active');

    return toDTO(tipo);
  }

  /** Update a tipo */
  static async update(id: string, input: UpdateTipoEquipamentoInput): Promise<TipoEquipamentoDTO> {
    const existing = await prisma.tipoEquipamento.findUnique({ where: { id } });
    if (!existing) throw new AppError(404, 'Tipo de equipamento não encontrado', 'NOT_FOUND');

    const data: Prisma.TipoEquipamentoUpdateInput = {};
    if (input.nome !== undefined) data.nome = input.nome;
    if (input.ativo !== undefined) data.ativo = input.ativo;

    const tipo = await prisma.tipoEquipamento.update({ where: { id }, data });

    // Invalidate all list caches and the specific tipo cache
    await cacheService.delPattern('tipos:list:*');
    await cacheService.del('tipos:active');
    await cacheService.del(`tipo:${id}`);

    return toDTO(tipo);
  }

  /** Toggle active status */
  static async toggleActive(id: string): Promise<TipoEquipamentoDTO> {
    const existing = await prisma.tipoEquipamento.findUnique({ where: { id } });
    if (!existing) throw new AppError(404, 'Tipo de equipamento não encontrado', 'NOT_FOUND');

    const tipo = await prisma.tipoEquipamento.update({
      where: { id },
      data: { ativo: !existing.ativo },
    });

    // Invalidate all list caches and the specific tipo cache
    await cacheService.delPattern('tipos:list:*');
    await cacheService.del('tipos:active');
    await cacheService.del(`tipo:${id}`);

    return toDTO(tipo);
  }

  /** Delete a tipo (only if no equipamentos reference it) */
  static async delete(id: string): Promise<void> {
    const existing = await prisma.tipoEquipamento.findUnique({ where: { id } });
    if (!existing) throw new AppError(404, 'Tipo de equipamento não encontrado', 'NOT_FOUND');

    const count = await prisma.equipamento.count({ where: { tipoId: id } });
    if (count > 0) {
      throw new AppError(409, 'Tipo possui equipamentos vinculados', 'IN_USE');
    }

    await prisma.tipoEquipamento.delete({ where: { id } });

    // Invalidate all list caches and the specific tipo cache
    await cacheService.delPattern('tipos:list:*');
    await cacheService.del('tipos:active');
    await cacheService.del(`tipo:${id}`);
  }
}
