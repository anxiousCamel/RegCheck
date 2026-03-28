import { prisma } from '@regcheck/database';
import { PdfProcessor, PdfGenerator } from '@regcheck/pdf-engine';
import { FieldCloner, RepetitionEngine } from '@regcheck/editor-engine';
import type { TemplateField, RepetitionConfig, FieldPosition, FieldType } from '@regcheck/shared';
import type { FieldOverlay } from '@regcheck/pdf-engine';
import type { PdfGenerationJobData } from '../lib/queue';
import { downloadFile, uploadFile } from '../lib/s3';
import crypto from 'node:crypto';

const FIELD_TYPE_REVERSE: Record<string, FieldType> = {
  TEXT: 'text',
  IMAGE: 'image',
  SIGNATURE: 'signature',
  CHECKBOX: 'checkbox',
};

/** Structured log helper */
function log(step: string, documentId: string, extra?: Record<string, unknown>) {
  console.log(JSON.stringify({ ts: new Date().toISOString(), step, documentId, ...extra }));
}

/**
 * Process a PDF generation job.
 * 1. Load document + template + filled data
 * 2. Compute repetition layout
 * 3. Clone fields for all items
 * 4. Download original PDF
 * 5. Overlay filled data on pages (image downloads parallelized)
 * 6. Upload generated PDF
 */
