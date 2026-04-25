# Plano de Implementação: Refatoração TypeScript Strict

## Visão Geral

Refatoração incremental do monorepo **regcheck** para eliminar todos os 1794 erros de compilação TypeScript no modo `strict`. A abordagem segue a ordem de dependência definida no design: primeiro configuração (maior impacto, menor risco), depois pacotes base, aplicações e scripts. Cada tarefa é autocontida e validável individualmente.

## Tarefas

- [x] 1. Configuração JSX e flags globais no TSConfig raiz
  - Adicionar `"jsx": "react-jsx"` ao `tsconfig.json` raiz como fallback para pacotes que contêm `.tsx`
  - Verificar que `apps/web/tsconfig.json` mantém `"jsx": "preserve"` (override para Next.js)
  - Verificar que `packages/ui/tsconfig.json` mantém `"jsx": "react-jsx"` (já presente)
  - Executar `tsc --noEmit` e confirmar eliminação dos ~1024 erros TS17004
  - _Requisitos: 1.1, 1.2, 1.3, 1.4_

- [x] 2. Configuração de `skipLibCheck` seletivo e tipos do Vitest
  - [x] 2.1 Adicionar `"skipLibCheck": true` em `apps/api/tsconfig.json` com comentário justificando (conflito ioredis/bullmq)
    - _Requisitos: 13.1, 13.2, 13.3_
  - [x] 2.2 Adicionar `"types": ["vitest/globals"]` nos TSConfigs que usam `globals: true` no Vitest
    - Atualizar `apps/api/tsconfig.json`, `apps/web/tsconfig.json` e `scripts/tsconfig.json`
    - Confirmar que `describe`, `it`, `expect` são reconhecidos pelo compilador
    - _Requisitos: 4.2, 4.3_
  - [x] 2.3 Criar arquivo de declaração de tipos para módulos sem tipos disponíveis
    - Criar `apps/web/src/types/modules.d.ts` com `declare module` para `pdfjs-dist/build/pdf.worker.min.mjs`
    - Criar `apps/api/src/types/globals.d.ts` se necessário para extensões do Express
    - _Requisitos: 4.1, 4.4_

- [x] 3. Checkpoint — Validar Fase 1 de configuração
  - Executar `tsc --noEmit` no diretório raiz e em cada app/pacote individualmente
  - Confirmar eliminação dos ~1064 erros de configuração (TS17004, TS2304 Vitest, TS2375/TS2412 ioredis)
  - Garantir que todos os testes existentes continuam passando. Perguntar ao usuário se houver dúvidas.

- [x] 4. Criar tipos reutilizáveis em `packages/shared`
  - [x] 4.1 Criar `packages/shared/src/types/common.ts` com tipos utilitários compartilhados
    - Implementar `JsonValue`, `DocumentMetadata`, `FieldPosition`, `FieldConfig`, `StrictOptional<T,K>` conforme definido no design
    - Exportar todos os tipos no barrel file (`packages/shared/src/types/index.ts` ou equivalente)
    - _Requisitos: 9.1, 12.1, 12.2, 12.3_
  - [ ]* 4.2 Escrever testes unitários para os type guards e tipos utilitários
    - Testar que `JsonValue` aceita valores válidos e rejeita inválidos
    - Testar type guards criados para `DocumentMetadata`, `FieldConfig`
    - _Requisitos: 9.2_

- [x] 5. Corrigir erros nos pacotes base (`packages/*`)
  - [x] 5.1 Corrigir erros em `packages/shared`
    - Tipar parâmetros implícitos `any` (TS7006) com tipos concretos
    - Tratar acessos a valores possivelmente `undefined` (TS18048, TS2532)
    - Remover variáveis/imports não utilizados (TS6133) ou prefixar com `_`
    - _Requisitos: 2.1, 2.5, 3.1, 3.2, 5.1, 5.2, 10.1, 10.5, 11.2_
  - [x] 5.2 Corrigir erros em `packages/database`
    - Tipar parâmetros e retornos implícitos
    - Resolver incompatibilidades de tipo com Prisma (campos JSON → `JsonValue`)
    - _Requisitos: 2.1, 2.2, 6.1, 6.2, 9.1_
  - [x] 5.3 Corrigir erros em `packages/validators`
    - Tipar parâmetros implícitos e resolver erros de null safety
    - _Requisitos: 2.1, 3.1, 6.1_
  - [x] 5.4 Corrigir erros em `packages/editor-engine`
    - Tipar parâmetros e retornos implícitos
    - Resolver erros de `exactOptionalPropertyTypes` em `BindingScope` e interfaces similares
    - Tratar acessos a valores possivelmente `undefined`
    - _Requisitos: 2.1, 3.1, 7.1, 7.2_
  - [x] 5.5 Corrigir erros em `packages/pdf-engine`
    - Tipar parâmetros implícitos e resolver incompatibilidades de tipo
    - Usar `FieldPosition` e `FieldConfig` de `packages/shared` onde aplicável
    - _Requisitos: 2.1, 6.1, 6.3, 12.1, 12.2_
  - [x] 5.6 Corrigir erros em `packages/ui`
    - Tipar props de componentes React e event handlers
    - Resolver erros de null safety em refs e estados
    - Remover imports não utilizados
    - _Requisitos: 2.1, 3.1, 5.1, 6.1_

