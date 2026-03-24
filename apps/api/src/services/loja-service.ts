import { prisma } from '@regcheck/database';
import type { LojaDTO } from '@regcheck/shared';
import type { CreateLojaInput, UpdateLojaInput } from '@regcheck/validators';
import { AppError } from '../middleware/error-handler';
import { cachedGet, invalidateCache } from '../lib/redis';

function toDTO(loja: { id: string; nome: string; ativo: boolean; createdAt: Date; updatedAt: Date }): LojaDTO {
  return {
    id: loja.id,
    nome: loja.nome,
    ativo: loja.ativo,
    createdAt: loja.createdAt.toISOString(),
    updatedAt: loja.updatedAt.toISOString(),
  };
}

export class LojaService {
  /** List lojas with pagination */
  static async list(page: number, pageSize: number) {
    const skip = (page - 1) * pageSize;

    const [items, total] = await Promise.all([
      prisma.loja.findMany({
        skip,
        take: pageSize,
        orderBy: { nome: 'asc' },
      }),
      prisma.loja.count(),
    ]);

    return {
      items: items.map(toDTO),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  /** List active lojas (for select dropdowns), cached */
  static async listActive(): Promise<LojaDTO[]> {
    return cachedGet('lojas:active', async () => {
      const lojas = await prisma.loja.findMany({
        where: { ativo: true },
        orderBy: { nome: 'asc' },
      });
      return lojas.map(toDTO);
    }, 300);
  }

  /** Get loja by ID */
  static async getById(id: string): Promise<LojaDTO> {
    const loja = await prisma.loja.findUnique({ where: { id } });
    if (!loja) throw new AppError(404, 'Loja não encontrada', 'NOT_FOUND');
    return toDTO(loja);
  }

  /** Create a new loja */
  static async create(input: CreateLojaInput): Promise<LojaDTO> {
    const loja = await prisma.loja.create({ data: { nome: input.nome } });
    await invalidateCache('lojas:*');
    return toDTO(loja);
  }

  /** Update a loja */
  static async update(id: string, input: UpdateLojaInput): Promise<LojaDTO> {
    const existing = await prisma.loja.findUnique({ where: { id } });
    if (!existing) throw new AppError(404, 'Loja não encontrada', 'NOT_FOUND');

    const loja = await prisma.loja.update({ where: { id }, data: input });
    await invalidateCache('lojas:*');
    return toDTO(loja);
  }

  /** Toggle active status */
  static async toggleActive(id: string): Promise<LojaDTO> {
    const existing = await prisma.loja.findUnique({ where: { id } });
    if (!existing) throw new AppError(404, 'Loja não encontrada', 'NOT_FOUND');

    const loja = await prisma.loja.update({
      where: { id },
      data: { ativo: !existing.ativo },
    });
    await invalidateCache('lojas:*');
    return toDTO(loja);
  }

  /** Delete a loja (only if no equipamentos reference it) */
  static async delete(id: string): Promise<void> {
    const existing = await prisma.loja.findUnique({ where: { id } });
    if (!existing) throw new AppError(404, 'Loja não encontrada', 'NOT_FOUND');

    const count = await prisma.equipamento.count({ where: { lojaId: id } });
    if (count > 0) {
      throw new AppError(409, 'Loja possui equipamentos vinculados', 'IN_USE');
    }

    await prisma.loja.delete({ where: { id } });
    await invalidateCache('lojas:*');
  }
}
