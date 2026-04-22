import { prisma } from '@regcheck/database';
import type { Prisma, DocumentStatus as PrismaDocStatus } from '@regcheck/database';
import { TemplatePaginator, FieldBindingResolver, type BindingContext, type BindingScope } from '@regcheck/editor-engine';
import type { TemplateField, FieldScope } from '@regcheck/shared';
import type {
  CreateDocumentInput,
  UpdateDocumentInput,
  SaveFilledDataInput,
  PopulateDocumentInput,
} from '@regcheck/validators';
import { AppError } from '../middleware/error-handler';
import { pdfGenerationQueue } from '../lib/queue';
import { cacheService } from '../lib/cache';

const STATUS_MAP: Record<string, PrismaDocStatus> = {
  draft: 'DRAFT',
  in_progress: 'IN_PROGRESS',
  completed: 'COMPLETED',
};

/**
 * Shape of a template field as read straight from Prisma. Kept narrow so the
 * service layer doesn't depend on the full generated model.
 */
type DbField = {
  id: string;
  type: string;
  pageIndex: number;
  position: unknown;
  config: unknown;
  scope: string;
  slotIndex: number | null;
  bindingKey: string | null;
};

/** Convert a DB field row into the shared TemplateField shape used by the engine. */
function toTemplateField(f: DbField): TemplateField {
  return {
    id: f.id,
    type: f.type.toLowerCase() as TemplateField['type'],
    pageIndex: f.pageIndex,
    position: f.position as TemplateField['position'],
    config: f.config as TemplateField['config'],
    scope: f.scope as FieldScope,
    slotIndex: f.slotIndex,
    bindingKey: f.bindingKey,
    createdAt: '',
    updatedAt: '',
  };
}