- [x] 6. Checkpoint — Validar Fase 2 de pacotes base
  - Executar `tsc --noEmit` em cada pacote individualmente
  - Confirmar zero erros em todos os `packages/*`
  - Garantir que todos os testes existentes continuam passando. Perguntar ao usuário se houver dúvidas.

- [x] 7. Corrigir erros em `apps/api` — Serviços e Lib
  - [x] 7.1 Corrigir erros em `apps/api/src/lib/`
    - Tipar parâmetros de `cache.ts`, `performance.ts`, `prisma-query-logger.ts`, `queue.ts`, `redis.ts`, `s3.ts`
    - Resolver null safety em conexões Redis e operações S3
    - Usar `unknown` com type guards para dados de cache deserializados
    - _Requisitos: 2.1, 2.3, 3.1, 3.3, 9.1, 9.3, 10.1, 10.5_
  - [x] 7.2 Corrigir erros em `apps/api/src/services/`
    - Tipar parâmetros e retornos de todos os services (`document-service.ts`, `equipamento-service.ts`, `field-service.ts`, `loja-service.ts`, `setor-service.ts`, `template-service.ts`, `tipo-equipamento-service.ts`, `upload-service.ts`)
    - Substituir `unknown` por `FieldPosition`, `FieldConfig`, `DocumentMetadata` de `packages/shared`
    - Resolver incompatibilidades de tipo com Prisma (`as unknown as Prisma.InputJsonValue` com `satisfies` e comentário)
    - _Requisitos: 2.1, 2.2, 3.1, 6.1, 6.2, 6.3, 9.1, 10.2, 12.1_
  - [ ]* 7.3 Verificar que testes existentes dos services continuam passando
    - Executar suite de testes de `apps/api/src/services/__tests__/`
    - Ajustar apenas tipagem nos testes se necessário (sem alterar lógica)
    - _Requisitos: 11.2, 11.3_

- [x] 8. Corrigir erros em `apps/api` — Middleware, Routes e Server
  - [x] 8.1 Corrigir erros em `apps/api/src/middleware/`
    - Tipar parâmetros de error handlers (`err: Error`, `req: Request`, `res: Response`, `next: NextFunction`)
    - Resolver null safety em middleware de cache e performance
    - _Requisitos: 2.1, 3.1, 6.1_
  - [x] 8.2 Corrigir erros em `apps/api/src/routes/`
    - Tipar parâmetros de request/response em todos os route handlers
    - Resolver erros de propriedades inexistentes (TS2339) em objetos de request
    - Tratar `req.body`, `req.params`, `req.query` com tipos explícitos
    - _Requisitos: 2.1, 3.1, 6.1, 6.3, 9.1, 9.2_
  - [x] 8.3 Corrigir erros em `apps/api/src/server.ts` e `apps/api/src/jobs/`
    - Tipar configuração do servidor e workers
    - Resolver erros de fluxo de controle (TS2454) em inicialização
    - _Requisitos: 2.1, 8.1, 8.2_
  - [ ]* 8.4 Verificar que testes existentes de middleware continuam passando
    - Executar suite de testes de `apps/api/src/middleware/__tests__/`
    - _Requisitos: 11.2, 11.3_

- [x] 9. Checkpoint — Validar `apps/api`
  - Executar `tsc --noEmit` em `apps/api`
  - Confirmar zero erros de compilação
  - Executar todos os testes de `apps/api`. Perguntar ao usuário se houver dúvidas.

- [x] 10. Corrigir erros em `apps/web` — Componentes
  - [x] 10.1 Corrigir erros em `apps/web/src/components/ui/`
    - Tipar props de componentes UI base
    - Resolver null safety em refs (`useRef`) e estados
    - Remover imports não utilizados
    - _Requisitos: 2.1, 3.1, 5.1, 6.1_
  - [x] 10.2 Corrigir erros em `apps/web/src/components/editor/`
    - Tipar props e event handlers do editor
    - Resolver erros de `exactOptionalPropertyTypes` em configurações do editor
    - Usar tipos de `packages/editor-engine` e `packages/shared`
    - _Requisitos: 2.1, 3.1, 6.1, 7.1, 7.2, 12.1_
  - [x] 10.3 Corrigir erros em `apps/web/src/components/document/` e `apps/web/src/components/equipment/`
    - Tipar props de componentes de documento e equipamento
    - Resolver incompatibilidades de tipo com dados da API
    - _Requisitos: 2.1, 3.1, 6.1, 6.2_
  - [x] 10.4 Corrigir erros em `apps/web/src/components/layout/`
    - Tipar props de componentes de layout
    - Remover variáveis não utilizadas
    - _Requisitos: 2.1, 5.1, 6.1_

