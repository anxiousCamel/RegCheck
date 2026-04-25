#!/usr/bin/env tsx
/**
 * Comprehensive test verification for Prisma parser
 * This script manually tests all the key functionality required by Task 3.3
 */

import {
  parsePrismaSchema,
  getModels,
  getEnums,
  getModelByName,
  getPrimaryKeys,
  getUniqueFields,
  getRelationFields,
  getDataFields,
} from './docs/prisma-parser';
import type { PrismaField, PrismaModel } from './docs/prisma-parser';

console.log('='.repeat(70));
console.log('PRISMA PARSER COMPREHENSIVE TEST VERIFICATION');
console.log('Task 3.3: Write unit tests for Prisma parser');
console.log('='.repeat(70));
console.log();

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function test(description: string, fn: () => void) {
  totalTests++;
  try {
    fn();
    console.log(`✓ ${description}`);
    passedTests++;
  } catch (error) {
    console.log(`✗ ${description}`);
    console.log(`  Error: ${error instanceof Error ? error.message : String(error)}`);
    failedTests++;
  }
}

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

function getFirstModel(result: ReturnType<typeof parsePrismaSchema>): PrismaModel {
  const model = result.data.models[0];
  if (!model) throw new Error('No models found in parse result');
  return model;
}

console.log('TEST CATEGORY: Model Extraction with Various Field Types');
console.log('-'.repeat(70));

test('Parse String, Int, Boolean, DateTime, Json field types', () => {
  const schema = `
model Document {
  id        String   @id
  name      String
  count     Int
  active    Boolean
  metadata  Json
  createdAt DateTime @default(now())
}
`;
  const result = parsePrismaSchema(schema);
  const model = getFirstModel(result);

  assert(
    model.fields.find((f: PrismaField) => f.name === 'name' && f.type === 'String') !== undefined,
    'String type not parsed',
  );
  assert(
    model.fields.find((f: PrismaField) => f.name === 'count' && f.type === 'Int') !== undefined,
    'Int type not parsed',
  );
  assert(
    model.fields.find((f: PrismaField) => f.name === 'active' && f.type === 'Boolean') !== undefined,
    'Boolean type not parsed',
  );
  assert(
    model.fields.find((f: PrismaField) => f.name === 'metadata' && f.type === 'Json') !== undefined,
    'Json type not parsed',
  );
  assert(
    model.fields.find((f: PrismaField) => f.name === 'createdAt' && f.type === 'DateTime') !== undefined,
    'DateTime type not parsed',
  );
});

test('Parse Float, Decimal, BigInt, Bytes field types', () => {
  const schema = `
model ComplexModel {
  id     String  @id
  price  Float
  amount Decimal
  bigNum BigInt
  binary Bytes
}
`;
  const result = parsePrismaSchema(schema);
  const model = getFirstModel(result);

  assert(
    model.fields.find((f: PrismaField) => f.name === 'price' && f.type === 'Float') !== undefined,
    'Float type not parsed',
  );
  assert(
    model.fields.find((f: PrismaField) => f.name === 'amount' && f.type === 'Decimal') !== undefined,
    'Decimal type not parsed',
  );
  assert(
    model.fields.find((f: PrismaField) => f.name === 'bigNum' && f.type === 'BigInt') !== undefined,
    'BigInt type not parsed',
  );
  assert(
    model.fields.find((f: PrismaField) => f.name === 'binary' && f.type === 'Bytes') !== undefined,
    'Bytes type not parsed',
  );
});

test('Parse optional fields (with ? modifier)', () => {
  const schema = `
model User {
  id    String  @id
  name  String
  age   Int?
  bio   String?
}
`;
  const result = parsePrismaSchema(schema);
  const model = getFirstModel(result);

  const ageField = model.fields.find((f: PrismaField) => f.name === 'age');
  const bioField = model.fields.find((f: PrismaField) => f.name === 'bio');

  assert(ageField?.isOptional === true, 'Optional Int field not detected');
  assert(bioField?.isOptional === true, 'Optional String field not detected');
});

test('Parse array fields (with [] modifier)', () => {
  const schema = `
model User {
  id    String   @id
  tags  String[]
  codes Int[]
}
`;
  const result = parsePrismaSchema(schema);
  const model = getFirstModel(result);

  const tagsField = model.fields.find((f: PrismaField) => f.name === 'tags');
  const codesField = model.fields.find((f: PrismaField) => f.name === 'codes');

  assert(tagsField?.isArray === true && tagsField?.type === 'String', 'String array not parsed');
  assert(codesField?.isArray === true && codesField?.type === 'Int', 'Int array not parsed');
});

