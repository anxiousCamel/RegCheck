# API Documentation Formatter

This module provides utilities for formatting API endpoint information into readable Markdown documentation.

## Overview

The API formatter takes `ApiEndpoint` objects (extracted by the route parser) and formats them into well-structured Markdown documentation with:

- Endpoint headings with HTTP method and path
- Parameter tables (path, query, header parameters)
- Request body information with content type and schema
- Response information with status codes and descriptions
- Example requests and responses

## Usage

### Format a Single Endpoint

```typescript
import { formatEndpoint } from './api-formatter';
import type { ApiEndpoint } from './route-parser';

const endpoint: ApiEndpoint = {
  method: 'POST',
  path: '/api/templates',
  description: 'Create a new template',
  parameters: [],
  requestBody: {
    contentType: 'application/json',
    schemaName: 'createTemplateSchema',
    description: 'Template data',
  },
  responses: [
    {
      statusCode: 201,
      description: 'Created - Template created successfully',
      successType: 'ApiResponse<Template>',
    },
  ],
};

const markdown = formatEndpoint(endpoint);
console.log(markdown);
```

**Output:**

```markdown
### POST /api/templates

Create a new template

#### Parâmetros

Nenhum

#### Corpo da Requisição

**Content-Type:** `application/json`

**Schema:** `createTemplateSchema`

Template data

#### Respostas

**Sucesso (201):** Created - Template created successfully

Tipo de resposta: `ApiResponse<Template>`
```

### Format Multiple Endpoints for a Resource

```typescript
import { formatResourceEndpoints } from './api-formatter';

const endpoints: ApiEndpoint[] = [
  // ... array of endpoints
];

const markdown = formatResourceEndpoints('templates', endpoints);
```

**Output:**

```markdown
## Templates

### GET /api/templates

...

### POST /api/templates

...
```

### Format Complete API Documentation

```typescript
import { formatApiDocumentation } from './api-formatter';

const endpointsByResource = new Map<string, ApiEndpoint[]>();
endpointsByResource.set('templates', templateEndpoints);
endpointsByResource.set('documents', documentEndpoints);

const markdown = formatApiDocumentation(endpointsByResource);
```

This generates a complete API reference document with all resources sorted alphabetically.

## API Reference

### `formatEndpoint(endpoint: ApiEndpoint): string`

Formats a single API endpoint into Markdown documentation.

**Parameters:**

- `endpoint` - The API endpoint to format

**Returns:** Formatted Markdown string with:

- Heading (level 3) with method and path
- Description
- Parameters section (table or "Nenhum")
- Request body section (if applicable)
- Responses section

### `formatParameters(parameters: Parameter[]): string`

Formats parameters into a Markdown table.

**Parameters:**

- `parameters` - Array of parameters to format

**Returns:** Markdown table with columns:

- Nome (Name)
- Localização (Location: path, query, header)
- Tipo (Type)
- Obrigatório (Required: Sim/Não)
- Descrição (Description)

### `formatRequestBody(requestBody: RequestBody): string`

Formats request body information.

**Parameters:**

- `requestBody` - Request body information

**Returns:** Markdown with:

- Content-Type
- Schema name (if available)
- Description

### `formatResponses(responses: Response[]): string`

Formats response information.

**Parameters:**

- `responses` - Array of responses to format

**Returns:** Markdown with each response showing:

- Status label (Sucesso for 2xx, Erro for others)
- Status code
- Description
- Response type (if available)

### `formatResourceEndpoints(resourceName: string, endpoints: ApiEndpoint[]): string`

Formats multiple endpoints grouped by resource.

**Parameters:**

- `resourceName` - Name of the resource (e.g., 'templates', 'documents')
- `endpoints` - Array of endpoints for this resource

**Returns:** Markdown with:

- Resource heading (level 2)
- All endpoints formatted with `formatEndpoint()`

### `formatExampleRequest(endpoint: ApiEndpoint, exampleData: object): string`

Generates an example request for an endpoint.

**Parameters:**

- `endpoint` - The API endpoint
- `exampleData` - Example data object

**Returns:** Markdown with:

- Example heading
- HTTP request line in code block
- Request body JSON (if applicable)

### `formatExampleResponse(statusCode: number, exampleData: object): string`

Generates an example response.

**Parameters:**

- `statusCode` - HTTP status code
- `exampleData` - Example response data object

**Returns:** Markdown with:

- Response heading with status code
- JSON response in code block

### `formatApiDocumentation(endpointsByResource: Map<string, ApiEndpoint[]>): string`

Formats complete API documentation with all resources.

**Parameters:**

- `endpointsByResource` - Map of resource names to their endpoints

**Returns:** Complete formatted API documentation with resources sorted alphabetically

## Data Types

### `ApiEndpoint`

```typescript
interface ApiEndpoint {
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE' | 'PUT';
  path: string;
  description: string;
  parameters: Parameter[];
  requestBody?: RequestBody;
  responses: Response[];
}
```

### `Parameter`

```typescript
interface Parameter {
  name: string;
  location: 'path' | 'query' | 'header';
  type: string;
  required: boolean;
  description: string;
}
```

### `RequestBody`

```typescript
interface RequestBody {
  contentType: string;
  schemaName?: string;
  description: string;
}
```

### `Response`

```typescript
interface Response {
  statusCode: number;
  description: string;
  successType?: string;
}
```

## Integration with Route Parser

The API formatter is designed to work with the route parser:

```typescript
import { parseRouteFiles, groupEndpointsByResource } from './route-parser';
import { formatApiDocumentation } from './api-formatter';

// Parse all route files
const endpoints = parseRouteFiles('apps/api/src/routes');

// Group by resource
const grouped = groupEndpointsByResource(endpoints);

// Format as Markdown
const markdown = formatApiDocumentation(grouped);

// Write to file
fs.writeFileSync('docs/06-api-reference.md', markdown);
```

## Testing

The module includes comprehensive unit tests covering:

- Parameter formatting
- Request body formatting
- Response formatting
- Single endpoint formatting
- Resource endpoint formatting
- Example request/response formatting
- Complete API documentation formatting

Run tests with:

```bash
pnpm exec vitest run scripts/docs/api-formatter.test.ts
```

## Example Output

See `api-formatter-example.ts` for a complete working example that demonstrates all formatting functions.

Run the example with:

```bash
pnpm exec tsx scripts/docs/api-formatter-example.ts
```

## Requirements Satisfied

This module satisfies the following requirements from the spec:

- **Requirement 6.9**: Format endpoint documentation with method and path
- **Requirement 6.10**: Format request parameters (path, query, body) and response schemas with status codes
- Generate example requests and responses

## Related Modules

- `route-parser.ts` - Extracts API endpoints from route files
- `markdown-formatter.ts` - Provides low-level Markdown formatting utilities
