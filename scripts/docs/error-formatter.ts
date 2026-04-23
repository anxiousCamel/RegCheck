/**
 * Error Documentation Formatter
 * 
 * Formats parsed error codes into readable Markdown documentation.
 * Uses the markdown formatter utilities for consistent output.
 */

import { heading, table, codeBlock } from './markdown-formatter';
import type { ParsedError, ErrorCodeParserOutput } from './error-parser';

/**
 * Format complete error documentation
 * 
 * @param output - Parsed error codes output
 * @returns Formatted Markdown documentation
 */
export function formatErrorDocumentation(output: ErrorCodeParserOutput): string {
  let markdown = '';
  
  // Introduction
  markdown += heading('Códigos de Erro', 1);
  markdown += 'Este documento lista todos os códigos de erro utilizados na API do RegCheck.\n\n';
  
  // Error response format
  markdown += heading('Formato de Resposta de Erro', 2);
  markdown += 'Todas as respostas de erro seguem o formato padrão:\n\n';
  
  const errorExample = {
    success: false,
    error: {
      code: 'ERROR_CODE',
      message: 'Descrição do erro',
    },
  };
  
  markdown += codeBlock(JSON.stringify(errorExample, null, 2), 'json');
  
  // Error codes table
  markdown += heading('Referência de Códigos de Erro', 2);
  markdown += formatErrorTable(output.data);
  
  // Errors by status code
  markdown += heading('Erros por Status HTTP', 2);
  markdown += formatErrorsByStatus(output.data);
  
  // Examples
  markdown += heading('Exemplos de Respostas de Erro', 2);
  markdown += formatErrorExamples(output.data);
  
  return markdown;
}

/**
 * Format error codes as a table
 */
export function formatErrorTable(errors: ParsedError[]): string {
  const headers = ['Código', 'Status HTTP', 'Mensagem', 'Contexto'];
  const rows = errors.map(err => [
    err.code,
    err.httpStatus.toString(),
    err.message,
    err.context || '-',
  ]);
  
  return table(headers, rows);
}

/**
 * Format errors grouped by HTTP status code
 */
export function formatErrorsByStatus(errors: ParsedError[]): string {
  let markdown = '';
  
  // Group by status code
  const grouped = new Map<number, ParsedError[]>();
  for (const error of errors) {
    if (!grouped.has(error.httpStatus)) {
      grouped.set(error.httpStatus, []);
    }
    grouped.get(error.httpStatus)!.push(error);
  }
  
  // Sort by status code
  const sortedStatuses = Array.from(grouped.keys()).sort((a, b) => a - b);
  
  for (const status of sortedStatuses) {
    const statusErrors = grouped.get(status)!;
    const statusLabel = getStatusLabel(status);
    
    markdown += heading(`${status} - ${statusLabel}`, 3);
    
    for (const error of statusErrors) {
      markdown += `- **${error.code}**: ${error.message}\n`;
      if (error.context) {
        markdown += `  - *Contexto*: ${error.context}\n`;
      }
    }
    
    markdown += '\n';
  }
  
  return markdown;
}

/**
 * Format error examples
 */
export function formatErrorExamples(errors: ParsedError[]): string {
  let markdown = '';
  
  // Select a few representative errors for examples
  const exampleErrors = [
    errors.find(e => e.code === 'NOT_FOUND'),
    errors.find(e => e.code === 'VALIDATION_ERROR'),
    errors.find(e => e.code === 'TEMPLATE_NOT_PUBLISHED'),
  ].filter(Boolean) as ParsedError[];
  
  for (const error of exampleErrors) {
    markdown += heading(`Exemplo: ${error.code}`, 3);
    
    const example = {
      success: false,
      error: {
        code: error.code,
        message: error.message,
      },
    };
    
    markdown += codeBlock(JSON.stringify(example, null, 2), 'json');
  }
  
  return markdown;
}

/**
 * Get HTTP status label
 */
function getStatusLabel(status: number): string {
  const labels: Record<number, string> = {
    400: 'Bad Request',
    401: 'Unauthorized',
    403: 'Forbidden',
    404: 'Not Found',
    409: 'Conflict',
    422: 'Unprocessable Entity',
    500: 'Internal Server Error',
  };
  
  return labels[status] || 'Unknown';
}

/**
 * Format a single error for inline documentation
 */
export function formatError(error: ParsedError): string {
  let markdown = '';
  
  markdown += `**${error.code}** (${error.httpStatus}): ${error.message}`;
  
  if (error.context) {
    markdown += `\n- *Contexto*: ${error.context}`;
  }
  
  markdown += '\n\n';
  
  return markdown;
}
