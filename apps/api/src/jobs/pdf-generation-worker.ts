import { prisma } from '@regcheck/database';
import { PdfProcessor, PdfGenerator, type FieldOverlay } from '@regcheck/pdf-engine';
import { TemplatePaginator } from '@regcheck/editor-engine';
import type { FieldPosition, FieldType, TemplateField, FieldScope } from '@regcheck/shared';
import type { PdfGenerationJobData } from '../lib/queue';
import { downloadFile, uploadFile } from '../lib/s3';
import crypto from 'node:crypto';

/** Prisma stores field type as UPPERCASE enum; the shared type is lowercase. */
const FIELD_TYPE_REVERSE: Record<string, FieldType> = {
  TEXT: 'text',
  IMAGE: 'image',
  SIGNATURE: 'signature',
  CHECKBOX: 'checkbox',
};

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

type DbFilled = {
  fieldId: string;
  itemIndex: number;
  value: string;
  fileKey: string | null;
};

/** Structured log helper */
function log(step: string, documentId: string, extra?: Record<string, unknown>) {
  console.log(JSON.stringify({ ts: new Date().toISOString(), step, documentId, ...extra }));
}

function toSharedField(f: DbField): TemplateField {
  return {
    id: f.id,
    type: FIELD_TYPE_REVERSE[f.type]!,
    pageIndex: f.pageIndex,
    position: f.position as FieldPosition,
    config: f.config as TemplateField['config'],
    scope: f.scope as FieldScope,
    slotIndex: f.slotIndex,
    bindingKey: f.bindingKey,
    createdAt: '',
    updatedAt: '',
  };
}

/**
 * Downloads every image/signature referenced by a filled field in parallel.
 * Keyed by `${fieldId}:${itemIndex}` so overlay building can fetch by (field, item).
 */
async function downloadFilledImages(filled: DbFilled[]): Promise<Map<string, Buffer>> {
  const tasks = filled
    .filter((f) => !!f.fileKey)
    .map((f) => ({ key: `${f.fieldId}:${f.itemIndex}`, fileKey: f.fileKey! }));

  if (tasks.length === 0) return new Map();

  const results = await Promise.all(
    tasks.map(async (t) => ({ key: t.key, bytes: await downloadFile(t.fileKey) })),
  );
  return new Map(results.map((r) => [r.key, r.bytes]));
}

/** Resolve the expanded-PDF page index for a given template page + page ordinal. */
function expandedPageIndex(templatePageIndex: number, pageOrdinal: number, originalPageCount: number): number {
  return pageOrdinal * originalPageCount + templatePageIndex;
}

function makeOverlay(
  field: TemplateField,
  filled: DbFilled,
  expandedPage: number,
  imageMap: Map<string, Buffer>,
): FieldOverlay {
  const config = field.config as { fontSize?: number; fontColor?: string };
  const overlay: FieldOverlay = {
    pageIndex: expandedPage,
    type: field.type,
    position: field.position,
    value: filled.value,
    checked: filled.value === 'true',
    fontSize: config.fontSize,
    fontColor: config.fontColor,
  };
  if (field.type === 'image' || field.type === 'signature') {
    overlay.imageBytes = imageMap.get(`${field.id}:${filled.itemIndex}`);
  }
  return overlay;
}

/**
 * Process a PDF generation job.
 *
 * Pipeline (single path for every template):
 *   1. Load document + template + filled data
 *   2. Compute pagination layout (TemplatePaginator)
 *   3. Download original PDF, duplicate pages to fit all items
 *   4. Parallel-download every image/signature referenced by filled fields
 *   5. Build overlays (global → every page; item → page matching slot)
 *   6. Render, upload, persist status
 */
