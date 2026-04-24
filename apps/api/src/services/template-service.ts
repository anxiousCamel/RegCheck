import { prisma } from '@regcheck/database';
import type { Prisma } from '@regcheck/database';
import { TemplatePaginator } from '@regcheck/editor-engine';
import type { TemplateSummary, TemplateField, FieldScope } from '@regcheck/shared';
import type { CreateTemplateInput, UpdateTemplateInput } from '@regcheck/validators';
import { AppError } from '../middleware/error-handler';
import { cacheService } from '../lib/cache';

export class TemplateService {
  /** List templates with pagination */
  static async list(page: number, pageSize: number) {
    const cacheKey = `templates:list:page:${page}:size:${pageSize}`;
    
    return cacheService.wrap(cacheKey, async () => {
      const skip = (page - 1) * pageSize;

      const [items, total] = await Promise.all([
        prisma.template.findMany({
          skip,
          take: pageSize,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            name: true,
            description: true,
            status: true,
            fillMode: true,
            version: true,
            createdAt: true,
            updatedAt: true,
            pdfFile: {
              select: {
                pageCount: true,
              },
            },
            _count: {
              select: { fields: true },
            },
          },
        }),
        prisma.template.count(),
      ]);

      const summaries: TemplateSummary[] = items.map((t) => ({
        id: t.id,
        name: t.name,
        description: t.description ?? undefined,
        status: t.status.toLowerCase() as TemplateSummary['status'],
        fillMode: t.fillMode,
        pageCount: t.pdfFile.pageCount,
        fieldCount: t._count.fields,
        version: t.version,
        createdAt: t.createdAt.toISOString(),
        updatedAt: t.updatedAt.toISOString(),
      }));

      return {
        items: summaries,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      };
    }, 300); // 5 minutes TTL
  }

  /** Get template by ID with all fields */
  static async getById(id: string) {
    const cacheKey = `template:${id}`;
    
    return cacheService.wrap(cacheKey, async () => {
      const template = await prisma.template.findUnique({
        where: { id },
        include: {
          pdfFile: true,
          fields: { orderBy: { createdAt: 'asc' } },
        },
      });

      if (!template) {
        throw new AppError(404, 'Template not found', 'NOT_FOUND');
      }

      return template;
    }, 120); // 2 minutes TTL
  }

  /** Create a new template from an uploaded PDF */
  static async create(input: CreateTemplateInput, pdfFileId: string) {
    const template = await prisma.template.create({
      data: {
        name: input.name,
        description: input.description,
        pdfFileId,
      },
      include: { pdfFile: true },
    });

    // Invalidate list caches
    await cacheService.delPattern('templates:list:*');

    return template;
  }

  /** Update template metadata */
  static async update(id: string, input: UpdateTemplateInput) {
    console.log('[TemplateService] Updating template:', id, 'with input:', input);
    
    const existing = await prisma.template.findUnique({ where: { id } });
    if (!existing) throw new AppError(404, 'Template not found', 'NOT_FOUND');
    if (existing.status === 'PUBLISHED') {
      throw new AppError(400, 'Cannot modify a published template. Create a new version.', 'TEMPLATE_PUBLISHED');
    }

    const data: Prisma.TemplateUpdateInput = {};
    if (input.name) data.name = input.name;
    if (input.description !== undefined) data.description = input.description;
    if (input.status) data.status = input.status.toUpperCase() as Prisma.TemplateUpdateInput['status'];
    if (input.fillMode) data.fillMode = input.fillMode;

    console.log('[TemplateService] Prisma update data:', data);

    const updated = await prisma.template.update({
      where: { id },
      data,
      include: { pdfFile: true, fields: true },
    });

    console.log('[TemplateService] Template updated, fillMode:', updated.fillMode);

    // Invalidate list caches and specific template cache
    await cacheService.delPattern('templates:list:*');
    await cacheService.del(`template:${id}`);
    
    return updated;
  }

  /**
   * Publish a template after running structural validation via {@link TemplatePaginator}.
   * Creates a version snapshot for audit/rollback.
   */
  static async publish(id: string) {
    const template = await prisma.template.findUnique({
      where: { id },
      include: { fields: true },
    });

    if (!template) throw new AppError(404, 'Template not found', 'NOT_FOUND');

    // Block publish if SX slots are misconfigured.
    const sharedFields: TemplateField[] = template.fields.map((f) => ({
      id: f.id,
      type: f.type.toLowerCase() as TemplateField['type'],
      pageIndex: f.pageIndex,
      position: f.position as unknown as TemplateField['position'],
      config: f.config as unknown as TemplateField['config'],
      scope: f.scope as FieldScope,
      slotIndex: f.slotIndex,
      bindingKey: f.bindingKey,
      createdAt: f.createdAt.toISOString(),
      updatedAt: f.updatedAt.toISOString(),
    }));
    const errors = TemplatePaginator.validate(sharedFields);
    if (errors.length > 0) {
      throw new AppError(
        400,
        `Template invalido: ${errors.join('; ')}`,
        'TEMPLATE_INVALID',
      );
    }

    const [published] = await prisma.$transaction([
      prisma.template.update({
        where: { id },
        data: {
          status: 'PUBLISHED',
          version: { increment: 1 },
        },
      }),
      prisma.templateVersion.create({
        data: {
          templateId: id,
          version: template.version + 1,
          snapshot: {
            name: template.name,
            description: template.description,
            fields: template.fields,
          } as unknown as Prisma.JsonObject,
        },
      }),
    ]);

    // Invalidate list caches and specific template cache
    await cacheService.delPattern(`template:${id}*`);
    await cacheService.delPattern('templates:list:*');
    
    return published;
  }

  /** Unpublish a template (return to DRAFT) */
  static async unpublish(id: string) {
    const template = await prisma.template.findUnique({
      where: { id },
    });

    if (!template) {
      throw new AppError(404, 'Template not found', 'NOT_FOUND');
    }

    const updated = await prisma.template.update({
      where: { id },
      data: { status: 'DRAFT' },
    });

    await cacheService.delPattern(`template:${id}*`);
    await cacheService.delPattern('templates:list:*');

    return updated;
  }

  /** Delete a template */
  static async delete(id: string) {
    const template = await prisma.template.findUnique({ where: { id } });
    if (!template) throw new AppError(404, 'Template not found', 'NOT_FOUND');

    await prisma.template.delete({ where: { id } });
    
    // Invalidate list caches and specific template cache
    await cacheService.delPattern('templates:list:*');
    await cacheService.del(`template:${id}`);
  }
}
