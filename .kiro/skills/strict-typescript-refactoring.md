---
inclusion: auto
globs: "**/*.ts,**/*.tsx"
---

# Skill: TypeScript Strict Mode Refactoring

Padrões e regras para manter o monorepo em conformidade com TypeScript `strict` completo, incluindo `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`, `useUnknownInCatchVariables` e todas as flags rigorosas.

## Regras Fundamentais

### 1. Nunca usar `any` sem justificativa

- Substituir `any` por tipos concretos inferidos do uso real
- Quando impossível, usar `unknown` com type guard
- Se `any` for absolutamente necessário, adicionar comentário explicando o motivo

```typescript
// ❌ Proibido
const data: any = JSON.parse(raw);

// ✅ Correto
const parsed: unknown = JSON.parse(raw);
if (isMyType(parsed)) { /* uso seguro */ }
```

### 2. Type assertions (`as`) devem ter justificativa

Toda ocorrência de `as` deve ter um comentário explicando por que a asserção é segura.

```typescript
// ❌ Sem justificativa
const pos = f.position as FieldPosition;

// ✅ Com justificativa
// Prisma JSON → FieldPosition: safe because the editor always writes this shape
const pos = f.position as FieldPosition;
```

### 3. Zero `@ts-ignore` — usar `@ts-expect-error` com comentário se necessário

```typescript
// ❌ Proibido
// @ts-ignore

// ✅ Aceitável (com justificativa e issue)
// @ts-expect-error — prisma.$on('query') não está nos tipos públicos (issue #123)
prisma.$on('query' as never, handler);
```

## Padrões por Categoria de Erro

### TS7006 — Implicit `any` em parâmetros

Tipar todos os parâmetros explicitamente:

```typescript
// ❌
app.use((err, req, res, next) => { ... });

// ✅
app.use((err: Error, req: Request, res: Response, next: NextFunction) => { ... });
```

### TS18048 / TS2532 — Null safety

Usar guard clause, optional chaining ou narrowing:

```typescript
// Guard clause (preferido para lógica de negócio)
if (!user.profile) throw new AppError(404, 'Not found', 'NOT_FOUND');
const name = user.profile.name;

// Optional chaining (para valores opcionais)
const name = user.profile?.name ?? 'Sem nome';

// noUncheckedIndexedAccess
const item = array[index];
if (item === undefined) continue;
```

### TS2375 / TS2412 — `exactOptionalPropertyTypes`

Nunca atribuir `undefined` a propriedades opcionais. Omitir a propriedade ou usar conditional spread:

```typescript
// ❌ Viola exactOptionalPropertyTypes
const opts: Options = { timeout: undefined };
const data = { name, fileKey: input.fileKey }; // fileKey pode ser undefined

// ✅ Omitir a propriedade
const opts: Options = {};

// ✅ Conditional spread
const data = {
  name,
  ...(input.fileKey !== undefined ? { fileKey: input.fileKey } : {}),
};
```

### TS6133 — Variáveis/imports não utilizados

- Remover se realmente desnecessário
- Prefixar com `_` se fizer parte de contrato obrigatório (callback, desestruturação)

```typescript
// Parâmetro obrigatório de callback
function handler(_req: Request, res: Response) { ... }

// Desestruturação parcial
const { used, _unused } = destructured;
```

### TS2345 / TS2322 — Incompatibilidades com Prisma JSON

Para campos JSON do Prisma, usar `satisfies` + cast com comentário:

```typescript
// Prisma JSON column: satisfies validates shape, cast bridges Prisma's InputJsonValue
metadata: {
  assignments,
  itemsPerPage,
} satisfies DocumentMetadata as unknown as Prisma.InputJsonValue,
```

Para leitura de JSON do Prisma:

```typescript
// Prisma JSON → FieldPosition: safe because the editor always writes this shape
const pos = f.position as FieldPosition;
```

## Tipos Reutilizáveis

Tipos comuns ficam em `packages/shared/src/types/`. Nunca duplicar definições:

| Tipo | Localização | Uso |
|------|-------------|-----|
| `JsonValue` | `common.ts` | Campos JSON do Prisma |
| `DocumentMetadata` | `common.ts` | `doc.metadata` |
| `FieldPosition` | `field.ts` | `field.position` |
| `FieldConfig` | `field.ts` | `field.config` |
| `StrictOptional<T,K>` | `common.ts` | Utilitário para exactOptionalPropertyTypes |

Importar sempre de `@regcheck/shared`:

```typescript
import type { FieldPosition, FieldConfig, DocumentMetadata } from '@regcheck/shared';
```

## Configuração TSConfig

### Raiz (`tsconfig.json`)
- `skipLibCheck: false` — verificação completa
- `jsx: "react-jsx"` — fallback para pacotes com `.tsx`

### Apps com conflitos em node_modules
- `skipLibCheck: true` — apenas nos TSConfigs filhos que sofrem com conflitos
- Sempre com comentário justificando o motivo

```jsonc
{
  // skipLibCheck: ioredis 5.x e bullmq possuem tipos incompatíveis
  // com exactOptionalPropertyTypes habilitado no tsconfig raiz.
  "skipLibCheck": true
}
```

### Vitest globals
- Adicionar `"types": ["vitest/globals"]` nos TSConfigs que usam `globals: true`

## Ordem de Refatoração

Seguir dependência bottom-up:
1. Configuração (TSConfig, JSX, skipLibCheck)
2. Pacotes base (`packages/*`)
3. Aplicações (`apps/api`, `apps/web`)
4. Scripts (`scripts/`)

Validar com `tsc --noEmit` a cada fase.

## Dados Externos

- Sempre tipar com `unknown` e validar antes de usar
- Usar `JSON.parse` → `unknown` → type guard ou `as` com comentário
- Para cache deserializado: `const parsed: unknown = JSON.parse(cached);`