test('Parse field attributes (@default, @unique, @updatedAt)', () => {
  const schema = `
model User {
  id        String   @id @default(uuid())
  email     String   @unique
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
`;
  const result = parsePrismaSchema(schema);
  const model = getFirstModel(result);

  const idField = model.fields.find((f: PrismaField) => f.name === 'id');
  const emailField = model.fields.find((f: PrismaField) => f.name === 'email');
  const createdAtField = model.fields.find((f: PrismaField) => f.name === 'createdAt');

  assert(idField?.defaultValue === 'uuid()', '@default(uuid()) not parsed');
  assert(emailField?.isUnique === true, '@unique not detected');
  assert(createdAtField?.defaultValue === 'now()', '@default(now()) not parsed');
});

console.log();
console.log('TEST CATEGORY: Enum Extraction');
console.log('-'.repeat(70));

test('Parse simple enum with multiple values', () => {
  const schema = `
enum Status {
  DRAFT
  PUBLISHED
  ARCHIVED
}
`;
  const result = parsePrismaSchema(schema);
  const firstEnum = result.data.enums[0];
  if (!firstEnum) throw new Error('No enums found');

  assert(result.data.enums.length === 1, 'Enum not extracted');
  assert(firstEnum.name === 'Status', 'Enum name incorrect');
  assert(firstEnum.values.length === 3, 'Enum values count incorrect');
  assert(firstEnum.values.includes('DRAFT'), 'DRAFT value missing');
  assert(firstEnum.values.includes('PUBLISHED'), 'PUBLISHED value missing');
  assert(firstEnum.values.includes('ARCHIVED'), 'ARCHIVED value missing');
});

test('Parse multiple enums', () => {
  const schema = `
enum TemplateStatus {
  DRAFT
  PUBLISHED
}

enum DocumentStatus {
  DRAFT
  COMPLETED
  GENERATED
}
`;
  const result = parsePrismaSchema(schema);
  const first = result.data.enums[0];
  const second = result.data.enums[1];
  if (!first || !second) throw new Error('Expected 2 enums');

  assert(result.data.enums.length === 2, 'Multiple enums not extracted');
  assert(first.name === 'TemplateStatus', 'First enum name incorrect');
  assert(second.name === 'DocumentStatus', 'Second enum name incorrect');
});

test('Parse enum field in model', () => {
  const schema = `
enum Status {
  ACTIVE
  INACTIVE
}

model User {
  id     String @id
  status Status @default(ACTIVE)
}
`;
  const result = parsePrismaSchema(schema);
  const model = getFirstModel(result);
  const statusField = model.fields.find((f: PrismaField) => f.name === 'status');

  assert(statusField?.type === 'Status', 'Enum field type not parsed');
  assert(statusField?.isRelation === false, 'Enum field incorrectly marked as relation');
  assert(statusField?.defaultValue === 'ACTIVE', 'Enum default value not parsed');
});

console.log();
console.log('TEST CATEGORY: Relationship Detection');
console.log('-'.repeat(70));

test('Parse one-to-many relationship', () => {
  const schema = `
model User {
  id    String @id
  posts Post[]
}

model Post {
  id     String @id
  userId String
  user   User   @relation(fields: [userId], references: [id])
}
`;
  const result = parsePrismaSchema(schema);

  const userModel = result.data.models.find((m: PrismaModel) => m.name === 'User');
  const postModel = result.data.models.find((m: PrismaModel) => m.name === 'Post');

  const postsField = userModel?.fields.find((f: PrismaField) => f.name === 'posts');
  assert(postsField?.isRelation === true, 'One-to-many relation not detected');
  assert(postsField?.relationTo === 'Post', 'Relation target incorrect');
  assert(postsField?.isArray === true, 'Array relation not detected');

  const userField = postModel?.fields.find((f: PrismaField) => f.name === 'user');
  assert(userField?.isRelation === true, 'Many-to-one relation not detected');
  assert(userField?.relationTo === 'User', 'Reverse relation target incorrect');
  assert(userField?.relationFields?.[0] === 'userId', 'Relation fields not parsed');
  assert(userField?.relationReferences?.[0] === 'id', 'Relation references not parsed');

  assert(result.data.relationships.length > 0, 'Relationships not extracted');
});

