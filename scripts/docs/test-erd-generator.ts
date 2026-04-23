/**
 * Manual test script for ERD generator
 */

import { readFileSync } from 'fs';
import { parsePrismaSchema } from './prisma-parser';
import { generateERD, generateERDCodeBlock } from './erd-generator';

// Read the actual Prisma schema
const schemaPath = '../../packages/database/prisma/schema.prisma';
const schemaContent = readFileSync(schemaPath, 'utf-8');

// Parse the schema
console.log('Parsing Prisma schema...');
const schema = parsePrismaSchema(schemaContent);

console.log(`\nFound ${schema.models.length} models`);
console.log(`Found ${schema.enums.length} enums`);
console.log(`Found ${schema.relationships.length} relationships`);

// Generate ERD
console.log('\n=== Generated ERD ===\n');
const erd = generateERD(schema);
console.log(erd);

// Generate ERD code block
console.log('\n=== Generated ERD Code Block ===\n');
const erdCodeBlock = generateERDCodeBlock(schema);
console.log(erdCodeBlock);

console.log('\n✓ ERD generation completed successfully!');
