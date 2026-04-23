#!/usr/bin/env tsx

/**
 * Example usage of the API formatter
 * Demonstrates how to format API endpoints into Markdown documentation
 */

import { formatEndpoint, formatResourceEndpoints, formatApiDocumentation } from './api-formatter';
import type { ApiEndpoint } from './route-parser';

// Example: Format a single endpoint
const singleEndpoint: ApiEndpoint = {
  method: 'POST',
  path: '/api/templates',
  description: 'Cria um novo template a partir de um PDF já enviado',
  parameters: [],
  requestBody: {
    contentType: 'application/json',
    schemaName: 'createTemplateSchema',
    description: 'Dados do template a ser criado',
  },
  responses: [
    {
      statusCode: 201,
      description: 'Created - Template criado com sucesso',
      successType: 'ApiResponse<Template>',
    },
    {
      statusCode: 400,
      description: 'Bad Request - Dados inválidos ou PDF não encontrado',
    },
  ],
};

console.log('=== Example 1: Single Endpoint ===\n');
console.log(formatEndpoint(singleEndpoint));

// Example: Format multiple endpoints for a resource
const templateEndpoints: ApiEndpoint[] = [
  {
    method: 'GET',
    path: '/api/templates',
    description: 'Lista todos os templates com paginação',
    parameters: [
      {
        name: 'page',
        location: 'query',
        type: 'number',
        required: false,
        description: 'Número da página (padrão: 1)',
      },
      {
        name: 'pageSize',
        location: 'query',
        type: 'number',
        required: false,
        description: 'Itens por página (padrão: 20, máximo: 100)',
      },
    ],
    responses: [
      {
        statusCode: 200,
        description: 'OK - Lista de templates retornada com sucesso',
        successType: 'ApiResponse<PaginatedResponse<Template>>',
      },
    ],
  },
  {
    method: 'GET',
    path: '/api/templates/:id',
    description: 'Busca um template específico por ID',
    parameters: [
      {
        name: 'id',
        location: 'path',
        type: 'string',
        required: true,
        description: 'ID do template',
      },
    ],
    responses: [
      {
        statusCode: 200,
        description: 'OK - Template encontrado',
        successType: 'ApiResponse<Template>',
      },
      {
        statusCode: 404,
        description: 'Not Found - Template não encontrado',
      },
    ],
  },
  singleEndpoint,
];

console.log('\n=== Example 2: Resource Endpoints ===\n');
console.log(formatResourceEndpoints('templates', templateEndpoints));

// Example: Format complete API documentation with multiple resources
const endpointsByResource = new Map<string, ApiEndpoint[]>();

endpointsByResource.set('templates', templateEndpoints);

endpointsByResource.set('documents', [
  {
    method: 'GET',
    path: '/api/documents',
    description: 'Lista todos os documentos com paginação',
    parameters: [
      {
        name: 'page',
        location: 'query',
        type: 'number',
        required: false,
        description: 'Número da página',
      },
    ],
    responses: [
      {
        statusCode: 200,
        description: 'OK - Lista de documentos',
        successType: 'ApiResponse<PaginatedResponse<Document>>',
      },
    ],
  },
  {
    method: 'POST',
    path: '/api/documents/:id/generate',
    description: 'Gera o PDF final do documento',
    parameters: [
      {
        name: 'id',
        location: 'path',
        type: 'string',
        required: true,
        description: 'ID do documento',
      },
    ],
    responses: [
      {
        statusCode: 200,
        description: 'OK - Geração iniciada',
        successType: 'ApiResponse<{ jobId: string }>',
      },
      {
        statusCode: 400,
        description: 'Bad Request - Documento já está sendo gerado',
      },
      {
        statusCode: 404,
        description: 'Not Found - Documento não encontrado',
      },
    ],
  },
]);

console.log('\n=== Example 3: Complete API Documentation ===\n');
const completeDoc = formatApiDocumentation(endpointsByResource);
console.log(completeDoc.substring(0, 1000));
console.log('\n... (truncated for brevity) ...\n');
console.log(`Total length: ${completeDoc.length} characters`);
