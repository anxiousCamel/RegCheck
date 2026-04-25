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

/**
 * Normalize incoming scope/slotIndex/bindingKey values so DB invariants hold:
 *   - globals always have slotIndex = null
 *   - items always have slotIndex ≥ 0 (validator should have enforced this; defensive default to 0)
 */
function normalizeSlotFor(
  scope: 'global' | 'item' | undefined,
  slotIndex: number | null | undefined,
): number | null {
  if (scope === 'global') return null;
  if (scope === 'item') return slotIndex ?? 0;
  // If scope is undefined, preserve the slotIndex value or default to null
  return slotIndex ?? null;
}

export class FieldService {
  /** Add a field to a template */
  static async create(templateId: string, input: CreateFieldInput) {
    const template = await prisma.template.findUnique({ where: { id: templateId } });
    if (!template) throw new AppError(404, 'Template not found', 'NOT_FOUND');

    const field = await prisma.templateField.create({
      data: {
        templateId,
        type: FIELD_TYPE_MAP[input.type] as PrismaFieldType,
        pageIndex: input.pageIndex,
        // FieldPosition → Prisma JSON: validated by Zod, cast bridges Prisma's JsonObject
        position: input.position as unknown as Prisma.JsonObject,
        // FieldConfig → Prisma JSON: validated by Zod, cast bridges Prisma's JsonObject
        config: input.config as unknown as Prisma.JsonObject,
        scope: input.scope,
        slotIndex: normalizeSlotFor(input.scope, input.slotIndex),
        bindingKey: input.bindingKey,
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

    const data: Prisma.TemplateFieldUpdateInput = {};
    if (input.type) data.type = FIELD_TYPE_MAP[input.type] as PrismaFieldType;
    if (input.pageIndex !== undefined) data.pageIndex = input.pageIndex;
    // FieldPosition → Prisma JSON: validated by Zod, cast bridges Prisma's JsonObject
    if (input.position) data.position = input.position as unknown as Prisma.JsonObject;
    // FieldConfig → Prisma JSON: validated by Zod, cast bridges Prisma's JsonObject
    if (input.config) data.config = input.config as unknown as Prisma.JsonObject;
    if (input.scope !== undefined) {
      data.scope = input.scope;
      data.slotIndex = normalizeSlotFor(input.scope, input.slotIndex);
    } else if (input.slotIndex !== undefined) {
      data.slotIndex = input.slotIndex;
    }
    if (input.bindingKey !== undefined) data.bindingKey = input.bindingKey;

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

  /** Batch update fields (position + optional scope/slot/binding/config). */
  static async batchUpdateFields(
    updates: Array<{
      id: string;
      position: { x: number; y: number; width: number; height: number };
      config?: Record<string, unknown>;
      scope?: 'global' | 'item';
      slotIndex?: number | null;
      bindingKey?: string | null;
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
        // FieldPosition → Prisma JSON: validated upstream, cast bridges Prisma's JsonObject
        position: u.position as unknown as Prisma.JsonObject,
      };
      // FieldConfig → Prisma JSON: validated upstream, cast bridges Prisma's JsonObject
      if (u.config) data.config = u.config as unknown as Prisma.JsonObject;
      if (u.scope !== undefined) {
        data.scope = u.scope;
        data.slotIndex = normalizeSlotFor(u.scope, u.slotIndex);
      } else if (u.slotIndex !== undefined) {
        data.slotIndex = u.slotIndex;
      }
      if (u.bindingKey !== undefined) data.bindingKey = u.bindingKey;

      return prisma.templateField.update({ where: { id: u.id }, data });
    });

    await prisma.$transaction(operations);
  }
}
