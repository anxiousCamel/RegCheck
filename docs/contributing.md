# Guia de Contribuição

Este guia cobre o fluxo completo de contribuição no RegCheck: do ambiente local até a abertura de um pull request.

> Veja também: [docs/conventions.md](./conventions.md) para padrões de código e [docs/packages.md](./packages.md) para a API dos pacotes compartilhados.

---

## Fluxo de Desenvolvimento Local

Todo trabalho novo começa em uma branch separada. O fluxo padrão é:

```bash
# 1. Crie uma branch a partir de main
git checkout -b feat/nome-da-feature

# 2. Implemente as mudanças

# 3. Verifique lint e tipos antes de commitar
pnpm lint
pnpm type-check

# 4. Commit seguindo as convenções (ver seção abaixo)
git commit -m "feat(templates): adicionar suporte a campos de assinatura"

# 5. Abra o pull request
git push origin feat/nome-da-feature
```

O lint e o type-check rodam via Turborepo em todos os pacotes e apps do monorepo. Corrija todos os erros antes de commitar — o CI rejeita PRs com falhas.

---

## Convenções de Commit

O projeto usa o formato **Conventional Commits**:

```
tipo(escopo): descrição curta em imperativo
```

### Tipos permitidos

| Tipo | Quando usar |
|---|---|
| `feat` | Nova funcionalidade |
| `fix` | Correção de bug |
| `docs` | Mudanças apenas em documentação |
| `refactor` | Refatoração sem mudança de comportamento |
| `chore` | Tarefas de manutenção (deps, config, build) |
| `test` | Adição ou correção de testes |

### Escopos comuns

Use o nome do pacote ou app afetado: `api`, `web`, `database`, `pdf-engine`, `editor-engine`, `validators`, `ui`, `shared`.

### Exemplos reais

```
feat(api): adicionar endpoint GET /api/equipamentos/:id/historico
fix(pdf-engine): corrigir cálculo de coordenadas em páginas rotacionadas
docs(contributing): adicionar seção de migrations
refactor(loja-service): extrair lógica de cache para helper
chore(deps): atualizar @aws-sdk/client-s3 para 3.x
test(validators): adicionar testes para createEquipamentoSchema
fix(api): bind em 0.0.0.0 para acesso via mobile na rede local
fix(scripts): separar host WSL2 do IP público no setup-env
```

---

## Banco de Dados: Prisma Studio e Migrations

### Prisma Studio

Para inspecionar e editar dados diretamente no banco durante o desenvolvimento:

```bash
pnpm db:studio
```

Abre o Prisma Studio em `http://localhost:5555`. Requer que a infra esteja rodando (`pnpm infra:up`).

### Criar uma migration

Quando você altera o `packages/database/prisma/schema.prisma`, crie uma migration nomeada:

```bash
pnpm db:migrate -- --name nome-da-migration
```

Exemplos:

```bash
pnpm db:migrate -- --name add-equipamento-observacoes
pnpm db:migrate -- --name create-template-version-table
pnpm db:migrate -- --name add-document-error-message
```

O arquivo de migration é gerado em `packages/database/prisma/migrations/` e deve ser commitado junto com a mudança no schema.

> **Atenção:** nunca edite arquivos de migration já aplicados. Se precisar corrigir, crie uma nova migration.

---

## Adicionando um Novo Endpoint à API

Siga estes 4 passos. O exemplo abaixo adiciona um endpoint para listar histórico de equipamentos.

### 1. Criar o schema em `packages/validators/src/`

```typescript
// packages/validators/src/equipamento-historico-schema.ts
import { z } from 'zod';

export const equipamentoHistoricoQuerySchema = z.object({
  equipamentoId: z.string().cuid(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});

export type EquipamentoHistoricoQuery = z.infer<typeof equipamentoHistoricoQuerySchema>;
```

Exporte o schema em `packages/validators/src/index.ts`:

```typescript
export { equipamentoHistoricoQuerySchema, type EquipamentoHistoricoQuery } from './equipamento-historico-schema';
```

### 2. Criar o service em `apps/api/src/services/`

