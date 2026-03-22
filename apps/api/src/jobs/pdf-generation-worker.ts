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

/**
 * Process a PDF generation job.
 * 1. Load document + template + filled data
 * 2. Compute repetition layout
 * 3. Clone fields for all items
 * 4. Download original PDF
 * 5. Overlay filled data on pages
 * 6. Upload generated PDF
 */
export async function processPdfGeneration(data: PdfGenerationJobData): Promise<void> {
  const { documentId } = data;

  try {
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

    // Download original PDF
    const pdfBytes = await downloadFile(template.pdfFile.fileKey);
    const pageInfos = await PdfProcessor.getPageInfo(pdfBytes);

    // Build field overlays
    const overlays: FieldOverlay[] = [];

    if (repetitionConfig) {
      // Map DB fields to shared types for the cloner
      const baseFields: TemplateField[] = template.fields.map((f) => ({
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

      // Duplicate pages to match total needed
      const expandedPdf = await PdfProcessor.duplicatePages(
        pdfBytes,
        layout.totalPages,
        template.pdfFile.pageCount,
      );
      const expandedPages = await PdfProcessor.getPageInfo(expandedPdf);

      // Match filled data to cloned fields
      for (const clonedField of clonedFields) {
        const filled = doc.filledFields.find(
          (f) => f.fieldId === clonedField.id.split('_item')[0] && f.itemIndex === clonedField.computedItemIndex,
        );

        if (filled) {
          const overlay: FieldOverlay = {
            pageIndex: clonedField.computedPageIndex,
            type: clonedField.type,
            position: clonedField.position,
            value: filled.value,
            checked: filled.value === 'true',
            fontSize: clonedField.config.fontSize,
            fontColor: clonedField.config.fontColor,
          };

          if ((clonedField.type === 'image' || clonedField.type === 'signature') && filled.fileKey) {
            overlay.imageBytes = await downloadFile(filled.fileKey);
          }

          overlays.push(overlay);
        }
      }

      // Generate final PDF
      const finalPdf = await PdfGenerator.generate({
        originalPdf: expandedPdf,
        pages: expandedPages,
        fieldOverlays: overlays,
      });

      const outputKey = `generated/${crypto.randomUUID()}.pdf`;
      await uploadFile(outputKey, finalPdf, 'application/pdf');

      await prisma.document.update({
        where: { id: documentId },
        data: { status: 'GENERATED', generatedPdfKey: outputKey },
      });
    } else {
      // No repetition: simple overlay on original pages
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

        if ((fieldType === 'image' || fieldType === 'signature') && filled.fileKey) {
          overlay.imageBytes = await downloadFile(filled.fileKey);
        }

        overlays.push(overlay);
      }

      const finalPdf = await PdfGenerator.generate({
        originalPdf: pdfBytes,
        pages: pageInfos,
        fieldOverlays: overlays,
      });

      const outputKey = `generated/${crypto.randomUUID()}.pdf`;
      await uploadFile(outputKey, finalPdf, 'application/pdf');

      await prisma.document.update({
        where: { id: documentId },
        data: { status: 'GENERATED', generatedPdfKey: outputKey },
      });
    }
  } catch (error) {
    console.error(`[PDF Worker] Failed to generate PDF for document ${documentId}:`, error);
    await prisma.document.update({
      where: { id: documentId },
      data: { status: 'ERROR' },
    });
    throw error;
  }
}
