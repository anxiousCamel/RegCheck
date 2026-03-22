import { prisma } from '@regcheck/database';
import type { Prisma, DocumentStatus as PrismaDocStatus } from '@regcheck/database';
import type { CreateDocumentInput, UpdateDocumentInput, SaveFilledDataInput } from '@regcheck/validators';
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

    return prisma.document.update({ where: { id }, data });
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