```typescript
// apps/api/src/services/equipamento-historico-service.ts
import { prisma } from '@regcheck/database';
import { AppError } from '../middleware/error-handler';
import type { EquipamentoHistoricoQuery } from '@regcheck/validators';

export class EquipamentoHistoricoService {
  static async list(query: EquipamentoHistoricoQuery) {
    const equipamento = await prisma.equipamento.findUnique({
      where: { id: query.equipamentoId },
    });
    if (!equipamento) throw new AppError(404, 'Equipamento não encontrado', 'NOT_FOUND');

    const skip = (query.page - 1) * query.pageSize;
    const [items, total] = await Promise.all([
      prisma.equipamentoHistorico.findMany({
        where: { equipamentoId: query.equipamentoId },
        skip,
        take: query.pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.equipamentoHistorico.count({ where: { equipamentoId: query.equipamentoId } }),
    ]);

    return { items, total, page: query.page, pageSize: query.pageSize };
  }
}
```

### 3. Criar a rota em `apps/api/src/routes/`

```typescript
// apps/api/src/routes/equipamento-historico.ts
import { Router } from 'express';
import { EquipamentoHistoricoService } from '../services/equipamento-historico-service';
import { equipamentoHistoricoQuerySchema } from '@regcheck/validators';
import type { ApiResponse } from '@regcheck/shared';

export const equipamentoHistoricoRouter = Router();

/** GET /api/equipamentos/:id/historico */
equipamentoHistoricoRouter.get('/:id/historico', async (req, res, next) => {
  try {
    const query = equipamentoHistoricoQuerySchema.parse({
      equipamentoId: req.params.id,
      ...req.query,
    });
    const result = await EquipamentoHistoricoService.list(query);
    res.json({ success: true, data: result } satisfies ApiResponse<typeof result>);
  } catch (err) {
    next(err);
  }
});
```

### 4. Registrar a rota em `apps/api/src/server.ts`

```typescript
// apps/api/src/server.ts
import { equipamentoHistoricoRouter } from './routes/equipamento-historico';

// ...dentro do bloco de Routes:
app.use('/api/equipamentos', equipamentoHistoricoRouter);
```

As rotas existentes seguem o mesmo padrão: `templateRouter`, `documentRouter`, `lojaRouter`, `setorRouter`, `tipoEquipamentoRouter`, `equipamentoRouter` — todas registradas em `server.ts` com prefixo `/api/<recurso>`.

---

## Adicionando um Componente ao `packages/ui`

O pacote `packages/ui` contém componentes React compartilhados entre `apps/web` e qualquer outro app do monorepo. Os componentes existentes são: `Button`, `Input`, `Label`, `Dialog`, `Badge`, `Spinner`.

### 1. Criar o arquivo do componente

```typescript
// packages/ui/src/components/alert.tsx
'use client';

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../utils';

const alertVariants = cva(
  'relative w-full rounded-lg border p-4 text-sm',
  {
    variants: {
      variant: {
        default: 'bg-background text-foreground',
        destructive: 'border-destructive/50 text-destructive',
        warning: 'border-yellow-500/50 text-yellow-700',
      },
    },
    defaultVariants: { variant: 'default' },
  },
);

export interface AlertProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof alertVariants> {}

const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ className, variant, ...props }, ref) => (
    <div ref={ref} className={cn(alertVariants({ variant }), className)} {...props} />
  ),
);
Alert.displayName = 'Alert';

export { Alert };
```

### 2. Exportar em `packages/ui/src/index.ts`

```typescript
export { Alert, type AlertProps } from './components/alert';
```

### 3. Usar em `apps/web`

```typescript
// apps/web/src/components/equipment/equipment-form.tsx
import { Alert } from '@regcheck/ui';

export function EquipmentForm() {
  return (
    <div>
      <Alert variant="warning">
        Verifique os dados antes de salvar.
      </Alert>
      {/* ... */}
    </div>
  );
}
```

O TypeScript resolve `@regcheck/ui` via workspace do pnpm — não é necessário instalar separadamente.

---

