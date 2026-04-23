/**
 * API Reference Documentation Generator
 * 
 * Generates comprehensive API documentation from parsed route files.
 * Includes endpoint listings, request/response formats, and examples.
 */

import type { RouteParserOutput, ApiEndpoint, Parameter, RequestBody, Response } from '../route-parser';
import type { DocGenerator } from './types';
import { heading, codeBlock, table, list } from '../markdown-formatter';
import { groupEndpointsByResource } from '../route-parser';

/**
 * Generates API reference documentation
 * 
 * @param output - Parsed routes output
 * @returns Markdown documentation string
 */
export const generateApiReferenceDocs: DocGenerator<RouteParserOutput> = (output) => {
  let markdown = '';
  
  // Title and introduction
  markdown += heading('Referência da API', 1);
  markdown += 'Este documento descreve todos os endpoints da API REST do RegCheck.\n\n';
  
  markdown += `**Fonte:** ${output.source}\n`;
  markdown += `**Gerado em:** ${new Date(output.generatedAt).toLocaleString('pt-BR')}\n\n`;
  
  // Base URL
  markdown += heading('URL Base', 2);
  markdown += codeBlock('http://localhost:4000/api', 'text');
  
  // Response format
  markdown += heading('Formato de Resposta', 2);
  markdown += 'Todas as respostas seguem o formato padrão `ApiResponse`:\n\n';
  
  const successExample = {
    success: true,
    data: '{ ... }',
  };
  markdown += codeBlock(JSON.stringify(successExample, null, 2), 'json');
  
  const errorExample = {
    success: false,
    error: {
      code: 'ERROR_CODE',
      message: 'Descrição do erro',
    },
  };
  markdown += codeBlock(JSON.stringify(errorExample, null, 2), 'json');
  
  // Authentication
  markdown += heading('Autenticação', 2);
  markdown += '**Status:** não identificado\n\n';
  
  // Endpoints by resource
  markdown += heading('Endpoints', 2);
  
  const grouped = groupEndpointsByResource(output);
  const sortedResources = Array.from(grouped.keys()).sort();
  
  for (const resource of sortedResources) {
    const endpoints = grouped.get(resource)!;
    markdown += generateResourceSection(resource, endpoints);
  }
  
  // References
  markdown += heading('Referências', 2);
  markdown += list([
    'Código fonte das rotas: `apps/api/src/routes/`',
    'Schemas de validação: Zod schemas nos arquivos de rota',
  ], false);
  
  return markdown;
};

/**
 * Generates documentation section for a resource
 */
function generateResourceSection(resource: string, endpoints: ApiEndpoint[]): string {
  let markdown = '';
  
  markdown += heading(capitalizeResource(resource), 3);
  markdown += `Endpoints relacionados a **${resource}**.\n\n`;
  
  // Sort endpoints by method and path
  const sorted = endpoints.sort((a, b) => {
    if (a.path !== b.path) {
      return a.path.localeCompare(b.path);
    }
    return a.method.localeCompare(b.method);
  });
  
  for (const endpoint of sorted) {
    markdown += generateEndpointSection(endpoint);
  }
  
  return markdown;
}

/**
 * Capitalizes resource name
 */
function capitalizeResource(resource: string): string {
  const names: Record<string, string> = {
    templates: 'Templates',
    documents: 'Documentos',
    uploads: 'Uploads',
    equipamentos: 'Equipamentos',
    lojas: 'Lojas',
    setores: 'Setores',
    tipos: 'Tipos de Equipamento',
    fields: 'Campos',
  };
  
  return names[resource] || resource.charAt(0).toUpperCase() + resource.slice(1);
}

/**
 * Generates documentation for a single endpoint
 */
function generateEndpointSection(endpoint: ApiEndpoint): string {
  let markdown = '';
  
  // Endpoint header
  markdown += heading(`${endpoint.method} ${endpoint.path}`, 4);
  
  if (endpoint.description) {
    markdown += `${endpoint.description}\n\n`;
  }
  
  // Parameters
  if (endpoint.parameters.length > 0) {
    markdown += '**Parâmetros:**\n\n';
    markdown += generateParametersTable(endpoint.parameters);
  }
  
  // Request body
  if (endpoint.requestBody) {
    markdown += '**Corpo da Requisição:**\n\n';
    markdown += generateRequestBodySection(endpoint.requestBody);
  }
  
  // Responses
  if (endpoint.responses.length > 0) {
    markdown += '**Respostas:**\n\n';
    markdown += generateResponsesTable(endpoint.responses);
  }
  
  // Example
  markdown += generateExampleSection(endpoint);
  
  markdown += '---\n\n';
  
  return markdown;
}

/**
 * Generates parameters table
 */
function generateParametersTable(parameters: Parameter[]): string {
  const headers = ['Nome', 'Localização', 'Tipo', 'Obrigatório', 'Descrição'];
  const rows = parameters.map(p => [
    p.name,
    p.location === 'path' ? 'Path' : p.location === 'query' ? 'Query' : 'Header',
    p.type,
    p.required ? 'Sim' : 'Não',
    p.description,
  ]);
  
  return table(headers, rows);
}