export class DocumentService {
  /** List documents with pagination */
  static async list(page: number, pageSize: number) {
    const cacheKey = `documents:list:page:${page}:size:${pageSize}`;
    
    return cacheService.wrap(cacheKey, async () => {
      const skip = (page - 1) * pageSize;

      const [items, total] = await Promise.all([
        prisma.document.findMany({
          skip,
          take: pageSize,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            name: true,
            status: true,
            totalItems: true,
            templateId: true,
            createdAt: true,
            updatedAt: true,
            template: {
              select: { name: true },
            },
            _count: {
              select: { filledFields: true },
            },
          },
        }),
        prisma.document.count(),
      ]);

      return {
        items: items.map((d) => ({
          id: d.id,
          templateId: d.templateId,
          templateName: d.template.name,
          name: d.name,
          status: d.status.toLowerCase(),
          totalItems: d.totalItems,
          completedItems: d._count.filledFields,
          createdAt: d.createdAt.toISOString(),
          updatedAt: d.updatedAt.toISOString(),
        })),
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      };
    }, 60); // 1 minute TTL (highly dynamic data)
  }

  /** Create a new document from a template */
  static async create(input: CreateDocumentInput) {
    const template = await prisma.template.findUnique({ where: { id: input.templateId } });
    if (!template) throw new AppError(404, 'Template not found', 'NOT_FOUND');
    if (template.status !== 'PUBLISHED') {
      throw new AppError(400, 'Template must be published before filling', 'TEMPLATE_NOT_PUBLISHED');
    }

    const doc = await prisma.document.create({
      data: {
        name: input.name,
        templateId: input.templateId,
        templateVersion: template.version,
        totalItems: input.totalItems,
      },
    });

    // Invalidate list cache
    await cacheService.delPattern('documents:list:*');

    return doc;
  }

  /** Get document by ID with filled data */
  static async getById(id: string) {
    const cacheKey = `document:${id}`;
    
    return cacheService.wrap(cacheKey, async () => {
      const doc = await prisma.document.findUnique({
        where: { id },
        select: {
          id: true,
          name: true,
          status: true,
          totalItems: true,
          templateId: true,
          templateVersion: true,
          generatedPdfKey: true,
          metadata: true,
          createdAt: true,
          updatedAt: true,
          template: {
            select: {
              id: true,
              name: true,
              status: true,
              version: true,
              repetitionConfig: true,
              pdfFile: {
                select: {
                  id: true,
                  key: true,
                  url: true,
                  filename: true,
                },
              },
              fields: {
                select: {
                  id: true,
                  type: true,
                  config: true,
                  page: true,
                  x: true,
                  y: true,
                  width: true,
                  height: true,
                },
                orderBy: { page: 'asc' },
              },
            },
          },
          filledFields: {
            select: {
              id: true,
              fieldId: true,
              itemIndex: true,
              value: true,
              fileKey: true,
            },
          },
        },
      });

      if (!doc) throw new AppError(404, 'Document not found', 'NOT_FOUND');
      return doc;
    }, 60); // 1 minute TTL (highly dynamic data)
  }

  /** Save filled field data (autosave-friendly: upserts) */
  static async saveFilledData(documentId: string, input: SaveFilledDataInput) {
    const doc = await prisma.document.findUnique({ where: { id: documentId } });
    if (!doc) throw new AppError(404, 'Document not found', 'NOT_FOUND');

    const operations = input.fields.map((f) =>
      prisma.filledField.upsert({
        where: {
          documentId_fieldId_itemIndex: {
            documentId,
            fieldId: f.fieldId,
            itemIndex: f.itemIndex,
          },
        },
        create: {
          documentId,
          fieldId: f.fieldId,
          itemIndex: f.itemIndex,
          value: String(f.value),
          fileKey: f.fileKey,
        },
        update: {
          value: String(f.value),
          fileKey: f.fileKey,
        },
      }),
    );

    await prisma.$transaction(operations);

    if (doc.status === 'DRAFT') {
      await prisma.document.update({
        where: { id: documentId },
        data: { status: 'IN_PROGRESS' },
      });
    }

    // Invalidate cache for this document and list cache
    await cacheService.del(`document:${documentId}`);
    await cacheService.delPattern('documents:list:*');
  }

  /** Update document metadata */
  static async update(id: string, input: UpdateDocumentInput) {
    const data: Prisma.DocumentUpdateInput = {};
    if (input.name) data.name = input.name;
    if (input.status) data.status = STATUS_MAP[input.status];
    if (input.totalItems) data.totalItems = input.totalItems;

    const result = await prisma.document.update({ where: { id }, data });

    // Invalidate cache for this document and list cache
    await cacheService.del(`document:${id}`);
    await cacheService.delPattern('documents:list:*');

    return result;
  }

  /**
   * Populate a document with equipment data.
   *
   * Flow:
   *   1. Fetch equipment matching tipo+loja, grouped by setor (each setor
   *      starts on a new page — business rule).
   *   2. Build a {@link BindingContext} with one `items[]` entry per equipment.
   *   3. Use {@link TemplatePaginator} to compute the page layout from the
   *      template's SX slot count.
   *   4. For every field with a `bindingKey`, pre-fill values through
   *      {@link FieldBindingResolver} (namespace-based, no enums).
   */
  static async populate(documentId: string, input: PopulateDocumentInput) {
    const doc = await prisma.document.findUnique({
      where: { id: documentId },
      include: { template: { include: { fields: true } } },
    });
    if (!doc) throw new AppError(404, 'Document not found', 'NOT_FOUND');

    const fields = doc.template.fields.map(toTemplateField);
    const itemsPerPage = TemplatePaginator.itemsPerPage(fields);

    // Fetch equipment filtered by tipo + loja, ordered by setor then numero.
    const equipamentos = await prisma.equipamento.findMany({
      where: { tipoId: input.tipoId, lojaId: input.lojaId },
      include: { setor: true },
      orderBy: [{ setor: { nome: 'asc' } }, { numeroEquipamento: 'asc' }],
    });

    if (equipamentos.length === 0) {
      throw new AppError(400, 'Nenhum equipamento encontrado para os filtros selecionados', 'NO_EQUIPMENT');
    }

    if (itemsPerPage === 0) {
      throw new AppError(
        400,
        'Template não define slots SX (nenhum campo de item). Configure os slots antes de popular.',
        'TEMPLATE_NO_SLOTS',
      );
    }

    // Pack items: each setor starts on a new page. Within a page we just fill
    // slots left-to-right; remaining slots on the last page of a setor stay empty.
    const items: BindingScope[] = [];
    const assignmentMeta: Array<{ itemIndex: number; setorId: string; setorNome: string; equipamentoId: string }> = [];

    let slotOnPage = 0;
    const pad = () => {
      while (slotOnPage % itemsPerPage !== 0) {
        items.push({});
        assignmentMeta.push({
          itemIndex: items.length - 1,
          setorId: '',
          setorNome: '',
          equipamentoId: '',
        });
        slotOnPage++;
      }
    };

    const bySetor = new Map<string, typeof equipamentos>();
    const setorOrder: string[] = [];
    for (const eq of equipamentos) {
      if (!bySetor.has(eq.setorId)) {
        bySetor.set(eq.setorId, []);
        setorOrder.push(eq.setorId);
      }
      bySetor.get(eq.setorId)!.push(eq);
    }

    for (const setorId of setorOrder) {
      if (slotOnPage > 0) pad();
      for (const eq of bySetor.get(setorId)!) {
        items.push({
          numero: eq.numeroEquipamento,
          serie: eq.serie ?? undefined,
          patrimonio: eq.patrimonio ?? undefined,
          modelo: eq.modelo ?? undefined,
          ip: eq.ip ?? undefined,
          glpiId: eq.glpiId ?? undefined,
          setor: eq.setor.nome,
        });
        assignmentMeta.push({
          itemIndex: items.length - 1,
          setorId,
          setorNome: eq.setor.nome,
          equipamentoId: eq.id,
        });
        slotOnPage = (slotOnPage + 1) % itemsPerPage;
      }
    }

    const totalItems = items.length;
    const layout = TemplatePaginator.compute(fields, totalItems);

    // No global pre-fill sources yet — globals are filled manually in the UI.
    // Extend `ctx.globals` here later (e.g. system date, logged-in user) without
    // changing the resolver or any schema.
    const ctx: BindingContext = { globals: {}, items };

    // Build pre-filled records for every field that has a bindingKey.
    const fieldsToCreate: Prisma.FilledFieldCreateManyInput[] = [];
    for (const field of fields) {
      if (!field.bindingKey) continue;

      if (field.scope === 'global') {
        const value = FieldBindingResolver.resolve(field.bindingKey, ctx);
        if (value === undefined) continue;
        fieldsToCreate.push({ documentId, fieldId: field.id, itemIndex: 0, value });
        continue;
      }

      // scope='item': one record per item matching the field's slotIndex.
      for (const a of layout.assignments) {
        if (a.slotIndex !== field.slotIndex) continue;
        const meta = assignmentMeta[a.itemIndex];
        if (!meta || !meta.equipamentoId) continue; // skip padding slots
        const value = FieldBindingResolver.resolve(field.bindingKey, ctx, a.itemIndex);
        if (value === undefined) continue;
        fieldsToCreate.push({ documentId, fieldId: field.id, itemIndex: a.itemIndex, value });
      }
    }

    await prisma.filledField.deleteMany({ where: { documentId } });
    if (fieldsToCreate.length > 0) {
      await prisma.filledField.createMany({ data: fieldsToCreate });
    }

    // Surface only real assignments (drop padding rows) in the metadata.
    const publicAssignments = assignmentMeta.filter((a) => a.equipamentoId !== '');

    await prisma.document.update({
      where: { id: documentId },
      data: {
        totalItems,
        metadata: {
          assignments: publicAssignments,
          itemsPerPage,
          totalPages: layout.totalPages,
        } as unknown as Prisma.InputJsonValue,
        status: 'IN_PROGRESS',
      },
    });

    // Invalidate cache for this document and list cache
    await cacheService.del(`document:${documentId}`);
    await cacheService.delPattern('documents:list:*');

    return {
      totalItems,
      itemsPerPage,
      totalPages: layout.totalPages,
      assignments: publicAssignments,
    };
  }

  /** Delete a document and all its FilledFields in a single transaction */
  static async delete(id: string): Promise<void> {
    const doc = await prisma.document.findUnique({ where: { id } });
    if (!doc) throw new AppError(404, 'Document not found', 'NOT_FOUND');

    await prisma.$transaction([
      prisma.filledField.deleteMany({ where: { documentId: id } }),
      prisma.document.delete({ where: { id } }),
    ]);

    // Invalidate cache for this document and list cache
    await cacheService.del(`document:${id}`);
    await cacheService.delPattern('documents:list:*');
  }

  /** Queue PDF generation for a document */
  static async generatePdf(documentId: string) {
    const doc = await prisma.document.findUnique({ where: { id: documentId } });
    if (!doc) throw new AppError(404, 'Document not found', 'NOT_FOUND');

    // Guard: prevent duplicate enqueue if already generating (with timeout recovery).
    if (doc.status === 'GENERATING') {
      const stuckThreshold = 10 * 60 * 1000;
      const elapsed = Date.now() - new Date(doc.updatedAt).getTime();
      if (elapsed < stuckThreshold) {
        throw new AppError(409, 'PDF generation already in progress', 'ALREADY_GENERATING');
      }
      console.warn(
        `[generatePdf] Document ${documentId} stuck in GENERATING for ${Math.round(elapsed / 1000)}s, resetting`,
      );
    }

    await prisma.document.update({
      where: { id: documentId },
      data: { status: 'GENERATING' },
    });

    const existingJob = await pdfGenerationQueue.getJob(`pdf-${documentId}`);
    if (existingJob) {
      try {
        await existingJob.remove();
      } catch {
        /* job may have been cleaned up already */
      }
    }

    await pdfGenerationQueue.add(
      'generate',
      { documentId },
      {
        jobId: `pdf-${documentId}`,
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: true,
        removeOnFail: { count: 1 },
      },
    );

    // Invalidate cache for this document and list cache
    await cacheService.del(`document:${documentId}`);
    await cacheService.delPattern('documents:list:*');

    return { message: 'PDF generation queued', documentId };
  }
}
