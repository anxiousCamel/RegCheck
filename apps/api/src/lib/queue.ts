import { Queue, Worker } from 'bullmq';
import Redis from 'ioredis';

const connection = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

/** Queue for PDF generation jobs */
export const pdfGenerationQueue = new Queue('pdf-generation', { connection });

/** Job data for PDF generation */
export interface PdfGenerationJobData {
  documentId: string;
}

/** Create the PDF generation worker (call once at startup) */
export function createPdfWorker(
  processor: (data: PdfGenerationJobData) => Promise<void>,
): Worker {
  return new Worker<PdfGenerationJobData>(
    'pdf-generation',
    async (job) => {
      await processor(job.data);
    },
    {
      connection,
      concurrency: 2,
    },
  );
}
