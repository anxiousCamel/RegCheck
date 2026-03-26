import { prisma } from '@regcheck/database';
import type { Prisma, DocumentStatus as PrismaDocStatus } from '@regcheck/database';
import type { CreateDocumentInput, UpdateDocumentInput, SaveFilledDataInput, PopulateDocumentInput } from '@regcheck/validators';
import type { RepetitionConfig } from '@regcheck/shared';
import { AppError } from '../middleware/error-handler';
import { pdfGenerationQueue } from '../lib/queue';

const STATUS_MAP: Record<string, PrismaDocStatus> = {
  draft: 'DRAFT',
  in_progress: 'IN_PROGRESS',
  completed: 'COMPLETED',
};

export class DocumentService {
  /** List documents with pagination */
  static async list(page: number, pageSize: number) {
    const skip = (page - 1) * pageSize;

    const [items, total] = await Promise.all([
      prisma.document.findMany({
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          template: { select: { name: true } },
          _count: { select: { filledFields: true } },
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

    return doc;
  }

  /** Get document by ID with filled data */
  static async getById(id: string) {
    const doc = await prisma.document.findUnique({
      where: { id },
      include: {
        template: {
          include: {
            pdfFile: true,
            fields: true,
          },
        },
        filledFields: true,
      },
    });

    if (!doc) throw new AppError(404, 'Document not found', 'NOT_FOUND');
    return doc;
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

    // Update status to in_progress if it was draft
    if (doc.status === 'DRAFT') {
      await prisma.document.update({
        where: { id: documentId },
        data: { status: 'IN_PROGRESS' },
      });
    }
  }

  /** Update document metadata */
  static async update(id: string, input: UpdateDocumentInput) {
    const data: Prisma.DocumentUpdateInput = {};
    if (input.name) data.name = input.name;
    if (input.status) data.status = STATUS_MAP[input.status];
    if (input.totalItems) data.totalItems = input.totalItems;

    return prisma.document.update({ where: { id }, data });
  }

  /** Populate document with equipment data, grouping by setor and respecting itemsPerPage */
  static async populate(documentId: string, input: PopulateDocumentInput) {
    const doc = await prisma.document.findUnique({
      where: { id: documentId },
      include: { template: { include: { fields: true } } },
    });
    if (!doc) throw new AppError(404, 'Document not found', 'NOT_FOUND');

    const repetitionConfig = doc.template.repetitionConfig as RepetitionConfig | null;
    const itemsPerPage = repetitionConfig?.itemsPerPage ?? 1;

    // Fetch all equipment matching tipo + loja, sorted by setor name then numero
    const equipamentos = await prisma.equipamento.findMany({
      where: { tipoId: input.tipoId, lojaId: input.lojaId },
      include: { setor: true },
      orderBy: [{ setor: { nome: 'asc' } }, { numeroEquipamento: 'asc' }],
    });

    if (equipamentos.length === 0) {
      throw new AppError(400, 'Nenhum equipamento encontrado para os filtros selecionados', 'NO_EQUIPMENT');
    }

    // Group by setorId maintaining sorted order
    const setorOrder: string[] = [];
    const bySetor = new Map<string, typeof equipamentos>();
    for (const eq of equipamentos) {
      if (!bySetor.has(eq.setorId)) {
        bySetor.set(eq.setorId, []);
        setorOrder.push(eq.setorId);
      }
      bySetor.get(eq.setorId)!.push(eq);
    }

    // Assign item indices, padding to page boundary at each setor boundary
    const assignments: Array<{
      itemIndex: number;
      setorId: string;
      setorNome: string;
      equipamentoId: string;
      numeroEquipamento: string;
    }> = [];

    let currentIndex = 0;
    for (const setorId of setorOrder) {
      const equips = bySetor.get(setorId)!;
      const setorNome = equips[0].setor.nome;

      for (const eq of equips) {
        assignments.push({
          itemIndex: currentIndex,
          setorId,
          setorNome,
          equipamentoId: eq.id,
          numeroEquipamento: eq.numeroEquipamento,
        });
        currentIndex++;
      }

      // Pad to next page boundary to prevent setor mixing
      const remainder = equips.length % itemsPerPage;
      if (remainder > 0) {
        currentIndex += itemsPerPage - remainder;
      }
    }

    const totalItems = currentIndex;

    // Find text fields whose labels match equipment properties
    function normalizeLabel(s: string): string {
      return s
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim();
    }

    function getFieldMapping(label: string): 'numero' | 'serie' | 'patrimonio' | null {
      const n = normalizeLabel(label);
      if (n.includes('numero') || n.includes('n°') || n.includes('nro') || n === 'n') return 'numero';
      if (n.includes('serie') || n.includes('serial')) return 'serie';
      if (n.includes('patrimonio') || n.includes('patrim')) return 'patrimonio';
      return null;
    }

    // Clear existing filled fields
    await prisma.filledField.deleteMany({ where: { documentId } });

    // Build pre-filled field records
    const fieldsToCreate: Prisma.FilledFieldCreateManyInput[] = [];

    for (const assignment of assignments) {
      const eq = equipamentos.find((e) => e.id === assignment.equipamentoId)!;

      for (const field of doc.template.fields) {
        if (field.type !== 'TEXT') continue;
        const fieldConfig = field.config as { label?: string };
        if (!fieldConfig.label) continue;

        const mapping = getFieldMapping(fieldConfig.label);
        if (!mapping) continue;

        let value: string | null = null;
        if (mapping === 'numero') value = eq.numeroEquipamento;
        else if (mapping === 'serie') value = eq.serie;
        else if (mapping === 'patrimonio') value = eq.patrimonio;

        if (value === null || value === undefined) continue;

        fieldsToCreate.push({
          documentId,
          fieldId: field.id,
          itemIndex: assignment.itemIndex,
          value,
        });
      }
    }

    if (fieldsToCreate.length > 0) {
      await prisma.filledField.createMany({ data: fieldsToCreate });
    }

    // Update document with new totalItems and assignment metadata
    await prisma.document.update({
      where: { id: documentId },
      data: {
        totalItems,
        metadata: { assignments } as unknown as Prisma.InputJsonValue,
        status: 'IN_PROGRESS',
      },
    });

    return { totalItems, assignments };
  }

  /** Queue PDF generation for a document */
  static async generatePdf(documentId: string) {
    const doc = await prisma.document.findUnique({ where: { id: documentId } });
    if (!doc) throw new AppError(404, 'Document not found', 'NOT_FOUND');

    await prisma.document.update({
      where: { id: documentId },
      data: { status: 'GENERATING' },
    });

    await pdfGenerationQueue.add('generate', { documentId }, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
    });

    return { message: 'PDF generation queued', documentId };
  }
}