test('Parse many-to-one relationship', () => {
  const schema = `
model Template {
  id        String @id
  pdfFileId String
  pdfFile   PdfFile @relation(fields: [pdfFileId], references: [id])
}

model PdfFile {
  id        String @id
  templates Template[]
}
`;
  const result = parsePrismaSchema(schema);

  const templateModel = result.data.models.find((m: PrismaModel) => m.name === 'Template');
  const pdfFileField = templateModel?.fields.find((f: PrismaField) => f.name === 'pdfFile');

  assert(pdfFileField?.isRelation === true, 'Many-to-one relation not detected');
  assert(pdfFileField?.relationTo === 'PdfFile', 'Relation target incorrect');
  assert(pdfFileField?.relationFields?.[0] === 'pdfFileId', 'Foreign key field not parsed');
  assert(pdfFileField?.relationReferences?.[0] === 'id', 'Referenced field not parsed');
});

test('Parse multiple relationships on same model', () => {
  const schema = `
model Template {
  id        String @id
  pdfFileId String
  pdfFile   PdfFile @relation(fields: [pdfFileId], references: [id])
  fields    TemplateField[]
  documents Document[]
}

model PdfFile {
  id        String @id
  templates Template[]
}

model TemplateField {
  id         String @id
  templateId String
  template   Template @relation(fields: [templateId], references: [id])
}

model Document {
  id         String @id
  templateId String
  template   Template @relation(fields: [templateId], references: [id])
}
`;
  const result = parsePrismaSchema(schema);

  const templateModel = result.data.models.find((m: PrismaModel) => m.name === 'Template');
  if (!templateModel) throw new Error('Template model not found');
  const relationFieldsList = templateModel.fields.filter((f: PrismaField) => f.isRelation);

  assert(relationFieldsList.length >= 3, 'Multiple relationships not detected');
  assert(
    relationFieldsList.some((f: PrismaField) => f.relationTo === 'PdfFile'),
    'PdfFile relation missing',
  );
  assert(
    relationFieldsList.some((f: PrismaField) => f.relationTo === 'TemplateField'),
    'TemplateField relation missing',
  );
  assert(
    relationFieldsList.some((f: PrismaField) => f.relationTo === 'Document'),
    'Document relation missing',
  );
});

test('Parse optional relationship', () => {
  const schema = `
model User {
  id      String   @id
  profile Profile?
}

model Profile {
  id     String @id
  userId String @unique
  user   User   @relation(fields: [userId], references: [id])
}
`;
  const result = parsePrismaSchema(schema);

  const userModel = result.data.models.find((m: PrismaModel) => m.name === 'User');
  const profileField = userModel?.fields.find((f: PrismaField) => f.name === 'profile');

  assert(profileField?.isRelation === true, 'Optional relation not detected');
  assert(profileField?.isOptional === true, 'Optional modifier not detected on relation');
});

test('Parse cascade delete relationship', () => {
  const schema = `
model Parent {
  id       String  @id
  children Child[]
}

model Child {
  id       String @id
  parentId String
  parent   Parent @relation(fields: [parentId], references: [id], onDelete: Cascade)
}
`;
  const result = parsePrismaSchema(schema);

  const childModel = result.data.models.find((m: PrismaModel) => m.name === 'Child');
  const parentField = childModel?.fields.find((f: PrismaField) => f.name === 'parent');

  assert(parentField?.isRelation === true, 'Cascade relation not detected');
  assert(parentField?.relationTo === 'Parent', 'Cascade relation target incorrect');
});

console.log();
console.log('TEST CATEGORY: Primary Key Identification');
console.log('-'.repeat(70));

test('Identify @id primary key', () => {
  const schema = `
model User {
  id    String @id @default(uuid())
  name  String
  email String
}
`;
  const result = parsePrismaSchema(schema);
  const model = getFirstModel(result);
  const primaryKeys = getPrimaryKeys(model);

  assert(primaryKeys.length === 1, 'Primary key not identified');
  const pk = primaryKeys[0];
  if (!pk) throw new Error('Primary key not found');
  assert(pk.name === 'id', 'Primary key name incorrect');
  assert(pk.isPrimaryKey === true, 'isPrimaryKey flag not set');
});

test('Identify unique constraints with @unique', () => {
  const schema = `
model User {
  id    String @id
  email String @unique
  phone String @unique
}
`;
  const result = parsePrismaSchema(schema);
  const model = getFirstModel(result);
  const uniqueFields = getUniqueFields(model);

  assert(uniqueFields.length === 2, 'Unique fields not identified');
  assert(
    uniqueFields.some((f: PrismaField) => f.name === 'email'),
    'Email unique constraint missing',
  );
  assert(
    uniqueFields.some((f: PrismaField) => f.name === 'phone'),
    'Phone unique constraint missing',
  );
});

test('Parse @@map table name attribute', () => {
  const schema = `
model PdfFile {
  id       String @id
  fileName String
  
  @@map("pdf_files")
}
`;
  const result = parsePrismaSchema(schema);
  const model = getFirstModel(result);

  assert(model.name === 'PdfFile', 'Model name incorrect');
  assert(model.tableName === 'pdf_files', '@@map table name not parsed');
});

