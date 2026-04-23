# Sistema de Validação de Documentação

## Visão Geral

Sistema completo de validação automática para garantir qualidade e consistência da documentação gerada.

## Arquitetura

```
scripts/docs/validators/
├── markdown-validator.ts      # ✅ Valida sintaxe Markdown
├── mermaid-validator.ts       # ✅ Valida diagramas Mermaid
├── content-validator.ts       # ✅ Valida qualidade do conteúdo
└── index.ts                   # ✅ Orquestrador de validação
```

## Validadores Implementados

### 1. Markdown Validator

**Responsabilidade:** Garantir sintaxe Markdown válida

**Validações:**
- ✅ Hierarquia de headings (sem pulos de nível)
- ✅ Code blocks fechados corretamente
- ✅ Tabelas com colunas consistentes
- ✅ Links bem formados (sem URLs vazias)
- ✅ Estrutura básica (título h1, seções h2)

**Exemplo de erro detectado:**
```
❌ [heading] Skipped heading level from h1 to h3 at line 45
❌ [code-block] Unclosed code block starting at line 120
❌ [table] Inconsistent column count at line 78: expected 4, got 3
```

### 2. Mermaid Validator

**Responsabilidade:** Garantir diagramas Mermaid renderizáveis

**Validações:**
- ✅ Blocos ```mermaid abrem e fecham
- ✅ Tipo de diagrama válido (erDiagram, graph, sequenceDiagram)
- ✅ Sintaxe específica por tipo:
  - **ERD**: Relacionamentos e entidades não vazios
  - **Graph**: Nós e conexões presentes
  - **Sequence**: Interações entre atores

**Exemplo de erro detectado:**
```
❌ [syntax] ER diagram must start with "erDiagram" at line 50
❌ [structure] Graph has no nodes at line 120
❌ [syntax] Malformed relationship syntax at line 65
```

### 3. Content Validator

**Responsabilidade:** Garantir conteúdo significativo (não apenas estrutura vazia)

**Validações:**
- ✅ Documento não vazio
- ✅ Possui título (h1)
- ✅ Possui seções (h2)
- ✅ Conteúdo mínimo (50 palavras)
- ✅ Sem placeholders (TODO, FIXME, Coming soon)
- ✅ Dados reais por tipo de documento:
  - **API**: HTTP methods, paths
  - **Data Model**: Field types
  - **Errors**: Status codes

**Estatísticas coletadas:**
```
📊 Stats:
   - Lines: 245/280
   - Words: 1,234
   - Headings: 15 (8 sections)
   - Tables: 3
   - Code blocks: 5
   - Lists: 12
```

## Integração no Pipeline

### Fluxo Automático

```
1. Parse (Prisma, Routes, Errors)
   ↓
2. Generate (Markdown files)
   ↓
3. Write (Save to disk)
   ↓
4. VALIDATE ← Automático
   ├─ Markdown syntax
   ├─ Mermaid diagrams
   └─ Content quality
   ↓
5. Success ✅ ou Fail ❌ (exit 1)
```

### Fail Fast

Se qualquer validação falhar:
- ❌ Pipeline aborta com `exit 1`
- 🚫 Documentação não é considerada válida
- 📋 Erros detalhados são exibidos

### Exemplo de Saída

```bash
$ pnpm generate:docs

================================================================================
REGCHECK - DOCUMENTATION GENERATOR
================================================================================

📊 Parsing Prisma schema...
   ✓ Found 10 models, 3 enums

🛣️  Parsing API routes...
   ✓ Found 45 endpoints

⚠️  Parsing error codes...
   ✓ Found 15 error codes

================================================================================
GENERATING DOCUMENTATION FILES
================================================================================

📐 Generating architecture documentation...
   ✓ Written: /path/to/docs/01-arquitetura.md

... (outros arquivos)

================================================================================
GENERATION SUMMARY
================================================================================

   Files written: 7
   Files skipped: 0 (unchanged)
   Total files:   7
   Time elapsed:  1.23s

================================================================================
VALIDATING DOCUMENTATION
================================================================================

Files validated: 7

✅ All validations passed!
⚠️  3 warning(s)

WARNINGS:
--------------------------------------------------------------------------------
  04-modelagem-dados.md: Line 145 is very long (125 characters)
  06-api-reference.md: 2 lines have trailing whitespace
  README.md: Multiple consecutive blank lines at line 45

