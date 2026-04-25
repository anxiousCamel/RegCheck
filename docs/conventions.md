# Convenções do Projeto RegCheck

Este documento descreve os padrões de código adotados no RegCheck. Seguir estas convenções garante consistência em todo o monorepo e facilita a revisão de código.

---

## 1. Nomenclatura

### Arquivos e Pastas

| Tipo                    | Convenção                                       | Exemplos                                   |
| ----------------------- | ----------------------------------------------- | ------------------------------------------ |
| Arquivos TypeScript/TSX | `kebab-case`                                    | `template-service.ts`, `editor-canvas.tsx` |
| Pastas                  | `kebab-case`                                    | `editor-engine/`, `pdf-engine/`            |
| Componentes React       | `kebab-case` no arquivo, `PascalCase` no export | `editor-toolbar.tsx` → `EditorToolbar`     |

### Identificadores no Código

| Tipo                | Convenção                     | Exemplos                                           |
| ------------------- | ----------------------------- | -------------------------------------------------- |
| Funções e variáveis | `camelCase`                   | `getTemplate`, `isDirty`, `totalPages`             |
| Componentes React   | `PascalCase`                  | `EditorCanvas`, `FieldProperties`                  |
| Tipos e interfaces  | `PascalCase`                  | `TemplateField`, `FieldPosition`, `ApiResponse<T>` |
| Enums e constantes  | `UPPER_SNAKE_CASE`            | `TEMPLATE_STATUS`, `MAX_ZOOM`                      |
| Hooks customizados  | `camelCase` com prefixo `use` | `useAutosave`, `usePdfRenderer`                    |

### Exemplos Reais do Projeto

```typescript
// ✅ Correto — tipos em PascalCase
export interface FieldPosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

// ✅ Correto — funções em camelCase
export function useAutosave<T>(data: T, isDirty: boolean, saveFn: (data: T) => Promise<void>) { ... }

// ✅ Correto — componente em PascalCase
export default function EditorCanvas() { ... }

// ✅ Correto — arquivo em kebab-case
// apps/web/src/components/editor/editor-canvas.tsx
```

---

## 2. Estrutura de Pastas

### `apps/api`

```
apps/api/src/
├── routes/          # Handlers HTTP — um arquivo por recurso
│   ├── templates.ts
│   ├── documents.ts
│   ├── fields.ts
│   ├── lojas.ts
│   └── uploads.ts
├── services/        # Lógica de negócio — um arquivo por recurso
│   ├── template-service.ts
│   ├── document-service.ts
│   └── field-service.ts
├── middleware/      # Middlewares Express
│   ├── error-handler.ts
│   └── request-logger.ts
├── lib/             # Clientes de infraestrutura (Redis, S3, BullMQ)
│   ├── queue.ts
│   ├── redis.ts
│   └── s3.ts
├── jobs/            # Workers BullMQ
│   └── pdf-generation-worker.ts
└── server.ts        # Ponto de entrada — registra rotas e middlewares
```

### `apps/web`

```
apps/web/src/
├── app/             # Rotas Next.js App Router — um diretório por rota
│   ├── templates/
│   │   └── page.tsx
│   ├── editor/
│   │   └── [templateId]/
│   │       └── page.tsx
│   └── documents/
│       └── page.tsx
├── components/      # Componentes React — subpastas por domínio
│   ├── editor/
│   │   ├── editor-canvas.tsx
│   │   └── editor-toolbar.tsx
│   └── equipment/
│       └── equipment-form.tsx
├── hooks/           # Hooks customizados
│   ├── use-autosave.ts
│   └── use-pdf-renderer.ts
├── stores/          # Estado Zustand
│   └── editor-store.ts
└── lib/             # Utilitários e clientes
    ├── api.ts       # Cliente HTTP centralizado
    └── draft-db.ts
```

---

## 3. Uso de Zod Validators

### Onde Criar

Todos os schemas de validação ficam em `packages/validators/src/`. Cada arquivo agrupa schemas de um domínio:

```
packages/validators/src/
├── template.ts    # createTemplateSchema, updateTemplateSchema, repetitionConfigSchema
├── document.ts    # createDocumentSchema, fillDocumentSchema
├── field.ts       # createFieldSchema, updateFieldSchema
├── equipment.ts   # createEquipamentoSchema
└── common.ts      # paginationSchema, idParamSchema
```

### Como Importar

```typescript
import { createTemplateSchema, paginationSchema } from '@regcheck/validators';
```

### Como Compor Schemas

Use `.extend()`, `.merge()` e `.pick()` para reutilizar schemas existentes:

