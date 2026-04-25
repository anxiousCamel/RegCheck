/**
 * Unit tests for ERD Generator
 */

import { describe, it, expect } from 'vitest';
import { generateERD, generateERDCodeBlock, generatePartialERD } from './erd-generator';
import type { PrismaParserOutput, PrismaSchema } from './prisma-parser';

/** Helper to wrap a PrismaSchema in PrismaParserOutput format */
function wrapSchema(schema: PrismaSchema): PrismaParserOutput {
  return {
    source: 'prisma-parser',
    generatedAt: new Date().toISOString(),
    data: schema,
  };
}

describe('ERD Generator', () => {
  describe('generateERD', () => {
    it('should generate basic ERD with single entity', () => {
      const input = wrapSchema({
        models: [
          {
            name: 'User',
            tableName: 'users',
            fields: [
              {
                name: 'id',
                type: 'String',
                isArray: false,
                isOptional: false,
                isPrimaryKey: true,
                isUnique: false,
                isRelation: false,
                attributes: ['@id'],
              },
              {
                name: 'email',
                type: 'String',
                isArray: false,
                isOptional: false,
                isPrimaryKey: false,
                isUnique: true,
                isRelation: false,
                attributes: ['@unique'],
              },
            ],
            indexes: [],
          },
        ],
        enums: [],
        relationships: [],
      });

      const result = generateERD(input);

      expect(result).toContain('erDiagram');
      expect(result).toContain('User {');
      expect(result).toContain('string id PK');
      expect(result).toContain('string email');
      expect(result).not.toContain('email PK');
    });

    it('should generate ERD with multiple entities', () => {
      const input = wrapSchema({
        models: [
          {
            name: 'User',
            tableName: 'users',
            fields: [
              {
                name: 'id',
                type: 'String',
                isArray: false,
                isOptional: false,
                isPrimaryKey: true,
                isUnique: false,
                isRelation: false,
                attributes: ['@id'],
              },
            ],
            indexes: [],
          },
          {
            name: 'Post',
            tableName: 'posts',
            fields: [
              {
                name: 'id',
                type: 'String',
                isArray: false,
                isOptional: false,
                isPrimaryKey: true,
                isUnique: false,
                isRelation: false,
                attributes: ['@id'],
              },
              {
                name: 'title',
                type: 'String',
                isArray: false,
                isOptional: false,
                isPrimaryKey: false,
                isUnique: false,
                isRelation: false,
                attributes: [],
              },
            ],
            indexes: [],
          },
        ],
        enums: [],
        relationships: [],
      });

      const result = generateERD(input);

      expect(result).toContain('User {');
      expect(result).toContain('Post {');
      expect(result).toContain('string id PK');
      expect(result).toContain('string title');
    });

    it('should generate ERD with one-to-many relationship', () => {
      const input = wrapSchema({
        models: [
          {
            name: 'User',
            tableName: 'users',
            fields: [
              {
                name: 'id',
                type: 'String',
                isArray: false,
                isOptional: false,
                isPrimaryKey: true,
                isUnique: false,
                isRelation: false,
                attributes: ['@id'],
              },
            ],
            indexes: [],
          },
          {
            name: 'Post',
            tableName: 'posts',
            fields: [
              {
                name: 'id',
                type: 'String',
                isArray: false,
                isOptional: false,
                isPrimaryKey: true,
                isUnique: false,
                isRelation: false,
                attributes: ['@id'],
              },
            ],
            indexes: [],
          },
        ],
        enums: [],
        relationships: [
          {
            from: 'User',
            to: 'Post',
            type: 'one-to-many',
            fromField: 'posts',
            toField: 'posts',
          },
        ],
      });

      const result = generateERD(input);

      expect(result).toContain('User ||--o{ Post : "posts"');
    });

    it('should generate ERD with many-to-one relationship', () => {
      const input = wrapSchema({
        models: [
          {
            name: 'Post',
            tableName: 'posts',
            fields: [
              {
                name: 'id',
                type: 'String',
                isArray: false,
                isOptional: false,
                isPrimaryKey: true,
                isUnique: false,
                isRelation: false,
                attributes: ['@id'],
              },
            ],
            indexes: [],
          },
          {
            name: 'User',
            tableName: 'users',
            fields: [
              {
                name: 'id',
                type: 'String',
                isArray: false,
                isOptional: false,
                isPrimaryKey: true,
                isUnique: false,
                isRelation: false,
                attributes: ['@id'],
              },
            ],
            indexes: [],
          },
        ],
        enums: [],
        relationships: [
          {
            from: 'Post',
            to: 'User',
            type: 'many-to-one',
            fromField: 'author',
          },
        ],
      });

      const result = generateERD(input);

      expect(result).toContain('Post }o--|| User : "author"');
    });

    it('should handle various Prisma field types', () => {
      const input = wrapSchema({
        models: [
          {
            name: 'Entity',
            tableName: 'entities',
            fields: [
              {
                name: 'id',
                type: 'String',
                isArray: false,
                isOptional: false,
                isPrimaryKey: true,
                isUnique: false,
                isRelation: false,
                attributes: ['@id'],
              },
              {
                name: 'count',
                type: 'Int',
                isArray: false,
                isOptional: false,
                isPrimaryKey: false,
                isUnique: false,
                isRelation: false,
                attributes: [],
              },
              {
                name: 'price',
                type: 'Float',
                isArray: false,
                isOptional: false,
                isPrimaryKey: false,
                isUnique: false,
                isRelation: false,
                attributes: [],
              },
              {
                name: 'active',
                type: 'Boolean',
                isArray: false,
                isOptional: false,
                isPrimaryKey: false,
                isUnique: false,
                isRelation: false,
                attributes: [],
              },
              {
                name: 'createdAt',
                type: 'DateTime',
                isArray: false,
                isOptional: false,
                isPrimaryKey: false,
                isUnique: false,
                isRelation: false,
                attributes: [],
              },
              {
                name: 'metadata',
                type: 'Json',
                isArray: false,
                isOptional: false,
                isPrimaryKey: false,
                isUnique: false,
                isRelation: false,
                attributes: [],
              },
            ],
            indexes: [],
          },
        ],
        enums: [],
        relationships: [],
      });

      const result = generateERD(input);

      expect(result).toContain('string id PK');
      expect(result).toContain('int count');
      expect(result).toContain('float price');
      expect(result).toContain('boolean active');
      expect(result).toContain('datetime createdAt');
      expect(result).toContain('json metadata');
    });

    it('should handle array fields', () => {
      const input = wrapSchema({
        models: [
          {
            name: 'Entity',
            tableName: 'entities',
            fields: [
              {
                name: 'id',
                type: 'String',
                isArray: false,
                isOptional: false,
                isPrimaryKey: true,
                isUnique: false,
                isRelation: false,
                attributes: ['@id'],
              },
              {
                name: 'tags',
                type: 'String',
                isArray: true,
                isOptional: false,
                isPrimaryKey: false,
                isUnique: false,
                isRelation: false,
                attributes: [],
              },
            ],
            indexes: [],
          },
        ],
        enums: [],
        relationships: [],
      });

      const result = generateERD(input);

      expect(result).toContain('string[] tags');
    });

    it('should handle enum fields', () => {
      const input = wrapSchema({
        models: [
          {
            name: 'Template',
            tableName: 'templates',
            fields: [
              {
                name: 'id',
                type: 'String',
                isArray: false,
                isOptional: false,
                isPrimaryKey: true,
                isUnique: false,
                isRelation: false,
                attributes: ['@id'],
              },
              {
                name: 'status',
                type: 'TemplateStatus',
                isArray: false,
                isOptional: false,
                isPrimaryKey: false,
                isUnique: false,
                isRelation: false,
                attributes: [],
              },
            ],
            indexes: [],
          },
        ],
        enums: [
          {
            name: 'TemplateStatus',
            values: ['DRAFT', 'PUBLISHED'],
          },
        ],
        relationships: [],
      });

      const result = generateERD(input);

      expect(result).toContain('templatestatus status');
    });

    it('should exclude relation fields from entity definitions', () => {
      const input = wrapSchema({
        models: [
          {
            name: 'User',
            tableName: 'users',
            fields: [
              {
                name: 'id',
                type: 'String',
                isArray: false,
                isOptional: false,
                isPrimaryKey: true,
                isUnique: false,
                isRelation: false,
                attributes: ['@id'],
              },
              {
                name: 'posts',
                type: 'Post',
                isArray: true,
                isOptional: false,
                isPrimaryKey: false,
                isUnique: false,
                isRelation: true,
                relationTo: 'Post',
                attributes: [],
              },
            ],
            indexes: [],
          },
        ],
        enums: [],
        relationships: [],
      });

      const result = generateERD(input);

      expect(result).toContain('User {');
      expect(result).toContain('string id PK');
      expect(result).not.toContain('posts');
    });

    it('should handle empty schema', () => {
      const input = wrapSchema({
        models: [],
        enums: [],
        relationships: [],
      });

      const result = generateERD(input);

      expect(result).toBe('erDiagram\n');
    });

    it('should handle one-to-one relationship', () => {
      const input = wrapSchema({
        models: [
          {
            name: 'User',
            tableName: 'users',
            fields: [
              {
                name: 'id',
                type: 'String',
                isArray: false,
                isOptional: false,
                isPrimaryKey: true,
                isUnique: false,
                isRelation: false,
                attributes: ['@id'],
              },
            ],
            indexes: [],
          },
          {
            name: 'Profile',
            tableName: 'profiles',
            fields: [
              {
                name: 'id',
                type: 'String',
                isArray: false,
                isOptional: false,
                isPrimaryKey: true,
                isUnique: false,
                isRelation: false,
                attributes: ['@id'],
              },
            ],
            indexes: [],
          },
        ],
        enums: [],
        relationships: [
          {
            from: 'User',
            to: 'Profile',
            type: 'one-to-one',
            fromField: 'profile',
          },
        ],
      });

      const result = generateERD(input);

      expect(result).toContain('User ||--|| Profile : "profile"');
    });

    it('should handle many-to-many relationship', () => {
      const input = wrapSchema({
        models: [
          {
            name: 'User',
            tableName: 'users',
            fields: [
              {
                name: 'id',
                type: 'String',
                isArray: false,
                isOptional: false,
                isPrimaryKey: true,
                isUnique: false,
                isRelation: false,
                attributes: ['@id'],
              },
            ],
            indexes: [],
          },
          {
            name: 'Role',
            tableName: 'roles',
            fields: [
              {
                name: 'id',
                type: 'String',
                isArray: false,
                isOptional: false,
                isPrimaryKey: true,
                isUnique: false,
                isRelation: false,
                attributes: ['@id'],
              },
            ],
            indexes: [],
          },
        ],
        enums: [],
        relationships: [
          {
            from: 'User',
            to: 'Role',
            type: 'many-to-many',
            fromField: 'roles',
          },
        ],
      });

      const result = generateERD(input);

      expect(result).toContain('User }o--o{ Role : "roles"');
    });
  });

  describe('generateERDCodeBlock', () => {
    it('should wrap ERD in markdown code block', () => {
      const input = wrapSchema({
        models: [
          {
            name: 'User',
            tableName: 'users',
            fields: [
              {
                name: 'id',
                type: 'String',
                isArray: false,
                isOptional: false,
                isPrimaryKey: true,
                isUnique: false,
                isRelation: false,
                attributes: ['@id'],
              },
            ],
            indexes: [],
          },
        ],
        enums: [],
        relationships: [],
      });

      const result = generateERDCodeBlock(input);

      expect(result).toMatch(/^```mermaid\n/);
      expect(result).toMatch(/\n```\n$/);
      expect(result).toContain('erDiagram');
      expect(result).toContain('User {');
    });
  });

  describe('generatePartialERD', () => {
    it('should generate ERD for subset of models', () => {
      const input = wrapSchema({
        models: [
          {
            name: 'User',
            tableName: 'users',
            fields: [
              {
                name: 'id',
                type: 'String',
                isArray: false,
                isOptional: false,
                isPrimaryKey: true,
                isUnique: false,
                isRelation: false,
                attributes: ['@id'],
              },
            ],
            indexes: [],
          },
          {
            name: 'Post',
            tableName: 'posts',
            fields: [
              {
                name: 'id',
                type: 'String',
                isArray: false,
                isOptional: false,
                isPrimaryKey: true,
                isUnique: false,
                isRelation: false,
                attributes: ['@id'],
              },
            ],
            indexes: [],
          },
          {
            name: 'Comment',
            tableName: 'comments',
            fields: [
              {
                name: 'id',
                type: 'String',
                isArray: false,
                isOptional: false,
                isPrimaryKey: true,
                isUnique: false,
                isRelation: false,
                attributes: ['@id'],
              },
            ],
            indexes: [],
          },
        ],
        enums: [],
        relationships: [
          {
            from: 'User',
            to: 'Post',
            type: 'one-to-many',
            fromField: 'posts',
          },
          {
            from: 'Post',
            to: 'Comment',
            type: 'one-to-many',
            fromField: 'comments',
          },
        ],
      });

      const result = generatePartialERD(input, ['User', 'Post']);

      expect(result).toContain('User {');
      expect(result).toContain('Post {');
      expect(result).not.toContain('Comment {');
      expect(result).toContain('User ||--o{ Post');
      expect(result).not.toContain('Comment');
    });

    it('should exclude relationships to models not in subset', () => {
      const input = wrapSchema({
        models: [
          {
            name: 'User',
            tableName: 'users',
            fields: [
              {
                name: 'id',
                type: 'String',
                isArray: false,
                isOptional: false,
                isPrimaryKey: true,
                isUnique: false,
                isRelation: false,
                attributes: ['@id'],
              },
            ],
            indexes: [],
          },
          {
            name: 'Post',
            tableName: 'posts',
            fields: [
              {
                name: 'id',
                type: 'String',
                isArray: false,
                isOptional: false,
                isPrimaryKey: true,
                isUnique: false,
                isRelation: false,
                attributes: ['@id'],
              },
            ],
            indexes: [],
          },
        ],
        enums: [],
        relationships: [
          {
            from: 'User',
            to: 'Post',
            type: 'one-to-many',
            fromField: 'posts',
          },
        ],
      });

      const result = generatePartialERD(input, ['User']);

      expect(result).toContain('User {');
      expect(result).not.toContain('Post {');
      expect(result).not.toContain('||--o{');
    });
  });
});
