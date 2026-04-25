/**
 * Unit tests for Prisma Schema Parser
 */

import { describe, it, expect } from 'vitest';
import {
  parsePrismaSchema,
  getModels,
  getEnums,
  getModelByName,
  getPrimaryKeys,
  getUniqueFields,
  getRelationFields,
  getDataFields,
} from './prisma-parser';

describe('Prisma Schema Parser', () => {
  describe('Standardized Output Format', () => {
    it('should return ParserOutput with source, generatedAt, and data', () => {
      const schema = `
model User {
  id String @id
}
`;
      const result = parsePrismaSchema(schema);

      expect(result).toHaveProperty('source');
      expect(result).toHaveProperty('generatedAt');
      expect(result).toHaveProperty('data');

      expect(result.source).toBe('prisma-parser');
      expect(result.generatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/); // ISO timestamp
      expect(result.data).toHaveProperty('models');
      expect(result.data).toHaveProperty('enums');
      expect(result.data).toHaveProperty('relationships');
    });
  });

  describe('parseEnum', () => {
    it('should parse a simple enum', () => {
      const schema = `
enum Status {
  DRAFT
  PUBLISHED
  ARCHIVED
}
`;
      const result = parsePrismaSchema(schema);
      expect(result.data.enums).toHaveLength(1);
      expect(result.data.enums[0]!.name).toBe('Status');
      expect(result.data.enums[0]!.values).toEqual(['DRAFT', 'PUBLISHED', 'ARCHIVED']);
    });

    it('should parse multiple enums', () => {
      const schema = `
enum TemplateStatus {
  DRAFT
  PUBLISHED
}

enum DocumentStatus {
  DRAFT
  COMPLETED
}
`;
      const result = parsePrismaSchema(schema);
      expect(result.data.enums).toHaveLength(2);
      expect(result.data.enums[0]!.name).toBe('TemplateStatus');
      expect(result.data.enums[1]!.name).toBe('DocumentStatus');
    });
  });

  describe('parseModel', () => {
    it('should parse a simple model with basic fields', () => {
      const schema = `
model User {
  id    String @id @default(uuid())
  name  String
  email String @unique
  age   Int?
}
`;
      const result = parsePrismaSchema(schema);
      expect(result.data.models).toHaveLength(1);

      const model = result.data.models[0]!;
      expect(model.name).toBe('User');
      expect(model.fields).toHaveLength(4);

      // Check id field
      const idField = model.fields.find((f) => f.name === 'id');
      expect(idField).toBeDefined();
      expect(idField?.type).toBe('String');
      expect(idField?.isPrimaryKey).toBe(true);
      expect(idField?.defaultValue).toBe('uuid()');

      // Check email field
      const emailField = model.fields.find((f) => f.name === 'email');
      expect(emailField).toBeDefined();
      expect(emailField?.isUnique).toBe(true);

      // Check age field
      const ageField = model.fields.find((f) => f.name === 'age');
      expect(ageField).toBeDefined();
      expect(ageField?.isOptional).toBe(true);
    });

    it('should parse model with @@map attribute', () => {
      const schema = `
model PdfFile {
  id       String @id
  fileName String
  
  @@map("pdf_files")
}
`;
      const result = parsePrismaSchema(schema);
      const model = result.data.models[0]!;
      expect(model.name).toBe('PdfFile');
      expect(model.tableName).toBe('pdf_files');
    });

    it('should parse model with comment', () => {
      const schema = `
/// Uploaded PDF files
model PdfFile {
  id String @id
}
`;
      const result = parsePrismaSchema(schema);
      const model = result.data.models[0]!;
      expect(model.comment).toBe('Uploaded PDF files');
    });

    it('should parse array fields', () => {
      const schema = `
model User {
  id    String @id
  tags  String[]
}
`;
      const result = parsePrismaSchema(schema);
      const model = result.data.models[0]!;
      const tagsField = model.fields.find((f) => f.name === 'tags');
      expect(tagsField?.isArray).toBe(true);
      expect(tagsField?.type).toBe('String');
    });

    it('should parse DateTime and Json types', () => {
      const schema = `
model Document {
  id        String   @id
  metadata  Json
  createdAt DateTime @default(now())
}
`;
      const result = parsePrismaSchema(schema);
      const model = result.data.models[0]!;

      const metadataField = model.fields.find((f) => f.name === 'metadata');
      expect(metadataField?.type).toBe('Json');
      expect(metadataField?.isRelation).toBe(false);

      const createdAtField = model.fields.find((f) => f.name === 'createdAt');
      expect(createdAtField?.type).toBe('DateTime');
      expect(createdAtField?.defaultValue).toBe('now()');
    });
  });

  describe('parseRelationships', () => {
    it('should parse one-to-many relationship', () => {
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

      // Check relation fields
      const userModel = result.data.models.find((m) => m.name === 'User');
      const postsField = userModel?.fields.find((f) => f.name === 'posts');
      expect(postsField?.isRelation).toBe(true);
      expect(postsField?.relationTo).toBe('Post');
      expect(postsField?.isArray).toBe(true);

      const postModel = result.data.models.find((m) => m.name === 'Post');
      const userField = postModel?.fields.find((f) => f.name === 'user');
      expect(userField?.isRelation).toBe(true);
      expect(userField?.relationTo).toBe('User');
      expect(userField?.relationFields).toEqual(['userId']);
      expect(userField?.relationReferences).toEqual(['id']);

      // Check extracted relationships
      expect(result.data.relationships.length).toBeGreaterThan(0);
      const relationship = result.data.relationships.find(
        (r) => (r.from === 'User' && r.to === 'Post') || (r.from === 'Post' && r.to === 'User'),
      );
      expect(relationship).toBeDefined();
    });

    it('should parse multiple relationships', () => {
      const schema = `
model Template {
  id        String @id
  pdfFileId String
  pdfFile   PdfFile @relation(fields: [pdfFileId], references: [id])
  fields    TemplateField[]
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
`;
      const result = parsePrismaSchema(schema);
      expect(result.data.relationships.length).toBeGreaterThan(0);

      // Should have relationships between Template-PdfFile and Template-TemplateField
      const templatePdfRelation = result.data.relationships.find(
        (r) =>
          (r.from === 'Template' && r.to === 'PdfFile') ||
          (r.from === 'PdfFile' && r.to === 'Template'),
      );
      expect(templatePdfRelation).toBeDefined();

      const templateFieldRelation = result.data.relationships.find(
        (r) =>
          (r.from === 'Template' && r.to === 'TemplateField') ||
          (r.from === 'TemplateField' && r.to === 'Template'),
      );
      expect(templateFieldRelation).toBeDefined();
    });
  });

  describe('helper functions', () => {
    const schema = `
model User {
  id       String @id @default(uuid())
  email    String @unique
  name     String
  age      Int?
  posts    Post[]
  profile  Profile?
}

model Post {
  id     String @id
  userId String
  user   User   @relation(fields: [userId], references: [id])
}

model Profile {
  id     String @id
  userId String @unique
  user   User   @relation(fields: [userId], references: [id])
}

enum Status {
  ACTIVE
  INACTIVE
}
`;

    it('should get all models', () => {
      const result = parsePrismaSchema(schema);
      const models = getModels(result);
      expect(models).toHaveLength(3);
      expect(models.map((m) => m.name)).toEqual(['User', 'Post', 'Profile']);
    });

    it('should get all enums', () => {
      const result = parsePrismaSchema(schema);
      const enums = getEnums(result);
      expect(enums).toHaveLength(1);
      expect(enums[0]!.name).toBe('Status');
    });

    it('should get model by name', () => {
      const result = parsePrismaSchema(schema);
      const user = getModelByName(result, 'User');
      expect(user).toBeDefined();
      expect(user?.name).toBe('User');

      const notFound = getModelByName(result, 'NonExistent');
      expect(notFound).toBeUndefined();
    });

    it('should get primary keys', () => {
      const result = parsePrismaSchema(schema);
      const user = getModelByName(result, 'User')!;
      const primaryKeys = getPrimaryKeys(user);
      expect(primaryKeys).toHaveLength(1);
      expect(primaryKeys[0]!.name).toBe('id');
    });

    it('should get unique fields', () => {
      const result = parsePrismaSchema(schema);
      const user = getModelByName(result, 'User')!;
      const uniqueFields = getUniqueFields(user);
      expect(uniqueFields).toHaveLength(1);
      expect(uniqueFields[0]!.name).toBe('email');
    });

    it('should get relation fields', () => {
      const result = parsePrismaSchema(schema);
      const user = getModelByName(result, 'User')!;
      const relationFields = getRelationFields(user);
      expect(relationFields.length).toBeGreaterThanOrEqual(1);
      expect(relationFields.some((f) => f.name === 'posts')).toBe(true);
    });

    it('should get data fields (non-relation)', () => {
      const result = parsePrismaSchema(schema);
      const user = getModelByName(result, 'User')!;
      const dataFields = getDataFields(user);
      expect(dataFields.some((f) => f.name === 'id')).toBe(true);
      expect(dataFields.some((f) => f.name === 'email')).toBe(true);
      expect(dataFields.some((f) => f.name === 'name')).toBe(true);
      expect(dataFields.some((f) => f.name === 'posts')).toBe(false); // posts is a relation
    });
  });

  describe('edge cases', () => {
    it('should handle empty schema', () => {
      const schema = '';
      const result = parsePrismaSchema(schema);
      expect(result.data.models).toHaveLength(0);
      expect(result.data.enums).toHaveLength(0);
      expect(result.data.relationships).toHaveLength(0);
    });

    it('should handle schema with only comments', () => {
      const schema = `
// This is a comment
/// This is a doc comment
`;
      const result = parsePrismaSchema(schema);
      expect(result.data.models).toHaveLength(0);
      expect(result.data.enums).toHaveLength(0);
    });

    it('should handle model with @@index attributes', () => {
      const schema = `
model User {
  id    String @id
  email String
  name  String
  
  @@index([email])
  @@index([name, email])
}
`;
      const result = parsePrismaSchema(schema);
      const model = result.data.models[0]!;
      expect(model.indexes).toHaveLength(2);
    });

    it('should handle @updatedAt attribute', () => {
      const schema = `
model User {
  id        String   @id
  updatedAt DateTime @updatedAt
}
`;
      const result = parsePrismaSchema(schema);
      const model = result.data.models[0]!;
      const updatedAtField = model.fields.find((f) => f.name === 'updatedAt');
      expect(updatedAtField).toBeDefined();
      expect(updatedAtField?.type).toBe('DateTime');
    });
  });

  describe('comprehensive field type coverage', () => {
    it('should parse all common Prisma field types', () => {
      const schema = `
model ComplexModel {
  id        String   @id @default(uuid())
  name      String
  count     Int
  price     Float
  active    Boolean
  data      Json
  binary    Bytes
  amount    Decimal
  bigNum    BigInt
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
`;
      const result = parsePrismaSchema(schema);
      const model = result.data.models[0]!;

      expect(model.fields.find((f) => f.name === 'name' && f.type === 'String')).toBeDefined();
      expect(model.fields.find((f) => f.name === 'count' && f.type === 'Int')).toBeDefined();
      expect(model.fields.find((f) => f.name === 'price' && f.type === 'Float')).toBeDefined();
      expect(model.fields.find((f) => f.name === 'active' && f.type === 'Boolean')).toBeDefined();
      expect(model.fields.find((f) => f.name === 'data' && f.type === 'Json')).toBeDefined();
      expect(model.fields.find((f) => f.name === 'binary' && f.type === 'Bytes')).toBeDefined();
      expect(model.fields.find((f) => f.name === 'amount' && f.type === 'Decimal')).toBeDefined();
      expect(model.fields.find((f) => f.name === 'bigNum' && f.type === 'BigInt')).toBeDefined();
      expect(
        model.fields.find((f) => f.name === 'createdAt' && f.type === 'DateTime'),
      ).toBeDefined();
      expect(
        model.fields.find((f) => f.name === 'updatedAt' && f.type === 'DateTime'),
      ).toBeDefined();
    });

    it('should parse enum fields correctly', () => {
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
      const model = result.data.models[0]!;
      const statusField = model.fields.find((f) => f.name === 'status');

      expect(statusField).toBeDefined();
      expect(statusField?.type).toBe('Status');
      expect(statusField?.isRelation).toBe(false);
      expect(statusField?.defaultValue).toBe('ACTIVE');
    });

    it('should parse optional enum fields', () => {
      const schema = `
enum Priority {
  LOW
  MEDIUM
  HIGH
}

model Task {
  id       String    @id
  priority Priority?
}
`;
      const result = parsePrismaSchema(schema);
      const model = result.data.models[0]!;
      const priorityField = model.fields.find((f) => f.name === 'priority');

      expect(priorityField).toBeDefined();
      expect(priorityField?.type).toBe('Priority');
      expect(priorityField?.isOptional).toBe(true);
      expect(priorityField?.isRelation).toBe(false);
    });
  });

  describe('complex relationship scenarios', () => {
    it('should parse cascade delete relationships', () => {
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
      const childModel = result.data.models.find((m) => m.name === 'Child');
      const parentField = childModel?.fields.find((f) => f.name === 'parent');

      expect(parentField?.isRelation).toBe(true);
      expect(parentField?.relationTo).toBe('Parent');
      expect(parentField?.relationFields).toEqual(['parentId']);
      expect(parentField?.relationReferences).toEqual(['id']);
    });

    it('should parse self-referential relationships', () => {
      const schema = `
model Category {
  id       String     @id
  parentId String?
  parent   Category?  @relation("CategoryTree", fields: [parentId], references: [id])
  children Category[] @relation("CategoryTree")
}
`;
      const result = parsePrismaSchema(schema);
      const model = result.data.models[0]!;

      const parentField = model.fields.find((f) => f.name === 'parent');
      expect(parentField?.isRelation).toBe(true);
      expect(parentField?.relationTo).toBe('Category');
      expect(parentField?.isOptional).toBe(true);

      const childrenField = model.fields.find((f) => f.name === 'children');
      expect(childrenField?.isRelation).toBe(true);
      expect(childrenField?.relationTo).toBe('Category');
      expect(childrenField?.isArray).toBe(true);
    });

    it('should parse multiple relationships to same model', () => {
      const schema = `
model User {
  id            String    @id
  createdPosts  Post[]    @relation("PostAuthor")
  reviewedPosts Post[]    @relation("PostReviewer")
}

model Post {
  id         String @id
  authorId   String
  author     User   @relation("PostAuthor", fields: [authorId], references: [id])
  reviewerId String?
  reviewer   User?  @relation("PostReviewer", fields: [reviewerId], references: [id])
}
`;
      const result = parsePrismaSchema(schema);

      const userModel = result.data.models.find((m) => m.name === 'User');
      expect(userModel?.fields.filter((f) => f.isRelation)).toHaveLength(2);

      const postModel = result.data.models.find((m) => m.name === 'Post');
      const authorField = postModel?.fields.find((f) => f.name === 'author');
      const reviewerField = postModel?.fields.find((f) => f.name === 'reviewer');

      expect(authorField?.relationTo).toBe('User');
      expect(reviewerField?.relationTo).toBe('User');
      expect(reviewerField?.isOptional).toBe(true);
    });
  });

  describe('index and constraint parsing', () => {
    it('should parse @@unique constraints', () => {
      const schema = `
model User {
  id    String @id
  email String
  phone String
  
  @@unique([email, phone])
}
`;
      const result = parsePrismaSchema(schema);
      const model = result.data.models[0]!;
      expect(model.indexes.some((idx) => idx.includes('@@unique'))).toBe(true);
    });

    it('should parse multiple @@index attributes', () => {
      const schema = `
model Document {
  id        String @id
  status    String
  createdAt DateTime
  userId    String
  
  @@index([status])
  @@index([userId])
  @@index([createdAt(sort: Desc)])
  @@index([status, userId])
}
`;
      const result = parsePrismaSchema(schema);
      const model = result.data.models[0]!;
      expect(model.indexes).toHaveLength(4);
    });
  });
});
