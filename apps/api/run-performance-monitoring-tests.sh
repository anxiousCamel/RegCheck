#!/bin/bash
# Run performance monitoring tests

echo "Running performance monitoring tests..."
npm test -- src/lib/__tests__/performance.test.ts src/lib/__tests__/performance-monitoring.integration.test.ts
