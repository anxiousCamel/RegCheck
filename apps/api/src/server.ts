import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { templateRouter } from './routes/templates';
import { documentRouter } from './routes/documents';
import { uploadRouter } from './routes/uploads';
import { fieldRouter } from './routes/fields';
import { lojaRouter } from './routes/lojas';
import { setorRouter } from './routes/setores';
import { tipoEquipamentoRouter } from './routes/tipos-equipamento';
import { equipamentoRouter } from './routes/equipamentos';
import { errorHandler } from './middleware/error-handler';
import { requestLogger } from './middleware/request-logger';
import { createPdfWorker } from './lib/queue';
import { processPdfGeneration } from './jobs/pdf-generation-worker';

const app = express();
const PORT = process.env.API_PORT ?? 4000;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN ?? 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(requestLogger);

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/uploads', uploadRouter);
app.use('/api/templates', templateRouter);
app.use('/api/templates', fieldRouter);
app.use('/api/documents', documentRouter);
app.use('/api/lojas', lojaRouter);
app.use('/api/setores', setorRouter);
app.use('/api/tipos-equipamento', tipoEquipamentoRouter);
app.use('/api/equipamentos', equipamentoRouter);

// Error handling
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`[API] Server running on port ${PORT}`);

  // Start the PDF generation worker (BullMQ consumer)
  const worker = createPdfWorker(processPdfGeneration);
  worker.on('completed', (job) => {
    console.log(`[Worker] PDF job ${job.id} completed`);
  });
  worker.on('failed', (job, err) => {
    console.error(`[Worker] PDF job ${job?.id} failed:`, err.message);
  });
  console.log('[Worker] PDF generation worker started');
});

export { app };
