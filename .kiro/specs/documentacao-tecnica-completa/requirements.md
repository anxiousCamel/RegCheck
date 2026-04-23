# Requirements Document

## Introduction

Este documento especifica os requisitos para a criação de uma documentação técnica completa e estruturada do sistema RegCheck. O RegCheck é um sistema monorepo (Turborepo + pnpm) para construção e preenchimento de templates de documentos PDF, permitindo criar templates visuais sobre PDFs existentes, posicionando campos interativos via drag-and-drop, e depois preencher esses campos para gerar novos PDFs automaticamente.

## Glossary

- **System**: O conjunto completo de documentação técnica do RegCheck
- **Documentation_Generator**: Processo responsável por criar os arquivos de documentação
- **RegCheck**: Sistema monorepo para construção e preenchimento de templates PDF
- **Template**: Modelo de documento PDF com campos interativos posicionados
- **Document**: Instância de um template preenchida com dados
- **Field**: Campo interativo posicionado em um template (texto, imagem, assinatura, checkbox)
- **Monorepo**: Repositório único contendo múltiplos pacotes e aplicações
- **API**: Aplicação backend Express rodando na porta 4000
- **Web**: Aplicação frontend Next.js rodando na porta 3000
- **Equipamento**: Registro de equipamento técnico (balança, impressora, etc.)
- **Loja**: Localização física onde equipamentos estão instalados
- **Setor**: Subdivisão dentro de uma loja
- **TipoEquipamento**: Classificação de tipo de equipamento
- **BullMQ**: Sistema de filas para processamento assíncrono
- **MinIO**: Storage S3-compatible para arquivos
- **Prisma**: ORM para acesso ao banco de dados PostgreSQL

## Requirements

### Requirement 1: Especificação Técnica e Arquitetura

**User Story:** Como desenvolvedor, eu quero uma especificação técnica completa da arquitetura, para que eu possa entender a estrutura do sistema e suas responsabilidades.

#### Acceptance Criteria

1. THE Documentation_Generator SHALL create a file named `docs/01-arquitetura.md`
2. THE Documentation_Generator SHALL document the monorepo modular architecture type
3. THE Documentation_Generator SHALL describe all architectural layers (apps, packages, infrastructure)
4. THE Documentation_Generator SHALL include a Mermaid diagram showing the monorepo structure with apps and packages
5. THE Documentation_Generator SHALL include a Mermaid diagram showing the technology stack by layer (infrastructure, backend, frontend, shared)
6. THE Documentation_Generator SHALL document the general application flow from upload to PDF generation
7. THE Documentation_Generator SHALL specify the responsibilities of each architectural component

### Requirement 2: Stack Tecnológica

**User Story:** Como desenvolvedor, eu quero documentação completa da stack tecnológica, para que eu possa entender todas as tecnologias utilizadas e seus propósitos.

#### Acceptance Criteria

1. THE Documentation_Generator SHALL create a file named `docs/02-stack-tecnologica.md`
2. THE Documentation_Generator SHALL document all backend technologies (Express, Prisma, BullMQ, pdf-lib, sharp, multer, zod)
3. THE Documentation_Generator SHALL document all frontend technologies (Next.js 14, Konva, react-konva, pdfjs-dist, TanStack Query, Zustand, Tailwind CSS)
4. THE Documentation_Generator SHALL document all infrastructure services (PostgreSQL 16, Redis 7, MinIO)
5. THE Documentation_Generator SHALL document all shared packages (@regcheck/database, @regcheck/pdf-engine, @regcheck/editor-engine, @regcheck/shared, @regcheck/validators, @regcheck/ui)
6. THE Documentation_Generator SHALL specify the purpose and responsibility of each technology
7. THE Documentation_Generator SHALL document architectural patterns used (monorepo, service layer, state management)

### Requirement 3: Infraestrutura e Ambiente

**User Story:** Como desenvolvedor, eu quero documentação da infraestrutura e configuração de ambiente, para que eu possa configurar e executar o sistema localmente.

#### Acceptance Criteria

1. THE Documentation_Generator SHALL create a file named `docs/03-infraestrutura.md`
2. THE Documentation_Generator SHALL document the Docker Compose setup with PostgreSQL, Redis, and MinIO services
3. THE Documentation_Generator SHALL document all service ports (PostgreSQL :5432, Redis :6379, MinIO :9000/:9001, API :4000, Web :3000)
4. THE Documentation_Generator SHALL document environment variables required for each service
5. THE Documentation_Generator SHALL document the local development setup process step-by-step
6. THE Documentation_Generator SHALL document all available npm scripts and their purposes
7. THE Documentation_Generator SHALL document troubleshooting steps for common issues (port conflicts, MinIO failures, Prisma migrations)
8. THE Documentation_Generator SHALL mark deployment strategy as "não identificado" since it is not defined in the codebase

### Requirement 4: Modelagem de Dados

**User Story:** Como desenvolvedor, eu quero um diagrama de entidade-relacionamento completo, para que eu possa entender o modelo de dados e os relacionamentos entre entidades.

#### Acceptance Criteria

