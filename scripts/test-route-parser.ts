#!/usr/bin/env tsx

import { parseRouteFile, groupEndpointsByResource } from './docs/route-parser';
import type { RouteParserOutput } from './docs/route-parser';
import * as path from 'path';

console.log('Testing Route Parser...\n');

// Test parsing templates route
const templatesFile = path.join(__dirname, '../apps/api/src/routes/templates.ts');
console.log(`Parsing: ${templatesFile}`);

const endpoints = parseRouteFile(templatesFile);

console.log(`\nFound ${endpoints.length} endpoints:\n`);

for (const endpoint of endpoints) {
  console.log(`${endpoint.method} ${endpoint.path}`);
  console.log(`  Description: ${endpoint.description || '(none)'}`);
  console.log(`  Parameters: ${endpoint.parameters.length}`);
  if (endpoint.requestBody) {
    console.log(
      `  Request Body: ${endpoint.requestBody.schemaName || endpoint.requestBody.contentType}`,
    );
  }
  console.log(`  Responses: ${endpoint.responses.map((r) => r.statusCode).join(', ')}`);
  console.log('');
}

// Test grouping
console.log('\n--- Testing Grouping ---\n');
const wrappedOutput: RouteParserOutput = {
  source: 'route-parser',
  generatedAt: new Date().toISOString(),
  data: endpoints,
};
const groups = groupEndpointsByResource(wrappedOutput);
console.log(`Grouped into ${groups.size} resource(s):`);
for (const [resource, eps] of groups) {
  console.log(`  ${resource}: ${eps.length} endpoints`);
}

console.log('\n✓ Route parser test completed successfully!');
