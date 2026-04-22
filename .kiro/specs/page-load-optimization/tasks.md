# Implementation Plan: Page Load Optimization

## Overview

This plan implements comprehensive performance optimization for the RegCheck application, targeting sub-second page load times. The implementation follows a layered approach: backend optimization (caching, query optimization), frontend optimization (code splitting, lazy loading), and monitoring infrastructure.

Key targets: API responses < 200ms, First Load JS < 150KB, database queries < 50ms, LCP < 2.5s.

## Tasks

- [ ] 1. Set up backend caching infrastructure
  - [x] 1.1 Create centralized cache service with Redis
    - Implement `CacheService` class in `apps/api/src/lib/cache.ts`
    - Add methods: `get`, `set`, `del`, `delPattern`, `wrap`
    - Implement graceful degradation when Redis is unavailable
    - Add generic type support for type-safe caching
    - _Requirements: 6.1, 6.5_

  - [x] 1.2 Create cache middleware for Express
    - Implement `cacheMiddleware` in `apps/api/src/middleware/cache-middleware.ts`
    - Support configurable TTL and custom key generation
    - Add `X-Cache` header to responses (HIT/MISS)
    - Implement conditional caching based on request/response
    - _Requirements: 6.1, 6.2_

  - [x] 1.3 Write unit tests for cache service
    - Test cache hit/miss scenarios
    - Test graceful degradation when Redis fails
    - Test pattern-based invalidation
    - _Requirements: 6.5_

- [ ] 2. Optimize backend service layer with caching
  - [x] 2.1 Update LojaService with Redis caching
    - Wrap `list()` method with cache (TTL: 5 minutes)
    - Wrap `getById()` method with cache (TTL: 2 minutes)
    - Invalidate cache on create/update/delete/toggleActive operations
    - Use cache key pattern: `lojas:list:page:{page}:size:{size}` and `loja:{id}`
    - _Requirements: 6.1, 6.2, 6.3_

  - [x] 2.2 Update SetorService with Redis caching
    - Wrap `list()` and `listActive()` with cache (TTL: 5 minutes)
    - Wrap `getById()` with cache (TTL: 2 minutes)
    - Invalidate cache on mutations
    - _Requirements: 6.1, 6.2, 6.3_

  - [x] 2.3 Update TipoEquipamentoService with Redis caching
    - Wrap `list()` and `listActive()` with cache (TTL: 5 minutes)
    - Wrap `getById()` with cache (TTL: 2 minutes)
    - Invalidate cache on mutations
    - _Requirements: 6.1, 6.2, 6.3_

  - [x] 2.4 Update EquipamentoService with Redis caching
    - Wrap `list()` with cache (TTL: 2 minutes, more dynamic data)
    - Wrap `getById()` with cache (TTL: 2 minutes)
    - Invalidate cache on mutations
    - _Requirements: 6.1, 6.2, 6.3_

  - [x] 2.5 Update DocumentService with Redis caching
    - Wrap `list()` with cache (TTL: 1 minute, highly dynamic)
    - Wrap `getById()` with cache (TTL: 1 minute)
    - Invalidate cache on mutations
    - _Requirements: 6.1, 6.2, 6.3_

  - [x] 2.6 Update TemplateService with Redis caching
    - Wrap `list()` with cache (TTL: 5 minutes)
    - Wrap `getById()` with cache (TTL: 2 minutes)
    - Invalidate cache on mutations
    - _Requirements: 6.1, 6.2, 6.3_

  - [x] 2.7 Write integration tests for cached services
    - Test cache hit/miss behavior
    - Test cache invalidation on mutations
    - Test graceful degradation
    - _Requirements: 6.3, 6.5_

