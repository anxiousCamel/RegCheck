# Requirements Document

## Introduction

O RegCheck é um sistema de construção e preenchimento de templates de documentos PDF, organizado como monorepo Turborepo com pnpm. O projeto possui um `readme.md` na raiz com informações de setup, mas não tem pasta `Docs/` nem documentação de arquitetura, fluxos, padrões de código ou ADRs.

Esta feature cobre a revisão, padronização e expansão completa da documentação do projeto. O objetivo é que um desenvolvedor novo consiga entender o sistema, configurar o ambiente e contribuir sem precisar de ajuda externa. Toda documentação deve priorizar diagramas Mermaid antes de texto longo, com cada diagrama tendo propósito claro e explícito.

## Glossary

- **README**: Arquivo `readme.md` na raiz do monorepo — ponto de entrada da documentação
- **Docs**: Pasta `docs/` na raiz do monorepo contendo documentação técnica detalhada
- **ADR**: Architecture Decision Record — documento que registra uma decisão técnica relevante com contexto, alternativas consideradas e justificativa
- **Diagrama_Mermaid**: Diagrama escrito em sintaxe Mermaid, renderizável no GitHub e em ferramentas compatíveis
- **Dev_Novo**: Desenvolvedor que nunca trabalhou no projeto e precisa entender o sistema sem ajuda externa
- **Monorepo**: Repositório único contendo múltiplos pacotes e aplicações gerenciados com Turborepo + pnpm
- **Editor_Visual**: Interface web baseada em Konva para posicionar campos sobre PDFs
- **Repetition_Engine**: Pacote `packages/editor-engine` responsável por calcular layout de repetição e clonar campos
- **PDF_Engine**: Pacote `packages/pdf-engine` responsável por processar e gerar PDFs com overlays
- **BullMQ_Worker**: Job assíncrono em `apps/api/src/jobs/pdf-generation-worker.ts` que processa geração de PDF
- **Template**: Definição de documento com campos posicionados sobre um PDF base
- **Document**: Instância preenchida de um Template
- **FilledField**: Dado preenchido por campo × item em um Document
- **RepetitionConfig**: Configuração JSON que define grid de repetição (rows, columns, offsets)
- **FieldPosition**: Coordenadas relativas (0–1) de um campo na página
- **S3**: Serviço de armazenamento de objetos — MinIO em desenvolvimento, AWS S3 em produção

---

## Requirements

### Requirement 1: README como Ponto de Entrada

**User Story:** As a Dev_Novo, I want a README that gives me a complete overview of the system with visual diagrams, so that I can understand what the project does and how it is structured before reading any code.

#### Acceptance Criteria

1. THE README SHALL contain a high-level description of the RegCheck system purpose in the first section.
2. THE README SHALL contain a Diagrama_Mermaid de arquitetura do Monorepo mostrando todos os pacotes e aplicações com suas dependências internas.
3. THE README SHALL contain a Diagrama_Mermaid de stack tecnológica organizado por camada (infra, backend, frontend, shared).
4. THE README SHALL contain links navegáveis para todos os documentos em `docs/`.
5. THE README SHALL contain uma tabela de comandos essenciais (`pnpm dev`, `pnpm build`, `pnpm db:push`, etc.) com descrição de cada um.
6. THE README SHALL contain a seção de setup com instruções para Linux/macOS e Windows (WSL2), mantendo o conteúdo já existente e revisado.
7. THE README SHALL contain uma tabela de URLs de acesso local (Frontend, API, MinIO Console, Prisma Studio).
8. THE README SHALL contain uma seção de troubleshooting com os erros mais comuns e suas soluções.
9. WHEN a developer reads the README, THE README SHALL allow the developer to understand the system purpose, structure, and how to run it without reading any other file first.

---

### Requirement 2: Documentação de Arquitetura

**User Story:** As a Dev_Novo, I want an architecture document with diagrams showing how all parts of the system connect, so that I can understand data flow and component responsibilities before touching the code.

#### Acceptance Criteria

