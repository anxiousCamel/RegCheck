# RegCheck - Document Template Builder + Filler

Sistema de construção e preenchimento de templates de documentos PDF.

## Arquitetura

```
regcheck/
├── apps/
│   ├── api/          # Backend Node.js + Express + TypeScript
│   └── web/          # Frontend Next.js 14 (App Router) + TailwindCSS
├── packages/
│   ├── database/     # Prisma ORM + PostgreSQL schema
│   ├── shared/       # Tipos TypeScript compartilhados
│   ├── validators/   # Schemas Zod para validação
│   ├── pdf-engine/   # Processamento e geração de PDF (pdf-lib + sharp)
│   ├── editor-engine/ # Motor do editor: repetição, clonagem, snap grid, undo/redo
│   └── ui/           # Componentes UI reutilizáveis (shadcn-style)
├── docker-compose.yml
├── turbo.json
└── pnpm-workspace.yaml
```

## Stack

| Camada | Tecnologia | Justificativa |
|--------|-----------|---------------|
| Monorepo | Turborepo + pnpm | Cache inteligente, builds paralelos, workspaces nativos |
| Backend | Express + TypeScript | Leve, flexível, ecossistema maduro |
| Frontend | Next.js 14 App Router | SSR, routing file-based, React Server Components |
| Editor | Konva (react-konva) | Canvas 2D performático, drag/resize nativo, leve (vs Fabric.js) |
| UI | TailwindCSS + shadcn/ui pattern | Utility-first, componentes copiáveis sem lock-in |
| ORM | Prisma | Type-safe queries, migrations, studio |
| Banco | PostgreSQL | JSONB para configs flexíveis, confiabilidade |
| Cache/Fila | Redis + BullMQ | Cache de API, fila de jobs para geração de PDF |
| Storage | S3 (MinIO local) | API S3-compatible, migração transparente para cloud |
| PDF | pdf-lib | Manipulação de PDF em JS puro, sem dependências nativas |
| Imagens | sharp | Compressão eficiente, resize, conversão |
| Validação | Zod | Schema-first, type inference, composable |
| State | Zustand (editor) + React Query (server) | Zustand para estado síncrono do editor; React Query para cache de API |

## Decisões Técnicas

### Zustand vs React Query
- **Zustand**: estado do editor (campos, seleção, zoom, undo/redo) — precisa de updates síncronos e rápidos
- **React Query**: dados do servidor (templates, documentos) — cache automático, refetch, mutations

### Konva vs Fabric.js
- **Konva**: mais leve, API React nativa (react-konva), melhor performance para drag/resize simples
- Fabric.js seria necessário apenas se precisássemos de formas vetoriais complexas

### Coordenadas Relativas (0-1)
- Campos são salvos com posição relativa à página (0-1)
- Permite renderizar em qualquer resolução/zoom sem recalcular
- Geração de PDF converte para coordenadas absolutas

### Storage: S3 vs Base64
- Imagens armazenadas em S3 (MinIO local → AWS S3 em produção)
- Base64 apenas para assinaturas em preview no canvas
- Compressão via sharp antes do upload (qualidade + economia)

## Setup

### Pré-requisitos
- Node.js >= 20
- pnpm >= 9
- Docker + Docker Compose

### Instalação

```bash
# 1. Clone o repositório
git clone <repo-url> && cd regcheck

# 2. Copie as variáveis de ambiente
cp .env.example .env

# 3. Suba os serviços (PostgreSQL, Redis, MinIO)
docker compose up -d

# 4. Instale dependências
pnpm install

# 5. Gere o Prisma Client
pnpm db:generate

# 6. Aplique o schema no banco
pnpm db:push

# 7. Inicie em modo desenvolvimento
pnpm dev
```

### Acessos
- **Frontend**: http://localhost:3000
- **API**: http://localhost:4000
- **MinIO Console**: http://localhost:9001 (minioadmin/minioadmin)
- **Prisma Studio**: `pnpm --filter @regcheck/database db:studio`

## Fluxo do Sistema

```
1. Upload PDF → S3 → Registro no banco (PdfFile)
2. Criar Template → Associar PDF → Abrir Editor
3. Editor Visual → Arrastar campos sobre o PDF → Salvar posições
4. Configurar Repetição → Definir grid (linhas × colunas, offsets)
5. Publicar Template → Criar snapshot de versão
6. Criar Documento → Selecionar template + quantidade de itens
7. Preencher Dados → Texto, checkboxes, imagens, assinaturas
8. Gerar PDF → Job na fila (BullMQ) → Clonar campos × itens
   → Duplicar páginas → Overlay dados no PDF → Upload resultado
9. Download → URL pré-assinada do S3
```

## Entidades (Schema Prisma)

- **PdfFile**: PDF base uploadado
- **Template**: Definição do template (status, versão, config de repetição)
- **TemplateField**: Campos posicionados (tipo, posição relativa, config)
- **TemplateVersion**: Snapshots versionados para histórico
- **Document**: Instância preenchida de um template
- **FilledField**: Dados preenchidos por campo × item

## Features Implementadas

- [x] Monorepo Turborepo + pnpm
- [x] Upload de PDF com validação (tamanho, páginas)
- [x] Editor visual com Konva (drag, resize, snap grid)
- [x] 4 tipos de campo: texto, imagem, assinatura, checkbox
- [x] Painel de propriedades editáveis
- [x] Sistema de repetição inteligente (grid configurável)
- [x] Clonagem automática de campos por item
- [x] Preview de layout de repetição
- [x] Undo/redo no editor
- [x] Autosave (5s interval)
- [x] Preenchimento dinâmico por item
- [x] Canvas de assinatura (desenho touch/mouse)
- [x] Geração de PDF via fila (BullMQ)
- [x] Compressão de imagens (sharp)
- [x] Versionamento de templates
- [x] API REST completa com validação Zod
- [x] Docker Compose (PostgreSQL + Redis + MinIO)