- [x] 3. Checkpoint - Verify backend caching works
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 4. Optimize database queries and add indexes
  - [x] 4.1 Create database migration for performance indexes
    - Add index on `Equipamento(tipoId, lojaId)`
    - Add index on `Equipamento(setorId)`
    - Add index on `Equipamento(numeroEquipamento)`
    - Add index on `Document(templateId)`
    - Add index on `Document(status)`
    - Add index on `Document(createdAt DESC)`
    - Add index on `Template(status)`
    - Add index on `Template(createdAt DESC)`
    - Add index on `Field(templateId)`
    - _Requirements: 5.1_

  - [x] 4.2 Optimize EquipamentoService queries
    - Add Prisma `select` to return only necessary fields in `list()`
    - Use eager loading with `include` for loja, setor, tipo relations
    - Ensure single query with JOINs (no N+1)
    - Implement pagination with max 100 items per page
    - _Requirements: 1.5, 5.2, 5.3, 5.4_

  - [x] 4.3 Optimize DocumentService queries
    - Add Prisma `select` for necessary fields only
    - Use eager loading for template relation
    - Optimize `getById()` to include fields and filledFields efficiently
    - _Requirements: 1.5, 5.3, 5.4_

  - [x] 4.4 Optimize TemplateService queries
    - Add Prisma `select` for list view (exclude heavy fields)
    - Use eager loading for fields relation in `getById()`
    - Ensure single query for template with all fields
    - _Requirements: 1.5, 5.3, 5.4_

  - [x] 4.5 Write performance benchmark tests
    - Test API response times < 200ms for listings
    - Test API response times < 150ms for detail views
    - Test database query execution < 50ms
    - _Requirements: 1.1, 1.2, 5.5_

- [ ] 5. Implement backend performance monitoring
  - [x] 5.1 Create performance monitoring service
    - Implement `PerformanceMonitor` in `apps/api/src/lib/performance.ts`
    - Track request duration, query count, slow queries
    - Log slow queries (> 100ms) with details
    - _Requirements: 8.1, 8.2_

  - [x] 5.2 Add performance middleware to Express
    - Create middleware to track request start time
    - Add `X-Response-Time` header to all responses
    - Log requests with duration and cache status
    - _Requirements: 8.1_

  - [x] 5.3 Add Prisma query logging
    - Configure Prisma to emit query events
    - Log slow queries with duration and parameters
    - Track query count per request
    - _Requirements: 8.2_

  - [x] 5.4 Write tests for performance monitoring
    - Test slow query detection
    - Test request duration tracking
    - _Requirements: 8.1, 8.2_

- [ ] 6. Checkpoint - Verify backend optimizations
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 7. Optimize frontend React Query configuration
  - [x] 7.1 Update React Query configuration in providers
    - Update `apps/web/src/app/providers.tsx`
    - Set `staleTime: 60000` (1 minute) for relatively static data
    - Set `cacheTime: 300000` (5 minutes)
    - Set `refetchOnWindowFocus: false`
    - Set `retry: 1`
    - _Requirements: 3.3, 3.4_

  - [ ] 7.2 Create query configuration utilities
    - Create `apps/web/src/lib/query-config.ts`
    - Export query configs for different data types (static vs dynamic)
    - Add helper for parallel queries
    - _Requirements: 3.4, 3.5_

  - [ ] 7.3 Create prefetch utilities
    - Create `apps/web/src/lib/prefetch.ts`
    - Implement `usePrefetch` hook for hover/focus prefetching
    - Add prefetch helpers for common routes
    - _Requirements: 3.2_

  - [ ] 7.4 Write unit tests for query utilities
    - Test query configuration
    - Test prefetch behavior
    - _Requirements: 3.2, 3.4_

- [ ] 8. Implement frontend code splitting and lazy loading
  - [x] 8.1 Lazy load PDF viewer component
    - Update PDF viewer imports to use `next/dynamic`
    - Add loading skeleton component
    - Set `ssr: false` for client-only rendering
    - Apply to document fill page and any PDF preview components
    - _Requirements: 2.4, 2.5_

  - [x] 8.2 Lazy load template editor (Konva)
    - Update template editor imports to use `next/dynamic`
    - Add loading skeleton component
    - Set `ssr: false` for client-only rendering
    - Apply to editor page
    - _Requirements: 2.4, 2.5_

  - [x] 8.3 Lazy load OCR functionality (Tesseract.js)
    - Wrap Tesseract imports in dynamic import
    - Load only when OCR feature is triggered
    - Add loading indicator
    - _Requirements: 2.4, 2.5_

  - [ ] 8.4 Implement dynamic imports for modals and dialogs
    - Convert modal components to lazy loaded
    - Convert dialog components to lazy loaded
    - Add loading states
    - _Requirements: 2.5_

  - [ ] 8.5 Verify bundle size targets
    - Run `next build` and analyze bundle
    - Verify First Load JS < 150KB
    - Verify heavy libraries are in separate chunks
    - _Requirements: 2.3_

