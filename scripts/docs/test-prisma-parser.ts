/**
 * Manual test script for Prisma Parser
 * Run with: tsx scripts/docs/test-prisma-parser.ts
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import {
  parsePrismaSchema,
  getPrimaryKeys,
  getUniqueFields,
  getRelationFields,
  getDataFields,
} from './prisma-parser';

// Read the actual Prisma schema
const schemaPath = join(process.cwd(), 'packages/database/prisma/schema.prisma');
const schemaContent = readFileSync(schemaPath, 'utf-8');

console.log('🔍 Parsing Prisma schema...\n');

const schema = parsePrismaSchema(schemaContent);

console.log('📊 Models found:', schema.data.models.length);
schema.data.models.forEach((model) => {
  console.log(`  - ${model.name} (table: ${model.tableName})`);
  if (model.comment) {
    console.log(`    Comment: ${model.comment}`);
  }
  console.log(`    Fields: ${model.fields.length}`);

  const primaryKeys = getPrimaryKeys(model);
  if (primaryKeys.length > 0) {
    console.log(`    Primary keys: ${primaryKeys.map((f) => f.name).join(', ')}`);
  }

  const uniqueFields = getUniqueFields(model);
  if (uniqueFields.length > 0) {
    console.log(`    Unique fields: ${uniqueFields.map((f) => f.name).join(', ')}`);
  }

  const relationFields = getRelationFields(model);
  if (relationFields.length > 0) {
    console.log(
      `    Relations: ${relationFields.map((f) => `${f.name} -> ${f.relationTo}`).join(', ')}`,
    );
  }
});

console.log('\n📋 Enums found:', schema.data.enums.length);
schema.data.enums.forEach((enumDef) => {
  console.log(`  - ${enumDef.name}: ${enumDef.values.join(', ')}`);
});

console.log('\n🔗 Relationships found:', schema.data.relationships.length);
schema.data.relationships.forEach((rel) => {
  console.log(
    `  - ${rel.from} ${rel.type} ${rel.to} (${rel.fromField}${rel.toField ? ` -> ${rel.toField}` : ''})`,
  );
});

console.log('\n✅ Parsing completed successfully!');

// Verify expected entities
const expectedModels = [
  'PdfFile',
  'Template',
  'TemplateVersion',
  'TemplateField',
  'Document',
  'FilledField',
  'Loja',
  'Setor',
  'TipoEquipamento',
  'Equipamento',
];

const expectedEnums = ['TemplateStatus', 'DocumentStatus', 'FieldType'];

console.log('\n🧪 Verification:');
const foundModels = schema.data.models.map((m) => m.name);
const missingModels = expectedModels.filter((name) => !foundModels.includes(name));
if (missingModels.length === 0) {
  console.log('  ✓ All expected models found');
} else {
  console.log('  ✗ Missing models:', missingModels.join(', '));
}

const foundEnums = schema.data.enums.map((e) => e.name);
const missingEnums = expectedEnums.filter((name) => !foundEnums.includes(name));
if (missingEnums.length === 0) {
  console.log('  ✓ All expected enums found');
} else {
  console.log('  ✗ Missing enums:', missingEnums.join(', '));
}

// Test specific model details
console.log('\n🔬 Detailed model inspection:');

const templateModel = schema.data.models.find((m) => m.name === 'Template');
if (templateModel) {
  console.log('\n  Template model:');
  console.log(`    - Fields: ${templateModel.fields.length}`);
  console.log(`    - Data fields: ${getDataFields(templateModel).length}`);
  console.log(`    - Relation fields: ${getRelationFields(templateModel).length}`);

  const statusField = templateModel.fields.find((f) => f.name === 'status');
  if (statusField) {
    console.log(`    - status field type: ${statusField.type}`);
    console.log(`    - status default: ${statusField.defaultValue}`);
  }
}

const equipamentoModel = schema.data.models.find((m) => m.name === 'Equipamento');
if (equipamentoModel) {
  console.log('\n  Equipamento model:');
  console.log(`    - Fields: ${equipamentoModel.fields.length}`);
  const relations = getRelationFields(equipamentoModel);
  console.log(
    `    - Relations: ${relations.map((r) => `${r.name} -> ${r.relationTo}`).join(', ')}`,
  );
}

console.log('\n✨ Test completed!');