1. THE Documentation_Generator SHALL create a file named `docs/04-modelagem-dados.md`
2. THE Documentation_Generator SHALL document all database entities (PdfFile, Template, TemplateField, TemplateVersion, Document, FilledField, Equipamento, Loja, Setor, TipoEquipamento)
3. THE Documentation_Generator SHALL include a Mermaid ERD diagram showing all entities and their relationships
4. THE Documentation_Generator SHALL document all entity attributes with their types and constraints
5. THE Documentation_Generator SHALL document all relationships (one-to-many, many-to-one) with cardinality
6. THE Documentation_Generator SHALL document all enums (TemplateStatus, DocumentStatus, FieldType, FieldScope)
7. THE Documentation_Generator SHALL explain the purpose of each entity in the system context

### Requirement 5: Protótipo Visual das Telas

**User Story:** Como desenvolvedor ou designer, eu quero documentação visual das telas principais, para que eu possa entender a interface do usuário e o fluxo de navegação.

#### Acceptance Criteria

1. THE Documentation_Generator SHALL create a file named `docs/05-prototipo-telas.md`
2. THE Documentation_Generator SHALL document the Home screen with its purpose and main actions
3. THE Documentation_Generator SHALL document the Templates list screen with create/edit/delete actions
4. THE Documentation_Generator SHALL document the Template Editor screen with canvas, toolbar, and properties panel
5. THE Documentation_Generator SHALL document the Documents list screen with create/fill/generate/download actions
6. THE Documentation_Generator SHALL document the Document Fill screen with field filling interface
7. THE Documentation_Generator SHALL document the Cadastros screens (Lojas, Setores, Tipos, Equipamentos)
8. THE Documentation_Generator SHALL include a Mermaid diagram showing navigation flow between screens
9. THE Documentation_Generator SHALL describe main UI components for each screen (buttons, forms, lists, canvas)

### Requirement 6: Documentação da API

**User Story:** Como desenvolvedor frontend ou integrador, eu quero documentação completa dos endpoints da API, para que eu possa consumir os serviços corretamente.

#### Acceptance Criteria

1. THE Documentation_Generator SHALL create a file named `docs/06-api-reference.md`
2. THE Documentation_Generator SHALL document all template endpoints (GET /api/templates, POST /api/templates, GET /api/templates/:id, PATCH /api/templates/:id, POST /api/templates/:id/publish, DELETE /api/templates/:id)
3. THE Documentation_Generator SHALL document all document endpoints (GET /api/documents, POST /api/documents, GET /api/documents/:id, PATCH /api/documents/:id, POST /api/documents/:id/populate, POST /api/documents/:id/fill, POST /api/documents/:id/generate, GET /api/documents/:id/status, GET /api/documents/:id/download, DELETE /api/documents/:id)
4. THE Documentation_Generator SHALL document all upload endpoints (POST /api/uploads/pdf, POST /api/uploads/image, GET /api/uploads/presigned, GET /api/uploads/file)
5. THE Documentation_Generator SHALL document all equipment endpoints (GET /api/equipamentos, POST /api/equipamentos, GET /api/equipamentos/:id, PATCH /api/equipamentos/:id, DELETE /api/equipamentos/:id)
6. THE Documentation_Generator SHALL document all loja endpoints (GET /api/lojas, POST /api/lojas, GET /api/lojas/:id, PATCH /api/lojas/:id, DELETE /api/lojas/:id)
7. THE Documentation_Generator SHALL document all setor endpoints (GET /api/setores, POST /api/setores, GET /api/setores/:id, PATCH /api/setores/:id, DELETE /api/setores/:id)
8. THE Documentation_Generator SHALL document all tipo endpoints (GET /api/tipos-equipamento, POST /api/tipos-equipamento, GET /api/tipos-equipamento/:id, PATCH /api/tipos-equipamento/:id, DELETE /api/tipos-equipamento/:id)
9. THE Documentation_Generator SHALL document HTTP methods, request parameters, request body schemas, and response formats for each endpoint
10. THE Documentation_Generator SHALL document example requests and responses for key endpoints
11. THE Documentation_Generator SHALL mark authentication as "não identificado" since it is not implemented in the codebase

### Requirement 7: Códigos de Erro

**User Story:** Como desenvolvedor, eu quero uma lista completa de códigos de erro, para que eu possa tratar erros adequadamente na aplicação.

#### Acceptance Criteria

1. THE Documentation_Generator SHALL create a file named `docs/07-codigos-erro.md`
2. THE Documentation_Generator SHALL document all error codes used in the API (NOT_FOUND, VALIDATION_ERROR, PDF_NOT_FOUND, TEMPLATE_NOT_PUBLISHED, TEMPLATE_PUBLISHED, TEMPLATE_INVALID, NO_FILE, MISSING_KEY, NO_EQUIPMENT, TEMPLATE_NO_SLOTS, ALREADY_GENERATING, PDF_NOT_GENERATED, INVALID_LOJA, INVALID_SETOR, INVALID_TIPO)
3. THE Documentation_Generator SHALL document the HTTP status code for each error type
4. THE Documentation_Generator SHALL document when each error occurs
5. THE Documentation_Generator SHALL document the error response format (success: false, error: { code, message })
6. THE Documentation_Generator SHALL provide examples of error responses

