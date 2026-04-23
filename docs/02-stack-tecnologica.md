# Stack Tecnológica

Este documento descreve todas as tecnologias, bibliotecas e ferramentas utilizadas no projeto RegCheck.

**Gerado em:** 23/04/2026, 12:20:29

## Backend

| Tecnologia | Versão | Descrição | Propósito |
|---|---|---|---|
| Express.js | 4.x | Framework web para Node.js | Servidor HTTP, rotas, middleware |
| Prisma | 5.x | ORM TypeScript-first | Acesso ao banco de dados, migrações, type-safety |
| PostgreSQL | 16 | Banco de dados relacional | Persistência de dados |
| BullMQ | 5.x | Fila de jobs com Redis | Processamento assíncrono de PDFs |
| Redis | 7 | Cache e message broker | Cache de dados, filas BullMQ |
| pdf-lib | 1.x | Manipulação de PDFs | Geração e edição de arquivos PDF |
| sharp | 0.33.x | Processamento de imagens | Redimensionamento e otimização de imagens |
| multer | 1.x | Upload de arquivos | Recebimento de arquivos multipart/form-data |
| zod | 3.x | Validação de schemas | Validação de entrada de dados |
| MinIO | latest | Object storage S3-compatible | Armazenamento de PDFs e imagens |

## Frontend

| Tecnologia | Versão | Descrição | Propósito |
|---|---|---|---|
| Next.js | 14.x | Framework React | SSR, routing, otimizações |
| React | 18.x | Biblioteca UI | Componentes, hooks, estado |
| TypeScript | 5.x | Superset JavaScript | Type-safety, IntelliSense |
| Konva | 9.x | Canvas 2D | Editor visual de templates |
| react-konva | 18.x | React bindings para Konva | Componentes React para canvas |
| pdfjs-dist | 4.x | Renderização de PDFs | Visualização de PDFs no navegador |
| TanStack Query | 5.x | Data fetching e cache | Gerenciamento de estado servidor |
| Zustand | 4.x | State management | Estado global da aplicação |
| Tailwind CSS | 3.x | Framework CSS utility-first | Estilização de componentes |
| Radix UI | latest | Componentes acessíveis | Primitivos UI headless |

## Infraestrutura

| Tecnologia | Versão | Descrição | Propósito |
|---|---|---|---|
| Docker | latest | Containerização | Ambiente de desenvolvimento isolado |
| Docker Compose | latest | Orquestração de containers | Gerenciamento de serviços locais |
| pnpm | 9.x | Gerenciador de pacotes | Instalação rápida, monorepo workspace |
| Turbo | 2.x | Build system para monorepos | Cache de builds, execução paralela |

## Pacotes Compartilhados

- **@regcheck/database**: Cliente Prisma e tipos do banco
- **@regcheck/types**: Tipos TypeScript compartilhados
- **@regcheck/utils**: Funções utilitárias reutilizáveis

## Ferramentas de Desenvolvimento

| Tecnologia | Versão | Descrição | Propósito |
|---|---|---|---|
| Vitest | 1.x | Framework de testes | Testes unitários e integração |
| ESLint | 8.x | Linter JavaScript/TypeScript | Qualidade e consistência de código |
| Prettier | 3.x | Formatador de código | Formatação automática |
| tsx | 4.x | Executor TypeScript | Execução de scripts TS |

## Padrões Arquiteturais

### Monorepo

Organização de múltiplos pacotes em um único repositório com workspaces pnpm.

### Service Layer

Lógica de negócio encapsulada em services, separada das rotas.

### Repository Pattern

Acesso a dados através do Prisma Client, abstraindo queries SQL.

### State Management

- **Zustand**: Estado local da aplicação (UI, preferências)
- **TanStack Query**: Estado servidor (cache de API)

### Validation

Schemas Zod para validação de entrada em rotas e formulários.

## Referências

- package.json: Dependências completas
- Documentação oficial de cada tecnologia

