#!/usr/bin/env tsx
/**
 * Manual verification of comprehensive edge case tests for route parser
 * This script manually tests all the edge cases that were added to the test suite
 */

import { parseRouteFile } from './docs/route-parser';
import * as path from 'path';

console.log('='.repeat(80));
console.log('COMPREHENSIVE EDGE CASE VERIFICATION FOR ROUTE PARSER');
console.log('='.repeat(80));
console.log();

let passedTests = 0;
let failedTests = 0;

function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`✓ ${name}`);
    passedTests++;
  } catch (error) {
    console.log(`✗ ${name}`);
    console.log(`  Error: ${error instanceof Error ? error.message : String(error)}`);
    failedTests++;
  }
}

// Test files
const templatesFile = path.join(__dirname, '../apps/api/src/routes/templates.ts');
const documentsFile = path.join(__dirname, '../apps/api/src/routes/documents.ts');
const uploadsFile = path.join(__dirname, '../apps/api/src/routes/uploads.ts');

console.log('Edge Case 1: Multiple path parameters in single route');
console.log('-'.repeat(80));
test('Should extract all path parameters from complex routes', () => {
  const endpoints = parseRouteFile(documentsFile);
  const populate = endpoints.find(e => e.path === '/:id/populate');
  if (!populate) throw new Error('/:id/populate not found');
  if (!populate.parameters.some(p => p.name === 'id' && p.location === 'path' && p.required)) {
    throw new Error('Path parameter :id not properly extracted');
  }
});
console.log();

console.log('Edge Case 2: Query parameter extraction edge cases');
console.log('-'.repeat(80));
test('Should extract query parameters from req.query access', () => {
  const endpoints = parseRouteFile(uploadsFile);
  const presigned = endpoints.find(e => e.path === '/presigned');
  if (!presigned) throw new Error('/presigned not found');
  if (!presigned.parameters.some(p => p.name === 'key' && p.location === 'query')) {
    throw new Error('Query parameter key not extracted');
  }
});

test('Should handle query parameters with type casting', () => {
  const endpoints = parseRouteFile(uploadsFile);
  const fileDownload = endpoints.find(e => e.path === '/file');
  if (!fileDownload) throw new Error('/file not found');
  if (!fileDownload.parameters.some(p => p.name === 'key' && p.location === 'query')) {
    throw new Error('Query parameter key not extracted from /file');
  }
});
console.log();

console.log('Edge Case 3: JSDoc comment extraction');
console.log('-'.repeat(80));
test('Should extract description from JSDoc comments', () => {
  const endpoints = parseRouteFile(templatesFile);
  const list = endpoints.find(e => e.method === 'GET' && e.path === '/');
  if (!list) throw new Error('GET / not found');
  if (!list.description || !list.description.toLowerCase().includes('list')) {
    throw new Error(`Expected description with "list", got: ${list.description}`);
  }
});

test('Should extract description from multi-line JSDoc', () => {
  const endpoints = parseRouteFile(documentsFile);
  const deleteEndpoint = endpoints.find(e => e.method === 'DELETE' && e.path === '/:id');
  if (!deleteEndpoint) throw new Error('DELETE /:id not found');
  if (!deleteEndpoint.description) {
    throw new Error('Expected description from multi-line JSDoc');
  }
});

test('Should handle routes without JSDoc comments', () => {
  const endpoints = parseRouteFile(uploadsFile);
  const restore = endpoints.find(e => e.path === '/restore');
  if (!restore) throw new Error('/restore not found');
  if (typeof restore.description !== 'string') {
    throw new Error('Description should be a string even if empty');
  }
});
console.log();

console.log('Edge Case 4: Response status code extraction');
console.log('-'.repeat(80));
test('Should detect explicit 201 status for POST endpoints', () => {
  const endpoints = parseRouteFile(templatesFile);
  const create = endpoints.find(e => e.method === 'POST' && e.path === '/');
  if (!create) throw new Error('POST / not found');
  if (!create.responses.some(r => r.statusCode === 201)) {
    throw new Error('201 status not detected');
  }
});

test('Should detect 204 status for DELETE with .end()', () => {
  const endpoints = parseRouteFile(documentsFile);
  const deleteEndpoint = endpoints.find(e => e.method === 'DELETE' && e.path === '/:id');
  if (!deleteEndpoint) throw new Error('DELETE /:id not found');
  if (!deleteEndpoint.responses.some(r => r.statusCode === 204)) {
    throw new Error('204 status not detected from .end()');
  }
});

