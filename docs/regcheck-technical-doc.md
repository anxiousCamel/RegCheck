# DOCUMENTAÇÃO TÉCNICA COMPLETA - REGCHECK

**Versão:** 1.0  
**Data:** Janeiro 2025  
**Sistema:** RegCheck - Construtor e Preenchedor de Templates PDF

---

## 1. OBJETIVO

O RegCheck é um sistema de construção e preenchimento de templates de documentos PDF desenvolvido para automatizar a geração de documentos padronizados com dados variáveis.

**Capacidades principais:**
- Criar templates visuais sobre PDFs existentes via editor drag-and-drop
- Posicionar campos interativos (texto, imagem, assinatura, checkbox) em coordenadas precisas
- Preencher campos com dados estruturados
- Gerar PDFs finais de forma assíncrona via fila de processamento
- Suportar repetição de campos em grade para etiquetas de equipamentos (múltiplos itens por página)
- Gerenciar cadastros de equipamentos, lojas, setores e tipos de equipamento

**Problema resolvido:** Eliminação de preenchimento manual de formulários PDF repetitivos, reduzindo erros humanos e tempo de processamento.

**Público-alvo:** Equipes de TI e operações que precisam gerar documentos padronizados em escala (etiquetas de equipamentos, relatórios, formulários de inspeção).

---

## 2. REFERÊNCIA

- **Repositório:** [URL do repositório Git]
- **Ambiente de desenvolvimento:** 
  - Frontend: http://localhost:3000
  - API: http://localhost:4000
  - MinIO Console: http://localhost:9001
  - Prisma Studio: http://localhost:5555
- **Documentação adicional:** 
  - `/docs/flows.md` - Fluxos principais do sistema
  - `/docs/architecture.md` - Arquitetura detalhada
  - `/docs/packages.md` - API dos pacotes compartilhados
  - `/README.md` - Guia de setup e comandos

---

## 3. GLOSSÁRIO

| Termo | Definição |
|-------|-----------|
| **Template** | Definição de documento PDF com campos posicionados, usado como base para gerar documentos preenchidos |
| **Document** | Instância de um template com dados preenchidos, aguardando ou já processado em PDF final |
| **TemplateField** | Campo interativo posicionado em um template (texto, imagem, assinatura, checkbox) |
| **FilledField** | Valor preenchido para um campo específico em um documento |
| **PdfFile** | Arquivo PDF base armazenado no MinIO, usado como fundo para templates |
| **TemplatePaginator** | Componente que calcula quantas páginas são necessárias para N itens |
| **BullMQ** | Biblioteca de filas de jobs baseada em Redis |
| **MinIO** | Armazenamento de objetos S3-compatible usado para PDFs e imagens |
| **Konva** | Biblioteca de canvas HTML5 para renderização do editor visual |
| **pdfjs** | Biblioteca para renderização de PDFs no navegador |
| **pdf-lib** | Biblioteca para manipulação de PDFs no backend (overlays) |
| **Scope** | Escopo de um campo: `global` (um valor para todas as páginas) ou `item` (valor por item) |
| **SlotIndex** | Índice da posição de um item na grade de repetição (0..N-1) |
| **BindingKey** | Chave de vinculação automática de dados (`global.<key>` ou `eq.<key>`) |

---

## 4. PÚBLICO-ALVO

**Desenvolvedores:**
- Arquitetos de software que precisam entender a estrutura do monorepo
- Desenvolvedores backend (Node.js/Express/Prisma)
- Desenvolvedores frontend (Next.js/React/Konva)
- DevOps responsáveis por deploy e infraestrutura

**Usuários técnicos:**
- Administradores de sistema que configuram e mantêm o ambiente
- Analistas de TI que criam templates e geram documentos

---

## 5. CONFIDENCIALIDADE E SIGILO

**Classificação:** Interno  
**Restrições:** Este documento contém informações técnicas proprietárias do sistema RegCheck. Não deve ser compartilhado externamente sem autorização.

---

## 6. REGRAS GERAIS

### 6.1 MVP (v1.0)

**Funcionalidades implementadas:**

✅ **Editor Visual de Templates**
- Upload de PDF base
- Posicionamento de campos via drag-and-drop (Konva)
- Tipos de campo: TEXT, IMAGE, SIGNATURE, CHECKBOX
- Autosave a cada 5 segundos
- Undo/Redo (Ctrl+Z / Ctrl+Y)
- Navegação entre páginas do PDF
- Publicação de templates (status: DRAFT → PUBLISHED)

✅ **Preenchimento de Documentos**
- Wizard de preenchimento campo a campo
- Upload de imagens para campos IMAGE
- Canvas de assinatura para campos SIGNATURE
- Validação de campos obrigatórios
- Salvamento de rascunho local (IndexedDB)

✅ **Geração Assíncrona de PDFs**
- Fila BullMQ com worker dedicado
- Processamento paralelo de downloads de imagens
- Aplicação de overlays com pdf-lib
- Upload do PDF gerado para MinIO
- Polling de status pelo frontend (a cada 3s)

✅ **Repetição de Campos em Grade**
- TemplatePaginator: cálculo de layout automático
- Suporte a múltiplos itens por página
- Duplicação de páginas do PDF base
- Clonagem de campos com offsets calculados

✅ **Gestão de Equipamentos**
- CRUD de Lojas, Setores, Tipos de Equipamento
- CRUD de Equipamentos (número, série, patrimônio, modelo, IP, GLPI ID)
- Filtros e busca
- Scanner de código de barras (câmera + ZXing)
- OCR de etiquetas (Tesseract.js)

✅ **Infraestrutura**
- Monorepo Turborepo + pnpm
- PostgreSQL 16 (Prisma ORM)
- Redis 7 (BullMQ)
- MinIO (S3-compatible storage)
- Docker Compose para ambiente local

**Limitações conhecidas:**

⚠️ **Autenticação e autorização:** Não implementado. Sistema aberto sem controle de acesso.

⚠️ **Versionamento de templates:** Modelo `TemplateVersion` existe no schema mas não é usado. Alterações em templates publicados afetam documentos existentes.

⚠️ **Validação de integridade de PDFs:** Não há verificação de corrupção de arquivos ou limites de tamanho por página.

⚠️ **Retry automático de jobs falhados:** BullMQ suporta retry mas não está configurado. Jobs que falham ficam em estado ERROR permanentemente.

⚠️ **Logs estruturados:** Worker usa `console.log` com JSON, mas não há agregação centralizada (ELK, CloudWatch).

⚠️ **Testes automatizados:** Cobertura mínima. Apenas alguns testes unitários em `@regcheck/editor-engine`.

⚠️ **Responsividade mobile:** Editor visual não é otimizado para telas pequenas.

⚠️ **Internacionalização:** Interface em português hardcoded.

### 6.2 EXPECTATIVAS FUTURAS

**Roadmap técnico (não implementado):**

🔮 **Autenticação e RBAC**
- Integração com OAuth2/OIDC (Keycloak, Auth0)
- Roles: Admin, Editor, Viewer
- Permissões por template e documento

🔮 **Versionamento de Templates**
- Snapshot automático ao publicar
- Rollback para versões anteriores
- Documentos vinculados a versão específica do template

🔮 **Validação Avançada de PDFs**
- Limite de tamanho por página (ex: 10MB)
- Detecção de PDFs corrompidos
- Validação de campos obrigatórios no backend