### Requirement 8: Guia de Configuração do Ambiente

**User Story:** Como novo desenvolvedor, eu quero um guia passo a passo de configuração, para que eu possa configurar o ambiente de desenvolvimento rapidamente.

#### Acceptance Criteria

1. THE Documentation_Generator SHALL create a file named `docs/08-guia-setup.md`
2. THE Documentation_Generator SHALL document all prerequisites (Node.js >= 20, pnpm 9.x, Docker, Docker Compose)
3. THE Documentation_Generator SHALL document the installation process step-by-step (clone, install dependencies, configure env, start infrastructure, apply schema, start dev)
4. THE Documentation_Generator SHALL document all environment variables required (.env, apps/api/.env, apps/web/.env.local)
5. THE Documentation_Generator SHALL document how to run the system locally (pnpm dev, pnpm dev:api, pnpm dev:web)
6. THE Documentation_Generator SHALL document how to access each service (Web :3000, API :4000, MinIO Console :9001, Prisma Studio :5555)
7. THE Documentation_Generator SHALL document common troubleshooting steps

### Requirement 9: Padrões de Código e Versionamento

**User Story:** Como desenvolvedor, eu quero documentação dos padrões de código e versionamento, para que eu possa contribuir seguindo as convenções do projeto.

#### Acceptance Criteria

1. THE Documentation_Generator SHALL create a file named `docs/09-padroes-codigo.md`
2. THE Documentation_Generator SHALL document the monorepo folder structure (apps/, packages/, infra/, scripts/)
3. THE Documentation_Generator SHALL document naming conventions for files, folders, and components
4. THE Documentation_Generator SHALL document code organization patterns (service layer, route handlers, middleware, stores)
5. THE Documentation_Generator SHALL document TypeScript usage and type safety practices
6. THE Documentation_Generator SHALL document validation patterns using Zod schemas
7. THE Documentation_Generator SHALL document state management patterns (Zustand for editor, TanStack Query for server state)
8. THE Documentation_Generator SHALL mark commit conventions as "não identificado" since they are not defined in the codebase
9. THE Documentation_Generator SHALL mark branch strategy as "não identificado" since it is not defined in the codebase

### Requirement 10: Fluxo do Processo

**User Story:** Como desenvolvedor ou analista de negócio, eu quero diagramas de fluxo detalhados, para que eu possa entender os processos de negócio do sistema.

#### Acceptance Criteria

1. THE Documentation_Generator SHALL create a file named `docs/10-fluxos-processo.md`
2. THE Documentation_Generator SHALL include a Mermaid sequence diagram for the upload PDF and template creation flow
3. THE Documentation_Generator SHALL include a Mermaid sequence diagram for the template editing flow (add fields, configure properties, save)
4. THE Documentation_Generator SHALL include a Mermaid sequence diagram for the template publication flow
5. THE Documentation_Generator SHALL include a Mermaid sequence diagram for the document creation flow
6. THE Documentation_Generator SHALL include a Mermaid sequence diagram for the document population flow (select equipment, auto-fill fields)
7. THE Documentation_Generator SHALL include a Mermaid sequence diagram for the document filling flow (manual field entry, autosave)
8. THE Documentation_Generator SHALL include a Mermaid sequence diagram for the PDF generation flow (queue job, process with BullMQ, generate with pdf-lib, upload to MinIO)
9. THE Documentation_Generator SHALL document the actors involved in each flow (User, Web, API, Database, Queue, MinIO)
10. THE Documentation_Generator SHALL document the key steps and decision points in each flow

### Requirement 11: Índice de Documentação

**User Story:** Como usuário da documentação, eu quero um índice centralizado, para que eu possa navegar facilmente entre os documentos.

#### Acceptance Criteria

1. THE Documentation_Generator SHALL create a file named `docs/README.md`
2. THE Documentation_Generator SHALL include links to all documentation files
3. THE Documentation_Generator SHALL organize links by category (Arquitetura, Desenvolvimento, API, Processos)
4. THE Documentation_Generator SHALL include a brief description for each document
5. THE Documentation_Generator SHALL include a "Como usar esta documentação" section with reading recommendations

### Requirement 12: Parser e Pretty Printer para Markdown

**User Story:** Como desenvolvedor, eu quero garantir que os arquivos Markdown sejam válidos e bem formatados, para que a documentação seja consistente e legível.

#### Acceptance Criteria

1. WHEN a Markdown file is generated, THE Documentation_Generator SHALL validate its syntax
2. WHEN a Markdown file is generated, THE Documentation_Generator SHALL format it with consistent indentation and spacing
3. THE Documentation_Generator SHALL ensure all Mermaid diagrams have valid syntax
4. THE Documentation_Generator SHALL ensure all links are properly formatted
5. FOR ALL valid Markdown documents, parsing then formatting then parsing SHALL produce an equivalent document (round-trip property)