export async function processPdfGeneration(data: PdfGenerationJobData): Promise<void> {
  const { documentId } = data;
  const startedAt = Date.now();

  log('start', documentId);

  try {
    // ── 1. Load data ──────────────────────────────────────────────────────────
    const doc = await prisma.document.findUnique({
      where: { id: documentId },
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

    if (!doc) throw new Error(`Document ${documentId} not found`);

    const { template } = doc;
    const repetitionConfig = template.repetitionConfig as RepetitionConfig | null;

    log('data_loaded', documentId, {
      totalItems: doc.totalItems,
      fieldCount: template.fields.length,
      filledCount: doc.filledFields.length,
      hasRepetition: !!repetitionConfig,
    });

    // ── 2. Download original PDF ──────────────────────────────────────────────
    log('download_pdf_start', documentId);
    const pdfBytes = await downloadFile(template.pdfFile.fileKey);
    log('download_pdf_done', documentId, { bytes: pdfBytes.length });

    // ── 3. Build overlays ─────────────────────────────────────────────────────
    log('build_overlays_start', documentId);

    let finalPdf: Buffer;

    if (repetitionConfig) {
      const baseFields: TemplateField[] = template.fields
        .filter((f) => f.repetitionIndex == null || f.repetitionIndex === 0)
        .map((f) => ({
        id: f.id,
        type: FIELD_TYPE_REVERSE[f.type] as FieldType,
        pageIndex: f.pageIndex,
        position: f.position as unknown as FieldPosition,
        config: f.config as unknown as TemplateField['config'],
        repetitionGroupId: f.repetitionGroupId ?? undefined,
        repetitionIndex: f.repetitionIndex ?? undefined,
        createdAt: f.createdAt.toISOString(),
        updatedAt: f.updatedAt.toISOString(),
      }));

      const clonedFields = FieldCloner.cloneForItems(baseFields, doc.totalItems, repetitionConfig);
      const layout = RepetitionEngine.computeLayout(doc.totalItems, repetitionConfig);

      log('pages_duplicate_start', documentId, { totalPages: layout.totalPages });
      const expandedPdf = await PdfProcessor.duplicatePages(
        pdfBytes,
        layout.totalPages,
        template.pdfFile.pageCount,
      );
      const expandedPages = await PdfProcessor.getPageInfo(expandedPdf);
      log('pages_duplicate_done', documentId, { pages: expandedPages.length });

      // Collect all image/signature fields that need downloading
      const imageDownloadTasks: Array<{
        clonedFieldId: string;
        fileKey: string;
      }> = [];

      for (const clonedField of clonedFields) {
        if (clonedField.type !== 'image' && clonedField.type !== 'signature') continue;
        const filled = doc.filledFields.find(
          (f) => f.fieldId === clonedField.id.split('_item')[0] && f.itemIndex === clonedField.computedItemIndex,
        );
        if (filled?.fileKey) {
          imageDownloadTasks.push({ clonedFieldId: clonedField.id, fileKey: filled.fileKey });
        }
      }

      // Download all images in parallel
      log('image_downloads_start', documentId, { count: imageDownloadTasks.length });
      const imageMap = new Map<string, Buffer>();
      if (imageDownloadTasks.length > 0) {
        const results = await Promise.all(
          imageDownloadTasks.map(async (task) => ({
            id: task.clonedFieldId,
            bytes: await downloadFile(task.fileKey),
          })),
        );
        for (const r of results) imageMap.set(r.id, r.bytes);
      }
      log('image_downloads_done', documentId, { count: imageMap.size });

      // Build overlays
      const overlays: FieldOverlay[] = [];
      for (const clonedField of clonedFields) {
        const filled = doc.filledFields.find(
          (f) => f.fieldId === clonedField.id.split('_item')[0] && f.itemIndex === clonedField.computedItemIndex,
        );
        if (!filled) continue;

        const overlay: FieldOverlay = {
          pageIndex: clonedField.computedPageIndex,
          type: clonedField.type,
          position: clonedField.position,
          value: filled.value,
          checked: filled.value === 'true',
          fontSize: clonedField.config.fontSize,
          fontColor: clonedField.config.fontColor,
        };

        if (clonedField.type === 'image' || clonedField.type === 'signature') {
          overlay.imageBytes = imageMap.get(clonedField.id);
        }

        overlays.push(overlay);
      }

      log('build_overlays_done', documentId, { overlayCount: overlays.length });

      log('generate_start', documentId);
      finalPdf = await PdfGenerator.generate({
        originalPdf: expandedPdf,
        pages: expandedPages,
        fieldOverlays: overlays,
      });
    } else {
      // No repetition: simple overlay on original pages
      const pageInfos = await PdfProcessor.getPageInfo(pdfBytes);

      // Collect image downloads
      const imageDownloadTasks = template.fields
        .filter((f) => (f.type === 'IMAGE' || f.type === 'SIGNATURE'))
        .map((f) => {
          const filled = doc.filledFields.find((ff) => ff.fieldId === f.id && ff.itemIndex === 0);
          return filled?.fileKey ? { fieldId: f.id, fileKey: filled.fileKey } : null;
        })
        .filter(Boolean) as Array<{ fieldId: string; fileKey: string }>;

      log('image_downloads_start', documentId, { count: imageDownloadTasks.length });
      const imageMap = new Map<string, Buffer>();
      if (imageDownloadTasks.length > 0) {
        const results = await Promise.all(
          imageDownloadTasks.map(async (task) => ({
            id: task.fieldId,
            bytes: await downloadFile(task.fileKey),
          })),
        );
        for (const r of results) imageMap.set(r.id, r.bytes);
      }
      log('image_downloads_done', documentId, { count: imageMap.size });

      const overlays: FieldOverlay[] = [];
      for (const field of template.fields) {
        const filled = doc.filledFields.find((f) => f.fieldId === field.id && f.itemIndex === 0);
        if (!filled) continue;

        const fieldType = FIELD_TYPE_REVERSE[field.type] as FieldType;
        const overlay: FieldOverlay = {
          pageIndex: field.pageIndex,
          type: fieldType,
          position: field.position as unknown as FieldPosition,
          value: filled.value,
          checked: filled.value === 'true',
        };

        if (fieldType === 'image' || fieldType === 'signature') {
          overlay.imageBytes = imageMap.get(field.id);
        }

        overlays.push(overlay);
      }

      log('build_overlays_done', documentId, { overlayCount: overlays.length });

      log('generate_start', documentId);
      finalPdf = await PdfGenerator.generate({
        originalPdf: pdfBytes,
        pages: pageInfos,
        fieldOverlays: overlays,
      });
    }

    log('generate_done', documentId, { bytes: finalPdf.length });

    // ── 4. Upload result ──────────────────────────────────────────────────────
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

    // Robust status recovery: retry the status update to prevent stuck GENERATING state
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
