# Arquitetura do Sistema

Este documento descreve a arquitetura do sistema RegCheck, incluindo estrutura, camadas e responsabilidades dos componentes.

**Gerado em:** 23/04/2026, 12:20:29

## Tipo de Arquitetura

**Monorepo Modular**

O projeto utiliza uma arquitetura de monorepo com múltiplos pacotes e aplicações organizados em um único repositório.

## Estrutura do Monorepo

```mermaid
graph

graph TD
    Root[RegCheck Monorepo]
    Root --> Apps[apps/]
    Root --> Packages[packages/]
    Root --> Infra[infra/]
    Root --> Scripts[scripts/]
    
    Apps --> API[api - Backend Express]
    Apps --> Web[web - Frontend Next.js]
    
    Packages --> Database[database - Prisma]
    Packages --> Types[types - TypeScript types]
    Packages --> Utils[utils - Shared utilities]
    
    Infra --> Docker[docker-compose.yml]
    
    Scripts --> Docs[docs/ - Generators]

```

## Camadas Arquiteturais

### 1. Aplicações (apps/)

- **api**: Backend REST API construído com Express.js
- **web**: Frontend SPA construído com Next.js 14

### 2. Pacotes Compartilhados (packages/)

- **database**: Schema Prisma e cliente de banco de dados
- **types**: Tipos TypeScript compartilhados entre apps
- **utils**: Funções utilitárias reutilizáveis

### 3. Infraestrutura (infra/)

- Configuração Docker Compose para serviços locais
- PostgreSQL, Redis, MinIO

## Stack Tecnológica por Camada

```mermaid
graph

graph LR
    Frontend[Frontend Layer]
    Backend[Backend Layer]
    Data[Data Layer]
    Infra[Infrastructure Layer]
    
    Frontend --> NextJS[Next.js 14]
    Frontend --> React[React 18]
    Frontend --> Konva[Konva Canvas]
    
    Backend --> Express[Express.js]
    Backend --> Prisma[Prisma ORM]
    Backend --> BullMQ[BullMQ]
    
    Data --> PostgreSQL[PostgreSQL 16]
    Data --> Redis[Redis 7]
    
    Infra --> Docker[Docker Compose]
    Infra --> MinIO[MinIO S3]

```

## Fluxo Geral da Aplicação

O sistema segue o fluxo:

1. **Upload**: Usuário faz upload de PDF
2. **Template**: Sistema cria template baseado no PDF
3. **Edição**: Usuário configura campos no template
4. **Documento**: Usuário cria documento a partir do template
5. **Preenchimento**: Sistema ou usuário preenche campos
6. **PDF**: Sistema gera PDF final com dados preenchidos

## Responsabilidades dos Componentes

### Backend (API)

- Gerenciar templates e documentos
- Processar uploads de PDF
- Validar dados com Zod
- Gerar PDFs em background (BullMQ)
- Armazenar arquivos no MinIO
- Persistir dados no PostgreSQL

### Frontend (Web)

- Interface de edição de templates (Konva)
- Formulários de preenchimento de documentos
- Visualização de PDFs (pdf.js)
- Gerenciamento de estado (Zustand)
- Cache de requisições (TanStack Query)

### Database

- Schema Prisma com 10 modelos
- Migrações de banco de dados
- Cliente TypeScript type-safe

## Referências

- Estrutura do projeto: Diretório raiz
- Configuração do monorepo: `package.json`, `turbo.json`
- Docker Compose: `infra/docker-compose.yml`

