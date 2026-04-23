/**
 * API Documentation Formatter
 * 
 * Formats API endpoint information into readable Markdown documentation.
 * Uses the markdown formatter utilities to generate consistent documentation.
 */

import { heading, codeBlock, table } from './markdown-formatter';
import type { ApiEndpoint, Parameter, RequestBody, Response } from './route-parser';

/**
 * Format a single API endpoint into Markdown documentation
 * 
 * @param endpoint - The API endpoint to format
 * @returns Formatted Markdown string
 */
export function formatEndpoint(endpoint: ApiEndpoint): string {
  let output = '';
  
  // Endpoint heading with method and path
  output += heading(`${endpoint.method} ${endpoint.path}`, 3);
  
  // Description
  if (endpoint.description) {
    output += endpoint.description + '\n\n';
  }
  
  // Parameters section
  if (endpoint.parameters.length > 0) {
    output += heading('Parâmetros', 4);
    output += formatParameters(endpoint.parameters);
  } else {
    output += heading('Parâmetros', 4);
    output += 'Nenhum\n\n';
  }
  
  // Request body section
  if (endpoint.requestBody) {
    output += heading('Corpo da Requisição', 4);
    output += formatRequestBody(endpoint.requestBody);
  }
  
  // Responses section
  if (endpoint.responses.length > 0) {
    output += heading('Respostas', 4);
    output += formatResponses(endpoint.responses);
  }
  
  return output;
}

/**
 * Format parameters into a Markdown table
 * 
 * @param parameters - Array of parameters to format
 * @returns Formatted Markdown table
 */
export function formatParameters(parameters: Parameter[]): string {
  const headers = ['Nome', 'Localização', 'Tipo', 'Obrigatório', 'Descrição'];
  const rows = parameters.map(param => [
    param.name,
    param.location,
    param.type,
    param.required ? 'Sim' : 'Não',
    param.description,
  ]);
  
  return table(headers, rows);
}

/**
 * Format request body information
 * 
 * @param requestBody - Request body information
 * @returns Formatted Markdown string
 */
export function formatRequestBody(requestBody: RequestBody): string {
  let output = '';
  
  output += `**Content-Type:** \`${requestBody.contentType}\`\n\n`;
  
  if (requestBody.schemaName) {
    output += `**Schema:** \`${requestBody.schemaName}\`\n\n`;
  }
  
  if (requestBody.description) {
    output += requestBody.description + '\n\n';
  }
  
  return output;
}

/**
 * Format response information
 * 
 * @param responses - Array of responses to format
 * @returns Formatted Markdown string
 */
export function formatResponses(responses: Response[]): string {
  let output = '';
  
  for (const response of responses) {
    const statusLabel = response.statusCode >= 200 && response.statusCode < 300 
      ? 'Sucesso' 
      : 'Erro';
    
    output += `**${statusLabel} (${response.statusCode}):** ${response.description}\n\n`;
    
    if (response.successType) {
      output += `Tipo de resposta: \`${response.successType}\`\n\n`;
    }
  }
  
  return output;
}

/**
 * Format multiple endpoints grouped by resource
 * 
 * @param resourceName - Name of the resource (e.g., 'templates', 'documents')
 * @param endpoints - Array of endpoints for this resource
 * @returns Formatted Markdown string
 */
export function formatResourceEndpoints(resourceName: string, endpoints: ApiEndpoint[]): string {
  let output = '';
  
  // Resource heading
  const resourceTitle = capitalizeResourceName(resourceName);
  output += heading(resourceTitle, 2);
  
  // Format each endpoint
  for (const endpoint of endpoints) {
    output += formatEndpoint(endpoint);
  }
  
  return output;
}

/**
 * Capitalize and format resource name for display
 * 
 * @param resourceName - Raw resource name (e.g., 'templates', 'tipos-equipamento')
 * @returns Formatted resource name
 */
function capitalizeResourceName(resourceName: string): string {
  // Handle special cases
  const specialCases: Record<string, string> = {
    'templates': 'Templates',
    'documents': 'Documents',
    'uploads': 'Uploads',
    'equipamentos': 'Equipamentos',
    'lojas': 'Lojas',
    'setores': 'Setores',
    'tipos-equipamento': 'Tipos de Equipamento',
  };
  
  return specialCases[resourceName] || resourceName.charAt(0).toUpperCase() + resourceName.slice(1);
}

/**
 * Generate example request for an endpoint
 * 
 * @param endpoint - The API endpoint
 * @param exampleData - Example data object
 * @returns Formatted example request
 */
export function formatExampleRequest(endpoint: ApiEndpoint, exampleData: object): string {
  let output = '';
  
  output += heading('Exemplo de Requisição', 4);
  
  // Show the HTTP request line
  output += codeBlock(`${endpoint.method} ${endpoint.path}`, 'http');
  
  // Show request body if applicable
  if (endpoint.requestBody && Object.keys(exampleData).length > 0) {
    output += codeBlock(JSON.stringify(exampleData, null, 2), 'json');
  }
  
  return output;
}

/**
 * Generate example response for an endpoint
 * 
 * @param statusCode - HTTP status code
 * @param exampleData - Example response data object
 * @returns Formatted example response
 */
export function formatExampleResponse(statusCode: number, exampleData: object): string {
  let output = '';
  
  output += heading(`Exemplo de Resposta (${statusCode})`, 4);
  output += codeBlock(JSON.stringify(exampleData, null, 2), 'json');
  
  return output;
}

/**
 * Format complete API documentation with all resources
 * 
 * @param endpointsByResource - Map of resource names to their endpoints
 * @returns Complete formatted API documentation
 */
export function formatApiDocumentation(endpointsByResource: Map<string, ApiEndpoint[]>): string {
  let output = '';
  
  // Sort resources for consistent output
  const sortedResources = Array.from(endpointsByResource.keys()).sort();
  
  for (const resourceName of sortedResources) {
    const endpoints = endpointsByResource.get(resourceName)!;
    output += formatResourceEndpoints(resourceName, endpoints);
  }
  
  return output;
}