```typescript
// packages/validators/src/template.ts

import { z } from 'zod';

export const repetitionConfigSchema = z.object({
  itemsPerPage: z.number().int().min(1).max(50),
  columns: z.number().int().min(1).max(10),
  rows: z.number().int().min(1).max(10),
  offsetX: z.number().min(0).max(1),
  offsetY: z.number().min(0).max(1),
  startX: z.number().min(0).max(1).optional(),
  startY: z.number().min(0).max(1).optional(),
});

export const createTemplateSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  pdfFileKey: z.string().min(1),
});

// Inferir tipo TypeScript a partir do schema
export type CreateTemplateInput = z.infer<typeof createTemplateSchema>;
```

### Como Usar nas Rotas

```typescript
// apps/api/src/routes/templates.ts
import { createTemplateSchema, paginationSchema, idParamSchema } from '@regcheck/validators';

templateRouter.post('/', async (req, res, next) => {
  try {
    // .parse() lança ZodError se inválido — capturado pelo errorHandler
    const input = createTemplateSchema.parse(req.body);
    const template = await TemplateService.create(input, pdfFile.id);
    res.status(201).json({ success: true, data: template });
  } catch (err) {
    next(err); // ZodError é tratado automaticamente pelo errorHandler
  }
});
```

---

## 4. React Query vs Zustand

### Regra Geral

| Situação                                                | Use                         |
| ------------------------------------------------------- | --------------------------- |
| Buscar dados do servidor (GET)                          | React Query (`useQuery`)    |
| Criar/atualizar/deletar no servidor (POST/PATCH/DELETE) | React Query (`useMutation`) |
| Estado local da UI (seleção, zoom, histórico)           | Zustand                     |
| Cache e invalidação de dados remotos                    | React Query                 |
| Estado do editor visual (campos, página atual)          | Zustand (`editor-store.ts`) |

### React Query — Dados do Servidor

```typescript
// apps/web/src/app/templates/page.tsx
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export default function TemplatesPage() {
  const queryClient = useQueryClient();

  // Buscar lista de templates
  const { data, isLoading } = useQuery({
    queryKey: ['templates'],
    queryFn: () => api.listTemplates(),
  });

  // Deletar template e invalidar cache
  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteTemplate(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['templates'] }),
  });

  return (
    // ...
    <button onClick={() => deleteMutation.mutate(template.id)}>
      Excluir
    </button>
  );
}
```

### Zustand — Estado Local do Editor

```typescript
// apps/web/src/stores/editor-store.ts
import { create } from 'zustand';
import { HistoryManager } from '@regcheck/editor-engine';

export const useEditorStore = create<EditorState>((set, get) => ({
  fields: [],
  selectedFieldIds: [],
  currentPage: 0,
  zoom: 1,
  isDirty: false,
  history: new HistoryManager<EditorField[]>(50),

  addField: (field) => {
    const fields = [...get().fields, field];
    set({ fields, isDirty: true, selectedFieldIds: [field.id] });
    get().history.push(fields);
  },

  undo: () => {
    const fields = get().history.undo();
    if (fields) set({ fields, isDirty: true });
  },
}));

// Consumir no componente
const { fields, addField, undo } = useEditorStore();
```

### Por que essa separação?

- React Query gerencia ciclo de vida de dados remotos: loading, error, cache, refetch, invalidação.
- Zustand gerencia estado local complexo sem boilerplate: o editor tem histórico de undo/redo, multi-seleção e preview de replicação que não precisam ser sincronizados com o servidor.

Ver também: [ADR 004 — Zustand + React Query](./adr/004-zustand-react-query.md)

---

## 5. Tratamento de Erros na API

### Formato `ApiResponse<T>`

Toda resposta da API usa o tipo `ApiResponse<T>` de `@regcheck/shared`:

```typescript
// packages/shared/src/types/api.ts

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, string[]>; // usado em erros de validação Zod
}
```

**Resposta de sucesso:**

```json
{ "success": true, "data": { "id": "...", "name": "Meu Template" } }
```

**Resposta de erro:**

```json
{ "success": false, "error": { "code": "NOT_FOUND", "message": "Template não encontrado" } }
```

### `AppError` — Lançar Erros com Status Code

Use `AppError` de `apps/api/src/middleware/error-handler.ts` para erros de negócio:

```typescript
import { AppError } from '../middleware/error-handler';

// Em qualquer service ou route handler:
throw new AppError(404, 'Template não encontrado', 'TEMPLATE_NOT_FOUND');
throw new AppError(409, 'Template já publicado', 'ALREADY_PUBLISHED');
throw new AppError(400, 'PDF não encontrado. Faça upload primeiro.', 'PDF_NOT_FOUND');
```

### `errorHandler` Middleware

