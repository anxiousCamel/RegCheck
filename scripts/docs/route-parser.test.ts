import { describe, it, expect } from 'vitest';
import * as path from 'path';
import {
  parseRouteFile,
  parseRouteFiles,
  groupEndpointsByResource,
  type ApiEndpoint,
} from './route-parser';

describe('Route Parser', () => {
  describe('parseRouteFiles (Standardized Output)', () => {
    it('should return ParserOutput with source, generatedAt, and data', () => {
      const routesDir = path.join(__dirname, '../../../apps/api/src/routes');
      const result = parseRouteFiles(routesDir);

      expect(result).toHaveProperty('source');
      expect(result).toHaveProperty('generatedAt');
      expect(result).toHaveProperty('data');

      expect(result.source).toBe('route-parser');
      expect(result.generatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/); // ISO timestamp
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.data.length).toBeGreaterThan(0);
    });

    it('should extract endpoints from all route files', () => {
      const routesDir = path.join(__dirname, '../../../apps/api/src/routes');
      const result = parseRouteFiles(routesDir);

      // Should have endpoints from templates, documents, uploads, etc.
      expect(result.data.length).toBeGreaterThan(10);

      // Should have different HTTP methods
      const methods = new Set(result.data.map((e) => e.method));
      expect(methods.has('GET')).toBe(true);
      expect(methods.has('POST')).toBe(true);
      expect(methods.has('PATCH')).toBe(true);
      expect(methods.has('DELETE')).toBe(true);
    });
  });

  describe('groupEndpointsByResource', () => {
    it('should group endpoints by resource name', () => {
      const routesDir = path.join(__dirname, '../../../apps/api/src/routes');
      const result = parseRouteFiles(routesDir);
      const grouped = groupEndpointsByResource(result);

      expect(grouped.size).toBeGreaterThan(0);
      expect(grouped.has('templates')).toBe(true);
      expect(grouped.has('documents')).toBe(true);
      expect(grouped.has('uploads')).toBe(true);
    });
  });

  describe('parseRouteFile', () => {
    it('should extract GET endpoint with path parameter', () => {
      const testFile = path.join(__dirname, '../../../apps/api/src/routes/templates.ts');
      const endpoints = parseRouteFile(testFile);

      const getById = endpoints.find((e) => e.method === 'GET' && e.path === '/:id');
      expect(getById).toBeDefined();
      expect(getById?.description).toContain('template');
      expect(getById?.parameters).toContainEqual(
        expect.objectContaining({
          name: 'id',
          location: 'path',
          required: true,
        }),
      );
    });

    it('should extract POST endpoint with request body', () => {
      const testFile = path.join(__dirname, '../../../apps/api/src/routes/templates.ts');
      const endpoints = parseRouteFile(testFile);

      const create = endpoints.find((e) => e.method === 'POST' && e.path === '/');
      expect(create).toBeDefined();
      expect(create?.requestBody).toBeDefined();
      expect(create?.requestBody?.schemaName).toBe('createTemplateSchema');
      expect(create?.responses).toContainEqual(
        expect.objectContaining({
          statusCode: 201,
        }),
      );
    });

    it('should extract PATCH endpoint', () => {
      const testFile = path.join(__dirname, '../../../apps/api/src/routes/templates.ts');
      const endpoints = parseRouteFile(testFile);

      const update = endpoints.find((e) => e.method === 'PATCH' && e.path === '/:id');
      expect(update).toBeDefined();
      expect(update?.requestBody?.schemaName).toBe('updateTemplateSchema');
      expect(update?.parameters).toContainEqual(
        expect.objectContaining({
          name: 'id',
          location: 'path',
        }),
      );
    });

    it('should extract DELETE endpoint', () => {
      const testFile = path.join(__dirname, '../../../apps/api/src/routes/templates.ts');
      const endpoints = parseRouteFile(testFile);

      const deleteEndpoint = endpoints.find((e) => e.method === 'DELETE' && e.path === '/:id');
      expect(deleteEndpoint).toBeDefined();
      expect(deleteEndpoint?.parameters).toContainEqual(
        expect.objectContaining({
          name: 'id',
          location: 'path',
        }),
      );
    });

    it('should extract pagination query parameters', () => {
      const testFile = path.join(__dirname, '../../../apps/api/src/routes/templates.ts');
      const endpoints = parseRouteFile(testFile);

      const list = endpoints.find((e) => e.method === 'GET' && e.path === '/');
      expect(list).toBeDefined();
      expect(list?.parameters).toContainEqual(
        expect.objectContaining({
          name: 'page',
          location: 'query',
          required: false,
        }),
      );
      expect(list?.parameters).toContainEqual(
        expect.objectContaining({
          name: 'pageSize',
          location: 'query',
          required: false,
        }),
      );
    });

    it('should extract custom action endpoints', () => {
      const testFile = path.join(__dirname, '../../../apps/api/src/routes/templates.ts');
      const endpoints = parseRouteFile(testFile);

      const publish = endpoints.find((e) => e.method === 'POST' && e.path === '/:id/publish');
      expect(publish).toBeDefined();
      expect(publish?.description).toContain('Publish');
    });

    it('should extract endpoints from documents route', () => {
      const testFile = path.join(__dirname, '../../../apps/api/src/routes/documents.ts');
      const endpoints = parseRouteFile(testFile);

      expect(endpoints.length).toBeGreaterThan(5);

      const populate = endpoints.find((e) => e.path === '/:id/populate');
      expect(populate).toBeDefined();
      expect(populate?.method).toBe('POST');
      expect(populate?.requestBody?.schemaName).toBe('populateDocumentSchema');
    });

    it('should extract file upload endpoints', () => {
      const testFile = path.join(__dirname, '../../../apps/api/src/routes/uploads.ts');
      const endpoints = parseRouteFile(testFile);

      const uploadPdf = endpoints.find((e) => e.path === '/pdf');
      expect(uploadPdf).toBeDefined();
      expect(uploadPdf?.method).toBe('POST');
      expect(uploadPdf?.requestBody?.contentType).toBe('multipart/form-data');
    });

    it('should extract query parameters from uploads route', () => {
      const testFile = path.join(__dirname, '../../../apps/api/src/routes/uploads.ts');
      const endpoints = parseRouteFile(testFile);

      const presigned = endpoints.find((e) => e.path === '/presigned');
      expect(presigned).toBeDefined();
      expect(presigned?.parameters).toContainEqual(
        expect.objectContaining({
          name: 'key',
          location: 'query',
        }),
      );
    });

    it('should handle multiple path parameters', () => {
      const testFile = path.join(__dirname, '../../../apps/api/src/routes/documents.ts');
      const endpoints = parseRouteFile(testFile);

      const generate = endpoints.find((e) => e.path === '/:id/generate');
      expect(generate).toBeDefined();
      expect(generate?.parameters).toContainEqual(
        expect.objectContaining({
          name: 'id',
          location: 'path',
        }),
      );
    });
  });

  describe('groupEndpointsByResource', () => {
    it('should group endpoints by resource name', () => {
      const endpoints: ApiEndpoint[] = [
        {
          method: 'GET',
          path: '/templates',
          description: 'List templates',
          parameters: [],
          responses: [],
        },
        {
          method: 'POST',
          path: '/templates',
          description: 'Create template',
          parameters: [],
          responses: [],
        },
        {
          method: 'GET',
          path: '/documents',
          description: 'List documents',
          parameters: [],
          responses: [],
        },
      ];

      const groups = groupEndpointsByResource({
        source: 'route-parser',
        generatedAt: new Date().toISOString(),
        data: endpoints,
      });

      expect(groups.size).toBe(2);
      expect(groups.get('templates')).toHaveLength(2);
      expect(groups.get('documents')).toHaveLength(1);
    });

    it('should handle /api prefix in paths', () => {
      const endpoints: ApiEndpoint[] = [
        {
          method: 'GET',
          path: '/api/templates',
          description: 'List templates',
          parameters: [],
          responses: [],
        },
      ];

      const groups = groupEndpointsByResource({
        source: 'route-parser',
        generatedAt: new Date().toISOString(),
        data: endpoints,
      });

      expect(groups.has('templates')).toBe(true);
    });
  });

  describe('Edge Cases - Complex Route Patterns', () => {
    describe('Multiple path parameters in single route', () => {
      it('should extract all path parameters from complex routes', () => {
        const testFile = path.join(__dirname, '../../../apps/api/src/routes/documents.ts');
        const endpoints = parseRouteFile(testFile);

        // Test routes with nested path parameters like /:id/populate, /:id/generate
        const populate = endpoints.find((e) => e.path === '/:id/populate');
        expect(populate).toBeDefined();
        expect(populate?.parameters).toContainEqual(
          expect.objectContaining({
            name: 'id',
            location: 'path',
            required: true,
          }),
        );

        const generate = endpoints.find((e) => e.path === '/:id/generate');
        expect(generate).toBeDefined();
        expect(generate?.parameters).toContainEqual(
          expect.objectContaining({
            name: 'id',
            location: 'path',
            required: true,
          }),
        );
      });
    });

    describe('Query parameter extraction edge cases', () => {
      it('should extract query parameters from req.query access', () => {
        const testFile = path.join(__dirname, '../../../apps/api/src/routes/uploads.ts');
        const endpoints = parseRouteFile(testFile);

        const presigned = endpoints.find((e) => e.path === '/presigned');
        expect(presigned).toBeDefined();
        expect(presigned?.parameters).toContainEqual(
          expect.objectContaining({
            name: 'key',
            location: 'query',
          }),
        );
      });

      it('should handle query parameters with type casting', () => {
        const testFile = path.join(__dirname, '../../../apps/api/src/routes/uploads.ts');
        const endpoints = parseRouteFile(testFile);

        const fileDownload = endpoints.find((e) => e.path === '/file');
        expect(fileDownload).toBeDefined();
        expect(fileDownload?.parameters).toContainEqual(
          expect.objectContaining({
            name: 'key',
            location: 'query',
          }),
        );
      });

      it('should extract optional query parameters', () => {
        const testFile = path.join(__dirname, '../../../apps/api/src/routes/uploads.ts');
        const endpoints = parseRouteFile(testFile);

        const imageUpload = endpoints.find((e) => e.path === '/image' && e.method === 'POST');
        expect(imageUpload).toBeDefined();
        // The type query param is optional
        const typeParam = imageUpload?.parameters.find((p) => p.name === 'type');
        if (typeParam) {
          expect(typeParam.required).toBe(false);
        }
      });
    });

    describe('JSDoc comment extraction', () => {
      it('should extract description from JSDoc comments', () => {
        const testFile = path.join(__dirname, '../../../apps/api/src/routes/templates.ts');
        const endpoints = parseRouteFile(testFile);

        const list = endpoints.find((e) => e.method === 'GET' && e.path === '/');
        expect(list).toBeDefined();
        expect(list?.description).toBeTruthy();
        expect(list?.description.toLowerCase()).toContain('list');
      });

      it('should extract description from multi-line JSDoc', () => {
        const testFile = path.join(__dirname, '../../../apps/api/src/routes/documents.ts');
        const endpoints = parseRouteFile(testFile);

        // The DELETE endpoint has a detailed multi-line JSDoc comment
        const deleteEndpoint = endpoints.find((e) => e.method === 'DELETE' && e.path === '/:id');
        expect(deleteEndpoint).toBeDefined();
        expect(deleteEndpoint?.description).toBeTruthy();
      });

      it('should handle routes without JSDoc comments', () => {
        const testFile = path.join(__dirname, '../../../apps/api/src/routes/uploads.ts');
        const endpoints = parseRouteFile(testFile);

        // Some routes might not have JSDoc
        const restore = endpoints.find((e) => e.path === '/restore');
        expect(restore).toBeDefined();
        // Description might be empty, but should not crash
        expect(typeof restore?.description).toBe('string');
      });
    });

    describe('Response status code extraction', () => {
      it('should detect explicit 201 status for POST endpoints', () => {
        const testFile = path.join(__dirname, '../../../apps/api/src/routes/templates.ts');
        const endpoints = parseRouteFile(testFile);

        const create = endpoints.find((e) => e.method === 'POST' && e.path === '/');
        expect(create).toBeDefined();
        expect(create?.responses).toContainEqual(
          expect.objectContaining({
            statusCode: 201,
          }),
        );
      });

      it('should detect 204 status for DELETE with .end()', () => {
        const testFile = path.join(__dirname, '../../../apps/api/src/routes/documents.ts');
        const endpoints = parseRouteFile(testFile);

        const deleteEndpoint = endpoints.find((e) => e.method === 'DELETE' && e.path === '/:id');
        expect(deleteEndpoint).toBeDefined();
        // Should detect 204 from res.status(204).end()
        const has204 = deleteEndpoint?.responses.some((r) => r.statusCode === 204);
        expect(has204).toBe(true);
      });

      it('should detect 400 error responses from error codes', () => {
        const testFile = path.join(__dirname, '../../../apps/api/src/routes/templates.ts');
        const endpoints = parseRouteFile(testFile);

        const create = endpoints.find((e) => e.method === 'POST' && e.path === '/');
        expect(create).toBeDefined();
        // Should detect 400 from error response with code: 'PDF_NOT_FOUND'
        const has400 = create?.responses.some((r) => r.statusCode === 400);
        expect(has400).toBe(true);
      });

      it('should detect 404 responses for routes with :id parameter', () => {
        const testFile = path.join(__dirname, '../../../apps/api/src/routes/templates.ts');
        const endpoints = parseRouteFile(testFile);

        const getById = endpoints.find((e) => e.method === 'GET' && e.path === '/:id');
        expect(getById).toBeDefined();
        // Should infer 404 from idParamSchema usage
        const has404 = getById?.responses.some((r) => r.statusCode === 404);
        expect(has404).toBe(true);
      });

      it('should handle routes without explicit status codes', () => {
        const testFile = path.join(__dirname, '../../../apps/api/src/routes/templates.ts');
        const endpoints = parseRouteFile(testFile);

        const list = endpoints.find((e) => e.method === 'GET' && e.path === '/');
        expect(list).toBeDefined();
        // Should default to 200 for GET
        expect(list?.responses).toContainEqual(
          expect.objectContaining({
            statusCode: 200,
          }),
        );
      });
    });

    describe('Request body schema extraction', () => {
      it('should extract Zod schema names from parse calls', () => {
        const testFile = path.join(__dirname, '../../../apps/api/src/routes/templates.ts');
        const endpoints = parseRouteFile(testFile);

        const create = endpoints.find((e) => e.method === 'POST' && e.path === '/');
        expect(create).toBeDefined();
        expect(create?.requestBody?.schemaName).toBe('createTemplateSchema');
      });

      it('should detect multipart/form-data from req.file usage', () => {
        const testFile = path.join(__dirname, '../../../apps/api/src/routes/uploads.ts');
        const endpoints = parseRouteFile(testFile);

        const uploadPdf = endpoints.find((e) => e.path === '/pdf' && e.method === 'POST');
        expect(uploadPdf).toBeDefined();
        expect(uploadPdf?.requestBody?.contentType).toBe('multipart/form-data');
      });

      it('should handle routes without request body', () => {
        const testFile = path.join(__dirname, '../../../apps/api/src/routes/templates.ts');
        const endpoints = parseRouteFile(testFile);

        const list = endpoints.find((e) => e.method === 'GET' && e.path === '/');
        expect(list).toBeDefined();
        expect(list?.requestBody).toBeUndefined();
      });
    });

    describe('Complex endpoint patterns', () => {
      it('should handle nested action routes like /:id/populate', () => {
        const testFile = path.join(__dirname, '../../../apps/api/src/routes/documents.ts');
        const endpoints = parseRouteFile(testFile);

        const populate = endpoints.find((e) => e.path === '/:id/populate');
        expect(populate).toBeDefined();
        expect(populate?.method).toBe('POST');
        expect(populate?.requestBody?.schemaName).toBe('populateDocumentSchema');
      });

      it('should handle multiple nested action routes on same resource', () => {
        const testFile = path.join(__dirname, '../../../apps/api/src/routes/documents.ts');
        const endpoints = parseRouteFile(testFile);

        const actions = endpoints.filter((e) => e.path.includes('/:id/'));
        expect(actions.length).toBeGreaterThan(3);

        const actionPaths = actions.map((e) => e.path);
        expect(actionPaths).toContain('/:id/populate');
        expect(actionPaths).toContain('/:id/fill');
        expect(actionPaths).toContain('/:id/generate');
        expect(actionPaths).toContain('/:id/status');
        expect(actionPaths).toContain('/:id/download');
      });

      it('should correctly extract all endpoints from a complex route file', () => {
        const testFile = path.join(__dirname, '../../../apps/api/src/routes/documents.ts');
        const endpoints = parseRouteFile(testFile);

        // Documents route has many endpoints
        expect(endpoints.length).toBeGreaterThan(8);

        // Verify we have the main CRUD operations
        const methods = endpoints.map((e) => e.method);
        expect(methods).toContain('GET');
        expect(methods).toContain('POST');
        expect(methods).toContain('PATCH');
        expect(methods).toContain('DELETE');
      });
    });

    describe('Error handling and edge cases', () => {
      it('should handle routes with complex error handling logic', () => {
        const testFile = path.join(__dirname, '../../../apps/api/src/routes/documents.ts');
        const endpoints = parseRouteFile(testFile);

        const download = endpoints.find((e) => e.path === '/:id/download');
        expect(download).toBeDefined();
        // Should detect error code PDF_NOT_GENERATED
        const has400 = download?.responses.some((r) => r.statusCode === 400);
        expect(has400).toBe(true);
      });

      it('should handle routes with conditional status updates', () => {
        const testFile = path.join(__dirname, '../../../apps/api/src/routes/documents.ts');
        const endpoints = parseRouteFile(testFile);

        const status = endpoints.find((e) => e.path === '/:id/status');
        expect(status).toBeDefined();
        expect(status?.method).toBe('GET');
        // Complex logic with auto-recovery, but should still parse
        expect(status?.parameters).toContainEqual(
          expect.objectContaining({
            name: 'id',
            location: 'path',
          }),
        );
      });
    });

    describe('Pagination and filtering', () => {
      it('should extract pagination parameters from all list endpoints', () => {
        const testFile = path.join(__dirname, '../../../apps/api/src/routes/templates.ts');
        const endpoints = parseRouteFile(testFile);

        const list = endpoints.find((e) => e.method === 'GET' && e.path === '/');
        expect(list).toBeDefined();
        expect(list?.parameters).toContainEqual(
          expect.objectContaining({
            name: 'page',
            location: 'query',
            required: false,
          }),
        );
        expect(list?.parameters).toContainEqual(
          expect.objectContaining({
            name: 'pageSize',
            location: 'query',
            required: false,
          }),
        );
      });
    });

    describe('Multiple routes with same path but different methods', () => {
      it('should distinguish between GET and DELETE on same path', () => {
        const testFile = path.join(__dirname, '../../../apps/api/src/routes/documents.ts');
        const endpoints = parseRouteFile(testFile);

        const idRoutes = endpoints.filter((e) => e.path === '/:id');
        expect(idRoutes.length).toBeGreaterThan(1);

        const methods = idRoutes.map((e) => e.method);
        expect(methods).toContain('GET');
        expect(methods).toContain('DELETE');
        expect(methods).toContain('PATCH');
      });
    });
  });
});