- [ ] 9. Optimize frontend images and assets
  - [ ] 9.1 Update image components to use Next.js Image
    - Replace `<img>` tags with `<Image>` from `next/image`
    - Add appropriate sizes and quality settings
    - Implement lazy loading for below-fold images
    - Add blur placeholders
    - _Requirements: 4.1, 4.2, 4.5_

  - [ ] 9.2 Configure static asset caching
    - Update `next.config.js` with cache headers
    - Set long-term caching for hashed assets (1 year)
    - Configure image optimization settings
    - _Requirements: 4.3, 4.4_

- [ ] 10. Implement Web Vitals monitoring
  - [x] 10.1 Create performance monitoring utility
    - Create `apps/web/src/lib/performance-monitor.ts`
    - Implement `reportWebVitals` function
    - Track LCP, FID, CLS, TTFB, FCP
    - Log to console in development
    - _Requirements: 8.3, 8.4_

  - [x] 10.2 Integrate Web Vitals in app layout
    - Update `apps/web/src/app/layout.tsx`
    - Call `reportWebVitals` for all metrics
    - Add non-blocking analytics reporting
    - _Requirements: 8.3, 8.4, 8.5_

  - [ ] 10.3 Write Web Vitals tests
    - Test LCP < 2.5s
    - Test FID < 100ms
    - Test CLS < 0.1
    - _Requirements: 8.3_

- [ ] 11. Optimize CSS and styling
  - [ ] 11.1 Configure Tailwind CSS purge
    - Verify `tailwind.config.js` has correct content paths
    - Ensure unused classes are purged in production
    - _Requirements: 10.1_

  - [ ] 11.2 Optimize critical CSS
    - Ensure Tailwind generates minimal critical CSS
    - Verify no large CSS-in-JS runtime overhead
    - _Requirements: 10.2, 10.4_

- [ ] 12. Implement bundle analysis and optimization
  - [ ] 12.1 Set up bundle analyzer
    - Install `@next/bundle-analyzer`
    - Configure in `next.config.js`
    - _Requirements: 9.4_

  - [ ] 12.2 Optimize imports and tree shaking
    - Review and optimize library imports (use named imports)
    - Replace heavy libraries with lighter alternatives if found
    - Ensure tree shaking is working correctly
    - _Requirements: 9.1, 9.2, 9.3, 9.5_

  - [ ] 12.3 Analyze and verify bundle size
    - Run bundle analyzer
    - Verify no unexpected large dependencies
    - Document bundle composition
    - _Requirements: 9.4_

- [ ] 13. Optimize page rendering strategy
  - [ ] 13.1 Review and optimize page rendering modes
    - Identify pages suitable for SSR vs CSR
    - Implement Server Components where appropriate
    - Use `loading.tsx` for streaming SSR
    - _Requirements: 7.1, 7.2_

  - [ ] 13.2 Implement skeleton loading states
    - Create skeleton components for listings
    - Create skeleton components for detail views
    - Add to all major pages
    - _Requirements: 3.1_

  - [ ] 13.3 Optimize data fetching patterns
    - Move critical data fetching to server components where possible
    - Implement parallel data fetching
    - Minimize client-side useEffect data fetching
    - _Requirements: 7.4, 3.5_

- [ ] 14. Final integration and testing
  - [ ] 14.1 Run full performance benchmark suite
    - Test all API endpoints for response time targets
    - Test all pages for Web Vitals targets
    - Test cache hit rates
    - _Requirements: 1.1, 1.2, 5.5, 8.3_

  - [ ] 14.2 Run load tests
    - Execute k6 load tests with 50 concurrent users
    - Verify 95th percentile response times meet targets
    - Verify error rate < 1%
    - _Requirements: 1.1, 1.2_

  - [ ] 14.3 Document performance improvements
    - Record before/after metrics
    - Document cache configuration
    - Document bundle size improvements
    - _Requirements: 8.1, 8.2, 8.3_

- [ ] 15. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Focus on backend optimizations first (tasks 1-6) as they provide immediate impact
- Frontend optimizations (tasks 7-13) build on backend improvements
- All code examples use TypeScript as specified in the design document
- Redis is already available in the project, no additional infrastructure setup needed
- Database indexes require a Prisma migration
- Bundle analysis should be run periodically to catch regressions
