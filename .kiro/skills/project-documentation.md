---
inclusion: manual
---

# Skill: Documentação Técnica de Projeto

Framework de padrões e regras para criar e manter documentação técnica completa de qualquer projeto. Estrutura padronizada com diagramas Mermaid, ADRs, validadores automatizados e guias práticos.

## Estrutura Obrigatória

Todo projeto documentado deve ter esta estrutura mínima. Adaptar conforme o tamanho e tipo do projeto:

```
README.md                        ← ponto de entrada (setup, comandos, links)
docs/
  index.md                       ← índice navegável de toda a documentação
  architecture.md                ← diagramas C4, dependências, schema
  flows.md                       ← diagramas de sequência e estado
  conventions.md                 ← padrões de código e convenções do projeto
  packages.md                    ← API pública dos pacotes/módulos (se monorepo)
  contributing.md                ← guia de contribuição
  adr/
    README.md                    ← índice de ADRs + template padrão
    NNN-titulo-da-decisao.md     ← uma ADR por decisão arquitetural
```

Para projetos menores, `architecture.md` e `flows.md` podem ser combinados. Para projetos maiores, adicionar arquivos conforme necessidade (ex: `api-reference.md`, `data-model.md`, `infrastructure.md`, `error-codes.md`).

## Regras Fundamentais

### 1. Nenhum placeholder — conteúdo real

Todo conteúdo deve ser específico ao projeto. Nunca usar "Lorem ipsum", "TODO", ou descrições genéricas.

```markdown
<!-- ❌ Proibido -->
## Arquitetura
TODO: descrever a arquitetura

<!-- ✅ Correto -->
## Arquitetura
O sistema usa uma arquitetura monorepo com Turborepo, separando...
```

### 2. Diagramas Mermaid obrigatórios com título

Todo bloco Mermaid deve ter um heading ou legenda imediatamente antes. Nunca inserir diagrama "solto".

```markdown
<!-- ❌ Sem título -->
```mermaid
graph LR
  A --> B
```

<!-- ✅ Com título -->
### Dependências entre pacotes

```mermaid
graph LR
  A --> B
```
```

### 3. Links sempre relativos entre documentos

Referências entre arquivos de documentação devem usar caminhos relativos, nunca URLs absolutas ao próprio repo.

```markdown
<!-- ❌ URL absoluta -->
Veja [arquitetura](https://github.com/user/repo/blob/main/docs/architecture.md)

<!-- ✅ Link relativo -->
Veja [arquitetura](docs/architecture.md)
```

### 4. Idioma consistente

Escolher um idioma e manter em toda a documentação. Não misturar pt-BR e en-US no mesmo documento.

### 5. Conteúdo extraído do código, não inventado

Sempre que possível, gerar documentação a partir do código-fonte real:
- Parsear schemas de banco (Prisma, TypeORM, Drizzle) para gerar ERDs
- Parsear rotas para gerar referência de API
- Parsear exports de pacotes para gerar docs de API pública

## Conteúdo Esperado por Arquivo

### README.md

Deve conter, nesta ordem:
1. Badge de status + descrição de uma linha do projeto
2. Diagrama Mermaid de arquitetura (visão geral dos componentes)
3. Tabela de URLs de acesso local (se aplicável)
4. Seção de setup (pré-requisitos, clone, variáveis de ambiente, dependências, dev server)
5. Tabela de comandos essenciais
6. Links para `docs/`
7. Seção de troubleshooting com erros comuns

### docs/index.md

Índice com links relativos para todos os documentos, agrupados por categoria. Deve referenciar 100% dos arquivos `.md` em `docs/`.

### docs/architecture.md

1. Diagrama C4 nível 2 (Container Diagram) — todos os serviços e suas conexões
2. Diagrama de dependências entre pacotes/módulos (se monorepo)
3. Diagrama ER do schema do banco (`erDiagram` Mermaid)
4. Tabela de responsabilidades por pacote/módulo/app
5. Explicação de decisões técnicas relevantes com links para ADRs

### docs/flows.md

1. Diagramas de estado (`stateDiagram-v2`) para ciclos de vida de entidades principais
2. Diagramas de sequência (`sequenceDiagram`) para fluxos end-to-end principais
3. Diagramas de fluxo (`flowchart TD`) para algoritmos complexos

### docs/conventions.md

Tópicos obrigatórios (adaptar ao projeto):
- Nomenclatura (arquivos, funções, tipos, constantes)
- Estrutura de pastas por app/pacote
- Validação de dados (Zod, Joi, class-validator, etc.)
- Gerenciamento de estado (se frontend)
- Tratamento de erros na API
- Como adicionar novos módulos/pacotes ao projeto

### docs/packages.md (monorepos)

Para cada pacote/módulo compartilhado:
- Símbolos exportados com descrição
- Exemplos de uso reais
- Diagrama de consumo mostrando quem importa o quê

### docs/contributing.md

