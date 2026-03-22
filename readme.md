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

### Instalação (Linux / macOS)

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

---

### Setup no Windows (WSL2) — Passo a Passo

O projeto usa Docker para rodar PostgreSQL, Redis e MinIO. No Windows, a forma recomendada é via **Docker Desktop + WSL2**.

#### 1. Instalar WSL2

Abra o **PowerShell como Administrador** e execute:

```powershell
wsl --install
```

Isso instala o WSL2 com Ubuntu por padrão. Reinicie o computador quando solicitado.
Após reiniciar, o Ubuntu vai abrir e pedir para criar um usuário/senha — guarde essas credenciais.

Para verificar se está usando WSL2:

```powershell
wsl --list --verbose
```

A coluna `VERSION` deve mostrar `2`.

#### 2. Instalar Docker Desktop

1. Baixe o **Docker Desktop** em: https://www.docker.com/products/docker-desktop/
2. Execute o instalador e reinicie se necessário
3. Abra o Docker Desktop
4. Vá em **Settings > General** e marque **"Use the WSL 2 based engine"**
5. Vá em **Settings > Resources > WSL Integration** e ative a integração com sua distro (ex: Ubuntu)
6. Clique **Apply & Restart**

Para verificar que está funcionando, abra um novo terminal (PowerShell ou WSL) e rode:

```powershell
docker --version
docker compose version
```

Ambos devem retornar versões válidas.

#### 3. Instalar Node.js e pnpm

**Opção A — Direto no Windows (mais simples):**

Baixe o Node.js 20+ em https://nodejs.org/ e instale normalmente.
Depois instale o pnpm:

```powershell
corepack enable
corepack prepare pnpm@9.15.0 --activate
```

**Opção B — Dentro do WSL2 (recomendado para compatibilidade total):**

```bash
# Dentro do terminal WSL2 (Ubuntu)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
corepack enable
corepack prepare pnpm@9.15.0 --activate
```

#### 4. Subir os serviços com Docker

Abra o **Docker Desktop** (ele precisa estar rodando em background).
Em seguida, no terminal onde está o projeto:

```powershell
# PowerShell (Windows)
docker compose up -d
```

```bash
# Ou no WSL2 (Ubuntu)
docker compose up -d
```

Verifique que os 3 serviços estão rodando:

```powershell
docker compose ps
```

Deve mostrar `postgres`, `redis` e `minio` com status `running`.

#### 5. Configurar variáveis de ambiente

```powershell
# PowerShell (Windows)
copy .env.example .env
```

```bash
# WSL2 (Linux)
cp .env.example .env
```

O arquivo `.env` já vem com os valores corretos para desenvolvimento local.
As variáveis principais são:

| Variável | Valor padrão | Descrição |
|----------|-------------|-----------|
| `DATABASE_URL` | `postgresql://regcheck:regcheck@localhost:5432/regcheck` | Conexão PostgreSQL |
| `REDIS_URL` | `redis://localhost:6379` | Conexão Redis |
| `S3_ENDPOINT` | `http://localhost:9000` | MinIO (S3 local) |
| `S3_ACCESS_KEY` | `minioadmin` | Credencial MinIO |
| `S3_SECRET_KEY` | `minioadmin` | Credencial MinIO |
| `API_PORT` | `4000` | Porta do backend |
| `NEXT_PUBLIC_API_URL` | `http://localhost:4000` | URL da API para o frontend |

#### 6. Instalar dependências e iniciar

```powershell
# Instalar dependências
pnpm install

# Gerar Prisma Client
pnpm db:generate

# Criar tabelas no PostgreSQL
pnpm db:push

# Iniciar em modo desenvolvimento (API + Web)
pnpm dev
```

#### 7. Verificar que tudo está funcionando

| Serviço | URL | Credenciais |
|---------|-----|-------------|
| Frontend | http://localhost:3000 | — |
| API | http://localhost:4000/health | — |
| MinIO Console | http://localhost:9001 | minioadmin / minioadmin |
| Prisma Studio | `pnpm --filter @regcheck/database db:studio` | — |

---

### Troubleshooting

| Erro | Causa | Solução |
|------|-------|---------|
| `docker: O termo 'docker' não é reconhecido` | Docker Desktop não instalado ou não está no PATH | Instale o Docker Desktop e reinicie o terminal |
| `Environment variable not found: DATABASE_URL` | Arquivo `.env` não existe | Rode `copy .env.example .env` (PowerShell) ou `cp .env.example .env` (WSL) |
| `Connection refused` no PostgreSQL | Docker não está rodando | Abra o Docker Desktop e rode `docker compose up -d` |
| `Port 5432 already in use` | Outro PostgreSQL rodando na máquina | Pare o serviço local: `net stop postgresql-x64-16` ou mude a porta no docker-compose.yml |
| `EACCES permission denied` no pnpm | Permissões no WSL | Rode `sudo chown -R $USER:$USER .` no diretório do projeto |
| MinIO bucket não criado | Serviço minio-init falhou | Rode `docker compose restart minio-init` |

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