SUMMARY BY FILE:
--------------------------------------------------------------------------------
  01-arquitetura.md:
    Markdown: ✅ (0 errors, 0 warnings)
    Mermaid:  ✅ (0 errors, 2 diagrams)
    Content:  ✅ (0 errors, 1,234 words)

  04-modelagem-dados.md:
    Markdown: ✅ (0 errors, 1 warnings)
    Mermaid:  ✅ (0 errors, 1 diagrams)
    Content:  ✅ (0 errors, 2,456 words)

  ... (outros arquivos)

================================================================================

✅ Documentation generation and validation complete!

📁 Output directory: /path/to/docs
```

### Exemplo de Falha

```bash
$ pnpm generate:docs

... (geração normal)

================================================================================
VALIDATING DOCUMENTATION
================================================================================

Files validated: 7

❌ Validation failed with 3 error(s)
⚠️  1 warning(s)

ERRORS:
--------------------------------------------------------------------------------
  Markdown validation failed for 04-modelagem-dados.md
    - [code-block] (line 120) Unclosed code block starting at line 120
  Mermaid validation failed for 01-arquitetura.md
    - [structure] (line 50) Graph has no nodes at line 50
  Content validation failed for 06-api-reference.md
    - [insufficient-data] API documentation is missing HTTP methods or endpoint paths

... (detalhes)

❌ Documentation validation failed!
   3 error(s) found

Please fix the errors above and regenerate documentation.

# Exit code 1 - Pipeline falha
```

## Testes E2E

### Arquivo: `scripts/docs/__tests__/e2e-generation.test.ts`

**Cobertura:**
- ✅ Parse completo sem erros
- ✅ Geração de todos os arquivos
- ✅ Validação automática
- ✅ Performance (< 5 segundos)
- ✅ Qualidade de conteúdo
- ✅ Tratamento de erros

**Execução:**
```bash
pnpm test scripts/docs/__tests__/e2e-generation.test.ts
```

## Critérios de Qualidade

### Markdown

| Critério | Validação |
|----------|-----------|
| Hierarquia de headings | Sem pulos de nível |
| Code blocks | Todos fechados |
| Tabelas | Colunas consistentes |
| Links | Formato válido |
| Estrutura | h1 + h2 presentes |

### Mermaid

| Tipo | Validação |
|------|-----------|
| erDiagram | Relacionamentos + entidades |
| graph/flowchart | Nós + conexões |
| sequenceDiagram | Interações entre atores |

### Conteúdo

| Critério | Mínimo |
|----------|--------|
| Palavras | 50 |
| Seções (h2) | 1 |
| Título (h1) | 1 |
| Placeholders | 0 |

## Uso Programático

```typescript
import { validateDocumentation } from './docs/validators';

const result = validateDocumentation('./docs');

if (!result.success) {
  console.error(`Validation failed: ${result.errors.length} errors`);
  process.exit(1);
}

console.log(`✅ ${result.filesValidated} files validated successfully`);
```

## Extensibilidade

Para adicionar novos validadores:

1. Criar arquivo em `scripts/docs/validators/`
2. Implementar interface de validação
3. Integrar no orquestrador (`index.ts`)
4. Adicionar testes

**Exemplo:**
```typescript
// scripts/docs/validators/link-validator.ts
export function validateLinks(content: string): ValidationResult {
  // Validar links externos, âncoras, etc.
}

// scripts/docs/validators/index.ts
import { validateLinks } from './link-validator';

// Adicionar ao pipeline
const linkResult = validateLinks(file.content);
```

## Benefícios

1. **Fail Fast**: Erros detectados imediatamente
2. **Consistência**: Todos os docs seguem o mesmo padrão
3. **Qualidade**: Conteúdo real, não apenas estrutura
4. **Manutenibilidade**: Mudanças futuras não quebram docs
5. **Confiança**: Documentação sempre renderizável

## Próximos Passos

Validações adicionais possíveis:

- [ ] Validar links externos (HTTP 200)
- [ ] Validar âncoras internas (#section)
- [ ] Validar imagens existem
- [ ] Spell checking (português)
- [ ] Validar exemplos de código compilam
- [ ] Snapshot testing para regressão
