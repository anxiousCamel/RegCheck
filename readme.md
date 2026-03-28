# RegCheck

> Construtor e preenchedor de templates de documentos PDF — monorepo Turborepo + pnpm.

O RegCheck permite criar templates visuais sobre PDFs existentes, posicionando campos interativos via drag-and-drop, e depois preencher esses campos para gerar novos PDFs automaticamente. Suporta repetição de campos em grade (ex.: etiquetas de equipamentos) e geração assíncrona via fila BullMQ.

---

## Arquitetura do Monorepo

```mermaid
graph LR
  subgraph apps
    API["apps/api\n(Express :4000)"]
    WEB["apps/web\n(Next.js :3000)"]
  end

  subgraph packages
    DB["@regcheck/database\n(Prisma)"]
    PDF["@regcheck/pdf-engine"]
    EDITOR["@regcheck/editor-engine"]
    SHARED["@regcheck/shared"]
    VALIDATORS["@regcheck/validators"]
    UI["@regcheck/ui"]
  end

  API --> DB
  API --> SHARED
  API --> VALIDATORS
  API --> PDF
  API --> EDITOR

  WEB --> EDITOR
  WEB --> SHARED
  WEB --> VALIDATORS
  WEB --> UI

  PDF --> SHARED
  EDITOR --> SHARED
```

## Stack Tecnológica por Camada

```mermaid
graph LR
  subgraph infra["Infra (Docker)"]
    PG["PostgreSQL 16\n:5432"]
    REDIS["Redis 7\n:6379"]
    MINIO["MinIO\n:9000 / :9001"]
  end

  subgraph backend["Backend"]
    EXPRESS["Express 4\n(apps/api)"]
    BULLMQ["BullMQ\n(jobs)"]
    PRISMA["Prisma 5\n(ORM)"]
    PDFLIB["pdf-lib\n(overlay)"]
    SHARP["sharp\n(imagens)"]
  end

  subgraph frontend["Frontend"]
    NEXT["Next.js 14\n(apps/web)"]
    KONVA["Konva / react-konva\n(editor canvas)"]
    PDFJS["pdfjs-dist\n(render PDF)"]
    RQ["TanStack Query\n(server state)"]
    ZUSTAND["Zustand\n(editor state)"]
    TW["Tailwind CSS"]
  end

  subgraph shared["Shared"]
    SHAREDPKG["@regcheck/shared\n(tipos)"]
    VALIDATORS["@regcheck/validators\n(Zod schemas)"]
    EDITORENG["@regcheck/editor-engine\n(RepetitionEngine)"]
    PDFENG["@regcheck/pdf-engine\n(PdfGenerator)"]
    UI["@regcheck/ui\n(componentes)"]
  end

  backend --> infra
  frontend --> backend
  backend --> shared
  frontend --> shared
```

---

## URLs de Acesso Local

| Serviço          | URL                          | Descrição                        |
|------------------|------------------------------|----------------------------------|
| Frontend         | http://localhost:3000        | Interface Next.js                |
| API              | http://localhost:4000        | API Express                      |
| MinIO Console    | http://localhost:9001        | Painel de administração do MinIO |
| Prisma Studio    | http://localhost:5555        | Visualizador do banco de dados   |

---

## Setup

### Pré-requisitos

- Node.js >= 20
- pnpm 9.x (`npm install -g pnpm@9`)
- Docker e Docker Compose

### Instalação

```bash
# 1. Clone o repositório
git clone <url-do-repo>
cd regcheck

# 2. Instale as dependências
pnpm install

# 3. Configure as variáveis de ambiente
cp .env.example .env
# Edite .env com suas configurações locais

# 4. Suba a infraestrutura (PostgreSQL, Redis, MinIO)
pnpm infra:up

# 5. Aplique o schema do banco de dados
pnpm db:push

# 6. Inicie o ambiente de desenvolvimento
pnpm dev
```

---

## Comandos Essenciais

