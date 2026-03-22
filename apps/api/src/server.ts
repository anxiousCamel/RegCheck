import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { templateRouter } from './routes/templates';
import { documentRouter } from './routes/documents';
import { uploadRouter } from './routes/uploads';
import { fieldRouter } from './routes/fields';
import { errorHandler } from './middleware/error-handler';
import { requestLogger } from './middleware/request-logger';

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

// Error handling
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`[API] Server running on port ${PORT}`);
});

export { app };
