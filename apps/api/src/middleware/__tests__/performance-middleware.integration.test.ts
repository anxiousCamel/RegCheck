import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import express, { Request, Response } from 'express';
import { performanceMiddleware } from '../performance-middleware';

describe('Performance Middleware Integration', () => {
  let app: express.Application;

  beforeAll(() => {
    app = express();
    app.use(performanceMiddleware);

    // Test routes
    app.get('/api/test', (_req: Request, res: Response) => {
      res.json({ message: 'success' });
    });

    app.get('/api/slow', async (_req: Request, res: Response) => {
      // Simulate slow endpoint
      await new Promise((resolve) => setTimeout(resolve, 100));
      res.json({ message: 'slow response' });
    });

    app.get('/api/cached', (_req: Request, res: Response) => {
      // Simulate cached response
      res.setHeader('X-Cache-Status', 'HIT');
      res.json({ message: 'cached' });
    });
  });

  it('should add X-Response-Time header to responses', async () => {
    const response = await request(app).get('/api/test');

    expect(response.status).toBe(200);
    expect(response.headers['x-response-time']).toBeDefined();
    expect(response.headers['x-response-time']).toMatch(/^\d+ms$/);
  });

  it('should track response time accurately', async () => {
    const response = await request(app).get('/api/slow');

    expect(response.status).toBe(200);

    const responseTime = response.headers['x-response-time'];
    const duration = parseInt(responseTime.replace('ms', ''));

    // Should be at least 100ms due to the delay
    expect(duration).toBeGreaterThanOrEqual(100);
  });

  it('should work with cached responses', async () => {
    const response = await request(app).get('/api/cached');

    expect(response.status).toBe(200);
    expect(response.headers['x-response-time']).toBeDefined();
    expect(response.headers['x-cache-status']).toBe('HIT');
  });

  it('should handle multiple concurrent requests', async () => {
    const requests = Array.from({ length: 10 }, () => request(app).get('/api/test'));

    const responses = await Promise.all(requests);

    responses.forEach((response) => {
      expect(response.status).toBe(200);
      expect(response.headers['x-response-time']).toBeDefined();
    });
  });

  it('should not interfere with response body', async () => {
    const response = await request(app).get('/api/test');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ message: 'success' });
  });
});
