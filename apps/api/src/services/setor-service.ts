import { prisma } from '@regcheck/database';
import type { SetorDTO } from '@regcheck/shared';
import type { CreateSetorInput, UpdateSetorInput } from '@regcheck/validators';
import { AppError } from '../middleware/error-handler';
import { cachedGet, invalidateCache } from '../lib/redis';

function toDTO(setor: { id: string; nome: string; ativo: boolean; createdAt: Date; updatedAt: Date }): SetorDTO {
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
  }

  /** List active setores (for select dropdowns), cached */
  static async listActive(): Promise<SetorDTO[]> {
    return cachedGet('setores:active', async () => {
      const setores = await prisma.setor.findMany({
        where: { ativo: true },
        orderBy: { nome: 'asc' },
      });
      return setores.map(toDTO);
    }, 300);
  }

  /** Get setor by ID */
  static async getById(id: string): Promise<SetorDTO> {
    const setor = await prisma.setor.findUnique({ where: { id } });
    if (!setor) throw new AppError(404, 'Setor não encontrado', 'NOT_FOUND');
    return toDTO(setor);
  }

  /** Create a new setor */
  static async create(input: CreateSetorInput): Promise<SetorDTO> {
    const setor = await prisma.setor.create({ data: { nome: input.nome } });
    await invalidateCache('setores:*');
    return toDTO(setor);
  }

  /** Update a setor */
  static async update(id: string, input: UpdateSetorInput): Promise<SetorDTO> {
    const existing = await prisma.setor.findUnique({ where: { id } });
    if (!existing) throw new AppError(404, 'Setor não encontrado', 'NOT_FOUND');

    const setor = await prisma.setor.update({ where: { id }, data: input });
    await invalidateCache('setores:*');
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
    await invalidateCache('setores:*');
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
    await invalidateCache('setores:*');
  }
}
