#!/bin/bash
# Simple test runner for cache integration tests

echo "Running cache integration tests..."
npx vitest run src/services/__tests__/services-cache.integration.test.ts
