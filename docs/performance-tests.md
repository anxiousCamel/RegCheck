# Performance Benchmark Tests

This directory contains performance benchmark tests that verify the RegCheck API meets its performance targets.

## Test Files

### 1. `performance-benchmarks.test.ts`

Tests API endpoint response times to ensure they meet the specified targets:

- **Listing Endpoints**: < 200ms response time (Requirement 1.1)
  - GET /api/lojas
  - GET /api/setores
  - GET /api/tipos-equipamento
  - GET /api/equipamentos
  - GET /api/documents
  - GET /api/templates

- **Detail Endpoints**: < 150ms response time (Requirement 1.2)
  - GET /api/lojas/:id
  - GET /api/equipamentos/:id
  - GET /api/documents/:id
  - GET /api/templates/:id

- **Concurrent Request Performance**
  - Tests 10 concurrent listing requests
  - Tests 10 concurrent detail requests
  - Verifies each request meets individual time targets

- **Response Validation**
  - Verifies pagination metadata is included
  - Verifies pageSize parameter is respected
  - Verifies max pageSize of 100 is enforced

### 2. `database-query-performance.test.ts`

Tests database query execution times to ensure optimal performance:

- **Query Execution Time**: < 50ms (Requirement 5.5)
  - Tests all service layer methods
  - Measures query construction and execution overhead
  - Validates concurrent query performance

- **Query Optimization Patterns**
  - Verifies `select` is used instead of `include`
  - Verifies eager loading prevents N+1 queries
  - Verifies pagination limits result sets
  - Verifies max page size enforcement

- **Index Usage Verification**
  - Verifies indexed columns in WHERE clauses
  - Verifies indexed columns in ORDER BY
  - Validates query optimization strategies

- **Query Result Size**
  - Verifies minimal fields in list queries
  - Verifies complete fields in detail queries
  - Validates efficient data transfer

## Running the Tests

### Run all performance tests:
```bash
npm test src/__tests__/performance-benchmarks.test.ts
npm test src/__tests__/database-query-performance.test.ts
```

### Run specific test suite:
```bash
npx vitest run src/__tests__/performance-benchmarks.test.ts
```

### Run in watch mode:
```bash
npx vitest src/__tests__/performance-benchmarks.test.ts
```

## Performance Targets

| Metric | Target | Requirement |
|--------|--------|-------------|
| Listing API Response | < 200ms | 1.1 |
| Detail API Response | < 150ms | 1.2 |
| Database Query Execution | < 50ms | 5.5 |
| Max Page Size | 100 items | 5.2 |

## Test Approach

These tests use **mocked services** to measure:
1. **API layer overhead**: Express routing, middleware, serialization
2. **Service layer overhead**: Business logic, cache checks
3. **Query construction overhead**: Prisma query building

### Why Mocked Tests?

The performance benchmark tests use mocked services for several reasons:

1. **Consistency**: Eliminates database variability (network latency, disk I/O, concurrent load)
2. **Speed**: Tests run quickly without database setup/teardown
3. **Isolation**: Tests measure application code performance, not database performance
4. **CI/CD Friendly**: No database infrastructure required

### Integration Testing

For **real database performance testing**, see:
- `src/services/__tests__/*-optimization.test.ts` - Query optimization tests with real Prisma
- `src/services/__tests__/*-cache.integration.test.ts` - Cache integration tests with real Redis

These integration tests verify:
- Actual database query execution times
- Real cache hit/miss behavior
- Actual network overhead
- Database index effectiveness

## Interpreting Results

### If Tests Fail

**API Response Time Failures**:
- Check middleware overhead (logging, caching, validation)
- Review service layer complexity
- Verify mocks are properly configured
- Check for synchronous blocking operations

**Database Query Time Failures**:
- Review Prisma query construction
- Verify select/include usage
- Check for N+1 query patterns
- Validate pagination implementation

**Concurrent Request Failures**:
- Check for blocking operations
- Review async/await patterns
- Verify no shared mutable state
- Check for resource contention

### Performance Regression

If tests that previously passed start failing:
1. Review recent code changes
2. Check for added middleware
3. Verify no new synchronous operations
4. Review service layer complexity
5. Check for increased data serialization

## Best Practices

1. **Run tests before commits**: Catch performance regressions early
2. **Monitor trends**: Track test execution times over time
3. **Update targets**: Adjust targets as requirements evolve
4. **Add new tests**: Cover new endpoints and features
5. **Document changes**: Note why targets were adjusted

## Related Documentation

- [Design Document](../../../../.kiro/specs/page-load-optimization/design.md)
- [Requirements](../../../../.kiro/specs/page-load-optimization/requirements.md)
- [Tasks](../../../../.kiro/specs/page-load-optimization/tasks.md)
- [Cache Integration Tests](../services/__tests__/CACHE_INTEGRATION_TESTS.md)

## Troubleshooting

### Tests are flaky
- Increase timeout values if running on slow hardware
- Check for race conditions in concurrent tests
- Verify mocks are properly reset between tests

### Tests pass but production is slow
- Run integration tests with real database
- Check production database indexes
- Verify Redis cache is working
- Review production middleware configuration
- Check network latency between services

### Need to adjust targets
- Document the reason for adjustment
- Update requirements document
- Get stakeholder approval
- Update all related tests
