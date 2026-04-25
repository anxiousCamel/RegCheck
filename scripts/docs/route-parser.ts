import * as ts from 'typescript';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Standardized parser output format
 */
export interface ParserOutput<T> {
  source: string;
  generatedAt: string;
  data: T;
}

/**
 * Represents an API endpoint extracted from a route file
 */
export interface ApiEndpoint {
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE' | 'PUT';
  path: string;
  description: string;
  parameters: Parameter[];
  requestBody?: RequestBody;
  responses: Response[];
}

export interface Parameter {
  name: string;
  location: 'path' | 'query' | 'header';
  type: string;
  required: boolean;
  description: string;
}

export interface RequestBody {
  contentType: string;
  schemaName?: string;
  description: string;
}

export interface Response {
  statusCode: number;
  description: string;
  successType?: string;
}

/**
 * Route parser output following standardized format
 */
export interface RouteParserOutput extends ParserOutput<ApiEndpoint[]> {
  source: 'route-parser';
  generatedAt: string;
  data: ApiEndpoint[];
}

/**
 * Parse all route files in a directory and extract API endpoints
 *
 * @param routesDir - Directory containing route files
 * @returns Standardized parser output with all endpoints
 */
export function parseRouteFiles(routesDir: string): RouteParserOutput {
  const endpoints: ApiEndpoint[] = [];

  const files = fs
    .readdirSync(routesDir)
    .filter((f) => f.endsWith('.ts') && !f.endsWith('.test.ts'))
    .map((f) => path.join(routesDir, f));

  for (const file of files) {
    const fileEndpoints = parseRouteFile(file);
    endpoints.push(...fileEndpoints);
  }

  return {
    source: 'route-parser',
    generatedAt: new Date().toISOString(),
    data: endpoints,
  };
}

/**
 * Parse a single route file and extract endpoints
 */