O middleware `errorHandler` em `apps/api/src/middleware/error-handler.ts` captura todos os erros passados via `next(err)` e formata a resposta automaticamente:

- `AppError` → status code definido + `{ success: false, error: { code, message } }`
- `ZodError` → status 400 + `{ success: false, error: { code: 'VALIDATION_ERROR', details: { campo: ['mensagem'] } } }`
- Outros erros → status 500 + `{ success: false, error: { code: 'INTERNAL_ERROR', ... } }`

```typescript
// apps/api/src/server.ts — registrar APÓS todas as rotas
import { errorHandler } from './middleware/error-handler';

app.use('/api/templates', templateRouter);
app.use('/api/documents', documentRouter);
// ... outras rotas

app.use(errorHandler); // sempre por último
```

### Padrão nas Rotas

```typescript
// apps/api/src/routes/templates.ts
templateRouter.get('/:id', async (req, res, next) => {
  try {
    const { id } = idParamSchema.parse(req.params);
    const template = await TemplateService.getById(id);
    res.json({ success: true, data: template } satisfies ApiResponse<typeof template>);
  } catch (err) {
    next(err); // delega ao errorHandler — nunca trate erros inline
  }
});
```

---

## 6. Coordenadas Relativas

### Regra Fundamental

**Nunca armazene coordenadas absolutas (pixels ou pontos PDF).** Todos os campos usam coordenadas relativas no intervalo `[0, 1]` em relação às dimensões da página.

```typescript
// packages/shared/src/types/field.ts
export interface FieldPosition {
  x: number; // 0 = esquerda, 1 = direita
  y: number; // 0 = topo, 1 = base
  width: number; // fração da largura da página
  height: number; // fração da altura da página
}
```

### Por quê?

PDFs têm dimensões variáveis por página. Coordenadas absolutas quebrariam ao trocar o PDF base ou ao renderizar em tamanhos diferentes. Com coordenadas relativas, o mesmo campo funciona em qualquer PDF.

### Fórmula de Conversão

A conversão de relativo para absoluto acontece **exclusivamente** no `@regcheck/pdf-engine`, na hora de gerar o PDF:

```typescript
// Conversão relativo → absoluto (sistema de coordenadas pdf-lib: origem no canto inferior esquerdo)
const absX = position.x * pageWidth;
const absY = pageHeight - position.y * pageHeight - position.height * pageHeight;
const absWidth = position.width * pageWidth;
const absHeight = position.height * pageHeight;
```

### No Editor (Konva)

O editor converte relativo → pixels ao renderizar e pixels → relativo ao salvar:

```typescript
// Relativo → pixels (para renderizar no canvas Konva)
const pixelX = position.x * canvasWidth;
const pixelY = position.y * canvasHeight;

// Pixels → relativo (ao salvar posição após drag/drop)
const relX = pixelX / canvasWidth;
const relY = pixelY / canvasHeight;
```

Ver também: [ADR 002 — Coordenadas Relativas](./adr/002-coordenadas-relativas.md)

---

## 7. Adição de Novos Pacotes ao Monorepo

### Passo a Passo

**1. Criar a estrutura do pacote:**

```
packages/novo-pacote/
├── src/
│   └── index.ts
├── package.json
└── tsconfig.json
```

**2. Configurar `package.json`:**

```json
{
  "name": "@regcheck/novo-pacote",
  "version": "0.0.1",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "type-check": "tsc --noEmit",
    "clean": "rimraf dist .turbo"
  },
  "devDependencies": {
    "typescript": "^5.5.0"
  }
}
```

**3. Configurar `tsconfig.json`:**

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "outDir": "./dist"
  },
  "include": ["src"]
}
```

**4. Adicionar ao `turbo.json` (se o pacote tiver tasks customizadas):**

O `turbo.json` na raiz já define tasks globais (`build`, `lint`, `type-check`). Só adicione entradas específicas se o pacote precisar de comportamento diferente:

```json
{
  "tasks": {
    "novo-pacote#build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    }
  }
}
```

**5. Instalar o pacote em outro app/pacote:**

```bash
# Adicionar como dependência em apps/api
pnpm add @regcheck/novo-pacote --filter @regcheck/api --workspace
```

**6. Importar:**

```typescript
import { minhaFuncao } from '@regcheck/novo-pacote';
```

### Convenções para Novos Pacotes

- O `name` no `package.json` deve seguir o padrão `@regcheck/nome-do-pacote`
- O `main` e `types` apontam para `./src/index.ts` (sem build step em desenvolvimento)
- Exporte tudo via `src/index.ts` — nunca importe de arquivos internos do pacote diretamente
- Mantenha o pacote focado em uma responsabilidade única (ex: `editor-engine` só lida com lógica do editor)
