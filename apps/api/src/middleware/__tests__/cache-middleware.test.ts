import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { cacheMiddleware } from '../cache-middleware';
import { cacheService } from '../../lib/cache';

// Mock the cache service
vi.mock('../../lib/cache', () => ({
  cacheService: {
    get: vi.fn(),
    set: vi.fn(),
  },
}));

describe('cacheMiddleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;
  let jsonSpy: ReturnType<typeof vi.fn>;
  let statusSpy: ReturnType<typeof vi.fn>;
  let setHeaderSpy: ReturnType<typeof vi.fn>;
  let getHeaderSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();

    jsonSpy = vi.fn().mockReturnThis();
    statusSpy = vi.fn().mockReturnThis();
    setHeaderSpy = vi.fn();
    getHeaderSpy = vi.fn().mockReturnValue('application/json');

    mockReq = {
      method: 'GET',
      path: '/api/lojas',
      query: {},
    };

    mockRes = {
      json: jsonSpy,
      status: statusSpy,
      setHeader: setHeaderSpy,
      getHeader: getHeaderSpy,
      statusCode: 200,
    };

    mockNext = vi.fn();
  });

  it('should only cache GET requests', async () => {
    mockReq.method = 'POST';
    const middleware = cacheMiddleware();

    await middleware(mockReq as Request, mockRes as Response, mockNext);

    expect(mockNext).toHaveBeenCalled();
    expect(cacheService.get).not.toHaveBeenCalled();
  });

  it('should return cached response with X-Cache: HIT header', async () => {
    const cachedData = {
      statusCode: 200,
      body: { data: 'cached' },
      contentType: 'application/json',
    };

    vi.mocked(cacheService.get).mockResolvedValue(cachedData);

    const middleware = cacheMiddleware();
    await middleware(mockReq as Request, mockRes as Response, mockNext);

    expect(cacheService.get).toHaveBeenCalledWith('cache:GET:/api/lojas');
    expect(setHeaderSpy).toHaveBeenCalledWith('X-Cache', 'HIT');
    expect(setHeaderSpy).toHaveBeenCalledWith('Content-Type', 'application/json');
    expect(statusSpy).toHaveBeenCalledWith(200);
    expect(jsonSpy).toHaveBeenCalledWith({ data: 'cached' });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should set X-Cache: MISS header on cache miss', async () => {
    vi.mocked(cacheService.get).mockResolvedValue(null);

    const middleware = cacheMiddleware();
    await middleware(mockReq as Request, mockRes as Response, mockNext);

    expect(setHeaderSpy).toHaveBeenCalledWith('X-Cache', 'MISS');
    expect(mockNext).toHaveBeenCalled();
  });

  it('should cache response on cache miss', async () => {
    vi.mocked(cacheService.get).mockResolvedValue(null);
    vi.mocked(cacheService.set).mockResolvedValue();

    const middleware = cacheMiddleware({ ttl: 600 });
    await middleware(mockReq as Request, mockRes as Response, mockNext);

    // Simulate response being sent
    const overriddenJson = mockRes.json as any;
    const responseBody = { data: 'fresh' };
    overriddenJson(responseBody);

    expect(cacheService.set).toHaveBeenCalledWith(
      'cache:GET:/api/lojas',
      {
        statusCode: 200,
        body: responseBody,
        contentType: 'application/json',
      },
      600,
    );
  });

  it('should use custom key generator', async () => {
    vi.mocked(cacheService.get).mockResolvedValue(null);

    const customKeyGenerator = (req: Request) => `custom:${req.path}`;
    const middleware = cacheMiddleware({ keyGenerator: customKeyGenerator });

    await middleware(mockReq as Request, mockRes as Response, mockNext);

    expect(cacheService.get).toHaveBeenCalledWith('custom:/api/lojas');
  });

  it('should include query parameters in default cache key', async () => {
    mockReq.query = { page: '1', pageSize: '50' };
    vi.mocked(cacheService.get).mockResolvedValue(null);

    const middleware = cacheMiddleware();
    await middleware(mockReq as Request, mockRes as Response, mockNext);

    expect(cacheService.get).toHaveBeenCalledWith(
      'cache:GET:/api/lojas:{"page":"1","pageSize":"50"}',
    );
  });

  it('should not cache when shouldCache returns false', async () => {
    vi.mocked(cacheService.get).mockResolvedValue(null);
    vi.mocked(cacheService.set).mockResolvedValue();

    const shouldCache = () => false;
    const middleware = cacheMiddleware({ shouldCache });

    await middleware(mockReq as Request, mockRes as Response, mockNext);

    // Simulate response being sent
    const overriddenJson = mockRes.json as any;
    overriddenJson({ data: 'fresh' });

    expect(cacheService.set).not.toHaveBeenCalled();
  });

  it('should only cache successful responses by default', async () => {
    vi.mocked(cacheService.get).mockResolvedValue(null);
    vi.mocked(cacheService.set).mockResolvedValue();

    const middleware = cacheMiddleware();
    await middleware(mockReq as Request, mockRes as Response, mockNext);

    // Simulate error response
    mockRes.statusCode = 500;
    const overriddenJson = mockRes.json as any;
    overriddenJson({ error: 'Internal error' });

    expect(cacheService.set).not.toHaveBeenCalled();
  });

  it('should handle cache service errors gracefully', async () => {
    vi.mocked(cacheService.get).mockRejectedValue(new Error('Redis error'));

    const middleware = cacheMiddleware();

    // Should not throw
    await expect(
      middleware(mockReq as Request, mockRes as Response, mockNext),
    ).resolves.not.toThrow();

    expect(mockNext).toHaveBeenCalled();
  });

  it('should use custom TTL', async () => {
    vi.mocked(cacheService.get).mockResolvedValue(null);
    vi.mocked(cacheService.set).mockResolvedValue();

    const middleware = cacheMiddleware({ ttl: 120 });
    await middleware(mockReq as Request, mockRes as Response, mockNext);

    // Simulate response being sent
    const overriddenJson = mockRes.json as any;
    overriddenJson({ data: 'fresh' });

    expect(cacheService.set).toHaveBeenCalledWith(expect.any(String), expect.any(Object), 120);
  });
});