/**
 * Generates request body section
 */
function generateRequestBodySection(body: RequestBody): string {
  let markdown = '';
  
  markdown += `- **Content-Type:** \`${body.contentType}\`\n`;
  
  if (body.schemaName) {
    markdown += `- **Schema:** \`${body.schemaName}\`\n`;
  }
  
  if (body.description) {
    markdown += `- **Descrição:** ${body.description}\n`;
  }
  
  markdown += '\n';
  
  return markdown;
}

/**
 * Generates responses table
 */
function generateResponsesTable(responses: Response[]): string {
  const headers = ['Status', 'Descrição'];
  const rows = responses.map(r => [
    r.statusCode.toString(),
    r.description,
  ]);
  
  return table(headers, rows);
}

/**
 * Generates example request/response
 */
function generateExampleSection(endpoint: ApiEndpoint): string {
  let markdown = '';
  
  markdown += '**Exemplo:**\n\n';
  
  // Request example
  const requestExample = generateRequestExample(endpoint);
  if (requestExample) {
    markdown += 'Requisição:\n\n';
    markdown += codeBlock(requestExample, 'http');
  }
  
  // Response example
  const responseExample = generateResponseExample(endpoint);
  if (responseExample) {
    markdown += 'Resposta:\n\n';
    markdown += codeBlock(responseExample, 'json');
  }
  
  return markdown;
}

/**
 * Generates request example
 */
function generateRequestExample(endpoint: ApiEndpoint): string | null {
  let example = `${endpoint.method} /api${endpoint.path}`;
  
  // Replace path params with example values
  example = example.replace(/:id/g, '123e4567-e89b-12d3-a456-426614174000');
  example = example.replace(/:(\w+)/g, 'example-$1');
  
  // Add query params if present
  const queryParams = endpoint.parameters.filter(p => p.location === 'query');
  if (queryParams.length > 0) {
    const params = queryParams.map(p => `${p.name}=${getExampleValue(p.type)}`).join('&');
    example += `?${params}`;
  }
  
  example += ' HTTP/1.1\n';
  example += 'Host: localhost:4000\n';
  example += 'Content-Type: application/json';
  
  // Add request body if present
  if (endpoint.requestBody && endpoint.requestBody.contentType === 'application/json') {
    example += '\n\n';
    example += generateRequestBodyExample(endpoint);
  }
  
  return example;
}

/**
 * Generates request body example
 */
function generateRequestBodyExample(endpoint: ApiEndpoint): string {
  const examples: Record<string, any> = {
    createTemplateSchema: {
      title: 'Checklist de Manutenção',
      pdfFileId: '123e4567-e89b-12d3-a456-426614174000',
    },
    updateTemplateSchema: {
      title: 'Checklist Atualizado',
    },
    createDocumentSchema: {
      templateId: '123e4567-e89b-12d3-a456-426614174000',
      title: 'Documento 001',
    },
    saveFilledDataSchema: {
      fields: [
        { fieldId: 'field-1', value: 'Valor preenchido' },
      ],
    },
  };
  
  const schemaName = endpoint.requestBody?.schemaName;
  if (schemaName && examples[schemaName]) {
    return JSON.stringify(examples[schemaName], null, 2);
  }
  
  return JSON.stringify({ example: 'data' }, null, 2);
}

/**
 * Generates response example
 */
function generateResponseExample(endpoint: ApiEndpoint): string | null {
  const successResponse = endpoint.responses.find(r => r.statusCode >= 200 && r.statusCode < 300);
  
  if (!successResponse) {
    return null;
  }
  
  const response = {
    success: true,
    data: generateResponseDataExample(endpoint),
  };
  
  return JSON.stringify(response, null, 2);
}

/**
 * Generates response data example based on endpoint
 */
function generateResponseDataExample(endpoint: ApiEndpoint): any {
  // List endpoints
  if (endpoint.method === 'GET' && endpoint.path === '/') {
    return {
      items: [{ id: '123', name: 'Exemplo' }],
      total: 1,
      page: 1,
      pageSize: 20,
    };
  }
  
  // Get by ID
  if (endpoint.method === 'GET' && endpoint.path.includes(':id')) {
    return {
      id: '123e4567-e89b-12d3-a456-426614174000',
      name: 'Exemplo',
      createdAt: '2024-01-01T00:00:00.000Z',
    };
  }
  
  // Create
  if (endpoint.method === 'POST') {
    return {
      id: '123e4567-e89b-12d3-a456-426614174000',
      message: 'Criado com sucesso',
    };
  }
  
  // Update
  if (endpoint.method === 'PATCH') {
    return {
      id: '123e4567-e89b-12d3-a456-426614174000',
      message: 'Atualizado com sucesso',
    };
  }
  
  // Delete
  if (endpoint.method === 'DELETE') {
    return {
      message: 'Removido com sucesso',
    };
  }
  
  return { example: 'data' };
}

/**
 * Gets example value for a parameter type
 */
function getExampleValue(type: string): string {
  const examples: Record<string, string> = {
    string: 'example',
    number: '10',
    boolean: 'true',
  };
  
  return examples[type] || 'value';
}
