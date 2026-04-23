/**
 * Verification script for ERD generator
 * Writes output to a file for inspection
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { parsePrismaSchema } from './prisma-parser';
import { generateERD, generateERDCodeBlock } from './erd-generator';

try {
  // Read the actual Prisma schema
  const schemaPath = join(process.cwd(), 'packages/database/prisma/schema.prisma');
  const schemaContent = readFileSync(schemaPath, 'utf-8');

  // Parse the schema
  const schema = parsePrismaSchema(schemaContent);

  // Generate ERD
  const erd = generateERD(schema);
  const erdCodeBlock = generateERDCodeBlock(schema);

  // Write results to file
  const output = `# ERD Generator Verification

## Summary
- Models: ${schema.models.length}
- Enums: ${schema.enums.length}
- Relationships: ${schema.relationships.length}

## Generated ERD

${erdCodeBlock}

## Raw ERD Syntax

\`\`\`
${erd}
\`\`\`

## Models Found
${schema.models.map(m => `- ${m.name} (${m.fields.length} fields)`).join('\n')}

## Relationships Found
${schema.relationships.map(r => `- ${r.from} ${r.type} ${r.to}`).join('\n')}

✓ ERD generation completed successfully!
`;

  writeFileSync(join(process.cwd(), 'scripts/docs/erd-generator-output.md'), output);
  console.log('✓ Output written to scripts/docs/erd-generator-output.md');
  process.exit(0);
} catch (error) {
  console.error('✗ Error:', error);
  writeFileSync(join(process.cwd(), 'scripts/docs/erd-generator-output.md'), `# Error\n\n${error}`);
  process.exit(1);
}
