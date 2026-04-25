/**
 * Error Code Parser
 *
 * Parses error codes from the codebase to extract:
 * - Error codes (e.g., 'NOT_FOUND', 'VALIDATION_ERROR')
 * - HTTP status codes
 * - Error messages
 * - Context (where/when the error occurs)
 * - Source files
 *
 * Follows standardized ParserOutput format for consistency.
 */

import * as ts from 'typescript';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Standardized parsed error structure
 */
export interface ParsedError {
  code: string;
  message: string;
  httpStatus: number;
  context?: string;
  sourceFile: string;
}

/**
 * Standardized parser output format
 */
export interface ParserOutput<T> {
  source: string;
  generatedAt: string;
  data: T;
}

/**
 * Error code parser output
 */
export interface ErrorCodeParserOutput extends ParserOutput<ParsedError[]> {
  source: 'error-code-parser';
  generatedAt: string;
  data: ParsedError[];
}

/**
 * Parse all error codes from the codebase
 *
 * @param routesDir - Directory containing route files
 * @param servicesDir - Directory containing service files
 * @param errorHandlerPath - Path to error handler middleware
 * @returns Standardized parser output with all error codes
 */
export function parseErrorCodes(
  routesDir: string,
  servicesDir: string,
  errorHandlerPath: string,
): ErrorCodeParserOutput {
  const errorMap = new Map<string, ParsedError>();

  // Parse error handler for standard errors
  const handlerErrors = parseErrorHandler(errorHandlerPath);
  handlerErrors.forEach((err) => errorMap.set(err.code, err));

  // Parse service files for AppError throws
  const serviceFiles = getAllTypeScriptFiles(servicesDir);
  for (const file of serviceFiles) {
    const fileErrors = parseFileForErrors(file);
    fileErrors.forEach((err) => {
      if (!errorMap.has(err.code)) {
        errorMap.set(err.code, err);
      }
    });
  }

  // Parse route files for error responses
  const routeFiles = getAllTypeScriptFiles(routesDir);
  for (const file of routeFiles) {
    const fileErrors = parseFileForErrors(file);
    fileErrors.forEach((err) => {
      if (!errorMap.has(err.code)) {
        errorMap.set(err.code, err);
      }
    });
  }

  // Convert map to array and sort by code
  const sortedErrors = Array.from(errorMap.values()).sort((a, b) => a.code.localeCompare(b.code));

  return {
    source: 'error-code-parser',
    generatedAt: new Date().toISOString(),
    data: sortedErrors,
  };
}

/**
 * Parse error handler middleware for standard error codes
 */
function parseErrorHandler(filePath: string): ParsedError[] {
  const errors: ParsedError[] = [];
  const content = fs.readFileSync(filePath, 'utf-8');

  // Extract VALIDATION_ERROR from ZodError handling
  if (content.includes('VALIDATION_ERROR')) {
    errors.push({
      code: 'VALIDATION_ERROR',
      message: 'Request validation failed',
      httpStatus: 400,
      context: 'Zod schema validation failure',
      sourceFile: path.relative(process.cwd(), filePath),
    });
  }

  // Extract INTERNAL_ERROR from default error handling
  if (content.includes('INTERNAL_ERROR')) {
    errors.push({
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
      httpStatus: 500,
      context: 'Unhandled error',
      sourceFile: path.relative(process.cwd(), filePath),
    });
  }

  return errors;
}

/**
 * Parse a TypeScript file for error codes
 */
