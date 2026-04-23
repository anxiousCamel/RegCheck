#!/usr/bin/env tsx
/**
 * Comprehensive test verification for Prisma parser
 * This script manually tests all the key functionality required by Task 3.3
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import {
  parsePrismaSchema,
  getModels,
  getEnums,
  getRelationships,
  getModelByName,
  getPrimaryKeys,
  getUniqueFields,
  getRelationFields,
  getDataFields,
} from './docs/prisma-parser';

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
  const model = result.models[0];
  
  assert(model.fields.find(f => f.name === 'name' && f.type === 'String') !== undefined, 'String type not parsed');
  assert(model.fields.find(f => f.name === 'count' && f.type === 'Int') !== undefined, 'Int type not parsed');
  assert(model.fields.find(f => f.name === 'active' && f.type === 'Boolean') !== undefined, 'Boolean type not parsed');
  assert(model.fields.find(f => f.name === 'metadata' && f.type === 'Json') !== undefined, 'Json type not parsed');
  assert(model.fields.find(f => f.name === 'createdAt' && f.type === 'DateTime') !== undefined, 'DateTime type not parsed');
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
  const model = result.models[0];
  
  assert(model.fields.find(f => f.name === 'price' && f.type === 'Float') !== undefined, 'Float type not parsed');
  assert(model.fields.find(f => f.name === 'amount' && f.type === 'Decimal') !== undefined, 'Decimal type not parsed');
  assert(model.fields.find(f => f.name === 'bigNum' && f.type === 'BigInt') !== undefined, 'BigInt type not parsed');
  assert(model.fields.find(f => f.name === 'binary' && f.type === 'Bytes') !== undefined, 'Bytes type not parsed');
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
  const model = result.models[0];
  
  const ageField = model.fields.find(f => f.name === 'age');
  const bioField = model.fields.find(f => f.name === 'bio');
  
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
  const model = result.models[0];
  
  const tagsField = model.fields.find(f => f.name === 'tags');
  const codesField = model.fields.find(f => f.name === 'codes');
  
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
  const model = result.models[0];
  
  const idField = model.fields.find(f => f.name === 'id');
  const emailField = model.fields.find(f => f.name === 'email');
  const createdAtField = model.fields.find(f => f.name === 'createdAt');
  
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
  
  assert(result.enums.length === 1, 'Enum not extracted');
  assert(result.enums[0].name === 'Status', 'Enum name incorrect');
  assert(result.enums[0].values.length === 3, 'Enum values count incorrect');
  assert(result.enums[0].values.includes('DRAFT'), 'DRAFT value missing');
  assert(result.enums[0].values.includes('PUBLISHED'), 'PUBLISHED value missing');
  assert(result.enums[0].values.includes('ARCHIVED'), 'ARCHIVED value missing');
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
  
  assert(result.enums.length === 2, 'Multiple enums not extracted');
  assert(result.enums[0].name === 'TemplateStatus', 'First enum name incorrect');
  assert(result.enums[1].name === 'DocumentStatus', 'Second enum name incorrect');
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
  const model = result.models[0];
  const statusField = model.fields.find(f => f.name === 'status');
  
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
  
  const userModel = result.models.find(m => m.name === 'User');
  const postModel = result.models.find(m => m.name === 'Post');
  
  const postsField = userModel?.fields.find(f => f.name === 'posts');
  assert(postsField?.isRelation === true, 'One-to-many relation not detected');
  assert(postsField?.relationTo === 'Post', 'Relation target incorrect');
  assert(postsField?.isArray === true, 'Array relation not detected');
  
  const userField = postModel?.fields.find(f => f.name === 'user');
  assert(userField?.isRelation === true, 'Many-to-one relation not detected');
  assert(userField?.relationTo === 'User', 'Reverse relation target incorrect');
  assert(userField?.relationFields?.[0] === 'userId', 'Relation fields not parsed');
  assert(userField?.relationReferences?.[0] === 'id', 'Relation references not parsed');
  
  assert(result.relationships.length > 0, 'Relationships not extracted');
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
  
  const templateModel = result.models.find(m => m.name === 'Template');
  const pdfFileField = templateModel?.fields.find(f => f.name === 'pdfFile');
  
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
  
  const templateModel = result.models.find(m => m.name === 'Template');
  const relationFields = templateModel?.fields.filter(f => f.isRelation);
  
  assert(relationFields && relationFields.length >= 3, 'Multiple relationships not detected');
  assert(relationFields?.some(f => f.relationTo === 'PdfFile'), 'PdfFile relation missing');
  assert(relationFields?.some(f => f.relationTo === 'TemplateField'), 'TemplateField relation missing');
  assert(relationFields?.some(f => f.relationTo === 'Document'), 'Document relation missing');
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
  
  const userModel = result.models.find(m => m.name === 'User');
  const profileField = userModel?.fields.find(f => f.name === 'profile');
  
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
  
  const childModel = result.models.find(m => m.name === 'Child');
  const parentField = childModel?.fields.find(f => f.name === 'parent');
  
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
  const model = result.models[0];
  const primaryKeys = getPrimaryKeys(model);
  
  assert(primaryKeys.length === 1, 'Primary key not identified');
  assert(primaryKeys[0].name === 'id', 'Primary key name incorrect');
  assert(primaryKeys[0].isPrimaryKey === true, 'isPrimaryKey flag not set');
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
  const model = result.models[0];
  const uniqueFields = getUniqueFields(model);
  
  assert(uniqueFields.length === 2, 'Unique fields not identified');
  assert(uniqueFields.some(f => f.name === 'email'), 'Email unique constraint missing');
  assert(uniqueFields.some(f => f.name === 'phone'), 'Phone unique constraint missing');
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
  const model = result.models[0];
  
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
  const model = result.models[0];
  
  assert(model.indexes.length === 2, 'Indexes not parsed');
  assert(model.indexes.some(idx => idx.includes('status')), 'Status index missing');
  assert(model.indexes.some(idx => idx.includes('createdAt')), 'CreatedAt index missing');
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
  assert(models.some(m => m.name === 'User'), 'User model missing');
  assert(models.some(m => m.name === 'Post'), 'Post model missing');
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
  assert(enums.some(e => e.name === 'Status'), 'Status enum missing');
  assert(enums.some(e => e.name === 'Priority'), 'Priority enum missing');
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
  const relationFields = getRelationFields(user);
  
  assert(relationFields.length >= 1, 'getRelationFields() count incorrect');
  assert(relationFields.some(f => f.name === 'posts'), 'Relation field not found');
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
  
  assert(dataFields.some(f => f.name === 'id'), 'Data field id missing');
  assert(dataFields.some(f => f.name === 'name'), 'Data field name missing');
  assert(dataFields.some(f => f.name === 'email'), 'Data field email missing');
  assert(!dataFields.some(f => f.name === 'posts'), 'Relation field should not be in data fields');
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
