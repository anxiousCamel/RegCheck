# Arquitetura do Sistema de Geração de Documentação

## Visão Geral

Sistema modular para geração automática de documentação técnica do RegCheck.

## Estrutura de Diretórios

```
scripts/
├── generate-docs.ts              # Entry point - orquestra tudo
├── docs/
│   ├── parsers/                  # Extraem dados do código
│   │   ├── prisma-parser.ts      # ✅ Schema Prisma → PrismaParserOutput
│   │   ├── route-parser.ts       # ✅ Rotas Express → RouteParserOutput
│   │   └── error-parser.ts       # ✅ Erros → ErrorCodeParserOutput
│   │
│   ├── generators/               # Transformam dados em Markdown
│   │   ├── types.ts              # ✅ DocGenerator<T> contract
│   │   ├── data-model-generator.ts        # ✅ 04-modelagem-dados.md
│   │   ├── api-reference-generator.ts     # ✅ 06-api-reference.md
│   │   ├── error-codes-generator.ts       # ✅ 07-codigos-erro.md
│   │   ├── architecture-generator.ts      # ✅ 01-arquitetura.md
│   │   ├── tech-stack-generator.ts        # ✅ 02-stack-tecnologica.md
│   │   ├── infrastructure-generator.ts    # ✅ 03-infraestrutura.md
│   │   └── index-generator.ts             # ✅ README.md
│   │
│   ├── writers/                  # Salvam arquivos
│   │   └── file-writer.ts        # ✅ writeDocument() com cache
│   │
│   └── markdown-formatter.ts     # ✅ Utilitários Markdown reutilizáveis
```

## Fluxo de Dados

```
┌─────────────────┐
│  Código Fonte   │
│  (Prisma, TS)   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│    PARSERS      │  ← Extraem dados estruturados
│  (AST, Regex)   │
└────────┬────────┘
         │
         ▼ ParserOutput<T>
┌─────────────────┐
│   GENERATORS    │  ← Transformam em Markdown
│  (Pure funcs)   │
└────────┬────────┘
         │
         ▼ string (Markdown)
┌─────────────────┐
│    WRITERS      │  ← Salvam em disco
│  (fs, cache)    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   docs/*.md     │  ← Documentação final
└─────────────────┘
```

## Contratos Padronizados

### ParserOutput<T>

Todos os parsers retornam este formato:

```typescript
interface ParserOutput<T> {
  source: string; // Identificador do parser
  generatedAt: string; // ISO timestamp
  data: T; // Dados parseados
}
```

**Implementações:**

- `PrismaParserOutput` → `data: PrismaSchema`
- `RouteParserOutput` → `data: ApiEndpoint[]`
- `ErrorCodeParserOutput` → `data: ParsedError[]`

### DocGenerator<T>

Todos os generators seguem este contrato:

```typescript
type DocGenerator<T> = (input: T) => string;
```

**Características:**

- ✅ Funções puras (sem side effects)
- ✅ Retornam apenas string (Markdown)
- ✅ Reutilizam `markdown-formatter.ts`
- ✅ Usam Mermaid para diagramas

## Generators Implementados

| Generator                  | Input                   | Output                    | Status |
| -------------------------- | ----------------------- | ------------------------- | ------ |
| `data-model-generator`     | `PrismaParserOutput`    | `04-modelagem-dados.md`   | ✅     |
| `api-reference-generator`  | `RouteParserOutput`     | `06-api-reference.md`     | ✅     |
| `error-codes-generator`    | `ErrorCodeParserOutput` | `07-codigos-erro.md`      | ✅     |
| `architecture-generator`   | `ArchitectureInput`     | `01-arquitetura.md`       | ✅     |
| `tech-stack-generator`     | `TechStackInput`        | `02-stack-tecnologica.md` | ✅     |
| `infrastructure-generator` | `InfrastructureInput`   | `03-infraestrutura.md`    | ✅     |
| `index-generator`          | `IndexInput`            | `README.md`               | ✅     |

## Separação de Responsabilidades

### ❌ O que NÃO fazer

```typescript
// ❌ Generator com lógica de parsing
function generateDocs(filePath: string) {
  const content = fs.readFileSync(filePath); // ❌ I/O no generator
  const parsed = parseContent(content); // ❌ Parsing no generator
  return formatMarkdown(parsed);
}

// ❌ Parser com formatação
function parseSchema(schema: string) {
  const models = extractModels(schema);
  return `# Models\n${models.join('\n')}`; // ❌ Markdown no parser
}
```

### ✅ O que fazer

```typescript
// ✅ Parser: apenas extração
function parsePrismaSchema(content: string): PrismaParserOutput {
  return {
    source: 'prisma-parser',
    generatedAt: new Date().toISOString(),
    data: { models, enums, relationships },
  };
}

// ✅ Generator: apenas transformação
const generateDataModelDocs: DocGenerator<PrismaParserOutput> = (output) => {
  let markdown = heading('Modelagem de Dados', 1);
  markdown += generateModelsSection(output.data.models);
  return markdown;
};

// ✅ Writer: apenas I/O
function writeDocument(options: WriteOptions): WriteResult {
  fs.writeFileSync(options.filepath, options.content);
  return { filepath, written: true };
}
```

## Cache e Performance

O `file-writer` implementa cache simples:

```typescript
// Evita sobrescrita se conteúdo não mudou
if (skipIfUnchanged && fs.existsSync(filepath)) {
  const existingHash = hashContent(existingContent);
  const newHash = hashContent(content);

  if (existingHash === newHash) {
    return { written: false, reason: 'Content unchanged' };
  }
}
```

## Uso

```bash
# Gerar toda documentação
pnpm generate:docs

# Saída
docs/
├── README.md                    # Índice
├── 01-arquitetura.md
├── 02-stack-tecnologica.md
├── 03-infraestrutura.md
├── 04-modelagem-dados.md
├── 06-api-reference.md
└── 07-codigos-erro.md
```

## Próximos Passos

Generators pendentes (Tasks 13-16):

- [ ] `ui-screens-generator.ts` → `05-prototipo-telas.md`
- [ ] `setup-guide-generator.ts` → `08-guia-setup.md`
- [ ] `code-standards-generator.ts` → `09-padroes-codigo.md`
- [ ] `process-flows-generator.ts` → `10-fluxos-processo.md`

## Princípios de Design

1. **Separação rígida**: Parser → Generator → Writer
2. **Funções puras**: Generators sem side effects
3. **Reutilização**: Markdown formatter compartilhado
4. **Padronização**: ParserOutput<T> e DocGenerator<T>
5. **Modularidade**: Um generator = um documento
6. **Cache inteligente**: Evita sobrescrita desnecessária
7. **Mermaid**: Diagramas como código