1. THE Docs SHALL contain um arquivo `docs/architecture.md`.
2. THE `docs/architecture.md` SHALL contain um Diagrama_Mermaid de arquitetura C4 nível 2 (Container Diagram) mostrando: Frontend (Next.js), API (Express), PostgreSQL, Redis, MinIO e suas conexões.
3. THE `docs/architecture.md` SHALL contain um Diagrama_Mermaid de dependências entre pacotes do Monorepo (quem importa quem).
4. THE `docs/architecture.md` SHALL contain um Diagrama_Mermaid do schema do banco de dados mostrando todas as entidades e seus relacionamentos.
5. THE `docs/architecture.md` SHALL contain uma descrição de responsabilidade de cada pacote (`packages/*`) e aplicação (`apps/*`).
6. THE `docs/architecture.md` SHALL contain uma explicação do sistema de coordenadas relativas (0–1) usado em FieldPosition.
7. WHEN a developer reads `docs/architecture.md`, THE document SHALL allow the developer to identify which package to modify for any given type of change.

---

### Requirement 3: Documentação dos Fluxos Principais

**User Story:** As a Dev_Novo, I want flow diagrams for the main system processes, so that I can trace a feature end-to-end from user action to database without guessing.

#### Acceptance Criteria

1. THE Docs SHALL contain um arquivo `docs/flows.md`.
2. THE `docs/flows.md` SHALL contain um Diagrama_Mermaid de sequência para o fluxo de criação de Template (upload PDF → criar template → abrir editor → salvar campos → publicar).
3. THE `docs/flows.md` SHALL contain um Diagrama_Mermaid de sequência para o fluxo de geração de PDF (criar documento → preencher campos → enfileirar job → BullMQ_Worker processar → download).
4. THE `docs/flows.md` SHALL contain um Diagrama_Mermaid de estado para o ciclo de vida de um Template (DRAFT → PUBLISHED → ARCHIVED).
5. THE `docs/flows.md` SHALL contain um Diagrama_Mermaid de estado para o ciclo de vida de um Document (DRAFT → IN_PROGRESS → GENERATING → GENERATED / ERROR).
6. THE `docs/flows.md` SHALL contain um Diagrama_Mermaid de sequência para o fluxo do Editor_Visual (carregar template → renderizar PDF → drag/drop campo → autosave → undo/redo).
7. THE `docs/flows.md` SHALL contain um Diagrama_Mermaid explicando o sistema de Repetition_Engine (como RepetitionConfig gera layout de páginas e clona campos).
8. WHEN a developer needs to debug a bug in PDF generation, THE `docs/flows.md` SHALL allow the developer to identify all steps involved without reading the source code first.

---

### Requirement 4: Padrões de Código e Convenções

**User Story:** As a Dev_Novo, I want a coding standards document, so that I can write code consistent with the existing codebase without needing code review to learn the conventions.

#### Acceptance Criteria

1. THE Docs SHALL contain um arquivo `docs/conventions.md`.
2. THE `docs/conventions.md` SHALL contain as convenções de nomenclatura para arquivos, funções, variáveis e tipos TypeScript usadas no projeto.
3. THE `docs/conventions.md` SHALL contain a estrutura de pastas esperada para cada app e pacote, com exemplos.
4. THE `docs/conventions.md` SHALL contain as regras de uso de Zod validators (onde criar, como importar, como compor schemas).
5. THE `docs/conventions.md` SHALL contain as regras de uso de React Query vs Zustand (quando usar cada um, com exemplos do projeto).
6. THE `docs/conventions.md` SHALL contain as regras de tratamento de erros na API (formato `ApiResponse`, uso do `errorHandler` middleware).
7. THE `docs/conventions.md` SHALL contain as regras de uso de coordenadas relativas em campos (como converter para absolutas no PDF_Engine).
8. THE `docs/conventions.md` SHALL contain as regras de adição de novos pacotes ao Monorepo (configuração de `package.json`, `tsconfig.json`, `turbo.json`).
9. WHEN a developer adds a new API route, THE `docs/conventions.md` SHALL provide enough guidance to follow the existing patterns without reading other routes first.

---

### Requirement 5: Architecture Decision Records (ADRs)

**User Story:** As a Dev_Novo, I want ADRs documenting key technical decisions, so that I understand why the system is built the way it is and avoid re-litigating past decisions.

#### Acceptance Criteria

