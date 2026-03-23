import { prisma } from '@regcheck/database';
import type { Prisma, FieldType as PrismaFieldType } from '@regcheck/database';
import type { CreateFieldInput, UpdateFieldInput } from '@regcheck/validators';
import { AppError } from '../middleware/error-handler';
import { invalidateCache } from '../lib/redis';

const FIELD_TYPE_MAP: Record<string, PrismaFieldType> = {
  text: 'TEXT',
  image: 'IMAGE',
  signature: 'SIGNATURE',
  checkbox: 'CHECKBOX',
};

export class FieldService {
  /** Add a field to a template */
  static async create(templateId: string, input: CreateFieldInput) {
    const template = await prisma.template.findUnique({ where: { id: templateId } });
    if (!template) throw new AppError(404, 'Template not found', 'NOT_FOUND');
    if (template.status === 'PUBLISHED') {
      throw new AppError(400, 'Cannot add fields to a published template', 'TEMPLATE_PUBLISHED');
    }

    const field = await prisma.templateField.create({
      data: {
        templateId,
        type: FIELD_TYPE_MAP[input.type] as PrismaFieldType,
        pageIndex: input.pageIndex,
        position: input.position as unknown as Prisma.JsonObject,
        config: input.config as unknown as Prisma.JsonObject,
        repetitionGroupId: input.repetitionGroupId,
      },
    });

    await invalidateCache(`template:${templateId}*`);
    return field;
  }

  /** Update a field */
  static async update(fieldId: string, input: UpdateFieldInput) {
    const field = await prisma.templateField.findUnique({
      where: { id: fieldId },
      include: { template: true },
    });
    if (!field) throw new AppError(404, 'Field not found', 'NOT_FOUND');
    if (field.template.status === 'PUBLISHED') {
      throw new AppError(400, 'Cannot modify fields on a published template', 'TEMPLATE_PUBLISHED');
    }

    const data: Prisma.TemplateFieldUpdateInput = {};
    if (input.type) data.type = FIELD_TYPE_MAP[input.type] as PrismaFieldType;
    if (input.pageIndex !== undefined) data.pageIndex = input.pageIndex;
    if (input.position) data.position = input.position as unknown as Prisma.JsonObject;
    if (input.config) data.config = input.config as unknown as Prisma.JsonObject;

    const updated = await prisma.templateField.update({
      where: { id: fieldId },
      data,
    });

    await invalidateCache(`template:${field.templateId}*`);
    return updated;
  }

  /** Delete a field */
  static async delete(fieldId: string) {
    const field = await prisma.templateField.findUnique({
      where: { id: fieldId },
      include: { template: true },
    });
    if (!field) throw new AppError(404, 'Field not found', 'NOT_FOUND');

    await prisma.templateField.delete({ where: { id: fieldId } });
    await invalidateCache(`template:${field.templateId}*`);
  }

  /** Batch update fields (positions and optionally config) */
  static async batchUpdateFields(
    updates: Array<{
      id: string;
      position: { x: number; y: number; width: number; height: number };
      config?: Record<string, unknown>;
    }>,
  ) {
    // Filter to only existing fields before updating (avoids P2025 on deleted fields)
    const existingIds = await prisma.templateField.findMany({
      where: { id: { in: updates.map((u) => u.id) } },
      select: { id: true },
    });
    const existingSet = new Set(existingIds.map((f) => f.id));
    const validUpdates = updates.filter((u) => existingSet.has(u.id));

    if (validUpdates.length === 0) return;

    const operations = validUpdates.map((u) => {
      const data: Prisma.TemplateFieldUpdateInput = {
        position: u.position as unknown as Prisma.JsonObject,
      };
      if (u.config) {
        data.config = u.config as unknown as Prisma.JsonObject;
      }
      return prisma.templateField.update({
        where: { id: u.id },
        data,
      });
    });

    await prisma.$transaction(operations);
  }

  /** @deprecated Use batchUpdateFields instead */
  static async batchUpdatePositions(
    updates: Array<{ id: string; position: { x: number; y: number; width: number; height: number } }>,
  ) {
    return this.batchUpdateFields(updates);
  }
}