| Comando              | Descrição                                                        |
|----------------------|------------------------------------------------------------------|
| `pnpm dev`           | Inicia todos os apps em modo desenvolvimento (Turborepo)         |
| `pnpm dev:api`       | Inicia apenas a API (`apps/api`) com logs completos              |
| `pnpm dev:web`       | Inicia apenas o frontend (`apps/web`) com logs completos         |
| `pnpm dev:all`       | Inicia API + Web com logs em stream                              |
| `pnpm build`         | Build de produção de todos os pacotes e apps                     |
| `pnpm lint`          | Executa lint em todos os pacotes e apps                          |
| `pnpm type-check`    | Verifica tipos TypeScript em todos os pacotes e apps             |
| `pnpm format`        | Formata todos os arquivos com Prettier                           |
| `pnpm infra:up`      | Sobe os containers Docker (PostgreSQL, Redis, MinIO) em background |
| `pnpm infra:down`    | Para e remove os containers Docker                               |
| `pnpm infra:logs`    | Sobe os containers com logs no terminal                          |
| `pnpm db:push`       | Aplica o schema Prisma no banco sem criar migration              |
| `pnpm db:migrate`    | Cria e aplica uma migration Prisma                               |
| `pnpm db:generate`   | Gera o Prisma Client                                             |
| `pnpm db:studio`     | Abre o Prisma Studio na porta 5555                               |
| `pnpm up`            | Atalho: `infra:up` + `wait:infra` + `dev:all`                    |
| `pnpm clean`         | Remove artefatos de build de todos os pacotes                    |

---

## Documentação

- [Índice da documentação](docs/index.md)
- [Arquitetura do sistema](docs/architecture.md)
- [Fluxos principais](docs/flows.md)
- [Convenções de código](docs/conventions.md)
- [API dos pacotes compartilhados](docs/packages.md)
- [Guia de contribuição](docs/contributing.md)
- [Architecture Decision Records (ADRs)](docs/adr/README.md)

---

## Troubleshooting

### Porta já em uso

**Sintoma:** `Error: listen EADDRINUSE :::4000` ou `:::3000`

**Solução:**
```bash
# Encontre o processo usando a porta
lsof -i :4000
# Encerre o processo
kill -9 <PID>
```

No Windows (PowerShell):
```powershell
netstat -ano | findstr :4000
taskkill /PID <PID> /F
```

---

### MinIO não sobe

**Sintoma:** Container `minio` reinicia em loop ou `minio-init` falha com connection refused.

**Solução:**
```bash
# Verifique os logs do container
pnpm infra:logs

# Remova volumes antigos e recrie
pnpm infra:down
docker volume rm regcheck_minio_data
pnpm infra:up
```

---

### Prisma migration falha

**Sintoma:** `Error: P3009 migrate found failed migrations` ou `drift detected`.

**Solução:**
```bash
# Reseta o banco (apaga todos os dados) e reaaplica o schema
pnpm --filter @regcheck/database db:push -- --force-reset

# Ou, para ambientes de desenvolvimento com dados que podem ser perdidos:
pnpm db:migrate -- --name reset
```

---

### Erro de CORS na API

**Sintoma:** `Access to fetch at 'http://localhost:4000' from origin 'http://localhost:3000' has been blocked by CORS policy`

**Solução:** Verifique se a variável `CORS_ORIGIN` no `.env` está configurada corretamente:

```env
CORS_ORIGIN=http://localhost:3000
```

Para múltiplas origens (ex.: mobile + web), separe por vírgula:

```env
CORS_ORIGIN=http://localhost:3000,http://10.101.6.26:3000
```

Reinicie a API após alterar o `.env`:
```bash
pnpm dev:api
```

---

### Mobile não consegue acessar a API (WSL2)

**Sintoma:** O app mobile não carrega dados ou recebe erros de rede. No terminal do Next.js aparece:
```
Cross origin request detected from <IP-DO-MOBILE> to /_next/* resource
```

**Causa:** Em ambientes Windows com Docker rodando no WSL2, o `setup-env.mjs` detecta o IP interno do WSL2 (ex.: `172.x.x.x`) e o usa para todas as URLs — incluindo `NEXT_PUBLIC_API_URL`, que é enviada ao browser/mobile. Esse IP não é roteável fora da máquina host.

**Solução:** O `setup-env.mjs` já trata isso automaticamente: usa o IP WSL2 para conexões server-side (banco, Redis, S3) e o IP da máquina Windows na rede local para `NEXT_PUBLIC_API_URL`. Basta rodar:

```bash
node scripts/setup-env.mjs
```

E reiniciar o ambiente:
```bash
pnpm dev
```

O script imprime os dois IPs detectados:
```
[setup-env] WSL2 detectado, usando host: 172.19.x.x
[setup-env] IP público (mobile/browser): 10.x.x.x
[setup-env] .env gerado com host: 172.19.x.x
```

> O IP público muda se você trocar de rede. Rode `node scripts/setup-env.mjs` sempre que mudar de rede Wi-Fi.