export function parseRouteFile(filePath: string): ApiEndpoint[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const sourceFile = ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, true);

  const endpoints: ApiEndpoint[] = [];

  // Visit all nodes in the AST
  function visit(node: ts.Node) {
    // Look for router method calls: router.get(), router.post(), etc.
    if (ts.isCallExpression(node)) {
      const endpoint = extractEndpointFromCall(node, content);
      if (endpoint) {
        endpoints.push(endpoint);
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);

  return endpoints;
}

/**
 * Extract endpoint information from a router method call
 */
function extractEndpointFromCall(
  node: ts.CallExpression,
  sourceContent: string,
): ApiEndpoint | null {
  // Check if this is a router method call (e.g., templateRouter.get())
  if (!ts.isPropertyAccessExpression(node.expression)) {
    return null;
  }

  const propertyAccess = node.expression;
  const methodName = propertyAccess.name.text;

  // Check if it's an HTTP method
  const httpMethods = ['get', 'post', 'patch', 'delete', 'put'];
  if (!httpMethods.includes(methodName.toLowerCase())) {
    return null;
  }

  // Check if the object is a router (ends with 'Router')
  if (!ts.isIdentifier(propertyAccess.expression)) {
    return null;
  }

  const routerName = propertyAccess.expression.text;
  if (!routerName.toLowerCase().includes('router')) {
    return null;
  }

  // Extract the path (first argument)
  if (node.arguments.length < 2) {
    return null;
  }

  const pathArg = node.arguments[0];
  if (!pathArg || !ts.isStringLiteral(pathArg)) {
    return null;
  }

  const routePath = pathArg.text;
  const method = methodName.toUpperCase() as ApiEndpoint['method'];

  // Extract description from JSDoc comment
  const description = extractJSDocComment(node, sourceContent);

  // Extract parameters from path and query
  const parameters = extractParameters(node, routePath, sourceContent);

  // Extract request body schema
  const requestBody = extractRequestBody(node, sourceContent);

  // Extract response information
  const responses = extractResponses(node, sourceContent);

  return {
    method,
    path: routePath,
    description,
    parameters,
    ...(requestBody !== undefined ? { requestBody } : {}),
    responses,
  };
}

/**
 * Extract JSDoc comment from a node
 */
function extractJSDocComment(node: ts.Node, sourceContent: string): string {
  const fullText = sourceContent;
  const nodeStart = node.getFullStart();
  const nodeEnd = node.getStart();
  const leadingText = fullText.substring(nodeStart, nodeEnd);

  // Look for /** ... */ comment
  const commentMatch = leadingText.match(/\/\*\*\s*([^*]|\*(?!\/))*\*\//);
  if (commentMatch) {
    const comment = commentMatch[0];
    // Extract the first line after /**
    const lines = comment.split('\n');
    for (const line of lines) {
      const cleaned = line.replace(/^\s*\*\s?/, '').trim();
      if (cleaned && !cleaned.startsWith('/**') && !cleaned.startsWith('*/')) {
        // Remove method and path from description if present
        return cleaned.replace(/^(GET|POST|PATCH|DELETE|PUT)\s+\/[^\s]*\s*-?\s*/, '');
      }
    }
  }

  return '';
}

/**
 * Extract parameters from path params and query parsing
 */
function extractParameters(
  node: ts.CallExpression,
  routePath: string,
  _sourceContent: string,
): Parameter[] {
  const parameters: Parameter[] = [];

  // Extract path parameters from route path (e.g., /:id)
  const pathParamMatches = routePath.matchAll(/:(\w+)/g);
  for (const match of pathParamMatches) {
    const paramName = match[1] ?? 'unknown';
    parameters.push({
      name: paramName,
      location: 'path',
      type: 'string',
      required: true,
      description: `${paramName} parameter`,
    });
  }

  // Look for query parameter parsing in the handler function
  const handlerFunc = node.arguments[1];
  if (handlerFunc && ts.isFunctionLike(handlerFunc)) {
    const funcText = handlerFunc.getText();

    // Look for paginationSchema.parse(req.query)
    if (funcText.includes('paginationSchema.parse(req.query)')) {
      parameters.push(
        {
          name: 'page',
          location: 'query',
          type: 'number',
          required: false,
          description: 'Page number (default: 1)',
        },
        {
          name: 'pageSize',
          location: 'query',
          type: 'number',
          required: false,
          description: 'Items per page (default: 20, max: 100)',
        },
      );
    }

    // Look for req.query.key or similar
    const queryMatches = funcText.matchAll(/req\.query\.(\w+)/g);
    const queryParams = new Set<string>();
    for (const match of queryMatches) {
      const paramName = match[1] ?? 'unknown';
      if (!queryParams.has(paramName) && !parameters.some((p) => p.name === paramName)) {
        queryParams.add(paramName);
        parameters.push({
          name: paramName,
          location: 'query',
          type: 'string',
          required: false,
          description: `${paramName} query parameter`,
        });
      }
    }
  }

  return parameters;
}

/**
 * Extract request body schema information
 */
function extractRequestBody(
  node: ts.CallExpression,
  _sourceContent: string,
): RequestBody | undefined {
  const handlerFunc = node.arguments[1];
  if (!handlerFunc || !ts.isFunctionLike(handlerFunc)) {
    return undefined;
  }

  const funcText = handlerFunc.getText();

  // Look for schema.parse(req.body) patterns
  const schemaMatch = funcText.match(/(\w+Schema)\.parse\(req\.body\)/);
  if (schemaMatch) {
    const schemaName = schemaMatch[1] ?? 'unknown';
    return {
      contentType: 'application/json',
      schemaName,
      description: `Request body validated by ${schemaName}`,
    };
  }

  // Look for multipart/form-data (multer)
  if (funcText.includes('req.file')) {
    return {
      contentType: 'multipart/form-data',
      description: 'File upload',
    };
  }

  return undefined;
}

/**
 * Extract response information from the handler
 */
function extractResponses(node: ts.CallExpression, _sourceContent: string): Response[] {
  const responses: Response[] = [];
  const handlerFunc = node.arguments[1];

  if (!handlerFunc || !ts.isFunctionLike(handlerFunc)) {
    return responses;
  }

  const funcText = handlerFunc.getText();

  // Look for res.status(XXX) or res.json() patterns
  const statusMatches = funcText.matchAll(/res\.status\((\d+)\)/g);
  const statusCodes = new Set<number>();

  for (const match of statusMatches) {
    const codeStr = match[1];
    if (codeStr) {
      const code = parseInt(codeStr, 10);
      statusCodes.add(code);
    }
  }

  // If no explicit status, assume 200 for GET/PATCH/DELETE, 201 for POST
  if (statusCodes.size === 0) {
    const method = (node.expression as ts.PropertyAccessExpression).name.text.toUpperCase();
    if (method === 'POST') {
      statusCodes.add(201);
    } else if (method === 'DELETE' && funcText.includes('.end()')) {
      statusCodes.add(204);
    } else {
      statusCodes.add(200);
    }
  }

  // Add success responses
  for (const code of statusCodes) {
    if (code >= 200 && code < 300) {
      responses.push({
        statusCode: code,
        description: getStatusDescription(code),
        successType: 'ApiResponse',
      });
    }
  }

  // Look for error responses
  const errorMatches = funcText.matchAll(/code:\s*['"](\w+)['"]/g);
  const errorCodes = new Set<string>();

  for (const match of errorMatches) {
    const errorCode = match[1];
    if (errorCode) {
      errorCodes.add(errorCode);
    }
  }

  // Add common error responses
  if (errorCodes.size > 0) {
    responses.push({
      statusCode: 400,
      description: 'Bad Request - Validation error or business logic error',
    });
  }

  // If path has :id parameter, add 404
  if (funcText.includes('idParamSchema') || funcText.includes('getById')) {
    responses.push({
      statusCode: 404,
      description: 'Not Found - Resource not found',
    });
  }

  return responses;
}

/**
 * Get standard HTTP status description
 */
function getStatusDescription(code: number): string {
  const descriptions: Record<number, string> = {
    200: 'OK - Request successful',
    201: 'Created - Resource created successfully',
    204: 'No Content - Request successful, no content returned',
    400: 'Bad Request - Invalid input',
    404: 'Not Found - Resource not found',
    500: 'Internal Server Error',
  };

  return descriptions[code] || `Status ${code}`;
}

/**
 * Group endpoints by resource
 *
 * @param output - Parsed route output
 * @returns Map of resource names to their endpoints
 */
export function groupEndpointsByResource(output: RouteParserOutput): Map<string, ApiEndpoint[]> {
  const groups = new Map<string, ApiEndpoint[]>();

  for (const endpoint of output.data) {
    // Extract resource name from path (e.g., /api/templates -> templates)
    const pathParts = endpoint.path.split('/').filter((p) => p && p !== 'api');
    const resource = pathParts[0] || 'unknown';

    if (!groups.has(resource)) {
      groups.set(resource, []);
    }

    groups.get(resource)!.push(endpoint);
  }

  return groups;
}
