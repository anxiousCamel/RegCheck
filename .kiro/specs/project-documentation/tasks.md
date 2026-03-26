# Plano de Implementação: project-documentation

## Visão Geral

Criar a documentação técnica completa do RegCheck: reescrever o `README.md` e criar a pasta `docs/` com arquitetura, fluxos, convenções, pacotes, guia de contribuição e ADRs. Cada arquivo deve ter conteúdo real e completo, com diagramas Mermaid funcionais.

## Tasks

- [ ] 1. Criar README.md na raiz do monorepo
  - Reescrever o arquivo `README.md` com conteúdo completo e real
  - Incluir diagrama Mermaid `graph LR` mostrando todos os pacotes e apps do monorepo com dependências internas
  - Incluir diagrama Mermaid de stack tecnológica organizado por camada (infra, backend, frontend, shared)
  - Incluir tabela de URLs de acesso local (Frontend :3000, API :4000, MinIO Console :9001, Prisma Studio :5555)
  - Incluir seção de setup com pré-requisitos, clone, `.env`, `pnpm infra:up`, `pnpm db:push`, `pnpm dev`
  - Incluir tabela de comandos essenciais com todos os scripts do `package.json` raiz e descrição
  - Incluir links navegáveis para `docs/index.md`, `docs/architecture.md`, `docs/flows.md`, `docs/conventions.md`, `docs/packages.md`, `docs/contributing.md`, `docs/adr/README.md`
  - Incluir seção de troubleshooting com erros comuns (porta ocupada, MinIO não sobe, Prisma migration falha, CORS)
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9_

- [ ] 2. Criar docs/index.md — índice navegável
  - Criar o arquivo `docs/index.md` com índice completo de toda a documentação
  - Incluir links relativos para todos os arquivos em `docs/` agrupados por categoria (Arquitetura, Fluxos, Padrões, Pacotes, Contribuição, ADRs)
  - Incluir breve descrição de cada documento para orientar o leitor
  - _Requirements: 8.4, 8.7_

- [ ] 3. Criar docs/architecture.md — arquitetura do sistema
  - Criar o arquivo `docs/architecture.md` com conteúdo completo
  - Incluir diagrama C4 nível 2 (Container Diagram) com `graph TD` mostrando: Next.js (3000), Express API (4000), PostgreSQL (5432), Redis (6379), MinIO (9000/9001) e suas conexões
  - Incluir diagrama de dependências entre pacotes do monorepo (`graph LR` mostrando quem importa quem entre `apps/api`, `apps/web`, `packages/*`)
  - Incluir diagrama ER do schema (`erDiagram`) com todas as entidades: PdfFile, Template, TemplateField, TemplateVersion, Document, FilledField, Equipamento, Loja, Setor, TipoEquipamento e seus relacionamentos
  - Incluir tabela de responsabilidades de cada pacote e app (`apps/api`, `apps/web`, `@regcheck/database`, `@regcheck/pdf-engine`, `@regcheck/editor-engine`, `@regcheck/shared`, `@regcheck/validators`, `@regcheck/ui`)
  - Incluir seção explicando o sistema de coordenadas relativas (0–1) com a fórmula: `absX = pos.x * pageWidth`, `absY = pageHeight - (pos.y * pageHeight) - (pos.height * pageHeight)`
  - Incluir link para `docs/adr/002-coordenadas-relativas.md`
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7_

- [ ] 4. Criar docs/flows.md — fluxos principais do sistema
  - Criar o arquivo `docs/flows.md` com todos os diagramas de fluxo
  - Incluir diagrama de estado (`stateDiagram-v2`) para ciclo de vida do Template: `DRAFT → PUBLISHED → ARCHIVED`
  - Incluir diagrama de estado (`stateDiagram-v2`) para ciclo de vida do Document: `DRAFT → IN_PROGRESS → GENERATING → GENERATED` e `GENERATING → ERROR`
  - Incluir diagrama de sequência (`sequenceDiagram`) para criação de Template: upload PDF → POST /api/uploads → criar template → abrir editor → drag/drop campos → autosave → publicar
  - Incluir diagrama de sequência (`sequenceDiagram`) para geração de PDF: POST /api/documents/:id/generate → BullMQ enqueue → worker carrega dados → download PDF S3 → duplica páginas → downloads paralelos de imagens → pdf-lib overlay → upload S3 → status GENERATED; frontend polling GET /api/documents/:id/status a cada 3s
  - Incluir diagrama de sequência (`sequenceDiagram`) para o Editor Visual: carregar template → GET /api/templates/:id → renderizar PDF com pdfjs → drag/drop campo Konva → autosave (debounce 1s) → undo/redo via HistoryManager
  - Incluir diagrama de fluxo (`flowchart TD`) explicando o RepetitionEngine: RepetitionConfig (rows, cols, offsetX, offsetY) → computeLayout → totalPages → FieldCloner.cloneForItems → campos com computedPageIndex e computedItemIndex
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8_

