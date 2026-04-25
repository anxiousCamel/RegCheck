/**
 * Error Codes Documentation Generator
 *
 * Generates comprehensive error codes documentation from parsed error definitions.
 * Includes error code reference table, examples, and grouping by HTTP status.
 */

import type { ErrorCodeParserOutput, ParsedError } from '../error-parser';
import type { DocGenerator } from './types';
import { heading, codeBlock, table, list } from '../markdown-formatter';
import { groupErrorsByStatus } from '../error-parser';

/**
 * Generates error codes documentation
 *
 * @param output - Parsed error codes output
 * @returns Markdown documentation string
 */
export const generateErrorCodesDocs: DocGenerator<ErrorCodeParserOutput> = (output) => {
  let markdown = '';

  // Title and introduction
  markdown += heading('Códigos de Erro', 1);
  markdown += 'Este documento lista todos os códigos de erro utilizados na API do RegCheck.\n\n';

  markdown += `**Fonte:** ${output.source}\n`;
  markdown += `**Gerado em:** ${new Date(output.generatedAt).toLocaleString('pt-BR')}\n`;
  markdown += `**Total de erros:** ${output.data.length}\n\n`;

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

  // Error codes reference table
  markdown += heading('Referência de Códigos de Erro', 2);
  markdown += 'Tabela completa com todos os códigos de erro:\n\n';
  markdown += generateErrorsTable(output.data);

  // Errors by HTTP status
  markdown += heading('Erros por Status HTTP', 2);
  markdown += generateErrorsByStatusSection(output.data);

  // Examples
  markdown += heading('Exemplos de Respostas de Erro', 2);
  markdown += generateExamplesSection(output.data);

  // References
  markdown += heading('Referências', 2);
  markdown += list(
    [
      'Error handler: `apps/api/src/middleware/error-handler.ts`',
      'Service files: `apps/api/src/services/`',
      'Route files: `apps/api/src/routes/`',
    ],
    false,
  );

  return markdown;
};

/**
 * Generates complete error codes table
 */
function generateErrorsTable(errors: ParsedError[]): string {
  const headers = ['Código', 'Status HTTP', 'Mensagem', 'Contexto'];
  const rows = errors.map((err) => [
    err.code,
    err.httpStatus.toString(),
    err.message,
    err.context || '-',
  ]);

  return table(headers, rows);
}

/**
 * Generates errors grouped by HTTP status section
 */
function generateErrorsByStatusSection(errors: ParsedError[]): string {
  let markdown = '';

  const grouped = groupErrorsByStatus(errors);
  const sortedStatuses = Array.from(grouped.keys()).sort((a, b) => a - b);

  for (const status of sortedStatuses) {
    const statusErrors = grouped.get(status)!;
    const statusLabel = getStatusLabel(status);

    markdown += heading(`${status} - ${statusLabel}`, 3);
    markdown += `Total: **${statusErrors.length}** erro(s)\n\n`;

    markdown += list(
      statusErrors.map((err) => {
        let item = `**${err.code}**: ${err.message}`;
        if (err.context) {
          item += `\n  - *Contexto:* ${err.context}`;
        }
        return item;
      }),
      false,
    );

    markdown += '\n';
  }

  return markdown;
}

/**
 * Gets HTTP status label
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
 * Generates examples section with common error responses
 */
function generateExamplesSection(errors: ParsedError[]): string {
  let markdown = '';

  // Select representative errors for examples
  const exampleCodes = [
    'NOT_FOUND',
    'VALIDATION_ERROR',
    'TEMPLATE_NOT_PUBLISHED',
    'IN_USE',
    'FILE_TOO_LARGE',
    'ALREADY_GENERATING',
  ];

  const exampleErrors = exampleCodes
    .map((code) => errors.find((e) => e.code === code))
    .filter(Boolean) as ParsedError[];

  for (const error of exampleErrors) {
    markdown += generateErrorExample(error);
  }

  return markdown;
}

/**
 * Generates example for a single error
 */
function generateErrorExample(error: ParsedError): string {
  let markdown = '';

  markdown += heading(`Exemplo: ${error.code}`, 3);

  if (error.context) {
    markdown += `**Contexto:** ${error.context}\n\n`;
  }

  markdown += '**Requisição:**\n\n';
  markdown += codeBlock(generateRequestExample(error), 'http');

  markdown += '**Resposta:**\n\n';
  const response = {
    success: false,
    error: {
      code: error.code,
      message: error.message,
    },
  };

  markdown += codeBlock(JSON.stringify(response, null, 2), 'json');

  return markdown;
}

/**
 * Generates request example based on error type
 */
function generateRequestExample(error: ParsedError): string {
  const examples: Record<string, string> = {
    NOT_FOUND: 'GET /api/templates/invalid-id HTTP/1.1',
    VALIDATION_ERROR: 'POST /api/templates HTTP/1.1\n\n{ "title": "" }',
    TEMPLATE_NOT_PUBLISHED: 'POST /api/documents HTTP/1.1\n\n{ "templateId": "draft-template-id" }',
    IN_USE: 'DELETE /api/lojas/loja-with-equipments HTTP/1.1',
    FILE_TOO_LARGE: 'POST /api/uploads/pdf HTTP/1.1\n\n[arquivo muito grande]',
    ALREADY_GENERATING: 'POST /api/documents/doc-id/generate HTTP/1.1',
    TEMPLATE_PUBLISHED: 'PATCH /api/templates/published-id HTTP/1.1',
    NO_EQUIPMENT: 'POST /api/documents/doc-id/populate HTTP/1.1\n\n{ "filters": {} }',
    INVALID_FILE_TYPE: 'POST /api/uploads/pdf HTTP/1.1\n\n[arquivo .txt]',
  };

  return examples[error.code] || `GET /api/resource HTTP/1.1`;
}

/**
 * Generates summary statistics
 */
export function generateErrorStatistics(errors: ParsedError[]): string {
  let markdown = '';

  markdown += heading('Estatísticas', 2);

  const byStatus = groupErrorsByStatus(errors);
  const statusCounts = Array.from(byStatus.entries())
    .map(([status, errs]) => `- **${status}**: ${errs.length} erro(s)`)
    .join('\n');

  markdown += statusCounts + '\n\n';

  const sourceFiles = new Set(errors.map((e) => e.sourceFile));
  markdown += `**Arquivos fonte:** ${sourceFiles.size}\n\n`;

  return markdown;
}