test('Parse @@index attributes', () => {
  const schema = `
model Document {
  id        String @id
  status    String
  createdAt DateTime
  
  @@index([status])
  @@index([createdAt])
}
`;
  const result = parsePrismaSchema(schema);
  const model = getFirstModel(result);

  assert(model.indexes.length === 2, 'Indexes not parsed');
  assert(
    model.indexes.some((idx: string) => idx.includes('status')),
    'Status index missing',
  );
  assert(
    model.indexes.some((idx: string) => idx.includes('createdAt')),
    'CreatedAt index missing',
  );
});

console.log();
console.log('TEST CATEGORY: Helper Functions');
console.log('-'.repeat(70));

test('getModels() returns all models', () => {
  const schema = `
model User {
  id String @id
}

model Post {
  id String @id
}
`;
  const result = parsePrismaSchema(schema);
  const models = getModels(result);

  assert(models.length === 2, 'getModels() count incorrect');
  assert(
    models.some((m: PrismaModel) => m.name === 'User'),
    'User model missing',
  );
  assert(
    models.some((m: PrismaModel) => m.name === 'Post'),
    'Post model missing',
  );
});

test('getEnums() returns all enums', () => {
  const schema = `
enum Status {
  ACTIVE
}

enum Priority {
  LOW
  HIGH
}
`;
  const result = parsePrismaSchema(schema);
  const enums = getEnums(result);

  assert(enums.length === 2, 'getEnums() count incorrect');
  assert(
    enums.some((e) => e.name === 'Status'),
    'Status enum missing',
  );
  assert(
    enums.some((e) => e.name === 'Priority'),
    'Priority enum missing',
  );
});

test('getModelByName() finds specific model', () => {
  const schema = `
model User {
  id String @id
}

model Post {
  id String @id
}
`;
  const result = parsePrismaSchema(schema);
  const user = getModelByName(result, 'User');
  const notFound = getModelByName(result, 'NonExistent');

  assert(user !== undefined, 'getModelByName() failed to find model');
  assert(user?.name === 'User', 'getModelByName() returned wrong model');
  assert(notFound === undefined, 'getModelByName() should return undefined for non-existent model');
});

test('getRelationFields() filters relation fields', () => {
  const schema = `
model User {
  id    String @id
  name  String
  posts Post[]
}

model Post {
  id     String @id
  userId String
  user   User   @relation(fields: [userId], references: [id])
}
`;
  const result = parsePrismaSchema(schema);
  const user = getModelByName(result, 'User')!;
  const relFields = getRelationFields(user);

  assert(relFields.length >= 1, 'getRelationFields() count incorrect');
  assert(
    relFields.some((f: PrismaField) => f.name === 'posts'),
    'Relation field not found',
  );
});

test('getDataFields() filters non-relation fields', () => {
  const schema = `
model User {
  id    String @id
  name  String
  email String
  posts Post[]
}

model Post {
  id     String @id
  userId String
  user   User   @relation(fields: [userId], references: [id])
}
`;
  const result = parsePrismaSchema(schema);
  const user = getModelByName(result, 'User')!;
  const dataFields = getDataFields(user);

  assert(
    dataFields.some((f: PrismaField) => f.name === 'id'),
    'Data field id missing',
  );
  assert(
    dataFields.some((f: PrismaField) => f.name === 'name'),
    'Data field name missing',
  );
  assert(
    dataFields.some((f: PrismaField) => f.name === 'email'),
    'Data field email missing',
  );
  assert(
    !dataFields.some((f: PrismaField) => f.name === 'posts'),
    'Relation field should not be in data fields',
  );
});

console.log();
console.log('='.repeat(70));
console.log('TEST SUMMARY');
console.log('='.repeat(70));
console.log(`Total tests:  ${totalTests}`);
console.log(`Passed:       ${passedTests} ✓`);
console.log(`Failed:       ${failedTests} ✗`);
console.log(`Success rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
console.log('='.repeat(70));

if (failedTests > 0) {
  console.log('\n❌ Some tests failed. Please review the errors above.');
  process.exit(1);
} else {
  console.log('\n✅ All tests passed! The Prisma parser is working correctly.');
  console.log('\nTask 3.3 Requirements Coverage:');
  console.log('  ✓ Test model extraction with various field types');
  console.log('  ✓ Test enum extraction');
  console.log('  ✓ Test relationship detection (one-to-many, many-to-one)');
  console.log('  ✓ Test primary key identification');
  console.log('  ✓ Requirements 4.2, 4.4, 4.5 validated');
  process.exit(0);
}
