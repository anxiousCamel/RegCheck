import { describe, it, expect } from 'vitest';
import {
  formatEndpoint,
  formatParameters,
  formatRequestBody,
  formatResponses,
  formatResourceEndpoints,
  formatExampleRequest,
  formatExampleResponse,
  formatApiDocumentation,
} from './api-formatter';
import type { ApiEndpoint, Parameter, RequestBody, Response } from './route-parser';

describe('API Formatter', () => {
  describe('formatParameters', () => {
    it('should format parameters as a table', () => {
      const parameters: Parameter[] = [
        {
          name: 'id',
          location: 'path',
          type: 'string',
          required: true,
          description: 'Template ID',
        },
        {
          name: 'page',
          location: 'query',
          type: 'number',
          required: false,
          description: 'Page number',
        },
      ];

      const result = formatParameters(parameters);

      expect(result).toContain('| Nome | Localização | Tipo | Obrigatório | Descrição |');
      expect(result).toContain('| id | path | string | Sim | Template ID |');
      expect(result).toContain('| page | query | number | Não | Page number |');
    });

    it('should handle empty parameters array', () => {
      const result = formatParameters([]);

      expect(result).toContain('| Nome | Localização | Tipo | Obrigatório | Descrição |');
      expect(result).toContain('|---|---|---|---|---|');
    });
  });

  describe('formatRequestBody', () => {
    it('should format request body with schema name', () => {
      const requestBody: RequestBody = {
        contentType: 'application/json',
        schemaName: 'createTemplateSchema',
        description: 'Template creation data',
      };

      const result = formatRequestBody(requestBody);

      expect(result).toContain('**Content-Type:** `application/json`');
      expect(result).toContain('**Schema:** `createTemplateSchema`');
      expect(result).toContain('Template creation data');
    });

    it('should format request body without schema name', () => {
      const requestBody: RequestBody = {
        contentType: 'multipart/form-data',
        description: 'File upload',
      };

      const result = formatRequestBody(requestBody);

      expect(result).toContain('**Content-Type:** `multipart/form-data`');
      expect(result).not.toContain('**Schema:**');
      expect(result).toContain('File upload');
    });
  });

  describe('formatResponses', () => {
    it('should format success responses', () => {
      const responses: Response[] = [
        {
          statusCode: 200,
          description: 'OK - Request successful',
          successType: 'ApiResponse',
        },
      ];

      const result = formatResponses(responses);

      expect(result).toContain('**Sucesso (200):** OK - Request successful');
      expect(result).toContain('Tipo de resposta: `ApiResponse`');
    });

    it('should format error responses', () => {
      const responses: Response[] = [
        {
          statusCode: 404,
          description: 'Not Found - Resource not found',
        },
      ];

      const result = formatResponses(responses);

      expect(result).toContain('**Erro (404):** Not Found - Resource not found');
      expect(result).not.toContain('Tipo de resposta:');
    });

    it('should format multiple responses', () => {
      const responses: Response[] = [
        {
          statusCode: 201,
          description: 'Created - Resource created successfully',
          successType: 'ApiResponse',
        },
        {
          statusCode: 400,
          description: 'Bad Request - Invalid input',
        },
      ];

      const result = formatResponses(responses);

      expect(result).toContain('**Sucesso (201):**');
      expect(result).toContain('**Erro (400):**');
    });
  });

  describe('formatEndpoint', () => {
    it('should format complete endpoint with all sections', () => {
      const endpoint: ApiEndpoint = {
        method: 'POST',
        path: '/api/templates',
        description: 'Create a new template',
        parameters: [
          {
            name: 'name',
            location: 'query',
            type: 'string',
            required: false,
            description: 'Template name filter',
          },
        ],
        requestBody: {
          contentType: 'application/json',
          schemaName: 'createTemplateSchema',
          description: 'Template data',
        },
        responses: [
          {
            statusCode: 201,
            description: 'Created - Template created successfully',
            successType: 'ApiResponse',
          },
          {
            statusCode: 400,
            description: 'Bad Request - Invalid input',
          },
        ],
      };

      const result = formatEndpoint(endpoint);

      // Check heading
      expect(result).toContain('### POST /api/templates');

      // Check description
      expect(result).toContain('Create a new template');

      // Check parameters section
      expect(result).toContain('#### Parâmetros');
      expect(result).toContain('| name | query | string | Não | Template name filter |');

      // Check request body section
      expect(result).toContain('#### Corpo da Requisição');
      expect(result).toContain('**Content-Type:** `application/json`');
      expect(result).toContain('**Schema:** `createTemplateSchema`');

      // Check responses section
      expect(result).toContain('#### Respostas');
      expect(result).toContain('**Sucesso (201):**');
      expect(result).toContain('**Erro (400):**');
    });

    it('should format endpoint without parameters', () => {
      const endpoint: ApiEndpoint = {
        method: 'GET',
        path: '/api/templates',
        description: 'List all templates',
        parameters: [],
        responses: [
          {
            statusCode: 200,
            description: 'OK - Request successful',
          },
        ],
      };

      const result = formatEndpoint(endpoint);

      expect(result).toContain('### GET /api/templates');
      expect(result).toContain('#### Parâmetros');
      expect(result).toContain('Nenhum');
    });

    it('should format endpoint without request body', () => {
      const endpoint: ApiEndpoint = {
        method: 'GET',
        path: '/api/templates/:id',
        description: 'Get template by ID',
        parameters: [
          {
            name: 'id',
            location: 'path',
            type: 'string',
            required: true,
            description: 'Template ID',
          },
        ],
        responses: [
          {
            statusCode: 200,
            description: 'OK - Request successful',
          },
        ],
      };

      const result = formatEndpoint(endpoint);

      expect(result).toContain('### GET /api/templates/:id');
      expect(result).not.toContain('#### Corpo da Requisição');
    });
  });

  describe('formatResourceEndpoints', () => {
    it('should format multiple endpoints for a resource', () => {
      const endpoints: ApiEndpoint[] = [
        {
          method: 'GET',
          path: '/api/templates',
          description: 'List templates',
          parameters: [],
          responses: [
            {
              statusCode: 200,
              description: 'OK',
            },
          ],
        },
        {
          method: 'POST',
          path: '/api/templates',
          description: 'Create template',
          parameters: [],
          responses: [
            {
              statusCode: 201,
              description: 'Created',
            },
          ],
        },
      ];

      const result = formatResourceEndpoints('templates', endpoints);

      expect(result).toContain('## Templates');
      expect(result).toContain('### GET /api/templates');
      expect(result).toContain('### POST /api/templates');
    });

    it('should capitalize resource names correctly', () => {
      const endpoints: ApiEndpoint[] = [
        {
          method: 'GET',
          path: '/api/equipamentos',
          description: 'List equipamentos',
          parameters: [],
          responses: [],
        },
      ];

      const result = formatResourceEndpoints('equipamentos', endpoints);

      expect(result).toContain('## Equipamentos');
    });

    it('should handle special resource names', () => {
      const endpoints: ApiEndpoint[] = [
        {
          method: 'GET',
          path: '/api/tipos-equipamento',
          description: 'List tipos',
          parameters: [],
          responses: [],
        },
      ];

      const result = formatResourceEndpoints('tipos-equipamento', endpoints);

      expect(result).toContain('## Tipos de Equipamento');
    });
  });

  describe('formatExampleRequest', () => {
    it('should format example request with body', () => {
      const endpoint: ApiEndpoint = {
        method: 'POST',
        path: '/api/templates',
        description: 'Create template',
        parameters: [],
        requestBody: {
          contentType: 'application/json',
          schemaName: 'createTemplateSchema',
          description: 'Template data',
        },
        responses: [],
      };

      const exampleData = {
        name: 'My Template',
        description: 'A test template',
      };

      const result = formatExampleRequest(endpoint, exampleData);

      expect(result).toContain('#### Exemplo de Requisição');
      expect(result).toContain('```http');
      expect(result).toContain('POST /api/templates');
      expect(result).toContain('```json');
      expect(result).toContain('"name": "My Template"');
      expect(result).toContain('"description": "A test template"');
    });

    it('should format example request without body', () => {
      const endpoint: ApiEndpoint = {
        method: 'GET',
        path: '/api/templates/:id',
        description: 'Get template',
        parameters: [],
        responses: [],
      };

      const result = formatExampleRequest(endpoint, {});

      expect(result).toContain('#### Exemplo de Requisição');
      expect(result).toContain('GET /api/templates/:id');
      expect(result).not.toContain('```json');
    });
  });

  describe('formatExampleResponse', () => {
    it('should format example response', () => {
      const exampleData = {
        success: true,
        data: {
          id: 'abc123',
          name: 'My Template',
          status: 'DRAFT',
        },
      };

      const result = formatExampleResponse(201, exampleData);

      expect(result).toContain('#### Exemplo de Resposta (201)');
      expect(result).toContain('```json');
      expect(result).toContain('"success": true');
      expect(result).toContain('"id": "abc123"');
      expect(result).toContain('"name": "My Template"');
    });
  });

  describe('formatApiDocumentation', () => {
    it('should format complete API documentation with multiple resources', () => {
      const endpointsByResource = new Map<string, ApiEndpoint[]>();

      endpointsByResource.set('templates', [
        {
          method: 'GET',
          path: '/api/templates',
          description: 'List templates',
          parameters: [],
          responses: [
            {
              statusCode: 200,
              description: 'OK',
            },
          ],
        },
      ]);

      endpointsByResource.set('documents', [
        {
          method: 'GET',
          path: '/api/documents',
          description: 'List documents',
          parameters: [],
          responses: [
            {
              statusCode: 200,
              description: 'OK',
            },
          ],
        },
      ]);

      const result = formatApiDocumentation(endpointsByResource);

      // Should contain both resources
      expect(result).toContain('## Documents');
      expect(result).toContain('## Templates');

      // Should contain endpoints
      expect(result).toContain('### GET /api/templates');
      expect(result).toContain('### GET /api/documents');
    });

    it('should sort resources alphabetically', () => {
      const endpointsByResource = new Map<string, ApiEndpoint[]>();

      endpointsByResource.set('uploads', [
        {
          method: 'POST',
          path: '/api/uploads',
          description: 'Upload file',
          parameters: [],
          responses: [],
        },
      ]);

      endpointsByResource.set('documents', [
        {
          method: 'GET',
          path: '/api/documents',
          description: 'List documents',
          parameters: [],
          responses: [],
        },
      ]);

      const result = formatApiDocumentation(endpointsByResource);

      // Documents should come before uploads alphabetically
      const documentsIndex = result.indexOf('## Documents');
      const uploadsIndex = result.indexOf('## Uploads');

      expect(documentsIndex).toBeLessThan(uploadsIndex);
    });
  });
});