🔮 **Retry e Dead Letter Queue**
- Configuração de retry exponencial no BullMQ
- DLQ para jobs que falharam 3x
- Notificações de falha (email, Slack)

🔮 **Observabilidade**
- Logs estruturados com Winston/Pino
- Métricas com Prometheus (latência, taxa de erro)
- Tracing distribuído com OpenTelemetry
- Dashboards Grafana

🔮 **Testes**
- Cobertura de 80%+ com Vitest
- Testes E2E com Playwright
- Testes de carga com k6

🔮 **Performance**
- Cache de PDFs renderizados (Redis)
- CDN para assets estáticos
- Compressão de imagens com sharp (já implementado mas não otimizado)
- Lazy loading de páginas no editor

🔮 **Funcionalidades de Negócio**
- Templates compartilhados entre usuários
- Histórico de documentos gerados
- Busca full-text em documentos
- Exportação em lote (ZIP de PDFs)
- Webhooks para integração com sistemas externos



### 6.3 ESPECIFICAÇÃO TÉCNICA E ARQUITETURA

#### 6.3.1 Visão Geral da Arquitetura

```mermaid
graph TB
    subgraph "Frontend (Next.js 14)"
        WEB[Next.js App Router]
        EDITOR[Editor Visual - Konva]
        WIZARD[Wizard de Preenchimento]
        SCANNER[Scanner QR/Barcode]
        OCR[OCR - Tesseract.js]
    end

    subgraph "Backend (Express 4)"
        API[API REST]
        WORKER[PDF Generation Worker]
        SERVICES[Services Layer]
    end

    subgraph "Infraestrutura"
        PG[(PostgreSQL 16)]
        REDIS[(Redis 7)]
        MINIO[MinIO S3]
    end

    subgraph "Pacotes Compartilhados"
        DB[@regcheck/database]
        PDF[@regcheck/pdf-engine]
        EDENG[@regcheck/editor-engine]
        SHARED[@regcheck/shared]
        VALIDATORS[@regcheck/validators]
        UI[@regcheck/ui]
    end

    WEB --> API
    EDITOR --> API
    WIZARD --> API
    SCANNER --> OCR
    
    API --> SERVICES
    API --> REDIS
    WORKER --> REDIS
    WORKER --> SERVICES
    
    SERVICES --> DB
    SERVICES --> MINIO
    WORKER --> PDF
    WORKER --> EDENG
    
    DB --> PG
    PDF --> SHARED
    EDENG --> SHARED
    SERVICES --> VALIDATORS
```

#### 6.3.2 Estrutura do Monorepo

```
regcheck/
├── apps/
│   ├── api/                    # Backend Express (porta 4000)
│   │   ├── src/
│   │   │   ├── routes/         # Rotas REST
│   │   │   ├── services/       # Lógica de negócio
│   │   │   ├── jobs/           # Workers BullMQ
│   │   │   ├── lib/            # Utilitários (S3, Redis, Queue)
│   │   │   ├── middleware/     # Error handler, logger
│   │   │   └── server.ts       # Entry point
│   │   └── package.json
│   └── web/                    # Frontend Next.js (porta 3000)
│       ├── src/
│       │   ├── app/            # App Router (pages)
│       │   ├── components/     # Componentes React
│       │   ├── hooks/          # Custom hooks
│       │   ├── lib/            # API client, scanner, draft-db
│       │   └── stores/         # Zustand stores
│       └── package.json
├── packages/
│   ├── database/               # Prisma ORM
│   │   ├── prisma/
│   │   │   └── schema.prisma   # Schema do banco
│   │   └── src/
│   │       └── index.ts        # PrismaClient export
│   ├── pdf-engine/             # Geração de PDFs
│   │   └── src/
│   │       ├── generator.ts    # PdfGenerator (pdf-lib)
│   │       ├── processor.ts    # PdfProcessor (duplicação)
│   │       └── image-compressor.ts
│   ├── editor-engine/          # Lógica do editor
│   │   └── src/
│   │       ├── template-paginator.ts  # Cálculo de layout
│   │       ├── field-binding-resolver.ts
│   │       ├── snap-grid.ts
│   │       └── history-manager.ts
│   ├── shared/                 # Tipos TypeScript
│   │   └── src/
│   │       └── types.ts
│   ├── validators/             # Schemas Zod
│   │   └── src/
│   │       └── schemas.ts
│   └── ui/                     # Componentes React
│       └── src/
│           └── components/
├── infra/
│   └── docker-compose.yml      # PostgreSQL, Redis, MinIO
├── scripts/                    # Scripts de automação
├── docs/                       # Documentação
└── package.json                # Root workspace
```

#### 6.3.3 Stack Tecnológica Detalhada

**Backend:**
- **Runtime:** Node.js 20+
- **Framework:** Express 4.18
- **ORM:** Prisma 5
- **Fila:** BullMQ 5.1 (Redis)
- **Storage:** AWS SDK S3 v3 (MinIO)
- **PDF:** pdf-lib 1.17, sharp 0.33
- **Validação:** Zod 3.22
- **Segurança:** Helmet 7.1, CORS 2.8

**Frontend:**
- **Framework:** Next.js 14 (App Router)
- **UI:** React 18, Tailwind CSS 3.4
- **Canvas:** Konva 9.3, react-konva 18.2
- **PDF Render:** pdfjs-dist 4.0
- **State:** Zustand 4.5, TanStack Query 5.20
- **Scanner:** ZXing-wasm 3.0, Tesseract.js 7.0
- **Ícones:** Lucide React 0.344

**Infraestrutura:**
- **Database:** PostgreSQL 16
- **Cache/Queue:** Redis 7
- **Storage:** MinIO (S3-compatible)
- **Orquestração:** Docker Compose
- **Monorepo:** Turborepo 2.9, pnpm 9.15

#### 6.3.4 Diagrama de Componentes

```mermaid
graph LR
    subgraph "apps/web"
        A1[Editor Canvas]
        A2[Fill Wizard]
        A3[Equipment Scanner]
        A4[CRUD Tables]
    end

    subgraph "apps/api"
        B1[Template Routes]
        B2[Document Routes]
        B3[Equipment Routes]
        B4[Upload Routes]
        B5[PDF Worker]
    end

    subgraph "packages"
        C1[@regcheck/pdf-engine]
        C2[@regcheck/editor-engine]
        C3[@regcheck/database]
        C4[@regcheck/validators]
    end

    A1 --> B1
    A2 --> B2
    A3 --> B3
    A4 --> B3
    
    B1 --> C3
    B2 --> C3
    B3 --> C3
    B4 --> C3
    
    B5 --> C1
    B5 --> C2
    B5 --> C3
    
    B1 --> C4
    B2 --> C4
```

#### 6.3.5 Modelo de Dados (DDL Prisma)

**Schema completo do banco de dados:**

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

/// Uploaded PDF files used as template bases
model PdfFile {
  id        String   @id @default(uuid())
  fileName  String
  fileKey   String   @unique
  fileSize  Int
  mimeType  String
  pageCount Int
  createdAt DateTime @default(now())

  templates Template[]

  @@map("pdf_files")
}

