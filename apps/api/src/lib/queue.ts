import { Queue, Worker, type ConnectionOptions } from 'bullmq';
import Redis from 'ioredis';

const redisInstance = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

// BullMQ ConnectionOptions includes IORedis.Redis, but exactOptionalPropertyTypes
// causes structural incompatibility between the ioredis instance and the type.
const connection = redisInstance as ConnectionOptions;

/** Queue for PDF generation jobs */
export const pdfGenerationQueue = new Queue('pdf-generation', { connection });

/** Job data for PDF generation */
export interface PdfGenerationJobData {
  documentId: string;
}

/** Create the PDF generation worker (call once at startup) */
export function createPdfWorker(processor: (data: PdfGenerationJobData) => Promise<void>): Worker {
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

/** Get the current BullMQ job status for a document */
export async function getJobStatus(documentId: string): Promise<{
  state: string | null;
  progress: number;
  failedReason?: string;
} | null> {
  const jobs = await pdfGenerationQueue.getJobs([
    'active',
    'waiting',
    'delayed',
    'failed',
    'completed',
  ]);
  const job = jobs.find((j) => j.data.documentId === documentId);
  if (!job) return null;

  const state = await job.getState();
  return {
    state,
    progress: typeof job.progress === 'number' ? job.progress : 0,
    failedReason: job.failedReason,
  };
}