test('Should detect 400 error responses from error codes', () => {
  const endpoints = parseRouteFile(templatesFile);
  const create = endpoints.find(e => e.method === 'POST' && e.path === '/');
  if (!create) throw new Error('POST / not found');
  if (!create.responses.some(r => r.statusCode === 400)) {
    throw new Error('400 status not detected from error codes');
  }
});

test('Should detect 404 responses for routes with :id parameter', () => {
  const endpoints = parseRouteFile(templatesFile);
  const getById = endpoints.find(e => e.method === 'GET' && e.path === '/:id');
  if (!getById) throw new Error('GET /:id not found');
  if (!getById.responses.some(r => r.statusCode === 404)) {
    throw new Error('404 status not inferred from :id parameter');
  }
});

test('Should handle routes without explicit status codes', () => {
  const endpoints = parseRouteFile(templatesFile);
  const list = endpoints.find(e => e.method === 'GET' && e.path === '/');
  if (!list) throw new Error('GET / not found');
  if (!list.responses.some(r => r.statusCode === 200)) {
    throw new Error('200 status not defaulted for GET');
  }
});
console.log();

console.log('Edge Case 5: Request body schema extraction');
console.log('-'.repeat(80));
test('Should extract Zod schema names from parse calls', () => {
  const endpoints = parseRouteFile(templatesFile);
  const create = endpoints.find(e => e.method === 'POST' && e.path === '/');
  if (!create) throw new Error('POST / not found');
  if (create.requestBody?.schemaName !== 'createTemplateSchema') {
    throw new Error(`Expected createTemplateSchema, got ${create.requestBody?.schemaName}`);
  }
});

test('Should detect multipart/form-data from req.file usage', () => {
  const endpoints = parseRouteFile(uploadsFile);
  const uploadPdf = endpoints.find(e => e.path === '/pdf' && e.method === 'POST');
  if (!uploadPdf) throw new Error('POST /pdf not found');
  if (uploadPdf.requestBody?.contentType !== 'multipart/form-data') {
    throw new Error(`Expected multipart/form-data, got ${uploadPdf.requestBody?.contentType}`);
  }
});

test('Should handle routes without request body', () => {
  const endpoints = parseRouteFile(templatesFile);
  const list = endpoints.find(e => e.method === 'GET' && e.path === '/');
  if (!list) throw new Error('GET / not found');
  if (list.requestBody !== undefined) {
    throw new Error('GET / should not have request body');
  }
});
console.log();

console.log('Edge Case 6: Complex endpoint patterns');
console.log('-'.repeat(80));
test('Should handle nested action routes like /:id/populate', () => {
  const endpoints = parseRouteFile(documentsFile);
  const populate = endpoints.find(e => e.path === '/:id/populate');
  if (!populate) throw new Error('/:id/populate not found');
  if (populate.method !== 'POST') throw new Error('Expected POST method');
  if (populate.requestBody?.schemaName !== 'populateDocumentSchema') {
    throw new Error(`Expected populateDocumentSchema, got ${populate.requestBody?.schemaName}`);
  }
});

test('Should handle multiple nested action routes on same resource', () => {
  const endpoints = parseRouteFile(documentsFile);
  const actions = endpoints.filter(e => e.path.includes('/:id/'));
  if (actions.length < 3) {
    throw new Error(`Expected at least 3 action routes, found ${actions.length}`);
  }
  const actionPaths = actions.map(e => e.path);
  const requiredPaths = ['/:id/populate', '/:id/fill', '/:id/generate', '/:id/status', '/:id/download'];
  for (const required of requiredPaths) {
    if (!actionPaths.includes(required)) {
      throw new Error(`Missing required action path: ${required}`);
    }
  }
});

test('Should correctly extract all endpoints from a complex route file', () => {
  const endpoints = parseRouteFile(documentsFile);
  if (endpoints.length < 8) {
    throw new Error(`Expected at least 8 endpoints, found ${endpoints.length}`);
  }
  const methods = endpoints.map(e => e.method);
  const requiredMethods = ['GET', 'POST', 'PATCH', 'DELETE'];
  for (const method of requiredMethods) {
    if (!methods.includes(method)) {
      throw new Error(`Missing required method: ${method}`);
    }
  }
});
console.log();

