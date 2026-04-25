#!/usr/bin/env tsx

/**
 * Simple test runner for API formatter
 */

import {
  formatEndpoint,
  formatParameters,
  formatRequestBody,
  formatResponses,
  formatResourceEndpoints,
  formatExampleRequest,
  formatExampleResponse,
  formatApiDocumentation,
} from './docs/api-formatter';
import type { ApiEndpoint, Parameter, RequestBody, Response } from './docs/route-parser';

console.log('Testing API Formatter...\n');

// Test 1: formatParameters
console.log('Test 1: formatParameters');
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

const paramResult = formatParameters(parameters);
console.log(paramResult);
console.assert(
  paramResult.includes('| Nome | Localização | Tipo | Obrigatório | Descrição |'),
  'Should have table headers',
);
console.assert(
  paramResult.includes('| id | path | string | Sim | Template ID |'),
  'Should have id parameter',
);
console.assert(
  paramResult.includes('| page | query | number | Não | Page number |'),
  'Should have page parameter',
);
console.log('✓ formatParameters works\n');

// Test 2: formatRequestBody
console.log('Test 2: formatRequestBody');
const requestBody: RequestBody = {
  contentType: 'application/json',
  schemaName: 'createTemplateSchema',
  description: 'Template creation data',
};

const bodyResult = formatRequestBody(requestBody);
console.log(bodyResult);
console.assert(
  bodyResult.includes('**Content-Type:** `application/json`'),
  'Should have content type',
);
console.assert(
  bodyResult.includes('**Schema:** `createTemplateSchema`'),
  'Should have schema name',
);
console.assert(bodyResult.includes('Template creation data'), 'Should have description');
console.log('✓ formatRequestBody works\n');

// Test 3: formatResponses
console.log('Test 3: formatResponses');
const responses: Response[] = [
  {
    statusCode: 200,
    description: 'OK - Request successful',
    successType: 'ApiResponse',
  },
  {
    statusCode: 404,
    description: 'Not Found - Resource not found',
  },
];

const responseResult = formatResponses(responses);
console.log(responseResult);
console.assert(responseResult.includes('**Sucesso (200):**'), 'Should have success response');
console.assert(responseResult.includes('**Erro (404):**'), 'Should have error response');
console.assert(
  responseResult.includes('Tipo de resposta: `ApiResponse`'),
  'Should have response type',
);
console.log('✓ formatResponses works\n');

// Test 4: formatEndpoint
console.log('Test 4: formatEndpoint');
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
  ],
};

const endpointResult = formatEndpoint(endpoint);
console.log(endpointResult.substring(0, 500) + '...');
console.assert(endpointResult.includes('### POST /api/templates'), 'Should have endpoint heading');
console.assert(endpointResult.includes('Create a new template'), 'Should have description');
console.assert(endpointResult.includes('#### Parâmetros'), 'Should have parameters section');
console.assert(
  endpointResult.includes('#### Corpo da Requisição'),
  'Should have request body section',
);
console.assert(endpointResult.includes('#### Respostas'), 'Should have responses section');
console.log('✓ formatEndpoint works\n');

// Test 5: formatResourceEndpoints
console.log('Test 5: formatResourceEndpoints');
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

const resourceResult = formatResourceEndpoints('templates', endpoints);
console.log(resourceResult.substring(0, 300) + '...');
console.assert(resourceResult.includes('## Templates'), 'Should have resource heading');
console.assert(resourceResult.includes('### GET /api/templates'), 'Should have GET endpoint');
console.assert(resourceResult.includes('### POST /api/templates'), 'Should have POST endpoint');
console.log('✓ formatResourceEndpoints works\n');

// Test 6: formatExampleRequest
console.log('Test 6: formatExampleRequest');
const exampleData = {
  name: 'My Template',
  description: 'A test template',
};

const exampleRequestResult = formatExampleRequest(endpoint, exampleData);
console.log(exampleRequestResult);
console.assert(
  exampleRequestResult.includes('#### Exemplo de Requisição'),
  'Should have example heading',
);
console.assert(
  exampleRequestResult.includes('POST /api/templates'),
  'Should have HTTP method and path',
);
console.assert(exampleRequestResult.includes('"name": "My Template"'), 'Should have example data');
console.log('✓ formatExampleRequest works\n');

// Test 7: formatExampleResponse
console.log('Test 7: formatExampleResponse');
const exampleResponseData = {
  success: true,
  data: {
    id: 'abc123',
    name: 'My Template',
    status: 'DRAFT',
  },
};

const exampleResponseResult = formatExampleResponse(201, exampleResponseData);
console.log(exampleResponseResult);
console.assert(
  exampleResponseResult.includes('#### Exemplo de Resposta (201)'),
  'Should have response heading',
);
console.assert(exampleResponseResult.includes('"success": true'), 'Should have success field');
console.assert(exampleResponseResult.includes('"id": "abc123"'), 'Should have id field');
console.log('✓ formatExampleResponse works\n');

// Test 8: formatApiDocumentation
console.log('Test 8: formatApiDocumentation');
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

const apiDocResult = formatApiDocumentation(endpointsByResource);
console.log(apiDocResult.substring(0, 400) + '...');
console.assert(apiDocResult.includes('## Documents'), 'Should have Documents resource');
console.assert(apiDocResult.includes('## Templates'), 'Should have Templates resource');
console.assert(
  apiDocResult.indexOf('## Documents') < apiDocResult.indexOf('## Templates'),
  'Should be sorted alphabetically',
);
console.log('✓ formatApiDocumentation works\n');

console.log('✅ All tests passed!');