export async function processPdfGeneration(data: PdfGenerationJobData): Promise<void> {
  const { documentId } = data;
  const startedAt = Date.now();

  log('start', documentId);

  try {
    const doc = await prisma.document.findUnique({
      where: { id: documentId },
      include: {
        template: { include: { pdfFile: true, fields: true } },
        filledFields: true,
      },
    });
    if (!doc) throw new Error(`Document ${documentId} not found`);

    const templateFields = doc.template.fields as DbField[];
    const filledFields = doc.filledFields as DbFilled[];
    const sharedFields = templateFields.map(toSharedField);

    const layout = TemplatePaginator.compute(sharedFields, doc.totalItems);

    log('data_loaded', documentId, {
      totalItems: doc.totalItems,
      fieldCount: templateFields.length,
      filledCount: filledFields.length,
      itemsPerPage: layout.itemsPerPage,
      totalPages: layout.totalPages,
    });

    log('download_pdf_start', documentId);
    const pdfBytes = await downloadFile(doc.template.pdfFile.fileKey);
    log('download_pdf_done', documentId, { bytes: pdfBytes.length });

    log('pages_duplicate_start', documentId, { totalPages: layout.totalPages });
    const expandedPdf = await PdfProcessor.duplicatePages(
      pdfBytes,
      layout.totalPages,
      doc.template.pdfFile.pageCount,
    );
    const expandedPages = await PdfProcessor.getPageInfo(expandedPdf);
    log('pages_duplicate_done', documentId, { pages: expandedPages.length });

    log('image_downloads_start', documentId);
    const imageMap = await downloadFilledImages(filledFields);
    log('image_downloads_done', documentId, { count: imageMap.size });

    // Build overlays — single unified loop.
    const filledLookup = new Map<string, DbFilled>();
    for (const f of filledFields) filledLookup.set(`${f.fieldId}:${f.itemIndex}`, f);

    const overlays: FieldOverlay[] = [];
    for (const field of sharedFields) {
      if (field.scope === 'global') {
        // Global: render on every expanded page, same value (itemIndex=0).
        const filled = filledLookup.get(`${field.id}:0`);
        if (!filled) continue;
        for (let p = 0; p < layout.totalPages; p++) {
          overlays.push(
            makeOverlay(
              field,
              filled,
              expandedPageIndex(field.pageIndex, p, doc.template.pdfFile.pageCount),
              imageMap,
            ),
          );
        }
      } else {
        // Item: render only on the page where its slot is assigned.
        if (field.slotIndex === null) continue;
        for (const a of layout.assignments) {
          if (a.slotIndex !== field.slotIndex) continue;
          const filled = filledLookup.get(`${field.id}:${a.itemIndex}`);
          if (!filled) continue;
          overlays.push(
            makeOverlay(
              field,
              filled,
              expandedPageIndex(field.pageIndex, a.pageOrdinal, doc.template.pdfFile.pageCount),
              imageMap,
            ),
          );
        }
      }
    }

    log('build_overlays_done', documentId, { overlayCount: overlays.length });

    log('generate_start', documentId);
    const finalPdf = await PdfGenerator.generate({
      originalPdf: expandedPdf,
      pages: expandedPages,
      fieldOverlays: overlays,
    });
    log('generate_done', documentId, { bytes: finalPdf.length });

    log('upload_start', documentId);
    const outputKey = `generated/${crypto.randomUUID()}.pdf`;
    await uploadFile(outputKey, finalPdf, 'application/pdf');
    log('upload_done', documentId, { key: outputKey });

    await prisma.document.update({
      where: { id: documentId },
      data: { status: 'GENERATED', generatedPdfKey: outputKey },
    });

    log('done', documentId, { elapsedMs: Date.now() - startedAt });
  } catch (error) {
    const elapsedMs = Date.now() - startedAt;
    log('error', documentId, {
      elapsedMs,
      message: error instanceof Error ? error.message : String(error),
    });

    // Robust status recovery: retry the status update to prevent stuck GENERATING state.
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        await prisma.document.update({
          where: { id: documentId },
          data: { status: 'ERROR' },
        });
        log('status_recovered', documentId, { attempt });
        break;
      } catch (updateErr) {
        log('status_recovery_failed', documentId, {
          attempt,
          message: updateErr instanceof Error ? updateErr.message : String(updateErr),
        });
        if (attempt < 2) {
          await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
        }
      }
    }

    throw error;
  }
}

