#!/bin/bash

# Performance Test Runner
# This script runs all performance benchmark tests

echo "=================================="
echo "Running Performance Benchmark Tests"
echo "=================================="
echo ""

echo "1. Running API Response Time Tests..."
npx vitest run src/__tests__/performance-benchmarks.test.ts

echo ""
echo "2. Running Database Query Performance Tests..."
npx vitest run src/__tests__/database-query-performance.test.ts

echo ""
echo "=================================="
echo "Performance Tests Complete"
echo "=================================="
