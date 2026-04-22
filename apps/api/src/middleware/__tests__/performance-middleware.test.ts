import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { performanceMiddleware, RequestWithPerformance } from '../performance-middleware';
import { performanceMonitor } from '../../lib/performance';

// Mock the performance monitor
vi.mock('../../lib/performance', () => ({
  performanceMonitor: {
    startRequest: vi.fn(),
    endRequest: vi.fn(),
  },
}));

describe('Performance Middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;
  let finishCallback: () => void;

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockReq = {
      method: 'GET',
      path: '/api/lojas',
    };

    mockRes = {
      on: vi.fn((event: string, callback: () => void) => {
        if (event === 'finish') {
          finishCallback = callback;
        }
        return mockRes as Response;
      }),
      setHeader: vi.fn(),
      getHeader: vi.fn(),
    };

    mockNext = vi.fn();
  });

  it('should add requestId and startTime to request', () => {
    performanceMiddleware(
      mockReq as Request,
      mockRes as Response,
      mockNext
    );

    const req = mockReq as RequestWithPerformance;
    expect(req.requestId).toBeDefined();
    expect(typeof req.requestId).toBe('string');
    expect(req.startTime).toBeDefined();
    expect(typeof req.startTime).toBe('number');
  });

  it('should call performanceMonitor.startRequest', () => {
    performanceMiddleware(
      mockReq as Request,
      mockRes as Response,
      mockNext
    );

    expect(performanceMonitor.startRequest).toHaveBeenCalledWith(
      expect.any(String),
      'GET',
      '/api/lojas'
    );
  });

  it('should call next middleware', () => {
    performanceMiddleware(
      mockReq as Request,
      mockRes as Response,
      mockNext
    );

    expect(mockNext).toHaveBeenCalled();
  });

  it('should add X-Response-Time header on response finish', () => {
    performanceMiddleware(
      mockReq as Request,
      mockRes as Response,
      mockNext
    );

    // Simulate response finish
    finishCallback();

    expect(mockRes.setHeader).toHaveBeenCalledWith(
      'X-Response-Time',
      expect.stringMatching(/^\d+ms$/)
    );
  });

  it('should call performanceMonitor.endRequest on finish', () => {
    const req = mockReq as RequestWithPerformance;
    
    performanceMiddleware(
      mockReq as Request,
      mockRes as Response,
      mockNext
    );

    const requestId = req.requestId;

    // Simulate response finish
    finishCallback();

    expect(performanceMonitor.endRequest).toHaveBeenCalledWith(requestId);
  });

  it('should log request details with cache status', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    
    (mockRes.getHeader as ReturnType<typeof vi.fn>).mockReturnValue('HIT');
    (performanceMonitor.endRequest as ReturnType<typeof vi.fn>).mockReturnValue({
      queryCount: 2,
      slowQueries: [],
    });

    performanceMiddleware(
      mockReq as Request,
      mockRes as Response,
      mockNext
    );

    // Simulate response finish
    finishCallback();

    expect(consoleSpy).toHaveBeenCalledWith(
      '[Request]',
      expect.objectContaining({
        method: 'GET',
        path: '/api/lojas',
        cacheStatus: 'HIT',
        queryCount: 2,
        slowQueries: 0,
      })
    );

    consoleSpy.mockRestore();
  });

  it('should default cache status to MISS if not set', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    
    (mockRes.getHeader as ReturnType<typeof vi.fn>).mockReturnValue(undefined);
    (performanceMonitor.endRequest as ReturnType<typeof vi.fn>).mockReturnValue({
      queryCount: 0,
      slowQueries: [],
    });

    performanceMiddleware(
      mockReq as Request,
      mockRes as Response,
      mockNext
    );

    // Simulate response finish
    finishCallback();

    expect(consoleSpy).toHaveBeenCalledWith(
      '[Request]',
      expect.objectContaining({
        cacheStatus: 'MISS',
      })
    );

    consoleSpy.mockRestore();
  });

  it('should log warning for slow requests (> 500ms)', async () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    
    (performanceMonitor.endRequest as ReturnType<typeof vi.fn>).mockReturnValue({
      queryCount: 5,
      slowQueries: [{ query: 'SELECT * FROM lojas', duration: 150 }],
    });

    performanceMiddleware(
      mockReq as Request,
      mockRes as Response,
      mockNext
    );

    // Wait to ensure duration > 500ms
    await new Promise(resolve => setTimeout(resolve, 550));

    // Simulate response finish
    finishCallback();

    expect(consoleSpy).toHaveBeenCalledWith(
      '[Slow Request]',
      expect.objectContaining({
        method: 'GET',
        path: '/api/lojas',
        queryCount: 5,
      })
    );

    consoleSpy.mockRestore();
  });

  it('should handle missing performance metrics gracefully', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    
    (performanceMonitor.endRequest as ReturnType<typeof vi.fn>).mockReturnValue(null);

    performanceMiddleware(
      mockReq as Request,
      mockRes as Response,
      mockNext
    );

    // Simulate response finish
    finishCallback();

    expect(consoleSpy).toHaveBeenCalledWith(
      '[Request]',
      expect.objectContaining({
        queryCount: 0,
        slowQueries: 0,
      })
    );

    consoleSpy.mockRestore();
  });
});