1. THE Docs SHALL contain uma pasta `docs/adr/`.
2. THE `docs/adr/` SHALL contain um arquivo `docs/adr/README.md` com índice de todos os ADRs e instruções de como criar novos.
3. THE `docs/adr/` SHALL contain um ADR para a decisão de usar Konva vs Fabric.js no Editor_Visual.
4. THE `docs/adr/` SHALL contain um ADR para a decisão de usar coordenadas relativas (0–1) em FieldPosition.
5. THE `docs/adr/` SHALL contain um ADR para a decisão de usar BullMQ + Redis para geração assíncrona de PDF.
6. THE `docs/adr/` SHALL contain um ADR para a decisão de usar Zustand para estado do editor e React Query para dados do servidor.
7. THE `docs/adr/` SHALL contain um ADR para a decisão de usar MinIO/S3 para armazenamento de arquivos em vez de base64 ou filesystem.
8. WHEN a developer proposes replacing a core technology, THE ADR for that technology SHALL provide the original context and alternatives considered.
9. THE `docs/adr/README.md` SHALL contain um template padrão de ADR com campos: Título, Status, Contexto, Decisão, Alternativas Consideradas, Consequências.

---

### Requirement 6: Documentação dos Pacotes Compartilhados

**User Story:** As a Dev_Novo, I want documentation for each shared package, so that I can use them correctly without reading all the source code.

#### Acceptance Criteria

1. THE Docs SHALL contain um arquivo `docs/packages.md`.
2. THE `docs/packages.md` SHALL contain a API pública de `packages/editor-engine` com exemplos de uso de `RepetitionEngine`, `FieldCloner`, `SnapGrid` e `HistoryManager`.
3. THE `docs/packages.md` SHALL contain a API pública de `packages/pdf-engine` com exemplos de uso de `PdfProcessor`, `PdfGenerator` e `ImageCompressor`.
4. THE `docs/packages.md` SHALL contain a descrição dos tipos principais de `packages/shared` com exemplos de `TemplateField`, `RepetitionConfig` e `FilledFieldData`.
5. THE `docs/packages.md` SHALL contain a descrição dos validators de `packages/validators` com exemplos de como usar os schemas Zod.
6. THE `docs/packages.md` SHALL contain um Diagrama_Mermaid mostrando como os pacotes compartilhados são consumidos por `apps/api` e `apps/web`.
7. WHEN a developer needs to add a new field type, THE `docs/packages.md` SHALL identify all packages that need to be modified.

---

### Requirement 7: Guia de Contribuição

**User Story:** As a Dev_Novo, I want a contribution guide, so that I know the full workflow from local setup to opening a pull request.

#### Acceptance Criteria

1. THE Docs SHALL contain um arquivo `docs/contributing.md`.
2. THE `docs/contributing.md` SHALL contain o fluxo completo de desenvolvimento local: branch → código → lint → type-check → commit.
3. THE `docs/contributing.md` SHALL contain as convenções de mensagens de commit usadas no projeto.
4. THE `docs/contributing.md` SHALL contain instruções de como rodar o Prisma Studio e como criar migrations.
5. THE `docs/contributing.md` SHALL contain instruções de como adicionar um novo endpoint à API (rota → service → validator → teste manual).
6. THE `docs/contributing.md` SHALL contain instruções de como adicionar um novo componente ao `packages/ui`.
7. WHEN a developer finishes implementing a feature, THE `docs/contributing.md` SHALL provide a checklist of steps before opening a pull request.

---

### Requirement 8: Consistência e Navegabilidade da Documentação

**User Story:** As a Dev_Novo, I want all documentation to be consistently formatted and cross-linked, so that I can navigate between documents without losing context.

#### Acceptance Criteria

1. THE Docs SHALL use consistent Markdown formatting across all documents (headings, code blocks, tables).
2. WHEN a document references another document, THE document SHALL include a relative link to the referenced file.
3. THE README SHALL contain links to all documents in `docs/`.
4. THE `docs/` SHALL contain um arquivo `docs/index.md` com índice navegável de toda a documentação.
5. WHEN a Diagrama_Mermaid is included in a document, THE diagram SHALL have a title or caption explaining its purpose.
6. THE Docs SHALL use Portuguese (pt-BR) as the primary language for all documentation, consistent with the existing README.
7. IF a document is created without a corresponding link in `docs/index.md`, THEN THE `docs/index.md` SHALL be updated to include the new document.
