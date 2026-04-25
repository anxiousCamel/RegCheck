# Documentation Generator Modules

This directory contains modular generator components for the RegCheck documentation system.

## Structure

Each generator module is responsible for creating a specific documentation file:

- **markdown-formatter.ts** - Utilities for generating Markdown syntax
- **prisma-parser.ts** - Extracts data model from Prisma schema
- **route-parser.ts** - Extracts API endpoints from route files
- **error-parser.ts** - Extracts error codes from error handlers
- **mermaid-generator.ts** - Generates Mermaid diagrams

## Usage

Generator modules are imported and orchestrated by `scripts/generate-docs.ts`.

Each module exports functions that:

1. Extract information from source files
2. Transform data into structured format
3. Generate Markdown content with proper formatting

## Development

When adding new generator modules:

1. Create a new `.ts` file in this directory
2. Export functions with clear interfaces
3. Add unit tests for extraction and formatting logic
4. Import and use in `generate-docs.ts`