/// Document template definitions
model Template {
  id          String         @id @default(uuid())
  name        String
  description String?
  status      TemplateStatus @default(DRAFT)
  version     Int            @default(1)

  /// Reference to the base PDF
  pdfFileId String
  pdfFile   PdfFile @relation(fields: [pdfFileId], references: [id])

  fields   TemplateField[]
  versions TemplateVersion[]
  documents Document[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([status])
  @@index([createdAt])
  @@map("templates")
}

enum TemplateStatus {
  DRAFT
  PUBLISHED
  ARCHIVED
}

/// Version history for templates
model TemplateVersion {
  id         String @id @default(uuid())
  templateId String
  template   Template @relation(fields: [templateId], references: [id], onDelete: Cascade)
  version    Int

  /// Snapshot of template data at this version
  snapshot Json

  createdAt DateTime @default(now())

  @@unique([templateId, version])
  @@index([templateId])
  @@map("template_versions")
}

/// Fields defined on a template page
model TemplateField {
  id         String @id @default(uuid())
  templateId String
  template   Template @relation(fields: [templateId], references: [id], onDelete: Cascade)

  type      FieldType
  pageIndex Int

  /// Position as JSON: { x, y, width, height }
  position Json

  /// Configuration as JSON: { label, required, placeholder, ... }
  config Json

  /// Field scope: 'global' (one value, rendered on every page) or 'item' (per SX slot)
  scope String @default("item")

  /// SX slot index on the page (0..N-1). Null for global-scope fields.
  slotIndex Int?

  /// Optional binding for auto-population. Free-form `<ns>.<key>`:
  ///   - `global.<key>`: resolved from document-level globals
  ///   - `eq.<key>`:     resolved from the item's source record at itemIndex
  bindingKey String?

  filledData FilledField[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([templateId, pageIndex])
  @@index([templateId, slotIndex])
  @@map("template_fields")
}

enum FieldType {
  TEXT
  IMAGE
  SIGNATURE
  CHECKBOX
}

/// A filled document instance
model Document {
  id              String         @id @default(uuid())
  name            String
  status          DocumentStatus @default(DRAFT)
  totalItems      Int
  templateId      String
  template        Template       @relation(fields: [templateId], references: [id])
  templateVersion Int

  /// Generated PDF file key
  generatedPdfKey String?

  /// Equipment assignment metadata (populated by /populate endpoint)
  metadata Json?

  filledFields FilledField[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([templateId])
  @@index([status])
  @@index([createdAt])
  @@map("documents")
}

enum DocumentStatus {
  DRAFT
  IN_PROGRESS
  COMPLETED
  GENERATING
  GENERATED
  ERROR
}

/// Data filled into a field for a specific item
model FilledField {
  id         String @id @default(uuid())
  documentId String
  document   Document @relation(fields: [documentId], references: [id], onDelete: Cascade)
  fieldId    String
  field      TemplateField @relation(fields: [fieldId], references: [id], onDelete: Cascade)

  /// Which repetition item (0-based)
  itemIndex Int

  /// The value: text content, boolean string, or file key
  value String

  /// For image/signature: storage key
  fileKey String?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([documentId, fieldId, itemIndex])
  @@index([documentId])
  @@index([fieldId])
  @@map("filled_fields")
}

/// Store locations
model Loja {
  id        String   @id @default(uuid())
  nome      String   @unique
  ativo     Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  equipamentos Equipamento[]

  @@index([ativo])
  @@map("lojas")
}

/// Sectors within a store
model Setor {
  id        String   @id @default(uuid())
  nome      String   @unique
  ativo     Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  equipamentos Equipamento[]

  @@index([ativo])
  @@map("setores")
}

/// Equipment type classification
model TipoEquipamento {
  id        String   @id @default(uuid())
  nome      String   @unique
  ativo     Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  equipamentos Equipamento[]

  @@index([ativo])
  @@map("tipos_equipamento")
}

/// Equipment registry
model Equipamento {
  id                String          @id @default(uuid())
  lojaId            String
  loja              Loja            @relation(fields: [lojaId], references: [id])
  setorId           String
  setor             Setor           @relation(fields: [setorId], references: [id])
  tipoId            String
  tipo              TipoEquipamento @relation(fields: [tipoId], references: [id])
  numeroEquipamento String
  serie             String?
  patrimonio        String?
  modelo            String?
  ip                String?
  glpiId            String?
  createdAt         DateTime        @default(now())
  updatedAt         DateTime        @updatedAt

  @@index([lojaId])
  @@index([setorId])
  @@index([tipoId])
  @@index([serie])
  @@index([patrimonio])
  @@index([numeroEquipamento])
  @@map("equipamentos")
}
```

**Diagrama ER (Entidade-Relacionamento):**

```mermaid
erDiagram
    PdfFile ||--o{ Template : "base"
    Template ||--o{ TemplateField : "contains"
    Template ||--o{ TemplateVersion : "versions"
    Template ||--o{ Document : "instances"
    TemplateField ||--o{ FilledField : "filled_in"
    Document ||--o{ FilledField : "contains"
    Loja ||--o{ Equipamento : "has"
    Setor ||--o{ Equipamento : "has"
    TipoEquipamento ||--o{ Equipamento : "classifies"

    PdfFile {
        uuid id PK
        string fileName
        string fileKey UK
        int fileSize
        string mimeType
        int pageCount
        timestamp createdAt
    }

    Template {
        uuid id PK
        string name
        string description
        enum status
        int version
        uuid pdfFileId FK
        timestamp createdAt
        timestamp updatedAt
    }

    TemplateField {
        uuid id PK
        uuid templateId FK
        enum type
        int pageIndex
        json position
        json config
        string scope
        int slotIndex
        string bindingKey
        timestamp createdAt
        timestamp updatedAt
    }

    Document {
        uuid id PK
        string name
        enum status
        int totalItems
        uuid templateId FK
        int templateVersion
        string generatedPdfKey
        json metadata
        timestamp createdAt
        timestamp updatedAt
    }

    FilledField {
        uuid id PK
        uuid documentId FK
        uuid fieldId FK
        int itemIndex
        string value
        string fileKey
        timestamp createdAt
        timestamp updatedAt
    }

    Equipamento {
        uuid id PK
        uuid lojaId FK
        uuid setorId FK
        uuid tipoId FK
        string numeroEquipamento
        string serie
        string patrimonio
        string modelo
        string ip
        string glpiId
        timestamp createdAt
        timestamp updatedAt
    }
```



### 6.4 DOCUMENTAÇÃO DA API

#### 6.4.1 Endpoints REST

**Base URL:** `http://localhost:4000/api`

**Health Check:**
```http
GET /health
Response: { "status": "ok", "timestamp": "2025-01-XX..." }
```

#### Templates

```http
# Listar templates
GET /api/templates
Response: Template[]

# Obter template por ID (com fields e pdfFile)
GET /api/templates/:id
Response: Template & { fields: TemplateField[], pdfFile: PdfFile }

# Criar template
POST /api/templates
Body: { name: string, description?: string, pdfFileId: string }
Response: Template

# Atualizar template
PATCH /api/templates/:id
Body: { name?: string, description?: string, status?: TemplateStatus }
Response: Template

# Deletar template
DELETE /api/templates/:id
Response: 204 No Content

# Atualizar campos do template (upsert em lote)
PUT /api/templates/:id/fields
Body: TemplateField[]
Response: TemplateField[]
```

#### Documents

```http
# Listar documentos
GET /api/documents
Response: Document[]

# Obter documento por ID (com template, fields, filledFields)
GET /api/documents/:id
Response: Document & { template: Template & { fields: TemplateField[] }, filledFields: FilledField[] }

# Criar documento
POST /api/documents
Body: { name: string, templateId: string, totalItems: number }
Response: Document

# Atualizar documento
PATCH /api/documents/:id
Body: { name?: string, status?: DocumentStatus }
Response: Document

# Deletar documento
DELETE /api/documents/:id
Response: 204 No Content

# Salvar campos preenchidos (upsert em lote)
PUT /api/documents/:id/filled-fields
Body: { fieldId: string, itemIndex: number, value: string, fileKey?: string }[]
Response: FilledField[]

# Iniciar geração de PDF (enfileira job BullMQ)
POST /api/documents/:id/generate
Response: 202 Accepted

# Obter status de geração
GET /api/documents/:id/status
Response: { status: DocumentStatus, jobState?: string, progress?: number }

# Download do PDF gerado
GET /api/documents/:id/download
Response: PDF file (application/pdf)
```

#### Uploads

```http
# Upload de PDF base
POST /api/uploads
Content-Type: multipart/form-data
Body: file (PDF)
Response: { pdfFileId: string, fileName: string, pageCount: number }

# Upload de imagem para campo
POST /api/uploads/image
Content-Type: multipart/form-data
Body: file (image)
Response: { fileKey: string, url: string }
```

#### Equipamentos

```http
# Listar equipamentos (com filtros)
GET /api/equipamentos?lojaId=&setorId=&tipoId=&search=
Response: Equipamento[]

# Obter equipamento por ID
GET /api/equipamentos/:id
Response: Equipamento & { loja: Loja, setor: Setor, tipo: TipoEquipamento }

# Criar equipamento
POST /api/equipamentos
Body: { lojaId, setorId, tipoId, numeroEquipamento, serie?, patrimonio?, modelo?, ip?, glpiId? }
Response: Equipamento

# Atualizar equipamento
PATCH /api/equipamentos/:id
Body: { ... }
Response: Equipamento

# Deletar equipamento
DELETE /api/equipamentos/:id
Response: 204 No Content
```

#### Lojas, Setores, Tipos de Equipamento

```http
# CRUD padrão para cada entidade
GET /api/lojas
POST /api/lojas { nome: string }
PATCH /api/lojas/:id { nome?: string, ativo?: boolean }
DELETE /api/lojas/:id

GET /api/setores
POST /api/setores { nome: string }
PATCH /api/setores/:id { nome?: string, ativo?: boolean }
DELETE /api/setores/:id

GET /api/tipos-equipamento
POST /api/tipos-equipamento { nome: string }
PATCH /api/tipos-equipamento/:id { nome?: string, ativo?: boolean }
DELETE /api/tipos-equipamento/:id
```

#### 6.4.2 Códigos de Status HTTP

| Código | Significado | Uso |
|--------|-------------|-----|
| 200 | OK | Requisição bem-sucedida (GET, PATCH) |
| 201 | Created | Recurso criado (POST) |
| 202 | Accepted | Job enfileirado (POST /generate) |
| 204 | No Content | Recurso deletado (DELETE) |
| 400 | Bad Request | Validação falhou (Zod) |
| 404 | Not Found | Recurso não encontrado |
| 500 | Internal Server Error | Erro não tratado |

#### 6.4.3 Exemplos de Uso

**Criar template e posicionar campos:**

```typescript
// 1. Upload PDF base
const formData = new FormData();
formData.append('file', pdfFile);
const { pdfFileId, pageCount } = await fetch('/api/uploads', {
  method: 'POST',
  body: formData,
}).then(r => r.json());

// 2. Criar template
const template = await fetch('/api/templates', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'Etiqueta de Equipamento',
    pdfFileId,
  }),
}).then(r => r.json());

// 3. Posicionar campos
const fields = [
  {
    id: crypto.randomUUID(),
    type: 'text',
    pageIndex: 0,
    position: { x: 0.1, y: 0.2, width: 0.3, height: 0.05 },
    config: { label: 'Número', required: true },
    scope: 'item',
    slotIndex: 0,
  },
];

await fetch(`/api/templates/${template.id}/fields`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(fields),
});

// 4. Publicar template
await fetch(`/api/templates/${template.id}`, {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ status: 'PUBLISHED' }),
});
```

**Preencher documento e gerar PDF:**

```typescript
// 1. Criar documento
const doc = await fetch('/api/documents', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'Etiquetas Loja 01',
    templateId: template.id,
    totalItems: 10,
  }),
}).then(r => r.json());

// 2. Preencher campos
const filledFields = [
  { fieldId: fields[0].id, itemIndex: 0, value: 'EQ-001' },
  { fieldId: fields[0].id, itemIndex: 1, value: 'EQ-002' },
  // ...
];

await fetch(`/api/documents/${doc.id}/filled-fields`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(filledFields),
});

// 3. Gerar PDF
await fetch(`/api/documents/${doc.id}/generate`, { method: 'POST' });

// 4. Polling de status
const interval = setInterval(async () => {
  const { status } = await fetch(`/api/documents/${doc.id}/status`).then(r => r.json());
  if (status === 'GENERATED') {
    clearInterval(interval);
    window.location.href = `/api/documents/${doc.id}/download`;
  }
}, 3000);
```

### 6.5 GUIA DE CONFIGURAÇÃO DO AMBIENTE

#### 6.5.1 Pré-requisitos

- **Node.js:** >= 20.0.0
- **pnpm:** 9.15.0 (`npm install -g pnpm@9`)
- **Docker:** >= 20.10
- **Docker Compose:** >= 2.0

#### 6.5.2 Setup Inicial

```bash
# 1. Clone o repositório
git clone <url-do-repo>
cd regcheck

# 2. Instale as dependências
pnpm install

# 3. Configure variáveis de ambiente
cp .env.example .env
# Edite .env se necessário (valores padrão funcionam para desenvolvimento local)

# 4. Suba a infraestrutura (PostgreSQL, Redis, MinIO)
pnpm infra:up

# 5. Aguarde os serviços iniciarem (30s)
pnpm wait:infra

# 6. Aplique o schema do banco de dados
pnpm db:push

# 7. (Opcional) Seed de dados de teste
pnpm seed:balanças

# 8. Inicie o ambiente de desenvolvimento
pnpm dev:all
```

**Acesse:**
- Frontend: http://localhost:3000
- API: http://localhost:4000
- MinIO Console: http://localhost:9001 (minioadmin / minioadmin)

#### 6.5.3 Variáveis de Ambiente

**Arquivo `.env` (raiz do projeto):**

```env
# Banco de Dados PostgreSQL
DATABASE_URL="postgresql://regcheck:regcheck@localhost:5432/regcheck?schema=public"

# Redis (cache e fila de jobs)
REDIS_URL="redis://localhost:6379"

# S3 / MinIO (armazenamento de arquivos)
S3_ENDPOINT="http://localhost:9000"
S3_ACCESS_KEY="minioadmin"
S3_SECRET_KEY="minioadmin"
S3_BUCKET="regcheck"
S3_REGION="us-east-1"

# Aplicação
API_PORT=4000
NEXT_PUBLIC_API_URL="http://localhost:4000"
NODE_ENV="development"

# Limites de Upload
MAX_FILE_SIZE_MB=50
MAX_PAGES_PER_PDF=200

# Autenticação (uso futuro)
JWT_SECRET="change-me-in-production"
```

**Produção:**
- Trocar `S3_ENDPOINT` para AWS S3 real
- Configurar `DATABASE_URL` para RDS/PostgreSQL gerenciado
- Configurar `REDIS_URL` para ElastiCache/Redis gerenciado
- Gerar `JWT_SECRET` seguro (`openssl rand -base64 32`)
- Configurar CORS_ORIGIN com domínio de produção

#### 6.5.4 Docker Compose (Infraestrutura)

**Arquivo `infra/docker-compose.yml`:**

```yaml
name: regcheck

services:
  postgres:
    image: postgres:16-alpine
    container_name: regcheck-postgres
    environment:
      POSTGRES_USER: regcheck
      POSTGRES_PASSWORD: regcheck
      POSTGRES_DB: regcheck
    ports:
      - '5432:5432'
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    container_name: regcheck-redis
    ports:
      - '6379:6379'
    volumes:
      - redis_data:/data

  minio:
    image: minio/minio:latest
    container_name: regcheck-minio
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin
    ports:
      - '9000:9000'
      - '9001:9001'
    volumes:
      - minio_data:/data

  minio-init:
    image: minio/mc:latest
    container_name: regcheck-minio-init
    depends_on:
      - minio
    entrypoint: >
      /bin/sh -c "
      sleep 3;
      mc alias set local http://minio:9000 minioadmin minioadmin;
      mc mb local/regcheck --ignore-existing;
      mc anonymous set download local/regcheck;
      exit 0;
      "

volumes:
  postgres_data:
  redis_data:
  minio_data:
```

#### 6.5.5 Comandos Úteis

```bash
# Desenvolvimento
pnpm dev                # Inicia todos os apps (Turborepo)
pnpm dev:api            # Apenas API
pnpm dev:web            # Apenas frontend
pnpm dev:all            # API + Web com logs em stream

# Infraestrutura
pnpm infra:up           # Sobe containers em background
pnpm infra:down         # Para e remove containers
pnpm infra:logs         # Sobe containers com logs no terminal

# Banco de Dados
pnpm db:push            # Aplica schema sem migration
pnpm db:migrate         # Cria e aplica migration
pnpm db:generate        # Gera Prisma Client
pnpm db:studio          # Abre Prisma Studio (porta 5555)
pnpm db:export          # Exporta backup (SQL + PDFs)
pnpm db:import          # Importa backup
pnpm db:restore         # Restaura backup específico

# Build e Qualidade
pnpm build              # Build de produção
pnpm lint               # Lint em todos os pacotes
pnpm type-check         # Verifica tipos TypeScript
pnpm format             # Formata código com Prettier
pnpm clean              # Remove artefatos de build

# Atalhos
pnpm up                 # infra:up + wait:infra + dev:all
pnpm up:studio          # up + Prisma Studio
pnpm start:all          # up + studio (script customizado)
pnpm start:fresh        # Limpa tudo e reinicia do zero
pnpm start:restore      # Restaura backup e inicia
```

### 6.6 PADRÕES DE CÓDIGO E VERSIONAMENTO

#### 6.6.1 Convenções de Código

**TypeScript:**
- Strict mode habilitado
- ESLint + Prettier configurados
- Imports organizados: externos → internos → relativos
- Tipos explícitos em funções públicas
- Evitar `any`, usar `unknown` quando necessário

**Nomenclatura:**
- Componentes React: PascalCase (`EditorCanvas.tsx`)
- Funções/variáveis: camelCase (`processPdfGeneration`)
- Constantes: UPPER_SNAKE_CASE (`MAX_FILE_SIZE_MB`)
- Arquivos: kebab-case (`pdf-generation-worker.ts`)
- Tipos/Interfaces: PascalCase (`TemplateField`)

**Estrutura de Arquivos:**
- Componentes React: um por arquivo
- Services: um service por entidade
- Routes: um router por domínio
- Testes: `*.test.ts` ou `*.spec.ts` ao lado do arquivo

**Comentários:**
- JSDoc para funções públicas de pacotes
- Comentários inline apenas quando lógica não é óbvia
- TODO/FIXME com contexto e responsável

#### 6.6.2 Git Workflow

**Branches:**
- `main`: produção (protegida)
- `develop`: desenvolvimento (protegida)
- `feature/<nome>`: novas funcionalidades
- `bugfix/<nome>`: correções de bugs
- `hotfix/<nome>`: correções urgentes em produção

**Commits:**
- Mensagens em inglês
- Formato: `<type>(<scope>): <subject>`
- Tipos: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`
- Exemplo: `feat(editor): add undo/redo support`

**Pull Requests:**
- Título descritivo
- Descrição com contexto e screenshots (se UI)
- Checklist: testes, lint, type-check
- Revisão obrigatória antes de merge

#### 6.6.3 Versionamento Semântico

- **MAJOR:** Mudanças incompatíveis na API
- **MINOR:** Novas funcionalidades compatíveis
- **PATCH:** Correções de bugs compatíveis

Exemplo: `1.2.3` → `1.3.0` (nova funcionalidade)

### 6.7 INTELIGÊNCIA ARTIFICIAL

**Status:** Não implementado no MVP.

**Possibilidades futuras:**
- OCR avançado com modelos de ML (substituir Tesseract.js)
- Extração automática de campos de PDFs existentes
- Sugestão de posicionamento de campos baseado em layout
- Validação semântica de dados preenchidos
- Geração de templates a partir de descrição em linguagem natural

### 6.8 DOCUMENTAÇÃO DE TESTES E DEPLOY

#### 6.8.1 Testes

**Status atual:** Cobertura mínima.

**Testes existentes:**
- `packages/editor-engine`: Testes unitários com Vitest
  - `TemplatePaginator.test.ts`
  - `FieldBindingResolver.test.ts`

**Executar testes:**
```bash
pnpm test                # Todos os pacotes
pnpm test:watch          # Watch mode
pnpm test:coverage       # Com cobertura
```

**Roadmap de testes:**
- [ ] Testes unitários para services (80%+ cobertura)
- [ ] Testes de integração para API (endpoints críticos)
- [ ] Testes E2E com Playwright (fluxos principais)
- [ ] Testes de carga com k6 (geração de PDFs)

#### 6.8.2 Deploy

**Não implementado.** Sugestões para produção:

**Backend (apps/api):**
- **Plataforma:** AWS ECS Fargate, Google Cloud Run, ou Kubernetes
- **Build:** `pnpm build` → `node dist/server.js`
- **Variáveis:** Configurar via secrets manager
- **Worker:** Deploy separado do servidor HTTP (mesma imagem, comando diferente)

**Frontend (apps/web):**
- **Plataforma:** Vercel, Netlify, ou AWS Amplify
- **Build:** `pnpm build` → `pnpm start`
- **Variáveis:** `NEXT_PUBLIC_API_URL` apontando para API de produção

**Infraestrutura:**
- **PostgreSQL:** AWS RDS, Google Cloud SQL, ou Supabase
- **Redis:** AWS ElastiCache, Google Memorystore, ou Upstash
- **S3:** AWS S3, Google Cloud Storage, ou Cloudflare R2

**CI/CD:**
- GitHub Actions ou GitLab CI
- Pipeline: lint → type-check → test → build → deploy
- Deploy automático em `main` (produção) e `develop` (staging)



---

## 7. FLUXO DO PROCESSO

### 7.1 Fluxo Completo: Criação de Template → Geração de PDF

```mermaid
sequenceDiagram
    actor Usuário
    participant Web as Next.js (Web)
    participant API as Express (API)
    participant S3 as MinIO/S3
    participant DB as PostgreSQL
    participant Queue as BullMQ (Redis)
    participant Worker as PDF Worker

    Note over Usuário,Worker: FASE 1: CRIAÇÃO DE TEMPLATE

    Usuário->>Web: 1. Seleciona arquivo PDF
    Web->>API: 2. POST /api/uploads (multipart)
    API->>S3: 3. uploadFile(pdfBytes)
    S3-->>API: 4. fileKey
    API->>DB: 5. INSERT PdfFile
    DB-->>API: 6. pdfFile.id
    API-->>Web: 7. { pdfFileId, pageCount }

    Web->>API: 8. POST /api/templates
    API->>DB: 9. INSERT Template (status: DRAFT)
    DB-->>API: 10. template.id
    API-->>Web: 11. template

    Web->>Web: 12. Redireciona para /editor/:templateId
    Web->>API: 13. GET /api/templates/:id
    API-->>Web: 14. template + fields + pdfFile

    Web->>S3: 15. GET pdfFile.fileKey (URL pré-assinada)
    S3-->>Web: 16. bytes do PDF
    Web->>Web: 17. Renderiza PDF com pdfjs (canvas)

    loop Posicionamento de campos
        Usuário->>Web: 18. Arrasta campo para posição
        Web->>Web: 19. Converte px → coordenadas relativas (0–1)
        Note over Web: useAutosave dispara a cada 5s
        Web->>API: 20. PUT /api/templates/:id/fields
        API->>DB: 21. UPSERT TemplateField[]
        DB-->>API: 22. ok
        API-->>Web: 23. fields atualizados
    end

    Usuário->>Web: 24. Clica em "Publicar"
    Web->>API: 25. PATCH /api/templates/:id (status: PUBLISHED)
    API->>DB: 26. UPDATE Template status=PUBLISHED
    DB-->>API: 27. ok
    API-->>Web: 28. template atualizado

    Note over Usuário,Worker: FASE 2: PREENCHIMENTO DE DOCUMENTO

    Usuário->>Web: 29. Cria novo documento
    Web->>API: 30. POST /api/documents
    API->>DB: 31. INSERT Document (status: DRAFT)
    DB-->>API: 32. document.id
    API-->>Web: 33. document

    Web->>Web: 34. Abre wizard de preenchimento

    loop Preenchimento de campos
        Usuário->>Web: 35. Preenche campo (texto/imagem/assinatura)
        alt Campo IMAGE
            Web->>API: 36. POST /api/uploads/image
            API->>S3: 37. uploadFile(imageBytes)
            S3-->>API: 38. fileKey
            API-->>Web: 39. { fileKey }
        end
        Web->>Web: 40. Salva em rascunho local (IndexedDB)
    end

    Usuário->>Web: 41. Finaliza preenchimento
    Web->>API: 42. PUT /api/documents/:id/filled-fields
    API->>DB: 43. UPSERT FilledField[]
    DB-->>API: 44. ok
    API-->>Web: 45. filledFields atualizados

    Note over Usuário,Worker: FASE 3: GERAÇÃO ASSÍNCRONA DE PDF

    Usuário->>Web: 46. Clica em "Gerar PDF"
    Web->>API: 47. POST /api/documents/:id/generate
    API->>DB: 48. UPDATE Document status=GENERATING
    API->>Queue: 49. queue.add('pdf-generation', { documentId })
    Queue-->>API: 50. job enfileirado
    API-->>Web: 51. 202 Accepted

    loop Polling a cada 3s
        Web->>API: 52. GET /api/documents/:id/status
        API->>DB: 53. SELECT Document.status
        DB-->>API: 54. status atual
        API-->>Web: 55. { status }
    end

    Note over Worker: Worker processa job em background

    Worker->>DB: 56. findUnique Document (template + fields + filledFields)
    DB-->>Worker: 57. dados completos

    Worker->>Worker: 58. TemplatePaginator.compute(fields, totalItems)
    Note over Worker: Calcula layout: itemsPerPage, totalPages, assignments

    Worker->>S3: 59. downloadFile(pdfFile.fileKey)
    S3-->>Worker: 60. pdfBytes

    Worker->>Worker: 61. PdfProcessor.duplicatePages(pdfBytes, totalPages, pageCount)
    Note over Worker: Duplica páginas do PDF base

    Worker->>S3: 62. Promise.all — downloads paralelos de imagens
    S3-->>Worker: 63. imageMap (fieldId:itemIndex → Buffer)

    Worker->>Worker: 64. Constrói overlays (global + item)
    Note over Worker: Global: renderiza em todas as páginas<br/>Item: renderiza apenas na página do slot

    Worker->>Worker: 65. PdfGenerator.generate({ originalPdf, pages, fieldOverlays })
    Note over Worker: pdf-lib aplica overlays de texto, imagem, checkbox, assinatura

    Worker->>S3: 66. uploadFile(generated/uuid.pdf)
    S3-->>Worker: 67. outputKey

    Worker->>DB: 68. UPDATE Document status=GENERATED, generatedPdfKey=outputKey
    DB-->>Worker: 69. ok

    Web->>API: 70. GET /api/documents/:id/status
    API-->>Web: 71. { status: "GENERATED" }

    Web->>Web: 72. Exibe link de download

    Usuário->>Web: 73. Clica em "Download PDF"
    Web->>API: 74. GET /api/documents/:id/download
    API->>S3: 75. downloadFile(generatedPdfKey)
    S3-->>API: 76. pdfBytes
    API-->>Web: 77. PDF file (application/pdf)
    Web-->>Usuário: 78. Download do PDF gerado
```

### 7.2 Fluxo de Repetição de Campos (TemplatePaginator)

```mermaid
flowchart TD
    A[Início: Document com totalItems=N] --> B[Carregar TemplateField[]]
    B --> C{Existem campos<br/>com scope='item'?}
    C -->|Não| D[Modo simples:<br/>1 página, sem repetição]
    C -->|Sim| E[Agrupar campos por slotIndex]
    E --> F[Contar slots únicos: S]
    F --> G[itemsPerPage = S]
    G --> H[totalPages = ceil(N / S)]
    H --> I[Para cada página p=0..totalPages-1]
    I --> J[Para cada slot s=0..S-1]
    J --> K[itemIndex = p * S + s]
    K --> L{itemIndex < N?}
    L -->|Sim| M[Adicionar assignment:<br/>pageOrdinal=p, slotIndex=s, itemIndex]
    L -->|Não| N[Pular slot vazio]
    M --> O{Mais slots?}
    N --> O
    O -->|Sim| J
    O -->|Não| P{Mais páginas?}
    P -->|Sim| I
    P -->|Não| Q[Retornar PaginationLayout]
    Q --> R[Worker usa layout para:<br/>1. Duplicar páginas<br/>2. Renderizar campos nos slots corretos]
    R --> S[Fim]
    D --> S
```

### 7.3 Ciclo de Vida do Template

```mermaid
stateDiagram-v2
    [*] --> DRAFT : criar template
    DRAFT --> PUBLISHED : publicar
    PUBLISHED --> ARCHIVED : arquivar
    PUBLISHED --> DRAFT : despublicar (não implementado)
    ARCHIVED --> [*]

    note right of DRAFT
        Editor permite modificações
        Campos podem ser adicionados/removidos
    end note

    note right of PUBLISHED
        Template disponível para criar documentos
        Modificações afetam documentos futuros
        (versionamento não implementado)
    end note

    note right of ARCHIVED
        Template não pode ser usado
        Documentos existentes não são afetados
    end note
```

### 7.4 Ciclo de Vida do Document

```mermaid
stateDiagram-v2
    [*] --> DRAFT : criar documento
    DRAFT --> IN_PROGRESS : iniciar preenchimento
    IN_PROGRESS --> COMPLETED : finalizar preenchimento
    COMPLETED --> GENERATING : POST /api/documents/:id/generate
    GENERATING --> GENERATED : worker conclui com sucesso
    GENERATING --> ERROR : worker lança exceção
    GENERATED --> [*]
    ERROR --> GENERATING : retentar geração (manual)

    note right of DRAFT
        Documento criado mas não preenchido
    end note

    note right of IN_PROGRESS
        Usuário está preenchendo campos
        Rascunho salvo em IndexedDB
    end note

    note right of COMPLETED
        Todos os campos preenchidos
        Pronto para gerar PDF
    end note

    note right of GENERATING
        Job enfileirado no BullMQ
        Worker processando em background
    end note

    note right of GENERATED
        PDF gerado e armazenado no MinIO
        Disponível para download
    end note

    note right of ERROR
        Falha na geração
        Retry manual necessário
        (retry automático não implementado)
    end note
```

### 7.5 Fluxo de Scanner de Equipamentos

```mermaid
sequenceDiagram
    actor Usuário
    participant Web as Camera Scanner
    participant ZXing as ZXing-wasm
    participant Tesseract as Tesseract.js
    participant API as Express (API)
    participant DB as PostgreSQL

    Usuário->>Web: 1. Abre scanner de equipamentos
    Web->>Web: 2. Solicita permissão de câmera
    Web->>Web: 3. Inicia stream de vídeo

    loop Captura contínua
        Web->>Web: 4. Captura frame do vídeo
        Web->>ZXing: 5. Tenta decodificar QR/barcode
        ZXing-->>Web: 6. Resultado (sucesso ou falha)
        
        alt QR/Barcode detectado
            Web->>Web: 7. Exibe resultado
            Web->>API: 8. GET /api/equipamentos?search=<código>
            API->>DB: 9. SELECT Equipamento WHERE serie/patrimonio LIKE
            DB-->>API: 10. equipamentos encontrados
            API-->>Web: 11. equipamentos[]
            Web->>Web: 12. Preenche formulário automaticamente
        else Nenhum código detectado
            Web->>Web: 13. Continua captura
        end
    end

    alt Usuário clica em "OCR"
        Usuário->>Web: 14. Captura foto
        Web->>Tesseract: 15. Processa imagem com OCR
        Note over Tesseract: Extrai texto da imagem
        Tesseract-->>Web: 16. Texto extraído
        Web->>Web: 17. Parse de campos (série, patrimônio, etc)
        Web->>Web: 18. Preenche formulário com dados extraídos
    end

    Usuário->>Web: 19. Confirma dados
    Web->>API: 20. POST /api/equipamentos
    API->>DB: 21. INSERT Equipamento
    DB-->>API: 22. equipamento.id
    API-->>Web: 23. equipamento criado
    Web->>Web: 24. Exibe confirmação
```

---

## 8. DOCUMENTOS DE REFERÊNCIA

### 8.1 Documentação Interna

- **README.md:** Guia de setup e comandos essenciais
- **docs/flows.md:** Fluxos principais do sistema com diagramas Mermaid
- **docs/architecture.md:** Arquitetura detalhada (se existir)
- **docs/packages.md:** API dos pacotes compartilhados (se existir)
- **docs/conventions.md:** Convenções de código (se existir)
- **docs/contributing.md:** Guia de contribuição (se existir)
- **docs/adr/:** Architecture Decision Records (se existir)

### 8.2 Documentação Externa

**Frameworks e Bibliotecas:**
- [Next.js 14 Documentation](https://nextjs.org/docs)
- [Express.js Documentation](https://expressjs.com/)
- [Prisma Documentation](https://www.prisma.io/docs)
- [BullMQ Documentation](https://docs.bullmq.io/)
- [Konva Documentation](https://konvajs.org/docs/)
- [pdf-lib Documentation](https://pdf-lib.js.org/)
- [pdfjs Documentation](https://mozilla.github.io/pdf.js/)
- [TanStack Query Documentation](https://tanstack.com/query/latest)
- [Zustand Documentation](https://docs.pmnd.rs/zustand)
- [Zod Documentation](https://zod.dev/)

**Infraestrutura:**
- [PostgreSQL 16 Documentation](https://www.postgresql.org/docs/16/)
- [Redis 7 Documentation](https://redis.io/docs/)
- [MinIO Documentation](https://min.io/docs/minio/linux/index.html)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Turborepo Documentation](https://turbo.build/repo/docs)

**Ferramentas:**
- [pnpm Documentation](https://pnpm.io/)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Vitest Documentation](https://vitest.dev/)

### 8.3 Padrões e Boas Práticas

- [Conventional Commits](https://www.conventionalcommits.org/)
- [Semantic Versioning](https://semver.org/)
- [REST API Design Best Practices](https://restfulapi.net/)
- [TypeScript Best Practices](https://www.typescriptlang.org/docs/handbook/declaration-files/do-s-and-don-ts.html)
- [React Best Practices](https://react.dev/learn/thinking-in-react)

---

## APÊNDICE A: PONTOS CRÍTICOS E RISCOS

### A.1 Gargalos de Performance

**1. Geração de PDFs com muitas imagens**
- **Problema:** Downloads paralelos de imagens do MinIO podem sobrecarregar a rede
- **Impacto:** Latência de 5-10s para documentos com 50+ imagens
- **Mitigação:** Implementar cache de imagens no Redis, compressão com sharp

**2. Renderização de PDFs grandes no frontend**
- **Problema:** pdfjs renderiza todas as páginas em memória
- **Impacto:** Consumo de 500MB+ RAM para PDFs com 100+ páginas
- **Mitigação:** Lazy loading de páginas, virtualização de canvas

**3. Autosave a cada 5 segundos**
- **Problema:** Requisições frequentes ao backend durante edição
- **Impacto:** Carga desnecessária no banco de dados
- **Mitigação:** Debounce inteligente (salvar apenas quando há mudanças), batch de updates

**4. Polling de status a cada 3 segundos**
- **Problema:** Requisições contínuas durante geração de PDF
- **Impacto:** Carga no banco de dados e API
- **Mitigação:** WebSockets ou Server-Sent Events para notificações em tempo real

### A.2 Riscos de Segurança

**1. Ausência de autenticação**
- **Risco:** Qualquer pessoa pode acessar e modificar templates/documentos
- **Severidade:** CRÍTICA
- **Mitigação:** Implementar OAuth2/OIDC + RBAC

**2. Upload de arquivos sem validação**
- **Risco:** Upload de arquivos maliciosos (executáveis, scripts)
- **Severidade:** ALTA
- **Mitigação:** Validar MIME type, escanear com antivírus, limitar tamanho

**3. Injeção de SQL via Prisma**
- **Risco:** Baixo (Prisma usa prepared statements)
- **Severidade:** MÉDIA
- **Mitigação:** Validar inputs com Zod, evitar raw queries

**4. CORS aberto em desenvolvimento**
- **Risco:** Qualquer origem pode fazer requisições à API
- **Severidade:** MÉDIA
- **Mitigação:** Configurar CORS_ORIGIN em produção

**5. Secrets em variáveis de ambiente**
- **Risco:** Vazamento de credenciais (S3, Redis, DB)
- **Severidade:** ALTA
- **Mitigação:** Usar secrets manager (AWS Secrets Manager, HashiCorp Vault)

### A.3 Problemas de Arquitetura

**1. Worker e API no mesmo processo**
- **Problema:** Worker bloqueia event loop do Express
- **Impacto:** Latência em requisições HTTP durante geração de PDFs
- **Solução:** Separar worker em processo/container dedicado

**2. Falta de versionamento de templates**
- **Problema:** Alterações em templates publicados afetam documentos existentes
- **Impacto:** Documentos gerados podem ter layout diferente do esperado
- **Solução:** Implementar snapshot de templates ao criar documento

**3. Falta de retry automático em jobs**
- **Problema:** Jobs que falham ficam em estado ERROR permanentemente
- **Impacto:** Usuário precisa retentar manualmente
- **Solução:** Configurar retry exponencial no BullMQ (3 tentativas)

**4. Falta de observabilidade**
- **Problema:** Difícil diagnosticar falhas em produção
- **Impacto:** Tempo de resolução de incidentes elevado
- **Solução:** Logs estruturados (Winston/Pino), métricas (Prometheus), tracing (OpenTelemetry)

**5. Monorepo sem cache de build**
- **Problema:** Builds lentos em CI/CD
- **Impacto:** Deploy demorado (5-10 minutos)
- **Solução:** Configurar Turborepo remote cache (Vercel, S3)

### A.4 Limitações Técnicas

**1. Coordenadas relativas (0-1) podem perder precisão**
- **Problema:** Conversão px → relativo → px pode causar desalinhamento de 1-2px
- **Impacto:** Campos podem ficar ligeiramente desalinhados em PDFs gerados
- **Solução:** Usar coordenadas absolutas em pontos (1pt = 1/72 inch)

**2. pdf-lib não suporta fontes customizadas facilmente**
- **Problema:** Apenas fontes padrão (Helvetica, Times, Courier)
- **Impacto:** Limitação de design
- **Solução:** Embed de fontes TrueType (complexo)

**3. Tesseract.js tem baixa precisão em imagens de baixa qualidade**
- **Problema:** OCR falha em etiquetas com texto pequeno ou borrado
- **Impacto:** Usuário precisa digitar manualmente
- **Solução:** Pré-processamento de imagem (sharp: contraste, nitidez)

**4. MinIO local não tem CDN**
- **Problema:** Downloads de PDFs/imagens são lentos
- **Impacto:** Latência de 500ms-1s para arquivos grandes
- **Solução:** Usar CloudFront (AWS) ou Cloudflare R2 em produção

---

## APÊNDICE B: MELHORIAS SUGERIDAS

### B.1 Curto Prazo (1-2 sprints)

1. **Implementar retry automático em jobs BullMQ**
   - Configurar `attempts: 3` e `backoff: { type: 'exponential' }`
   - Adicionar DLQ para jobs que falharam 3x

2. **Adicionar validação de tamanho de arquivo no backend**
   - Rejeitar PDFs > 50MB e imagens > 10MB
   - Retornar erro 413 (Payload Too Large)

3. **Implementar logs estruturados**
   - Substituir `console.log` por Winston/Pino
   - Adicionar `requestId` para rastreamento

4. **Separar worker em processo dedicado**
   - Criar `apps/worker` com entry point separado
   - Deploy em container/processo separado

5. **Adicionar testes de integração para API**
   - Testar endpoints críticos (upload, generate)
   - Usar Vitest + supertest

### B.2 Médio Prazo (3-6 sprints)

1. **Implementar autenticação e RBAC**
   - Integrar com Keycloak ou Auth0
   - Roles: Admin, Editor, Viewer
   - Middleware de autorização em rotas

2. **Implementar versionamento de templates**
   - Snapshot automático ao publicar
   - Vincular documentos a versão específica
   - UI para visualizar histórico de versões

3. **Adicionar WebSockets para notificações em tempo real**
   - Substituir polling por Socket.IO
   - Notificar frontend quando PDF estiver pronto

4. **Implementar cache de PDFs renderizados**
   - Cachear em Redis (chave: `pdf:${fileKey}:${pageIndex}`)
   - TTL de 1 hora

5. **Adicionar testes E2E com Playwright**
   - Testar fluxo completo: criar template → preencher → gerar PDF
   - Executar em CI/CD

### B.3 Longo Prazo (6+ sprints)

1. **Migrar para arquitetura de microserviços**
   - Separar: API Gateway, Template Service, Document Service, PDF Service
   - Comunicação via gRPC ou mensageria (RabbitMQ, Kafka)

2. **Implementar observabilidade completa**
   - Logs: Winston + ELK Stack
   - Métricas: Prometheus + Grafana
   - Tracing: OpenTelemetry + Jaeger

3. **Adicionar funcionalidades de IA**
   - Extração automática de campos de PDFs
   - Sugestão de posicionamento de campos
   - Validação semântica de dados

4. **Implementar multi-tenancy**
   - Isolamento de dados por tenant
   - Configuração de limites por tenant (storage, jobs)

5. **Adicionar exportação em lote**
   - Gerar ZIP com múltiplos PDFs
   - Processamento assíncrono com progresso

---

## APÊNDICE C: GLOSSÁRIO TÉCNICO EXPANDIDO

| Termo | Definição Técnica |
|-------|-------------------|
| **Overlay** | Camada de conteúdo (texto, imagem) aplicada sobre um PDF existente usando pdf-lib |
| **Field Position** | Objeto JSON `{ x, y, width, height }` com coordenadas relativas (0-1) |
| **Field Config** | Objeto JSON com configurações do campo: `{ label, required, placeholder, fontSize, fontColor }` |
| **Slot** | Posição fixa em uma página onde um item será renderizado (ex: slot 0 = canto superior esquerdo) |
| **Item** | Unidade de dados a ser renderizada (ex: um equipamento em uma etiqueta) |
| **Page Ordinal** | Índice da página no PDF expandido (0-based) |
| **Template Page Index** | Índice da página no PDF base (0-based) |
| **Expanded Page Index** | `pageOrdinal * originalPageCount + templatePageIndex` |
| **Assignment** | Mapeamento de um item para um slot em uma página: `{ pageOrdinal, slotIndex, itemIndex }` |
| **Pagination Layout** | Resultado do TemplatePaginator: `{ itemsPerPage, totalPages, assignments[] }` |
| **Binding Context** | Dados disponíveis para resolução de bindingKey: `{ globals, items[] }` |
| **Binding Scope** | Namespace da bindingKey: `global` ou `eq` |
| **Draft** | Rascunho de documento salvo localmente no IndexedDB do navegador |
| **Presigned URL** | URL temporária gerada pelo MinIO para download direto de arquivos |
| **Job** | Tarefa enfileirada no BullMQ para processamento assíncrono |
| **Worker** | Processo que consome jobs da fila e executa o processamento |
| **Concurrency** | Número de jobs processados simultaneamente pelo worker (padrão: 2) |

---

**FIM DA DOCUMENTAÇÃO TÉCNICA**

---

**Notas finais:**
- Este documento deve ser atualizado a cada release
- Diagramas Mermaid podem ser visualizados em editores compatíveis (GitHub, GitLab, VS Code com extensão)
- Para dúvidas técnicas, consultar o código-fonte ou abrir issue no repositório
- Contribuições para melhorar esta documentação são bem-vindas via Pull Request
