import { prisma } from '@regcheck/database';
import type { Prisma } from '@regcheck/database';
import type { SetorDTO } from '@regcheck/shared';
import type { CreateSetorInput, UpdateSetorInput } from '@regcheck/validators';
import { AppError } from '../middleware/error-handler';
import { cacheService } from '../lib/cache';

function toDTO(setor: {
  id: string;
  nome: string;
  ativo: boolean;
  createdAt: Date;
  updatedAt: Date;
}): SetorDTO {
  return {
    id: setor.id,
    nome: setor.nome,
    ativo: setor.ativo,
    createdAt: setor.createdAt.toISOString(),
    updatedAt: setor.updatedAt.toISOString(),
  };
}

export class SetorService {
  /** List setores with pagination */
  static async list(page: number, pageSize: number) {
    const cacheKey = `setores:list:page:${page}:size:${pageSize}`;

    return cacheService.wrap(
      cacheKey,
      async () => {
        const skip = (page - 1) * pageSize;

        const [items, total] = await Promise.all([
          prisma.setor.findMany({
            skip,
            take: pageSize,
            orderBy: { nome: 'asc' },
          }),
          prisma.setor.count(),
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

  /** List active setores (for select dropdowns), cached */
  static async listActive(): Promise<SetorDTO[]> {
    return cacheService.wrap(
      'setores:active',
      async () => {
        const setores = await prisma.setor.findMany({
          where: { ativo: true },
          orderBy: { nome: 'asc' },
        });
        return setores.map(toDTO);
      },
      300,
    ); // 5 minutes TTL
  }

  /** Get setor by ID */
  static async getById(id: string): Promise<SetorDTO> {
    const cacheKey = `setor:${id}`;

    return cacheService.wrap(
      cacheKey,
      async () => {
        const setor = await prisma.setor.findUnique({ where: { id } });
        if (!setor) throw new AppError(404, 'Setor não encontrado', 'NOT_FOUND');
        return toDTO(setor);
      },
      120,
    ); // 2 minutes TTL
  }

  /** Create a new setor */
  static async create(input: CreateSetorInput): Promise<SetorDTO> {
    const setor = await prisma.setor.create({ data: { nome: input.nome } });

    // Invalidate all list caches
    await cacheService.delPattern('setores:list:*');
    await cacheService.del('setores:active');

    return toDTO(setor);
  }

  /** Update a setor */
  static async update(id: string, input: UpdateSetorInput): Promise<SetorDTO> {
    const existing = await prisma.setor.findUnique({ where: { id } });
    if (!existing) throw new AppError(404, 'Setor não encontrado', 'NOT_FOUND');

    const data: Prisma.SetorUpdateInput = {};
    if (input.nome !== undefined) data.nome = input.nome;
    if (input.ativo !== undefined) data.ativo = input.ativo;

    const setor = await prisma.setor.update({ where: { id }, data });

    // Invalidate all list caches and the specific setor cache
    await cacheService.delPattern('setores:list:*');
    await cacheService.del('setores:active');
    await cacheService.del(`setor:${id}`);

    return toDTO(setor);
  }

  /** Toggle active status */
  static async toggleActive(id: string): Promise<SetorDTO> {
    const existing = await prisma.setor.findUnique({ where: { id } });
    if (!existing) throw new AppError(404, 'Setor não encontrado', 'NOT_FOUND');

    const setor = await prisma.setor.update({
      where: { id },
      data: { ativo: !existing.ativo },
    });

    // Invalidate all list caches and the specific setor cache
    await cacheService.delPattern('setores:list:*');
    await cacheService.del('setores:active');
    await cacheService.del(`setor:${id}`);

    return toDTO(setor);
  }

  /** Delete a setor (only if no equipamentos reference it) */
  static async delete(id: string): Promise<void> {
    const existing = await prisma.setor.findUnique({ where: { id } });
    if (!existing) throw new AppError(404, 'Setor não encontrado', 'NOT_FOUND');

    const count = await prisma.equipamento.count({ where: { setorId: id } });
    if (count > 0) {
      throw new AppError(409, 'Setor possui equipamentos vinculados', 'IN_USE');
    }

    await prisma.setor.delete({ where: { id } });

    // Invalidate all list caches and the specific setor cache
    await cacheService.delPattern('setores:list:*');
    await cacheService.del('setores:active');
    await cacheService.del(`setor:${id}`);
  }
}