- [x] 11. Corrigir erros em `apps/web` — Hooks, Lib e Pages
  - [x] 11.1 Corrigir erros em `apps/web/src/hooks/`
    - Tipar parâmetros e retornos de custom hooks (`use-autosave.ts`, `use-document-draft.ts`, etc.)
    - Resolver null safety em estados e efeitos
    - _Requisitos: 2.1, 2.2, 3.1_
  - [x] 11.2 Corrigir erros em `apps/web/src/lib/`
    - Tipar funções utilitárias e configurações
    - Resolver erros de módulos não encontrados (TS2307)
    - _Requisitos: 2.1, 4.1, 6.1_
  - [x] 11.3 Corrigir erros em `apps/web/src/app/` (pages e layouts)
    - Tipar props de páginas e layouts Next.js
    - Resolver erros de null safety em server components e client components
    - Remover imports não utilizados
    - _Requisitos: 2.1, 3.1, 5.1, 6.1, 8.4_

- [x] 12. Checkpoint — Validar `apps/web`
  - Executar `tsc --noEmit` em `apps/web`
  - Confirmar zero erros de compilação
  - Garantir que todos os testes existentes continuam passando. Perguntar ao usuário se houver dúvidas.

- [x] 13. Corrigir erros em `scripts/`
  - [x] 13.1 Corrigir erros nos scripts de geração de documentação
    - Tipar parâmetros e retornos em `scripts/generate-docs.ts` e scripts relacionados
    - Resolver erros de null safety e imports não utilizados
    - _Requisitos: 2.1, 3.1, 5.1_
  - [x] 13.2 Corrigir erros nos scripts de banco de dados e utilitários
    - Tipar parâmetros em `scripts/db-export.mjs`, `scripts/db-import.mjs`, `scripts/setup-env.mjs` e similares
    - Resolver erros de módulos não encontrados e tipos implícitos
    - _Requisitos: 2.1, 4.1, 6.1, 9.1_
  - [x] 13.3 Corrigir erros nos scripts de parsing e seed
    - Tipar parâmetros e dados externos em scripts de parsing
    - Usar `unknown` com type guards para dados lidos de arquivos
    - _Requisitos: 2.1, 9.1, 9.2, 9.3, 10.5_
  - [ ]* 13.4 Verificar que scripts executam corretamente após refatoração
    - Executar scripts de geração de docs e utilitários para confirmar comportamento preservado
    - _Requisitos: 11.2_

- [x] 14. Limpeza final e conformidade com regras de tipagem
  - [x] 14.1 Auditar uso de `any`, `as`, `@ts-ignore` e `@ts-expect-error` em todo o monorepo
    - Buscar ocorrências de `any` explícito sem comentário justificativo e substituir por tipos concretos ou `unknown`
    - Buscar ocorrências de `as` sem comentário e adicionar justificativa ou substituir por type guard
    - Remover qualquer `@ts-ignore` remanescente
    - Verificar que `@ts-expect-error` possui comentário e issue de rastreamento
    - _Requisitos: 10.1, 10.2, 10.3, 10.4, 10.5_
  - [x] 14.2 Verificar que tipos reutilizáveis estão centralizados e sem duplicação
    - Confirmar que `DocumentMetadata`, `FieldConfig`, `FieldPosition`, `JsonValue` são importados de `packages/shared`
    - Remover definições duplicadas de tipos em arquivos locais
    - _Requisitos: 12.1, 12.2, 12.3_

- [x] 15. Validação final — Zero erros em todo o monorepo
  - Executar `tsc --noEmit` no diretório raiz do monorepo e confirmar zero erros
  - Executar `tsc --noEmit` em `apps/api` individualmente e confirmar zero erros
  - Executar `tsc --noEmit` em `apps/web` individualmente e confirmar zero erros
  - Executar `tsc --noEmit` em cada pacote com TSConfig próprio e confirmar zero erros
  - Executar todos os testes existentes e confirmar que passam sem modificação de lógica
  - Garantir que todos os testes passam. Perguntar ao usuário se houver dúvidas.
  - _Requisitos: 14.1, 14.2, 14.3, 14.4, 11.1, 11.3, 11.4_

## Notas

- Tarefas marcadas com `*` são opcionais e podem ser puladas para um MVP mais rápido
- Cada tarefa referencia requisitos específicos para rastreabilidade
- Checkpoints garantem validação incremental a cada fase
- A ordem das tarefas segue a dependência entre pacotes: configuração → pacotes base → aplicações → scripts
- Testes unitários e de integração validam exemplos específicos e casos de borda