console.log('Edge Case 7: Error handling and edge cases');
console.log('-'.repeat(80));
test('Should handle routes with complex error handling logic', () => {
  const endpoints = parseRouteFile(documentsFile);
  const download = endpoints.find(e => e.path === '/:id/download');
  if (!download) throw new Error('/:id/download not found');
  if (!download.responses.some(r => r.statusCode === 400)) {
    throw new Error('400 status not detected from PDF_NOT_GENERATED error');
  }
});

test('Should handle routes with conditional status updates', () => {
  const endpoints = parseRouteFile(documentsFile);
  const status = endpoints.find(e => e.path === '/:id/status');
  if (!status) throw new Error('/:id/status not found');
  if (status.method !== 'GET') throw new Error('Expected GET method');
  if (!status.parameters.some(p => p.name === 'id' && p.location === 'path')) {
    throw new Error('Path parameter :id not extracted');
  }
});
console.log();

console.log('Edge Case 8: Pagination and filtering');
console.log('-'.repeat(80));
test('Should extract pagination parameters from all list endpoints', () => {
  const endpoints = parseRouteFile(templatesFile);
  const list = endpoints.find(e => e.method === 'GET' && e.path === '/');
  if (!list) throw new Error('GET / not found');
  if (!list.parameters.some(p => p.name === 'page' && p.location === 'query' && !p.required)) {
    throw new Error('Pagination parameter page not extracted correctly');
  }
  if (!list.parameters.some(p => p.name === 'pageSize' && p.location === 'query' && !p.required)) {
    throw new Error('Pagination parameter pageSize not extracted correctly');
  }
});
console.log();

console.log('Edge Case 9: Multiple routes with same path but different methods');
console.log('-'.repeat(80));
test('Should distinguish between GET and DELETE on same path', () => {
  const endpoints = parseRouteFile(documentsFile);
  const idRoutes = endpoints.filter(e => e.path === '/:id');
  if (idRoutes.length < 2) {
    throw new Error(`Expected at least 2 routes on /:id, found ${idRoutes.length}`);
  }
  const methods = idRoutes.map(e => e.method);
  const requiredMethods = ['GET', 'DELETE', 'PATCH'];
  for (const method of requiredMethods) {
    if (!methods.includes(method)) {
      throw new Error(`Missing required method ${method} on /:id`);
    }
  }
});
console.log();

console.log('Edge Case 10: External Zod validation schemas');
console.log('-'.repeat(80));
test('Should extract imported Zod schema names', () => {
  const endpoints = parseRouteFile(templatesFile);
  const create = endpoints.find(e => e.method === 'POST' && e.path === '/');
  if (!create) throw new Error('POST / not found');
  // createTemplateSchema is imported from @regcheck/validators
  if (create.requestBody?.schemaName !== 'createTemplateSchema') {
    throw new Error('Failed to extract imported schema name');
  }
});

test('Should extract multiple different schema names', () => {
  const endpoints = parseRouteFile(documentsFile);
  const schemaNames = endpoints
    .map(e => e.requestBody?.schemaName)
    .filter(Boolean);
  const uniqueSchemas = new Set(schemaNames);
  if (uniqueSchemas.size < 3) {
    throw new Error(`Expected at least 3 different schemas, found ${uniqueSchemas.size}`);
  }
});
console.log();

console.log('='.repeat(80));
console.log(`RESULTS: ${passedTests} passed, ${failedTests} failed`);
console.log('='.repeat(80));

if (failedTests > 0) {
  console.log('\n❌ Some tests failed');
  process.exit(1);
} else {
  console.log('\n✅ All comprehensive edge case tests passed!');
  console.log('\nThe route parser correctly handles:');
  console.log('  ✓ Multiple path parameters in single route');
  console.log('  ✓ Query parameter extraction edge cases');
  console.log('  ✓ JSDoc comment extraction (single-line, multi-line, missing)');
  console.log('  ✓ Response status code extraction (explicit and inferred)');
  console.log('  ✓ Request body schema extraction (Zod and multipart)');
  console.log('  ✓ Complex endpoint patterns (nested actions)');
  console.log('  ✓ Error handling and edge cases');
  console.log('  ✓ Pagination and filtering');
  console.log('  ✓ Multiple routes with same path but different methods');
  console.log('  ✓ External Zod validation schemas');
  process.exit(0);
}
