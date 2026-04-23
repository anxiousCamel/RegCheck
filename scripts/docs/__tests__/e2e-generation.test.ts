/**
 * End-to-End Documentation Generation Tests
 * 
 * Tests the complete documentation generation pipeline from parsing to validation.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { parsePrismaSchema } from '../prisma-parser';
import { parseRouteFiles } from '../route-parser';
import { parseErrorCodes } from '../error-parser';
import { generateDataModelDocs } from '../generators/data-model-generator';
import { generateApiReferenceDocs } from '../generators/api-reference-generator';
import { generateErrorCodesDocs } from '../generators/error-codes-generator';
import { generateArchitectureDocs } from '../generators/architecture-generator';
import { generateTechStackDocs } from '../generators/tech-stack-generator';
import { generateInfrastructureDocs } from '../generators/infrastructure-generator';
import { generateIndexDocs } from '../generators/index-generator';
import { writeDocument } from '../writers/file-writer';
import { validateDocumentation } from '../validators';

describe('Documentation Generation E2E', () => {
  const testOutputDir = path.join(__dirname, '../../../test-docs-output');
  const generatedAt = new Date().toISOString();
  
  beforeAll(() => {
    // Clean up test output directory
    if (fs.existsSync(testOutputDir)) {
      fs.rmSync(testOutputDir, { recursive: true });
    }
    fs.mkdirSync(testOutputDir, { recursive: true });
  });
  
  describe('Complete Pipeline', () => {
    it('should parse Prisma schema without errors', () => {
      const schemaPath = path.join(__dirname, '../../../packages/database/prisma/schema.prisma');
      const schemaContent = fs.readFileSync(schemaPath, 'utf-8');
      
      const output = parsePrismaSchema(schemaContent);
      
      expect(output.source).toBe('prisma-parser');
      expect(output.generatedAt).toBeTruthy();
      expect(output.data.models.length).toBeGreaterThan(0);
      expect(output.data.enums.length).toBeGreaterThan(0);
    });
    
    it('should parse routes without errors', () => {
      const routesDir = path.join(__dirname, '../../../apps/api/src/routes');
      
      const output = parseRouteFiles(routesDir);
      
      expect(output.source).toBe('route-parser');
      expect(output.generatedAt).toBeTruthy();
      expect(output.data.length).toBeGreaterThan(0);
    });
    
    it('should parse error codes without errors', () => {
      const routesDir = path.join(__dirname, '../../../apps/api/src/routes');
      const servicesDir = path.join(__dirname, '../../../apps/api/src/services');
      const errorHandlerPath = path.join(__dirname, '../../../apps/api/src/middleware/error-handler.ts');
      
      const output = parseErrorCodes(routesDir, servicesDir, errorHandlerPath);
      
      expect(output.source).toBe('error-code-parser');
      expect(output.generatedAt).toBeTruthy();
      expect(output.data.length).toBeGreaterThan(0);
    });
    
    it('should generate all documentation files', () => {
      // Parse data
      const schemaPath = path.join(__dirname, '../../../packages/database/prisma/schema.prisma');
      const schemaContent = fs.readFileSync(schemaPath, 'utf-8');
      const prismaOutput = parsePrismaSchema(schemaContent);
      
      const routesDir = path.join(__dirname, '../../../apps/api/src/routes');
      const routesOutput = parseRouteFiles(routesDir);
      
      const servicesDir = path.join(__dirname, '../../../apps/api/src/services');
      const errorHandlerPath = path.join(__dirname, '../../../apps/api/src/middleware/error-handler.ts');
      const errorsOutput = parseErrorCodes(routesDir, servicesDir, errorHandlerPath);
      
      // Generate documents
      const documents = [
        {
          filename: '01-arquitetura.md',
          content: generateArchitectureDocs({ projectName: 'RegCheck', generatedAt }),
        },
        {
          filename: '02-stack-tecnologica.md',
          content: generateTechStackDocs({ projectName: 'RegCheck', generatedAt }),
        },
        {
          filename: '03-infraestrutura.md',
          content: generateInfrastructureDocs({ projectName: 'RegCheck', generatedAt }),
        },
        {
          filename: '04-modelagem-dados.md',
          content: generateDataModelDocs(prismaOutput),
        },
        {
          filename: '06-api-reference.md',
          content: generateApiReferenceDocs(routesOutput),
        },
        {
          filename: '07-codigos-erro.md',
          content: generateErrorCodesDocs(errorsOutput),
        },
      ];
      
      // Add index
      const indexContent = generateIndexDocs({
        documents: documents.map(d => ({
          filename: d.filename,
          title: d.filename.replace('.md', '').replace(/^\d+-/, '').replace(/-/g, ' '),
          description: 'Test document',
          category: 'Test',
        })),
        generatedAt,
      });
      
      documents.push({
        filename: 'README.md',
        content: indexContent,
      });
      
      // Write all documents
      const results = documents.map(doc =>
        writeDocument({
          outputDir: testOutputDir,
          filename: doc.filename,
          content: doc.content,
          skipIfUnchanged: false,
        })
      );
      
      // Verify all files were written
      expect(results.every(r => r.written)).toBe(true);
      expect(results.length).toBe(7);
      
      // Verify files exist
      for (const doc of documents) {
        const filepath = path.join(testOutputDir, doc.filename);
        expect(fs.existsSync(filepath)).toBe(true);
        
        const content = fs.readFileSync(filepath, 'utf-8');
        expect(content.length).toBeGreaterThan(100);
      }
    });
    
    it('should validate generated documentation', () => {
      const result = validateDocumentation(testOutputDir);
      
      expect(result.filesValidated).toBeGreaterThan(0);
      
      if (!result.success) {
        console.error('Validation errors:', result.errors);
      }
      
      expect(result.success).toBe(true);
    });
  });
  
  describe('Performance', () => {
    it('should complete generation in reasonable time', () => {
      const startTime = Date.now();
      
      // Parse data
      const schemaPath = path.join(__dirname, '../../../packages/database/prisma/schema.prisma');
      const schemaContent = fs.readFileSync(schemaPath, 'utf-8');
      parsePrismaSchema(schemaContent);
      
      const routesDir = path.join(__dirname, '../../../apps/api/src/routes');
      parseRouteFiles(routesDir);
      
      const servicesDir = path.join(__dirname, '../../../apps/api/src/services');
      const errorHandlerPath = path.join(__dirname, '../../../apps/api/src/middleware/error-handler.ts');
      parseErrorCodes(routesDir, servicesDir, errorHandlerPath);
      
      const elapsed = Date.now() - startTime;
      
      // Should complete in less than 5 seconds
      expect(elapsed).toBeLessThan(5000);
    });
  });
  
  describe('Error Handling', () => {
    it('should handle missing Prisma schema gracefully', () => {
      expect(() => {
        parsePrismaSchema('');
      }).not.toThrow();
    });
    
    it('should handle empty routes directory gracefully', () => {
      const emptyDir = path.join(testOutputDir, 'empty-routes');
      fs.mkdirSync(emptyDir, { recursive: true });
      
      const output = parseRouteFiles(emptyDir);
      
      expect(output.data).toEqual([]);
    });
  });
  
  describe('Content Quality', () => {
    it('should generate data model doc with ERD diagram', () => {
      const schemaPath = path.join(__dirname, '../../../packages/database/prisma/schema.prisma');
      const schemaContent = fs.readFileSync(schemaPath, 'utf-8');
      const prismaOutput = parsePrismaSchema(schemaContent);
      
      const content = generateDataModelDocs(prismaOutput);
      
      expect(content).toContain('# Modelagem de Dados');
      expect(content).toContain('```mermaid');
      expect(content).toContain('erDiagram');
      expect(content).toContain('Entidades');
    });
    
    it('should generate API reference with endpoints', () => {
      const routesDir = path.join(__dirname, '../../../apps/api/src/routes');
      const routesOutput = parseRouteFiles(routesDir);
      
      const content = generateApiReferenceDocs(routesOutput);
      
      expect(content).toContain('# Referência da API');
      expect(content).toContain('GET');
      expect(content).toContain('POST');
      expect(content).toContain('/api');
    });
    
    it('should generate error codes with table', () => {
      const routesDir = path.join(__dirname, '../../../apps/api/src/routes');
      const servicesDir = path.join(__dirname, '../../../apps/api/src/services');
      const errorHandlerPath = path.join(__dirname, '../../../apps/api/src/middleware/error-handler.ts');
      const errorsOutput = parseErrorCodes(routesDir, servicesDir, errorHandlerPath);
      
      const content = generateErrorCodesDocs(errorsOutput);
      
      expect(content).toContain('# Códigos de Erro');
      expect(content).toContain('| Código |');
      expect(content).toContain('NOT_FOUND');
    });
  });
});