function parseFileForErrors(filePath: string): ParsedError[] {
  const errors: ParsedError[] = [];
  const content = fs.readFileSync(filePath, 'utf-8');
  const sourceFile = ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, true);

  const relativeFilePath = path.relative(process.cwd(), filePath);

  function visit(node: ts.Node) {
    // Pattern 1: throw new AppError(statusCode, message, code)
    if (ts.isNewExpression(node)) {
      const error = extractAppError(node, content, relativeFilePath);
      if (error) {
        errors.push(error);
      }
    }

    // Pattern 2: res.status(code).json({ error: { code: 'ERROR_CODE' } })
    if (ts.isCallExpression(node)) {
      const error = extractErrorResponse(node, content, relativeFilePath);
      if (error) {
        errors.push(error);
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);

  return errors;
}

/**
 * Extract error from AppError constructor
 */
function extractAppError(
  node: ts.NewExpression,
  sourceContent: string,
  sourceFile: string,
): ParsedError | null {
  // Check if it's new AppError(...)
  if (!ts.isIdentifier(node.expression) || node.expression.text !== 'AppError') {
    return null;
  }

  const args = node.arguments;
  if (!args || args.length < 3) {
    return null;
  }

  // Extract status code (first argument)
  const statusArg = args[0];
  if (!statusArg) return null;
  let httpStatus = 500;
  if (ts.isNumericLiteral(statusArg)) {
    httpStatus = parseInt(statusArg.text, 10);
  }

  // Extract message (second argument)
  const messageArg = args[1];
  if (!messageArg) return null;
  let message = 'Unknown error';
  if (ts.isStringLiteral(messageArg)) {
    message = messageArg.text;
  }

  // Extract code (third argument)
  const codeArg = args[2];
  if (!codeArg) return null;
  let code = 'UNKNOWN';
  if (ts.isStringLiteral(codeArg)) {
    code = codeArg.text;
  }

  // Extract context from surrounding code
  const context = extractContext(node, sourceContent);

  return {
    code,
    message,
    httpStatus,
    ...(context !== undefined ? { context } : {}),
    sourceFile,
  };
}

/**
 * Extract error from res.status().json({ error: ... }) pattern
 */
function extractErrorResponse(
  node: ts.CallExpression,
  sourceContent: string,
  sourceFile: string,
): ParsedError | null {
  // Check if it's a .json() call
  if (!ts.isPropertyAccessExpression(node.expression)) {
    return null;
  }

  if (node.expression.name.text !== 'json') {
    return null;
  }

  // Check if the object has .status() call before .json()
  const statusCall = node.expression.expression;
  if (!ts.isCallExpression(statusCall)) {
    return null;
  }

  if (!ts.isPropertyAccessExpression(statusCall.expression)) {
    return null;
  }

  if (statusCall.expression.name.text !== 'status') {
    return null;
  }

  // Extract status code
  let httpStatus = 500;
  if (statusCall.arguments.length > 0) {
    const statusArg = statusCall.arguments[0];
    if (statusArg && ts.isNumericLiteral(statusArg)) {
      httpStatus = parseInt(statusArg.text, 10);
    }
  }

  // Extract error object from json() argument
  if (node.arguments.length === 0) {
    return null;
  }

  const jsonArg = node.arguments[0];
  if (!jsonArg || !ts.isObjectLiteralExpression(jsonArg)) {
    return null;
  }

  // Look for error property
  let code = 'UNKNOWN';
  let message = 'Unknown error';

  for (const prop of jsonArg.properties) {
    if (!ts.isPropertyAssignment(prop)) continue;

    if (ts.isIdentifier(prop.name) && prop.name.text === 'error') {
      if (ts.isObjectLiteralExpression(prop.initializer)) {
        for (const errorProp of prop.initializer.properties) {
          if (!ts.isPropertyAssignment(errorProp)) continue;

          if (ts.isIdentifier(errorProp.name)) {
            if (errorProp.name.text === 'code' && ts.isStringLiteral(errorProp.initializer)) {
              code = errorProp.initializer.text;
            }
            if (errorProp.name.text === 'message' && ts.isStringLiteral(errorProp.initializer)) {
              message = errorProp.initializer.text;
            }
          }
        }
      }
    }
  }

  if (code === 'UNKNOWN') {
    return null;
  }

  const context = extractContext(node, sourceContent);

  return {
    code,
    message,
    httpStatus,
    ...(context !== undefined ? { context } : {}),
    sourceFile,
  };
}

/**
 * Extract context from surrounding code
 */
function extractContext(node: ts.Node, sourceContent: string): string | undefined {
  // Get the line containing the error
  const sourceFile = node.getSourceFile();
  const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart());

  // Get a few lines before for context
  const lines = sourceContent.split('\n');
  const contextLines: string[] = [];

  // Look back up to 5 lines for context
  for (let i = Math.max(0, line - 5); i < line; i++) {
    const rawLine = lines[i];
    if (rawLine === undefined) continue;
    const contextLine = rawLine.trim();
    if (contextLine && !contextLine.startsWith('//') && !contextLine.startsWith('/*')) {
      contextLines.push(contextLine);
    }
  }

  // Extract meaningful context
  const context = contextLines.join(' ');

  // Look for common patterns
  if (context.includes('findUnique') || context.includes('findFirst')) {
    return 'Resource not found in database';
  }
  if (context.includes('count') && context.includes('> 0')) {
    return 'Resource has dependent records';
  }
  if (context.includes('status') && context.includes('PUBLISHED')) {
    return 'Template is published and cannot be modified';
  }
  if (context.includes('file.size')) {
    return 'File size exceeds limit';
  }
  if (context.includes('mimetype')) {
    return 'Invalid file type';
  }
  if (context.includes('pageCount')) {
    return 'PDF has too many pages';
  }

  return undefined;
}

/**
 * Get all TypeScript files in a directory recursively
 */
function getAllTypeScriptFiles(dir: string): string[] {
  const files: string[] = [];

  if (!fs.existsSync(dir)) {
    return files;
  }

  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      // Skip test directories and node_modules
      if (entry.name === '__tests__' || entry.name === 'node_modules') {
        continue;
      }
      files.push(...getAllTypeScriptFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.ts') && !entry.name.endsWith('.test.ts')) {
      files.push(fullPath);
    }
  }

  return files;
}

/**
 * Group errors by HTTP status code
 */
export function groupErrorsByStatus(errors: ParsedError[]): Map<number, ParsedError[]> {
  const groups = new Map<number, ParsedError[]>();

  for (const error of errors) {
    if (!groups.has(error.httpStatus)) {
      groups.set(error.httpStatus, []);
    }
    groups.get(error.httpStatus)!.push(error);
  }

  return groups;
}

/**
 * Get all unique error codes
 */
export function getErrorCodes(output: ErrorCodeParserOutput): string[] {
  return output.data.map((e) => e.code);
}

/**
 * Get error by code
 */
export function getErrorByCode(
  output: ErrorCodeParserOutput,
  code: string,
): ParsedError | undefined {
  return output.data.find((e) => e.code === code);
}
