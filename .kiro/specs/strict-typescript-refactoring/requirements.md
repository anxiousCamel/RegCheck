# Documento de Requisitos — Refatoração TypeScript Strict

## Introdução

Este documento define os requisitos para a refatoração do monorepo **regcheck** com o objetivo de eliminar todos os erros de compilação TypeScript no modo `strict`, sem introduzir gambiarras (como `any`, `as` sem justificativa, `@ts-ignore` ou `@ts-expect-error`). O projeto possui 1794 erros distribuídos em 120 arquivos, abrangendo apps (API Express, Web Next.js), pacotes compartilhados (database, editor-engine, pdf-engine, shared, ui, validators) e scripts utilitários. A refatoração deve ser incremental, arquivo por arquivo, preservando o comportamento existente do código e aumentando o nível real de tipagem.

## Glossário

- **Compilador**: O compilador TypeScript (`tsc`) executado com a flag `--noEmit` para verificação de tipos sem gerar artefatos de saída.
- **Modo_Strict**: Conjunto de flags rigorosas do TypeScript habilitadas no `tsconfig.json` raiz, incluindo `strict`, `noImplicitAny`, `strictNullChecks`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noUnusedLocals`, `noUnusedParameters`, `noImplicitReturns`, `noFallthroughCasesInSwitch`, `noImplicitOverride` e `useUnknownInCatchVariables`.
- **Monorepo**: Repositório único contendo múltiplos pacotes e aplicações gerenciados via pnpm workspaces e Turborepo.
- **Pacote**: Módulo reutilizável dentro do monorepo (database, editor-engine, pdf-engine, shared, ui, validators).
- **Aplicação**: Projeto executável dentro do monorepo (apps/api, apps/web).
- **Type_Guard**: Função que realiza verificação de tipo em tempo de execução, permitindo ao TypeScript inferir o tipo correto dentro de um bloco condicional.
- **Tipo_Reutilizável**: Interface ou type alias definido em local compartilhado para evitar duplicação de definições de tipo entre arquivos.
- **Dados_Externos**: Dados provenientes de APIs, JSON, banco de dados ou qualquer fonte fora do controle direto do código TypeScript.
- **TSConfig_Filho**: Arquivo `tsconfig.json` de um pacote ou aplicação que estende o `tsconfig.json` raiz via propriedade `extends`.
- **Verificação_Incremental**: Processo de refatoração onde cada arquivo é corrigido e validado individualmente antes de prosseguir para o próximo.

## Requisitos

### Requisito 1: Configuração JSX nos TSConfigs Filhos

**User Story:** Como desenvolvedor, quero que os arquivos TSX compilem corretamente, para que os 1024 erros TS17004 sejam eliminados pela configuração adequada da flag `jsx`.

#### Critérios de Aceitação

1. THE TSConfig_Filho de apps/web SHALL incluir a opção `"jsx": "preserve"` (já presente) e THE Compilador SHALL processar arquivos `.tsx` em apps/web sem erros TS17004.
2. THE TSConfig_Filho de packages/ui SHALL incluir a opção `"jsx": "react-jsx"` (já presente) e THE Compilador SHALL processar arquivos `.tsx` em packages/ui sem erros TS17004.
3. WHEN um TSConfig_Filho não possuir a flag `jsx` configurada e contiver arquivos `.tsx`, THE Compilador SHALL reportar erro TS17004 e THE TSConfig_Filho SHALL ser atualizado com a opção `jsx` apropriada.
4. IF o TSConfig_Filho raiz for alterado para incluir `jsx` globalmente, THEN THE Compilador SHALL continuar respeitando as configurações específicas de cada TSConfig_Filho.

### Requisito 2: Eliminação de Tipos Implícitos `any`

**User Story:** Como desenvolvedor, quero que todos os parâmetros e retornos de funções tenham tipos explícitos, para que os 132 erros TS7006 e 10 erros TS7053 sejam corrigidos com tipagem real.

#### Critérios de Aceitação

1. WHEN um parâmetro de função possuir tipo implícito `any`, THE Compilador SHALL reportar erro TS7006 e o parâmetro SHALL receber um tipo explícito inferido a partir do uso real no código.
2. WHEN um retorno de função não puder ser inferido automaticamente, THE Compilador SHALL reportar erro e a função SHALL receber uma anotação de tipo de retorno explícita.
3. WHEN um acesso indexado a objeto resultar em tipo implícito `any` (TS7053), THE Compilador SHALL reportar erro e o objeto SHALL receber uma definição de tipo com assinatura de índice adequada ou o acesso SHALL usar verificação de tipo segura.
4. WHEN um binding element possuir tipo implícito `any` (TS7031), THE Compilador SHALL reportar erro e o binding element SHALL receber tipo explícito.
5. THE Compilador SHALL reportar zero erros TS7006, TS7053 e TS7031 após a refatoração completa.

### Requisito 3: Segurança contra Null e Undefined

**User Story:** Como desenvolvedor, quero que todos os acessos a valores potencialmente nulos ou indefinidos sejam tratados de forma segura, para que os 164 erros de null safety (TS18048, TS2532, TS18049) sejam eliminados.

#### Critérios de Aceitação

1. WHEN um objeto for possivelmente `undefined` (TS18048, TS2532), THE Compilador SHALL reportar erro e o código SHALL incluir verificação de nulidade antes do acesso (guard clause, optional chaining ou narrowing explícito).
2. WHEN um objeto for possivelmente `null` ou `undefined` (TS18049), THE Compilador SHALL reportar erro e o código SHALL tratar ambos os casos com verificação adequada.
3. WHEN `noUncheckedIndexedAccess` estiver habilitado e um acesso indexado retornar `T | undefined`, THE Compilador SHALL exigir verificação e o código SHALL validar o valor antes de usá-lo.
4. THE Compilador SHALL reportar zero erros TS18048, TS2532 e TS18049 após a refatoração completa.

### Requisito 4: Resolução de Módulos e Imports

**User Story:** Como desenvolvedor, quero que todos os imports e referências a módulos sejam resolvidos corretamente, para que os 78 erros TS2307 e 21 erros TS2304 sejam eliminados.

#### Critérios de Aceitação

1. WHEN um módulo não for encontrado (TS2307), THE Compilador SHALL reportar erro e o import SHALL ser corrigido via caminho correto, instalação de pacote de tipos (`@types/*`) ou criação de arquivo de declaração de tipos (`.d.ts`).
2. WHEN um nome não for encontrado no escopo (TS2304), THE Compilador SHALL reportar erro e o nome SHALL ser corrigido via import adequado ou configuração de tipos globais (por exemplo, globals do Vitest).
3. WHEN o Vitest estiver configurado com `globals: true`, THE TSConfig_Filho correspondente SHALL incluir referência aos tipos globais do Vitest para que `describe`, `it`, `expect` e similares sejam reconhecidos pelo Compilador.
4. WHEN um módulo de terceiros não possuir tipos disponíveis, THE Monorepo SHALL conter um arquivo de declaração de tipos (`.d.ts`) com declaração `declare module` para o módulo.
5. THE Compilador SHALL reportar zero erros TS2307 e TS2304 após a refatoração completa.

### Requisito 5: Limpeza de Variáveis e Imports Não Utilizados

**User Story:** Como desenvolvedor, quero que variáveis e imports não utilizados sejam removidos ou tratados adequadamente, para que os 82 erros TS6133 sejam eliminados.

#### Critérios de Aceitação

1. WHEN uma variável ou import for declarado mas nunca lido (TS6133), THE Compilador SHALL reportar erro e o elemento SHALL ser removido se for realmente desnecessário.
2. WHEN uma variável não utilizada fizer parte de um contrato obrigatório (por exemplo, parâmetro de callback, desestruturação parcial), THE variável SHALL ser prefixada com underscore (`_`) para indicar uso intencional.
3. THE Compilador SHALL reportar zero erros TS6133 após a refatoração completa.

### Requisito 6: Correção de Incompatibilidades de Tipo

**User Story:** Como desenvolvedor, quero que todas as atribuições e passagens de argumentos respeitem os tipos esperados, para que os 51 erros TS2345, 15 erros TS2322 e 76 erros TS2339 sejam eliminados.

#### Critérios de Aceitação

1. WHEN um argumento não for atribuível ao tipo esperado (TS2345), THE Compilador SHALL reportar erro e o código SHALL ser corrigido via conversão segura, criação de tipo adequado ou ajuste da assinatura da função.
2. WHEN um tipo não for atribuível a outro (TS2322), THE Compilador SHALL reportar erro e o código SHALL ser corrigido via definição de tipo correto ou ajuste da estrutura de dados.
3. WHEN uma propriedade não existir no tipo declarado (TS2339), THE Compilador SHALL reportar erro e o tipo SHALL ser estendido com a propriedade faltante ou o acesso SHALL ser corrigido.
4. THE Compilador SHALL reportar zero erros TS2345, TS2322 e TS2339 após a refatoração completa.

### Requisito 7: Conformidade com `exactOptionalPropertyTypes`

**User Story:** Como desenvolvedor, quero que propriedades opcionais sejam tratadas corretamente conforme a flag `exactOptionalPropertyTypes`, para que os 19 erros TS2375/TS2412 sejam eliminados.

#### Critérios de Aceitação

1. WHEN `exactOptionalPropertyTypes` estiver habilitado e uma propriedade opcional receber `undefined` explicitamente, THE Compilador SHALL reportar erro TS2375 ou TS2412 e o código SHALL distinguir entre propriedade ausente e propriedade com valor `undefined`.
2. WHEN uma interface possuir propriedade opcional (`prop?: T`), THE código SHALL omitir a propriedade em vez de atribuir `undefined`, ou THE interface SHALL ser ajustada para `prop?: T | undefined` quando `undefined` for um valor válido.
3. THE Compilador SHALL reportar zero erros TS2375 e TS2412 após a refatoração completa.

### Requisito 8: Correção de Erros de Fluxo de Controle

**User Story:** Como desenvolvedor, quero que variáveis sejam usadas somente após atribuição e que declarações de bloco sejam consistentes, para que os erros TS2454, TS2448, TS2374 e TS6142 sejam eliminados.

#### Critérios de Aceitação

1. WHEN uma variável for usada antes de ser atribuída (TS2454), THE Compilador SHALL reportar erro e o código SHALL garantir inicialização antes do uso ou reestruturar o fluxo de controle.
2. WHEN uma variável de escopo de bloco for usada antes da declaração (TS2448), THE Compilador SHALL reportar erro e o código SHALL reordenar declarações ou reestruturar o fluxo.
3. WHEN um inicializador não fornecer valor para um binding element (TS2374), THE Compilador SHALL reportar erro e o código SHALL fornecer valor padrão adequado.
4. WHEN um módulo não possuir export default e for importado como default (TS6142), THE Compilador SHALL reportar erro e o import SHALL ser corrigido para named import ou o módulo SHALL exportar default.
5. THE Compilador SHALL reportar zero erros TS2454, TS2448, TS2374 e TS6142 após a refatoração completa.

### Requisito 9: Tipagem de Dados Externos e Validação

**User Story:** Como desenvolvedor, quero que todos os dados provenientes de fontes externas (APIs, JSON, banco de dados) possuam tipos explícitos e validação, para que o código seja seguro em tempo de execução.

#### Critérios de Aceitação

1. WHEN Dados_Externos forem recebidos de uma API ou fonte externa, THE código SHALL definir um tipo explícito (interface ou type alias) para representar a estrutura esperada.
2. WHEN Dados_Externos forem usados no código, THE código SHALL validar a estrutura antes do uso, utilizando Type_Guard, schema Zod ou verificação equivalente.
3. WHEN não for possível inferir um tipo com segurança para Dados_Externos, THE código SHALL usar `unknown` como tipo e SHALL incluir comentário explicando a limitação.
4. THE código SHALL definir Tipo_Reutilizável em local compartilhado (packages/shared ou arquivo de tipos dedicado) para evitar duplicação de definições de tipo entre arquivos.

### Requisito 10: Proibição de Gambiarras de Tipagem

**User Story:** Como desenvolvedor, quero que a refatoração não introduza atalhos inseguros de tipagem, para que o nível real de segurança de tipos aumente.

#### Critérios de Aceitação

1. THE Compilador SHALL reportar zero ocorrências de `any` como tipo explícito em código novo ou refatorado, exceto quando acompanhado de comentário justificando a necessidade.
2. THE código refatorado SHALL conter zero ocorrências de `as` (type assertion) sem comentário justificando por que a asserção é segura.
3. THE código refatorado SHALL conter zero ocorrências de `@ts-ignore`.
4. THE código refatorado SHALL conter zero ocorrências de `@ts-expect-error`, exceto quando acompanhado de comentário explicando o motivo e um issue de rastreamento.
5. WHEN um tipo não puder ser inferido com segurança, THE código SHALL usar `unknown` com Type_Guard em vez de `any` ou type assertion.

### Requisito 11: Preservação de Comportamento e Refatoração Incremental

**User Story:** Como desenvolvedor, quero que a refatoração não altere o comportamento do código existente, para que funcionalidades continuem operando corretamente.

#### Critérios de Aceitação

1. THE Verificação_Incremental SHALL processar um arquivo por vez, garantindo que cada arquivo compile sem erros antes de prosseguir para o próximo.
2. WHEN um arquivo for refatorado, THE código SHALL manter o mesmo comportamento observável (mesmas entradas produzem mesmas saídas).
3. WHEN testes existentes estiverem disponíveis para um arquivo refatorado, THE testes SHALL continuar passando sem modificação na lógica de teste (apenas ajustes de tipagem são permitidos).
4. THE Compilador SHALL executar `tsc --noEmit` com sucesso (zero erros) ao final da refatoração completa de todos os 120 arquivos.

### Requisito 12: Criação de Tipos Reutilizáveis

**User Story:** Como desenvolvedor, quero que tipos comuns sejam definidos em locais compartilhados, para evitar duplicação e facilitar manutenção.

#### Critérios de Aceitação

1. WHEN dois ou mais arquivos utilizarem a mesma estrutura de tipo, THE Tipo_Reutilizável SHALL ser extraído para um arquivo de tipos compartilhado (em packages/shared ou arquivo de tipos dedicado no pacote correspondente).
2. WHEN um Tipo_Reutilizável for criado, THE tipo SHALL ser exportado e importado nos arquivos que o utilizam, em vez de redefinido localmente.
3. THE Monorepo SHALL manter consistência de nomenclatura para Tipo_Reutilizável, usando PascalCase para interfaces e type aliases.

### Requisito 13: Tratamento de Conflitos de Tipos em Dependências

**User Story:** Como desenvolvedor, quero que conflitos de tipos em dependências de terceiros sejam resolvidos adequadamente, para que o Compilador não reporte erros em node_modules.

#### Critérios de Aceitação

1. WHEN uma dependência de terceiros causar conflito de tipos (por exemplo, versões incompatíveis de `@types/*` ou ioredis), THE Monorepo SHALL resolver o conflito via alinhamento de versões, `skipLibCheck` seletivo no TSConfig_Filho afetado, ou arquivo de declaração de tipos (`.d.ts`) com override.
2. WHEN `skipLibCheck: false` estiver habilitado no TSConfig raiz e causar erros em node_modules, THE TSConfig_Filho afetado SHALL avaliar habilitar `skipLibCheck: true` localmente com comentário justificando a decisão.
3. IF um conflito de tipos em dependência não puder ser resolvido sem `skipLibCheck`, THEN THE TSConfig_Filho SHALL documentar o motivo em comentário no arquivo de configuração.

### Requisito 14: Compilação Final sem Erros

**User Story:** Como desenvolvedor, quero que o comando `tsc --noEmit` passe sem erros em todo o monorepo, para confirmar que a refatoração está completa.

#### Critérios de Aceitação

1. THE Compilador SHALL executar `tsc --noEmit` no diretório raiz do Monorepo e reportar zero erros.
2. THE Compilador SHALL executar `tsc --noEmit` em cada Aplicação (apps/api, apps/web) individualmente e reportar zero erros.
3. THE Compilador SHALL executar `tsc --noEmit` em cada Pacote que possua TSConfig_Filho e reportar zero erros.
4. WHILE o Modo_Strict estiver habilitado com todas as flags configuradas no TSConfig raiz, THE Compilador SHALL manter zero erros em compilações subsequentes.
