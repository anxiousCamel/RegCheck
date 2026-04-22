/**
 * Performance Middleware Usage Examples
 * 
 * This file demonstrates how to use the performance middleware
 * for tracking request timing and performance metrics.
 */

import express, { Request, Response } from 'express';
import { performanceMiddleware, RequestWithPerformance } from './performance-middleware';
import { performanceMonitor } from '../lib/performance';

const app = express();

// Apply performance middleware globally
app.use(performanceMiddleware);

// Example 1: Basic route with automatic performance tracking
app.get('/api/lojas', async (_req: Request, res: Response) => {
  // Performance tracking happens automatically
  // X-Response-Time header will be added
  // Request details will be logged
  
  const lojas = [
    { id: 1, nome: 'Loja A' },
    { id: 2, nome: 'Loja B' },
  ];
  
  res.json(lojas);
});

// Example 2: Route with manual query tracking
app.get('/api/equipamentos', async (req: Request, res: Response) => {
  const { requestId } = req as RequestWithPerformance;
  
  // Track database query performance
  const queryStart = Date.now();
  
  // Simulate database query
  const equipamentos = await Promise.resolve([
    { id: 1, nome: 'Equipamento 1' },
    { id: 2, nome: 'Equipamento 2' },
  ]);
  
  const queryDuration = Date.now() - queryStart;
  
  // Record query for performance monitoring
  performanceMonitor.recordQuery(
    requestId,
    'SELECT * FROM equipamentos',
    queryDuration
  );
  
  res.json(equipamentos);
});

// Example 3: Route with cache status
app.get('/api/cached-data', async (req: Request, res: Response) => {
  const { requestId } = req as RequestWithPerformance;
  
  // Check cache first
  const cached = await checkCache('data-key');
  
  if (cached) {
    // Set cache status header for logging
    res.setHeader('X-Cache-Status', 'HIT');
    return res.json(cached);
  }
  
  // Cache miss - fetch from database
  const queryStart = Date.now();
  const data = await fetchFromDatabase();
  const queryDuration = Date.now() - queryStart;
  
  performanceMonitor.recordQuery(
    requestId,
    'SELECT * FROM data',
    queryDuration
  );
  
  // Set cache status header
  res.setHeader('X-Cache-Status', 'MISS');
  
  // Store in cache for next time
  await setCache('data-key', data);
  
  res.json(data);
});

// Example 4: Route with multiple queries
app.get('/api/dashboard', async (req: Request, res: Response) => {
  const { requestId } = req as RequestWithPerformance;
  
  // Track multiple queries
  const queries = [
    { name: 'lojas', query: 'SELECT COUNT(*) FROM lojas' },
    { name: 'equipamentos', query: 'SELECT COUNT(*) FROM equipamentos' },
    { name: 'documents', query: 'SELECT COUNT(*) FROM documents' },
  ];
  
  const results: Record<string, number> = {};
  
  for (const { name, query } of queries) {
    const start = Date.now();
    results[name] = await executeQuery(query);
    const duration = Date.now() - start;
    
    performanceMonitor.recordQuery(requestId, query, duration);
  }
  
  res.json(results);
});

// Example 5: Accessing request ID for logging
app.post('/api/lojas', async (req: Request, res: Response) => {
  const { requestId, startTime } = req as RequestWithPerformance;
  
  console.log(`[${requestId}] Creating new loja at ${startTime}`);
  
  const queryStart = Date.now();
  const newLoja = await createLoja(req.body);
  const queryDuration = Date.now() - queryStart;
  
  performanceMonitor.recordQuery(
    requestId,
    'INSERT INTO lojas',
    queryDuration,
    req.body
  );
  
  console.log(`[${requestId}] Loja created successfully`);
  
  res.status(201).json(newLoja);
});

// Example 6: Error handling with performance tracking
app.get('/api/error-example', async (req: Request, res: Response) => {
  const { requestId } = req as RequestWithPerformance;
  
  try {
    const queryStart = Date.now();
    const data = await riskyOperation();
    const queryDuration = Date.now() - queryStart;
    
    performanceMonitor.recordQuery(
      requestId,
      'RISKY_OPERATION',
      queryDuration
    );
    
    res.json(data);
  } catch (error) {
    console.error(`[${requestId}] Error occurred:`, error);
    res.status(500).json({ error: 'Internal server error' });
  }
  // Performance tracking still happens even on error
});

// Helper functions (mock implementations)
async function checkCache(_key: string): Promise<unknown | null> {
  return null;
}

async function fetchFromDatabase(): Promise<unknown> {
  return { data: 'example' };
}

async function setCache(_key: string, _value: unknown): Promise<void> {
  // Cache implementation
}

async function executeQuery(_query: string): Promise<number> {
  return Math.floor(Math.random() * 100);
}

async function createLoja(_data: unknown): Promise<unknown> {
  return { id: 1, ..._data };
}

async function riskyOperation(): Promise<unknown> {
  return { result: 'success' };
}

/**
 * Expected Console Output:
 * 
 * [Request] {
 *   requestId: "550e8400-e29b-41d4-a716-446655440000",
 *   method: "GET",
 *   path: "/api/lojas",
 *   statusCode: 200,
 *   duration: "45ms",
 *   cacheStatus: "MISS",
 *   queryCount: 0,
 *   slowQueries: 0
 * }
 * 
 * [Request] {
 *   requestId: "660e8400-e29b-41d4-a716-446655440001",
 *   method: "GET",
 *   path: "/api/cached-data",
 *   statusCode: 200,
 *   duration: "12ms",
 *   cacheStatus: "HIT",
 *   queryCount: 0,
 *   slowQueries: 0
 * }
 * 
 * [Slow Query] {
 *   requestId: "770e8400-e29b-41d4-a716-446655440002",
 *   query: "SELECT * FROM equipamentos",
 *   duration: "150ms",
 *   params: undefined
 * }
 * 
 * [Request] {
 *   requestId: "770e8400-e29b-41d4-a716-446655440002",
 *   method: "GET",
 *   path: "/api/equipamentos",
 *   statusCode: 200,
 *   duration: "155ms",
 *   cacheStatus: "MISS",
 *   queryCount: 1,
 *   slowQueries: 1
 * }
 */

export { app };