1. Fluxo de desenvolvimento local (branch → código → lint → commit)
2. Convenções de commit (`tipo(escopo): descrição`)
3. Instruções de banco de dados (migrations, seeds)
4. Passo a passo: como adicionar endpoint, componente, módulo
5. Checklist de PR com `- [ ]`

### docs/adr/README.md

Índice de ADRs + template padrão com campos obrigatórios.

### ADRs individuais

Cada ADR deve conter todas estas seções:
- **Título**
- **Status** (Aceito / Proposto / Depreciado / Substituído)
- **Contexto** — problema que motivou a decisão
- **Decisão** — o que foi decidido
- **Alternativas Consideradas** — opções avaliadas
- **Consequências** — trade-offs e impactos

## Tooling de Geração e Validação

O projeto possui um sistema automatizado em `scripts/docs/` para gerar e validar documentação a partir do código-fonte.

### Estrutura do Tooling

```
scripts/
  generate-docs.ts               ← orquestrador principal (entry point)
  docs/
    generators/                  ← módulos que geram conteúdo Markdown
      architecture-generator.ts
      api-reference-generator.ts
      data-model-generator.ts
      error-codes-generator.ts
      index-generator.ts
      infrastructure-generator.ts
      tech-stack-generator.ts
      types.ts
    validators/                  ← módulos que validam docs gerados
      index.ts                   ← orquestrador de validação
      markdown-validator.ts      ← valida sintaxe Markdown (headings, code blocks, tabelas, links)
      mermaid-validator.ts       ← valida sintaxe de diagramas Mermaid
      content-validator.ts       ← valida qualidade do conteúdo (placeholders, conteúdo mínimo)
    writers/
      file-writer.ts             ← escreve arquivos com detecção de mudanças
    prisma-parser.ts             ← extrai modelos do schema Prisma
    route-parser.ts              ← extrai endpoints dos arquivos de rota
    error-parser.ts              ← extrai códigos de erro
    api-formatter.ts             ← formata endpoints para Markdown
    erd-generator.ts             ← gera diagramas ER Mermaid
    markdown-formatter.ts        ← utilitários de formatação Markdown
```

### Como Usar

```bash
# Gerar toda a documentação
pnpm tsx scripts/generate-docs.ts

# O script automaticamente:
# 1. Parseia o schema Prisma → modelos e enums
# 2. Parseia os arquivos de rota → endpoints
# 3. Parseia error handlers → códigos de erro
# 4. Gera os arquivos .md em docs/
# 5. Valida todos os arquivos gerados
```

### Validadores Disponíveis

Os validadores em `scripts/docs/validators/` verificam:

- **markdown-validator**: hierarquia de headings, code blocks fechados, tabelas consistentes, links válidos, estrutura mínima
- **mermaid-validator**: sintaxe de `erDiagram`, `graph`/`flowchart`, `sequenceDiagram` — verifica nós, relacionamentos, interações
- **content-validator**: detecta placeholders (TODO, FIXME), conteúdo insuficiente (<50 palavras), estrutura sem conteúdo, padrões de dados reais (HTTP methods em docs de API, field types em docs de modelo)

### Como Adicionar Novo Gerador

1. Criar `scripts/docs/generators/novo-generator.ts` exportando uma função que retorna string (Markdown)
2. Importar e orquestrar em `scripts/generate-docs.ts`
3. Adicionar entrada no `documents[]` para que apareça no índice
4. Os validadores rodam automaticamente sobre o arquivo gerado

### Como Adicionar Novo Validador

1. Criar `scripts/docs/validators/novo-validator.ts` com interface `{ valid: boolean, errors: [] }`
2. Importar e chamar no `scripts/docs/validators/index.ts` dentro do loop de arquivos
3. Adicionar resultados ao `ValidationResult`

## Propriedades de Correção

Ao criar ou atualizar documentação, verificar (automatizado pelos validators ou manualmente):

1. Todos os arquivos obrigatórios existem
2. `docs/index.md` referencia todos os `.md` em `docs/`
3. `README.md` referencia os documentos principais em `docs/`
4. Cada pacote/módulo/app tem responsabilidade documentada em `architecture.md`
5. Cada símbolo público de pacote está em `packages.md` (se monorepo)
6. Cada ADR contém todos os campos do template
7. Todas as referências cruzadas usam links relativos
8. Todo bloco Mermaid tem título ou legenda
9. `conventions.md` cobre todos os tópicos obrigatórios do projeto
10. `contributing.md` tem checklist de PR

## Manutenção

- Incluir timestamp "Última atualização" nos documentos
- Ao adicionar novo arquivo em `docs/`, atualizar `docs/index.md`
- Ao tomar decisão arquitetural, criar novo ADR e atualizar `docs/adr/README.md`
- Ao adicionar pacote/módulo, atualizar `docs/packages.md` e `docs/architecture.md`
- Rodar `scripts/generate-docs.ts` periodicamente para regenerar docs extraídos do código
- Tratar warnings dos validadores como dívida técnica a ser resolvida
