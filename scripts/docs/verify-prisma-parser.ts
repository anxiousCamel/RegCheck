/**
 * Verification script for Prisma Parser
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { parsePrismaSchema } from './prisma-parser';

try {
  // Read the actual Prisma schema
  const schemaPath = join(process.cwd(), 'packages/database/prisma/schema.prisma');
  const schemaContent = readFileSync(schemaPath, 'utf-8');
  
  const schema = parsePrismaSchema(schemaContent);
  
  const report = {
    success: true,
    models: schema.models.map(m => ({
      name: m.name,
      tableName: m.tableName,
      comment: m.comment,
      fieldCount: m.fields.length,
      fields: m.fields.map(f => ({
        name: f.name,
        type: f.type,
        isPrimaryKey: f.isPrimaryKey,
        isUnique: f.isUnique,
        isRelation: f.isRelation,
        relationTo: f.relationTo,
      })),
    })),
    enums: schema.enums,
    relationships: schema.relationships,
  };
  
  writeFileSync(
    join(process.cwd(), 'scripts/docs/parser-test-output.json'),
    JSON.stringify(report, null, 2)
  );
  
  console.log('✅ Parser test successful! Output written to parser-test-output.json');
  console.log(`Found ${schema.models.length} models, ${schema.enums.length} enums, ${schema.relationships.length} relationships`);
  
} catch (error) {
  console.error('❌ Parser test failed:', error);
  process.exit(1);
}