- [ ] 5. Criar docs/conventions.md — padrões de código
  - Criar o arquivo `docs/conventions.md` com todas as convenções do projeto
  - Incluir seção de nomenclatura: arquivos em `kebab-case`, componentes React em `PascalCase`, funções/variáveis em `camelCase`, tipos/interfaces em `PascalCase`, constantes em `UPPER_SNAKE_CASE`
  - Incluir seção de estrutura de pastas esperada para `apps/api` (routes, services, middleware, lib, jobs) e `apps/web` (app, components, hooks, stores, lib) com exemplos reais do projeto
  - Incluir seção de uso de Zod validators: onde criar (`packages/validators/src/`), como importar (`@regcheck/validators`), como compor schemas, exemplo com `templateCreateSchema`
  - Incluir seção de React Query vs Zustand: React Query para dados do servidor (GET/POST/PUT/DELETE), Zustand para estado local do editor (`editor-store.ts`), com exemplos reais do projeto
  - Incluir seção de tratamento de erros na API: formato `ApiResponse<T>` de `@regcheck/shared`, uso do `errorHandler` middleware em `apps/api/src/middleware/error-handler.ts`, como lançar erros com status code
  - Incluir seção de coordenadas relativas: regra de nunca armazenar coordenadas absolutas, fórmula de conversão, onde a conversão acontece (`@regcheck/pdf-engine`)
  - Incluir seção de adição de novos pacotes ao monorepo: criar `packages/novo-pacote/package.json` com `name: "@regcheck/novo-pacote"`, configurar `tsconfig.json` com `extends: "../../tsconfig.base.json"`, adicionar ao `turbo.json` se necessário
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9_

- [ ] 6. Criar docs/packages.md — API dos pacotes compartilhados
  - Criar o arquivo `docs/packages.md` com documentação de todos os pacotes
  - Documentar `@regcheck/editor-engine`: `RepetitionEngine.computeLayout(totalItems, config)`, `FieldCloner.cloneForItems(fields, totalItems, config)`, `SnapGrid`, `HistoryManager` — com exemplos de uso reais
  - Documentar `@regcheck/pdf-engine`: `PdfProcessor.duplicatePages()`, `PdfProcessor.getPageInfo()`, `PdfGenerator.generate({ originalPdf, pages, fieldOverlays })`, `ImageCompressor` — com exemplos de uso reais
  - Documentar `@regcheck/shared`: tipos `TemplateField`, `RepetitionConfig`, `FilledFieldData`, `FieldPosition`, `ApiResponse<T>` com exemplos de valores reais
  - Documentar `@regcheck/validators`: schemas Zod principais com exemplos de `parse()` e `safeParse()`
  - Incluir diagrama Mermaid (`graph LR`) mostrando como `apps/api` e `apps/web` consomem os pacotes compartilhados
  - Incluir nota sobre qual pacote modificar para adicionar novo tipo de campo
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7_

- [ ] 7. Criar docs/contributing.md — guia de contribuição
  - Criar o arquivo `docs/contributing.md` com o guia completo
  - Incluir fluxo de desenvolvimento local: `git checkout -b feat/nome` → código → `pnpm lint` → `pnpm type-check` → `git commit`
  - Incluir convenções de commit: formato `tipo(escopo): descrição` com tipos `feat`, `fix`, `docs`, `refactor`, `chore`, `test` e exemplos reais
  - Incluir instruções de Prisma Studio (`pnpm db:studio`) e como criar migrations (`pnpm db:migrate -- --name nome-da-migration`)
  - Incluir passo a passo de como adicionar novo endpoint à API: criar rota em `apps/api/src/routes/`, criar service em `apps/api/src/services/`, criar schema em `packages/validators/src/`, registrar rota em `server.ts`
  - Incluir passo a passo de como adicionar componente ao `packages/ui`: criar arquivo, exportar em `index.ts`, usar em `apps/web`
  - Incluir checklist de PR com itens `- [ ]` cobrindo: lint passa, type-check passa, testes passam, documentação atualizada, migrations criadas se necessário
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7_

- [ ] 8. Criar docs/adr/README.md — índice de ADRs e template
  - Criar o arquivo `docs/adr/README.md` com índice de todos os ADRs e template padrão
  - Incluir tabela com todos os 5 ADRs: número, título, status, link
  - Incluir template padrão de ADR com campos: Título, Status (Aceito/Proposto/Depreciado/Substituído), Contexto, Decisão, Alternativas Consideradas, Consequências
  - Incluir instruções de como criar um novo ADR (nomear arquivo, preencher template, atualizar índice)
  - _Requirements: 5.1, 5.2, 5.9_

