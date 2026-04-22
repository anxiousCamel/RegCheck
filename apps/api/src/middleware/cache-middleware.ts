import type { Request, Response, NextFunction } from 'express';
import { cacheService } from '../lib/cache';

export interface CacheMiddlewareOptions {
  /** Time to live in seconds (default: 300 = 5 minutes) */
  ttl?: number;
  /** Custom cache key generator function */
  keyGenerator?: (req: Request) => string;
  /** Conditional caching based on request/response */
  shouldCache?: (req: Request, res: Response) => boolean;
}

/**
 * Express middleware for automatic response caching
 * Caches GET requests and adds X-Cache header (HIT/MISS)
 */
export function cacheMiddleware(options: CacheMiddlewareOptions = {}) {
  const {
    ttl = 300,
    keyGenerator = defaultKeyGenerator,
    shouldCache = defaultShouldCache,
  } = options;

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    const cacheKey = keyGenerator(req);

    try {
      // Try to get from cache
      const cached = await cacheService.get<CachedResponse>(cacheKey);
      if (cached) {
        res.setHeader('X-Cache', 'HIT');
        res.setHeader('Content-Type', cached.contentType);
        res.status(cached.statusCode).json(cached.body);
        return;
      }
    } catch (error) {
      // Cache service error - log and continue without caching
      console.error('[Cache Middleware] Cache get failed:', error);
    }

    // Cache miss - intercept response
    res.setHeader('X-Cache', 'MISS');

    // Store original json method
    const originalJson = res.json.bind(res);

    // Override json method to cache response
    res.json = function (body: any): Response {
      // Check if we should cache this response
      if (shouldCache(req, res)) {
        const cachedResponse: CachedResponse = {
          statusCode: res.statusCode,
          body,
          contentType: res.getHeader('Content-Type') as string || 'application/json',
        };

        // Cache the response (fire and forget)
        cacheService.set(cacheKey, cachedResponse, ttl).catch((error) => {
          console.error('[Cache Middleware] Failed to cache response:', error);
        });
      }

      // Call original json method
      return originalJson(body);
    };

    next();
  };
}

interface CachedResponse {
  statusCode: number;
  body: any;
  contentType: string;
}

/**
 * Default cache key generator
 * Uses method, path, and query string
 */
function defaultKeyGenerator(req: Request): string {
  const queryString = Object.keys(req.query).length > 0
    ? ':' + JSON.stringify(req.query)
    : '';
  return `cache:${req.method}:${req.path}${queryString}`;
}

/**
 * Default conditional caching logic
 * Only cache successful responses (2xx status codes)
 */
function defaultShouldCache(req: Request, res: Response): boolean {
  return res.statusCode >= 200 && res.statusCode < 300;
}