## Desenvolvimento Cross-platform (Windows ↔ Linux)

Este projeto roda em Windows e Linux. Alguns pacotes têm binários nativos compilados por plataforma (`msgpackr-extract`, `sharp`, `canvas`), então o `node_modules` precisa ser recriado ao trocar de OS.

### Como o setup-env funciona

O script `scripts/setup-env.mjs` é responsável por gerar os arquivos `.env` corretos para cada ambiente. Ele é executado automaticamente pelo `pnpm up` e `pnpm up:studio`, mas pode ser rodado manualmente:

```bash
pnpm setup:env
```

O script lê o `.env` da raiz e gera três arquivos derivados com os hosts corretos:

| Arquivo gerado | Usado por |
|---|---|
| `apps/api/.env` | API Express (DATABASE_URL, REDIS_URL, S3_ENDPOINT) |
| `packages/database/.env` | Prisma CLI (migrations, studio) |
| `apps/web/.env.local` | Next.js (NEXT_PUBLIC_API_URL) |

**Por que isso é necessário?** O `localhost` tem significado diferente dependendo de onde a aplicação roda:

| Ambiente | Docker roda em | Host para serviços | Host para celular/browser |
|---|---|---|---|
| Linux nativo | Linux | `localhost` | `localhost` |
| Windows (Docker no WSL2) | WSL2 | IP do WSL2 (`172.x.x.x`) | IP da rede local (`10.x.x.x`) |

No Windows com Docker no WSL2, os containers expõem as portas dentro do WSL2. A API roda no Windows e precisa do IP do WSL2 para alcançar o PostgreSQL, Redis e MinIO. Esse IP muda a cada boot do WSL2, por isso o script detecta dinamicamente via `wsl hostname -I`.

O `NEXT_PUBLIC_API_URL` usa um IP diferente: o IP da rede local Wi-Fi/Ethernet (`10.x` ou `192.168.x`), que é o endereço que o celular consegue alcançar.

**Nunca edite `apps/api/.env`, `packages/database/.env` ou `apps/web/.env.local` manualmente** — eles são sobrescritos pelo `setup-env` a cada execução. Edite sempre o `.env` da raiz.

### Comandos de reinstalação

| Comando                | Descrição                                      |
|------------------------|------------------------------------------------|
| `pnpm reinstall`       | Detecta o OS automaticamente e reinstala       |
| `pnpm reinstall:win`   | Força reinstalação via PowerShell (Windows)    |
| `pnpm reinstall:linux` | Força reinstalação via bash (Linux/WSL)        |

### Regras importantes

- Sempre use `pnpm` para instalar dependências. Nunca use `npm install` — ele não entende as configs do pnpm (`.npmrc`, `shamefully-hoist`, etc.) e vai gerar erros de peer dependency.
- O `node_modules` nunca deve ser commitado. Está no `.gitignore` e os binários nativos estão marcados como `binary` no `.gitattributes`.
- Line endings: todos os arquivos de texto usam LF. O `.gitattributes` garante isso automaticamente — não altere essa config.

### Sintoma típico ao esquecer de reinstalar

```
EACCES: permission denied, open '.../@msgpackr-extract/msgpackr-extract-linux-x64/package.json'
```

Solução: `pnpm reinstall` (ou o script específico da plataforma acima).

---

## Checklist de PR

Antes de abrir o pull request, verifique cada item:

- [ ] `pnpm lint` passa sem erros ou warnings
- [ ] `pnpm type-check` passa sem erros
- [ ] Testes passam (se houver testes no pacote afetado)
- [ ] Documentação atualizada (se a mudança afeta comportamento público ou convenções)
- [ ] Migration criada e commitada (se o schema Prisma foi alterado)
- [ ] Variáveis de ambiente novas adicionadas ao `.env.example`
- [ ] Nenhuma coordenada absoluta armazenada no banco (usar valores relativos 0–1 em `FieldPosition`)
- [ ] Novos schemas Zod exportados em `packages/validators/src/index.ts`
- [ ] Novos componentes UI exportados em `packages/ui/src/index.ts`