- [ ] 9. Criar docs/adr/001-konva-vs-fabricjs.md
  - Criar ADR documentando a decisão de usar Konva.js em vez de Fabric.js no Editor Visual
  - Status: Aceito
  - Contexto: necessidade de canvas interativo para posicionar campos sobre PDFs renderizados
  - Decisão: Konva.js com React Konva
  - Alternativas: Fabric.js, canvas nativo, SVG overlay
  - Consequências: integração com React via `react-konva`, suporte a grupos, eventos de drag/drop nativos, sem suporte a texto editável inline
  - _Requirements: 5.3_

- [ ] 10. Criar docs/adr/002-coordenadas-relativas.md
  - Criar ADR documentando a decisão de armazenar coordenadas de campos como valores relativos (0–1)
  - Status: Aceito
  - Contexto: PDFs têm dimensões variáveis por página; coordenadas absolutas quebrariam ao trocar o PDF base
  - Decisão: armazenar `{ x, y, width, height }` como frações da dimensão da página
  - Alternativas: coordenadas absolutas em pontos PDF, coordenadas em pixels da tela
  - Consequências: conversão necessária no `@regcheck/pdf-engine` na hora de gerar; editor precisa converter ao renderizar
  - _Requirements: 5.4_

- [ ] 11. Criar docs/adr/003-bullmq-redis-pdf.md
  - Criar ADR documentando a decisão de usar BullMQ + Redis para geração assíncrona de PDF
  - Status: Aceito
  - Contexto: geração de PDF é CPU/IO intensiva (download S3, pdf-lib overlay, upload S3) e não pode bloquear a request HTTP
  - Decisão: BullMQ com Redis para fila de jobs, worker em processo separado
  - Alternativas: geração síncrona na request, AWS Lambda, worker threads Node.js
  - Consequências: frontend precisa fazer polling de status; Redis é dependência de infra; jobs podem ser retentados automaticamente
  - _Requirements: 5.5_

- [ ] 12. Criar docs/adr/004-zustand-react-query.md
  - Criar ADR documentando a decisão de usar Zustand para estado do editor e React Query para dados do servidor
  - Status: Aceito
  - Contexto: editor visual tem estado local complexo (campos selecionados, histórico, página atual) que não precisa ser sincronizado com servidor; dados de templates/documentos precisam de cache e invalidação
  - Decisão: Zustand para `editor-store.ts`, React Query (TanStack Query) para todas as chamadas à API
  - Alternativas: Redux Toolkit, Context API + useReducer, SWR, estado local com useState
  - Consequências: dois paradigmas de estado no frontend; Zustand é simples e sem boilerplate; React Query elimina loading/error states manuais
  - _Requirements: 5.6_

- [ ] 13. Criar docs/adr/005-minio-s3-storage.md
  - Criar ADR documentando a decisão de usar MinIO/S3 para armazenamento de arquivos
  - Status: Aceito
  - Contexto: PDFs base, imagens de campos e PDFs gerados precisam de armazenamento persistente e acessível pelo worker
  - Decisão: MinIO em desenvolvimento (compatível com S3 API), AWS S3 em produção; cliente `@aws-sdk/client-s3`
  - Alternativas: base64 no banco de dados, filesystem local, Cloudinary
  - Consequências: MinIO como dependência de infra local; `fileKey` armazenado no banco; URLs pré-assinadas para download seguro
  - _Requirements: 5.7_

- [ ] 14. Checkpoint — verificar estrutura e links
  - Verificar que todos os 13 arquivos foram criados: `README.md`, `docs/index.md`, `docs/architecture.md`, `docs/flows.md`, `docs/conventions.md`, `docs/packages.md`, `docs/contributing.md`, `docs/adr/README.md`, e os 5 ADRs
  - Verificar que `docs/index.md` contém links relativos para todos os arquivos em `docs/`
  - Verificar que `README.md` contém links para todos os documentos em `docs/`
  - Verificar que todos os blocos Mermaid têm título ou legenda imediatamente antes
  - Verificar que todos os ADRs contêm as seções: Título, Status, Contexto, Decisão, Alternativas Consideradas, Consequências
  - Garantir que todos os testes passam, perguntar ao usuário se houver dúvidas.
  - _Requirements: 8.1, 8.2, 8.3, 8.5_

## Notas

- Tasks marcadas com `*` são opcionais e podem ser puladas para um MVP mais rápido
- Cada task referencia os requisitos específicos para rastreabilidade
- Todo conteúdo deve ser em português (pt-BR), consistente com o projeto
- Diagramas Mermaid devem usar sintaxe válida renderizável no GitHub
- Nenhum arquivo deve conter placeholders — todo conteúdo deve ser real e específico ao RegCheck
