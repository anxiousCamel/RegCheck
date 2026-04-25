# Infraestrutura

Documentação da infraestrutura local e serviços do RegCheck.

**Gerado em:** 23/04/2026, 12:20:29

## Docker Compose

O projeto utiliza Docker Compose para gerenciar serviços locais:

- **PostgreSQL 16**: Banco de dados principal
- **Redis 7**: Cache e filas
- **MinIO**: Object storage S3-compatible

## Portas dos Serviços

| Serviço       | Porta | Descrição      |
| ------------- | ----- | -------------- |
| PostgreSQL    | 5432  | Banco de dados |
| Redis         | 6379  | Cache e filas  |
| MinIO API     | 9000  | S3 API         |
| MinIO Console | 9001  | Interface web  |
| API Backend   | 4000  | REST API       |
| Web Frontend  | 3000  | Aplicação web  |
| Prisma Studio | 5555  | Database GUI   |

## Variáveis de Ambiente

### Root .env

```bash
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/regcheck
REDIS_URL=redis://localhost:6379
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
```

### apps/api/.env

```bash
PORT=4000
NODE_ENV=development
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/regcheck
REDIS_URL=redis://localhost:6379
```

### apps/web/.env.local

```bash
NEXT_PUBLIC_API_URL=http://localhost:4000/api
```

## Setup Local

1. Clonar repositório
2. Instalar dependências: `pnpm install`
3. Copiar `.env.example` para `.env`
4. Iniciar serviços: `docker-compose up -d`
5. Executar migrações: `pnpm db:migrate`
6. Iniciar aplicações: `pnpm dev`

## Scripts Disponíveis

| Comando            | Descrição                                |
| ------------------ | ---------------------------------------- |
| pnpm dev           | Inicia API e Web em modo desenvolvimento |
| pnpm dev:api       | Inicia apenas API                        |
| pnpm dev:web       | Inicia apenas Web                        |
| pnpm build         | Build de produção                        |
| pnpm test          | Executa testes                           |
| pnpm db:migrate    | Executa migrações Prisma                 |
| pnpm db:studio     | Abre Prisma Studio                       |
| pnpm generate:docs | Gera documentação                        |

## Troubleshooting

### Conflito de Portas

Se alguma porta estiver em uso, edite `docker-compose.yml` ou pare o serviço conflitante.

### MinIO não Inicia

Verifique permissões da pasta de dados ou remova volumes: `docker-compose down -v`

### Erro em Migrações Prisma

Reset do banco: `pnpm db:reset` (⚠️ apaga todos os dados)

## Estratégia de Deploy

**Status:** não identificado

## Referências

- Docker Compose: `infra/docker-compose.yml`
- Variáveis de ambiente: `.env.example`
