# Implementation Plan: Comprehensive Technical Documentation System

## Overview

This plan implements a documentation generation system for the RegCheck project. The system will analyze the codebase (Prisma schema, route files, services) and generate 11 structured Markdown documentation files with Mermaid diagrams in a `docs/` directory.

The implementation follows the document generation order specified in the design: data model → API reference → error codes → architecture → stack → infrastructure → UI screens → setup guide → code standards → process flows → index.

## Tasks

- [x] 1. Set up documentation generation infrastructure
  - Create `scripts/generate-docs.ts` as the main entry point
  - Create `scripts/docs/` directory for generator modules
  - Set up TypeScript configuration for scripts
  - Add `generate:docs` script to root package.json
  - _Requirements: 1.1, 2.1, 3.1_

- [x] 2. Implement core utilities for Markdown generation
  - [x] 2.1 Create markdown formatter utilities
    - Implement `heading(text, level)` function
    - Implement `codeBlock(code, language)` function
    - Implement `table(headers, rows)` function
    - Implement `list(items, ordered)` function
    - Implement `link(text, url)` function
    - Implement `mermaidDiagram(type, content)` function
    - _Requirements: 12.2_
  
  - [x] 2.2 Write unit tests for markdown formatter
    - Test heading generation with levels 1-6
    - Test code block formatting with language tags
    - Test table generation with proper alignment
    - Test list formatting (ordered and unordered)
    - Test link formatting (internal and external)
    - Test Mermaid diagram wrapping
    - _Requirements: 12.1, 12.2_

- [x] 3. Implement Prisma schema parser for data model extraction
  - [x] 3.1 Create Prisma schema parser
    - Parse `packages/database/prisma/schema.prisma` file
    - Extract all model definitions with fields and types
    - Extract all enum definitions
    - Extract relationships between models (one-to-many, many-to-one)
    - Identify primary keys and unique constraints
    - _Requirements: 4.2, 4.3, 4.4, 4.5, 4.6_
  
  - [x] 3.2 Create ERD generator from parsed schema
    - Generate Mermaid ERD syntax from entities
    - Add relationship lines with cardinality
    - Add entity definitions with fields and types
    - Mark primary keys with "PK" suffix
    - _Requirements: 4.3_
  
  - [x] 3.3 Write unit tests for Prisma parser
    - Test model extraction with various field types
    - Test enum extraction
    - Test relationship detection (one-to-many, many-to-one)
    - Test primary key identification
    - _Requirements: 4.2, 4.4, 4.5_

- [x] 4. Implement API endpoint extractor from route files
  - [x] 4.1 Create route file parser
    - Parse all route files in `apps/api/src/routes/`
    - Extract HTTP methods (GET, POST, PATCH, DELETE)
    - Extract route paths with parameters
    - Extract request body schemas from Zod validators
    - Extract response formats from route handlers
    - _Requirements: 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8, 6.9_
  
  - [x] 4.2 Create API documentation formatter
    - Format endpoint documentation with method and path
    - Format request parameters (path, query, body)
    - Format response schemas with status codes
    - Generate example requests and responses
    - _Requirements: 6.9, 6.10_
  
  - [x] 4.3 Write unit tests for route parser
    - Test endpoint extraction from route files
    - Test parameter extraction (path params, query params)
    - Test request body schema extraction
    - Test response format extraction
    - _Requirements: 6.2, 6.9_

- [x] 5. Implement error code extractor
  - [x] 5.1 Create error code parser
    - Parse error handler middleware in `apps/api/src/middleware/error-handler.ts`
    - Extract all error codes used in route files
    - Extract HTTP status codes for each error type
    - Extract error messages and context
    - _Requirements: 7.2, 7.3, 7.4_
  
  - [x] 5.2 Create error documentation formatter
    - Format error code reference table
    - Include HTTP status, code, message, and context
    - Generate example error responses
    - _Requirements: 7.5, 7.6_
  
  - [x] 5.3 Write unit tests for error code extractor
    - Test error code extraction from middleware
    - Test error code extraction from route files
    - Test HTTP status mapping
    - _Requirements: 7.2, 7.3_

- [x] 6. Generate data model documentation (04-modelagem-dados.md)
  - [x] 6.1 Create data model document generator
    - Generate introduction section
    - List all entities with descriptions
    - Generate complete ERD diagram using Mermaid
    - Document each entity with fields and types
    - Document all enums (TemplateStatus, DocumentStatus, FieldType, FieldScope)
    - Document all relationships with explanations
    - Add references section
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7_
  
  - [ ] 6.2 Write integration test for data model generation
    - Generate document from test schema
    - Verify all sections are present
    - Verify ERD diagram is syntactically valid
    - Verify all entities are documented
    - _Requirements: 4.1, 4.2, 4.3_

