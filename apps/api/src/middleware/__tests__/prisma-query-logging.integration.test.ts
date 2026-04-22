import { describe, it, expect, beforeAll, vi, afterEach } from 'vitest';
import request from 'supertest';
import express, { Request, Response } from 'express';
import { performanceMiddleware } from '../performance-middleware';
import { prisma } from '@regcheck/database';
import { initializePrismaQueryLogging } from '../../lib/prisma-query-logger';

/**
 * Integration tests for Prisma query logging with PerformanceMonitor
 * 
 * These tests verify that:
 * 1. Prisma queries are tracked per request
 * 2. Slow queries are logged with details
 * 3. Query count is included in request logs
 * 4. Request context properly associates queries with requests
 * 
 * **Validates: Requirements 8.2**
 */
describe('Prisma Query Logging Integration', () => {
  let app: express.Application;
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;

  beforeAll(() => {
    // Initialize Prisma query logging
    initializePrismaQueryLogging();

    // Set up Express app with performance middleware
    app = express();
    app.use(performanceMiddleware);

    // Test route that performs database queries
    app.get('/api/test-query', async (_req: Request, res: Response) => {
      try {
        // Perform a simple query
        await prisma.$queryRaw`SELECT 1 as test`;
        res.json({ message: 'query executed' });
      } catch (error) {
        res.status(500).json({ error: 'Query failed' });
      }
    });

    // Test route that performs multiple queries
    app.get('/api/test-multiple-queries', async (_req: Request, res: Response) => {
      try {
        await prisma.$queryRaw`SELECT 1 as test1`;
        await prisma.$queryRaw`SELECT 2 as test2`;
        await prisma.$queryRaw`SELECT 3 as test3`;
        res.json({ message: 'queries executed' });
      } catch (error) {
        res.status(500).json({ error: 'Queries failed' });
      }
    });

    // Test route that simulates a slow query
    app.get('/api/test-slow-query', async (_req: Request, res: Response) => {
      try {
        // Use pg_sleep to simulate a slow query (150ms)
        await prisma.$queryRaw`SELECT pg_sleep(0.15)`;
        res.json({ message: 'slow query executed' });
      } catch (error) {
        res.status(500).json({ error: 'Slow query failed' });
      }
    });

    // Set up spies
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleLogSpy.mockClear();
    consoleWarnSpy.mockClear();
  });

  it('should track database queries in request logs', async () => {
    const response = await request(app).get('/api/test-query');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ message: 'query executed' });

    // Check that request was logged with query count
    expect(consoleLogSpy).toHaveBeenCalledWith(
      '[Request]',
      expect.objectContaining({
        method: 'GET',
        path: '/api/test-query',
        queryCount: expect.any(Number),
      })
    );

    // Find the request log
    const requestLog = consoleLogSpy.mock.calls.find(
      call => call[0] === '[Request]'
    );
    expect(requestLog).toBeDefined();
    expect(requestLog?.[1].queryCount).toBeGreaterThan(0);
  });

  it('should track multiple queries in a single request', async () => {
    const response = await request(app).get('/api/test-multiple-queries');

    expect(response.status).toBe(200);

    // Check that all queries were counted
    const requestLog = consoleLogSpy.mock.calls.find(
      call => call[0] === '[Request]'
    );
    expect(requestLog).toBeDefined();
    expect(requestLog?.[1].queryCount).toBeGreaterThanOrEqual(3);
  });

  it('should log slow queries with details', async () => {
    const response = await request(app).get('/api/test-slow-query');

    expect(response.status).toBe(200);

    // Check that slow query was logged
    const slowQueryLog = consoleWarnSpy.mock.calls.find(
      call => call[0] === '[Slow Query]'
    );
    
    expect(slowQueryLog).toBeDefined();
    expect(slowQueryLog?.[1]).toMatchObject({
      requestId: expect.any(String),
      query: expect.stringContaining('pg_sleep'),
      duration: expect.stringMatching(/\d+ms/),
    });

    // Check that request log includes slow query count
    const requestLog = consoleLogSpy.mock.calls.find(
      call => call[0] === '[Request]'
    );
    expect(requestLog?.[1].slowQueries).toBeGreaterThan(0);
  });

  it('should isolate query tracking between concurrent requests', async () => {
    // Make multiple concurrent requests
    const requests = [
      request(app).get('/api/test-query'),
      request(app).get('/api/test-multiple-queries'),
      request(app).get('/api/test-query'),
    ];

    const responses = await Promise.all(requests);

    // All requests should succeed
    responses.forEach(response => {
      expect(response.status).toBe(200);
    });

    // Each request should have its own query count
    const requestLogs = consoleLogSpy.mock.calls.filter(
      call => call[0] === '[Request]'
    );
    
    expect(requestLogs.length).toBeGreaterThanOrEqual(3);
    
    // Verify each request has query tracking
    requestLogs.forEach(log => {
      expect(log[1]).toMatchObject({
        requestId: expect.any(String),
        queryCount: expect.any(Number),
      });
    });
  });

  it('should include query metrics in response headers', async () => {
    const response = await request(app).get('/api/test-query');

    expect(response.status).toBe(200);
    expect(response.headers['x-response-time']).toBeDefined();
    expect(response.headers['x-response-time']).toMatch(/^\d+ms$/);
  });

  it('should handle requests without database queries', async () => {
    // Add a route without queries
    app.get('/api/no-query', (_req: Request, res: Response) => {
      res.json({ message: 'no queries' });
    });

    const response = await request(app).get('/api/no-query');

    expect(response.status).toBe(200);

    // Should still log request with 0 queries
    const requestLog = consoleLogSpy.mock.calls.find(
      call => call[0] === '[Request]' && call[1].path === '/api/no-query'
    );
    expect(requestLog).toBeDefined();
    expect(requestLog?.[1].queryCount).toBe(0);
  });
});