- [x] 7. Generate API reference documentation (06-api-reference.md)
  - [x] 7.1 Create API reference document generator
    - Generate introduction section
    - Document ApiResponse format structure
    - Mark authentication as "não identificado"
    - Group endpoints by resource (Templates, Documents, Uploads, Equipamentos, Lojas, Setores, Tipos)
    - Document each endpoint with method, path, parameters, body, responses
    - Include example requests and responses for key endpoints
    - Add references section
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8, 6.9, 6.10, 6.11_
  
  - [ ] 7.2 Write integration test for API reference generation
    - Generate document from test route files
    - Verify all endpoint groups are present
    - Verify endpoint documentation format
    - Verify example requests/responses are included
    - _Requirements: 6.1, 6.2, 6.9_

- [x] 8. Generate error codes documentation (07-codigos-erro.md)
  - [x] 8.1 Create error codes document generator
    - Generate introduction section
    - Document error response format
    - Create error codes reference table
    - Document each error code with HTTP status, message, context
    - Include example error responses
    - Add references section
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_
  
  - [ ] 8.2 Write integration test for error codes generation
    - Generate document from test error definitions
    - Verify all error codes are documented
    - Verify error response format is correct
    - _Requirements: 7.1, 7.2, 7.5_

- [ ] 9. Checkpoint - Verify core extraction and generation
  - Ensure all tests pass, ask the user if questions arise.

- [x] 10. Generate architecture documentation (01-arquitetura.md)
  - [x] 10.1 Create architecture document generator
    - Generate introduction section
    - Document monorepo modular architecture type
    - Document architectural layers (apps, packages, infrastructure)
    - Generate Mermaid diagram showing monorepo structure
    - Generate Mermaid diagram showing technology stack by layer
    - Document general application flow (upload → template → document → PDF)
    - Document component responsibilities
    - Add references section
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7_
  
  - [ ] 10.2 Write integration test for architecture generation
    - Generate document
    - Verify all sections are present
    - Verify Mermaid diagrams are syntactically valid
    - _Requirements: 1.1, 1.4, 1.5_

- [x] 11. Generate technology stack documentation (02-stack-tecnologica.md)
  - [x] 11.1 Create stack document generator
    - Generate introduction section
    - Document backend technologies (Express, Prisma, BullMQ, pdf-lib, sharp, multer, zod)
    - Document frontend technologies (Next.js 14, Konva, react-konva, pdfjs-dist, TanStack Query, Zustand, Tailwind CSS)
    - Document infrastructure services (PostgreSQL 16, Redis 7, MinIO)
    - Document shared packages (@regcheck/*)
    - Specify purpose and responsibility of each technology
    - Document architectural patterns (monorepo, service layer, state management)
    - Add references section
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7_
  
  - [ ] 11.2 Write integration test for stack generation
    - Generate document
    - Verify all technology sections are present
    - Verify all technologies are documented with purposes
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [x] 12. Generate infrastructure documentation (03-infraestrutura.md)
  - [x] 12.1 Create infrastructure document generator
    - Generate introduction section
    - Document Docker Compose setup (PostgreSQL, Redis, MinIO)
    - Document all service ports (PostgreSQL :5432, Redis :6379, MinIO :9000/:9001, API :4000, Web :3000)
    - Document environment variables for each service
    - Document local development setup process step-by-step
    - Document available npm scripts and purposes
    - Document troubleshooting steps (port conflicts, MinIO failures, Prisma migrations)
    - Mark deployment strategy as "não identificado"
    - Add references section
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8_
  
  - [ ] 12.2 Write integration test for infrastructure generation
    - Generate document
    - Verify all sections are present
    - Verify service ports are documented
    - Verify troubleshooting section exists
    - _Requirements: 3.1, 3.2, 3.3_

- [ ] 13. Generate UI screens documentation (05-prototipo-telas.md)
  - [ ] 13.1 Create UI screens document generator
    - Generate introduction section
    - Document Home screen with purpose and actions
    - Document Templates list screen with CRUD actions
    - Document Template Editor screen (canvas, toolbar, properties panel)
    - Document Documents list screen with actions
    - Document Document Fill screen with field filling interface
    - Document Cadastros screens (Lojas, Setores, Tipos, Equipamentos)
    - Generate Mermaid diagram showing navigation flow
    - Describe main UI components for each screen
    - Add references section
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 5.9_
  
  - [ ] 13.2 Write integration test for UI screens generation
    - Generate document
    - Verify all screen sections are present
    - Verify navigation flow diagram is syntactically valid
    - _Requirements: 5.1, 5.2, 5.8_

- [ ] 14. Generate setup guide documentation (08-guia-setup.md)
  - [ ] 14.1 Create setup guide document generator
    - Generate introduction section
    - Document prerequisites (Node.js >= 20, pnpm 9.x, Docker, Docker Compose)
    - Document installation process step-by-step (clone, install, configure, start)
    - Document environment variables (.env, apps/api/.env, apps/web/.env.local)
    - Document how to run locally (pnpm dev, pnpm dev:api, pnpm dev:web)
    - Document how to access services (Web :3000, API :4000, MinIO :9001, Prisma Studio :5555)
    - Document common troubleshooting steps
    - Add references section
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7_
  
  - [ ] 14.2 Write integration test for setup guide generation
    - Generate document
    - Verify all sections are present
    - Verify prerequisites are documented
    - Verify step-by-step instructions exist
    - _Requirements: 8.1, 8.2, 8.3_

- [ ] 15. Generate code standards documentation (09-padroes-codigo.md)
  - [ ] 15.1 Create code standards document generator
    - Generate introduction section
    - Document monorepo folder structure (apps/, packages/, infra/, scripts/)
    - Document naming conventions (files, folders, components)
    - Document code organization patterns (service layer, route handlers, middleware, stores)
    - Document TypeScript usage and type safety practices
    - Document validation patterns using Zod schemas
    - Document state management patterns (Zustand, TanStack Query)
    - Mark commit conventions as "não identificado"
    - Mark branch strategy as "não identificado"
    - Add references section
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7, 9.8, 9.9_
  
  - [ ] 15.2 Write integration test for code standards generation
    - Generate document
    - Verify all sections are present
    - Verify folder structure is documented
    - Verify patterns are documented
    - _Requirements: 9.1, 9.2, 9.3_

- [ ] 16. Generate process flows documentation (10-fluxos-processo.md)
  - [ ] 16.1 Create process flows document generator
    - Generate introduction section
    - Generate Mermaid sequence diagram for upload PDF and template creation
    - Generate Mermaid sequence diagram for template editing
    - Generate Mermaid sequence diagram for template publication
    - Generate Mermaid sequence diagram for document creation
    - Generate Mermaid sequence diagram for document population (equipment auto-fill)
    - Generate Mermaid sequence diagram for document filling (manual entry)
    - Generate Mermaid sequence diagram for PDF generation (BullMQ, pdf-lib, MinIO)
    - Document actors (User, Web, API, Database, Queue, MinIO)
    - Document key steps and decision points
    - Add references section
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7, 10.8, 10.9, 10.10_
  
  - [ ] 16.2 Write integration test for process flows generation
    - Generate document
    - Verify all flow sections are present
    - Verify all Mermaid sequence diagrams are syntactically valid
    - _Requirements: 10.1, 10.2, 10.8_

- [x] 17. Generate documentation index (README.md)
  - [x] 17.1 Create index document generator
    - Generate introduction section
    - Create links to all 10 documentation files
    - Organize links by category (Arquitetura, Desenvolvimento, API, Processos)
    - Include brief description for each document
    - Add "Como usar esta documentação" section with reading recommendations
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5_
  
  - [ ] 17.2 Write integration test for index generation
    - Generate document
    - Verify all links are present
    - Verify links point to correct files
    - Verify categories are organized correctly
    - _Requirements: 11.1, 11.2, 11.3_

- [ ] 18. Implement validation and quality checks
  - [ ] 18.1 Create Markdown syntax validator
    - Parse generated Markdown files
    - Validate heading hierarchy (no skipped levels)
    - Validate code blocks are properly closed
    - Validate links are properly formatted
    - _Requirements: 12.1, 12.4_
  
  - [ ] 18.2 Create Mermaid syntax validator
    - Validate each Mermaid diagram against grammar
    - Check diagram types are valid (graph, erDiagram, sequenceDiagram)
    - Validate diagram syntax is complete
    - _Requirements: 12.3_
  
  - [ ] 18.3 Create content completeness validator
    - Verify all required sections are present in each document
    - Verify no placeholder content remains (except "não identificado" markers)
    - Verify all internal links resolve correctly
    - Verify file sizes are reasonable (not empty, not too large)
    - _Requirements: 12.1, 12.2_
  
  - [ ] 18.4 Write unit tests for validators
    - Test Markdown syntax validation with valid/invalid inputs
    - Test Mermaid syntax validation with valid/invalid diagrams
    - Test content completeness checks
    - _Requirements: 12.1, 12.3_

- [ ] 19. Checkpoint - Verify all documentation generated correctly
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 20. Wire everything together in main generator script
  - [ ] 20.1 Implement main generation orchestrator
    - Create `docs/` directory if it doesn't exist
    - Execute generators in correct order (data model → API → errors → architecture → stack → infrastructure → UI → setup → standards → flows → index)
    - Run validation after each document generation
    - Log progress and errors
    - Generate summary report
    - _Requirements: 1.1, 2.1, 3.1, 4.1, 5.1, 6.1, 7.1, 8.1, 9.1, 10.1, 11.1_
  
  - [ ] 20.2 Add error handling and recovery
    - Handle missing source files gracefully
    - Handle file write failures with retry
    - Handle validation errors with detailed logging
    - Generate partial documentation if some generators fail
    - _Requirements: 12.1, 12.2_
  
  - [ ] 20.3 Write end-to-end integration test
    - Run complete documentation generation
    - Verify all 11 files are created
    - Verify all files have valid Markdown syntax
    - Verify all Mermaid diagrams are valid
    - Verify all internal links resolve
    - _Requirements: 11.1, 12.1, 12.3, 12.4_

- [ ] 21. Final checkpoint and documentation
  - Ensure all tests pass, ask the user if questions arise.
  - Verify generated documentation is complete and accurate
  - Update README with instructions for running `pnpm generate:docs`

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at key milestones
- The implementation uses TypeScript as specified in the design document
- All Mermaid diagrams must be syntactically valid before document generation completes
- The system generates static Markdown files, not a runtime service
- Generated documentation should be committed to version control
