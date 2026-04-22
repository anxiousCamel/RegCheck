# Requirements Document

## Introduction

Este documento define os requisitos para otimização do tempo de carregamento das páginas do sistema RegCheck. O sistema atualmente apresenta lentidão no carregamento de todas as páginas, impactando negativamente a experiência do usuário. A otimização abrangerá tanto o frontend (Next.js) quanto o backend (Express/API), focando em melhorias de performance em queries de banco de dados, cache, bundle size, e estratégias de carregamento.

## Glossary

- **Frontend**: A aplicação web Next.js localizada em apps/web
- **Backend**: A API Express localizada em apps/api
- **Page_Load_Time**: O tempo total desde a requisição inicial até a página estar completamente interativa
- **API_Response_Time**: O tempo que o Backend leva para processar e retornar uma resposta
- **Bundle_Size**: O tamanho total dos arquivos JavaScript enviados ao navegador
- **Cache_Layer**: Sistema de cache usando Redis para armazenar dados frequentemente acessados
- **Database_Query**: Operação de leitura ou escrita no banco de dados PostgreSQL via Prisma
- **Critical_Path**: Recursos essenciais que bloqueiam a renderização inicial da página
- **Lazy_Loading**: Técnica de carregar recursos apenas quando necessários
- **Code_Splitting**: Divisão do código em chunks menores carregados sob demanda

## Requirements

### Requirement 1: Otimização de Tempo de Resposta da API

**User Story:** Como usuário, eu quero que as páginas carreguem rapidamente, para que eu possa trabalhar de forma eficiente sem esperas desnecessárias.

#### Acceptance Criteria

1. WHEN uma requisição GET é recebida para listagens (lojas, setores, tipos, equipamentos, documentos, templates), THE Backend SHALL retornar a resposta em menos de 200ms
2. WHEN uma requisição GET é recebida para detalhes de um recurso específico, THE Backend SHALL retornar a resposta em menos de 150ms
3. WHEN dados frequentemente acessados são requisitados, THE Cache_Layer SHALL servir a resposta sem consultar o banco de dados
4. WHEN dados em cache são invalidados por uma operação de escrita, THE Cache_Layer SHALL atualizar ou remover as entradas correspondentes
5. FOR ALL Database_Query operations, o número de queries N+1 SHALL ser zero (todas as relações necessárias devem usar eager loading)

### Requirement 2: Otimização de Bundle JavaScript

**User Story:** Como usuário, eu quero que o JavaScript da página carregue rapidamente, para que a interface fique interativa sem demora.

#### Acceptance Criteria

1. THE Frontend SHALL implementar Code_Splitting para todas as rotas principais
2. WHEN uma página é carregada, THE Frontend SHALL enviar apenas o JavaScript necessário para aquela página específica
3. THE Frontend SHALL ter um bundle inicial (First Load JS) menor que 150KB (gzipped)
4. WHEN bibliotecas pesadas são necessárias (ex: PDF.js, editor), THE Frontend SHALL carregá-las usando Lazy_Loading
5. THE Frontend SHALL usar dynamic imports para componentes não-críticos (modais, dialogs, formulários complexos)

### Requirement 3: Otimização de Carregamento de Dados no Frontend

**User Story:** Como usuário, eu quero ver conteúdo útil imediatamente, para que eu possa começar a interagir com a página enquanto outros dados carregam.

#### Acceptance Criteria

1. WHEN uma página com listagem é acessada, THE Frontend SHALL mostrar um skeleton/loading state em menos de 100ms
2. THE Frontend SHALL implementar prefetching para rotas frequentemente acessadas
3. WHEN o usuário navega entre páginas, THE Frontend SHALL reutilizar dados em cache do React Query quando disponíveis
4. THE Frontend SHALL configurar staleTime apropriado no React Query para evitar refetches desnecessários (mínimo 30 segundos para dados relativamente estáticos)
5. WHEN múltiplas queries são necessárias em uma página, THE Frontend SHALL executá-las em paralelo usando Promise.all ou React Query parallel queries

### Requirement 4: Otimização de Imagens e Assets

**User Story:** Como usuário, eu quero que imagens e recursos visuais carreguem eficientemente, para que não atrasem o carregamento da página.

#### Acceptance Criteria

1. THE Frontend SHALL usar o componente Image do Next.js para todas as imagens
2. WHEN imagens são exibidas, THE Frontend SHALL aplicar lazy loading para imagens fora da viewport inicial
3. THE Frontend SHALL servir imagens em formatos modernos (WebP) com fallback
4. WHEN assets estáticos são servidos, THE Frontend SHALL configurar cache headers apropriados (mínimo 1 ano para assets com hash)
5. THE Frontend SHALL implementar blur placeholder para imagens durante o carregamento

### Requirement 5: Otimização de Queries de Banco de Dados

**User Story:** Como desenvolvedor, eu quero que as queries de banco sejam eficientes, para que o Backend responda rapidamente.

#### Acceptance Criteria

1. THE Backend SHALL usar índices apropriados para todas as colunas frequentemente consultadas em WHERE, JOIN e ORDER BY
2. WHEN listagens são requisitadas, THE Backend SHALL implementar paginação com limite máximo de 100 itens por página
3. THE Backend SHALL usar select específico do Prisma para retornar apenas os campos necessários em cada endpoint
4. WHEN relações são necessárias, THE Backend SHALL usar include/select do Prisma para eager loading em vez de queries separadas
5. FOR ALL queries de listagem, o tempo de execução no banco de dados SHALL ser menor que 50ms

### Requirement 6: Implementação de Cache Estratégico

**User Story:** Como desenvolvedor, eu quero um sistema de cache eficiente, para que dados frequentemente acessados não sobrecarreguem o banco de dados.

#### Acceptance Criteria

1. THE Backend SHALL implementar cache no Redis para listagens de lojas, setores e tipos de equipamento
2. WHEN dados são lidos do cache, THE Backend SHALL definir um TTL (Time To Live) de 5 minutos para dados relativamente estáticos
3. WHEN uma operação de CREATE, UPDATE ou DELETE é executada, THE Backend SHALL invalidar as entradas de cache relacionadas
4. THE Backend SHALL implementar cache warming para dados críticos durante a inicialização
5. WHEN o Redis está indisponível, THE Backend SHALL continuar funcionando consultando diretamente o banco de dados

### Requirement 7: Otimização de Renderização Server-Side

**User Story:** Como usuário, eu quero ver conteúdo significativo rapidamente, para que eu saiba que a página está carregando corretamente.

#### Acceptance Criteria

1. WHERE páginas públicas ou de listagem são acessadas, THE Frontend SHALL usar Server-Side Rendering (SSR) ou Static Generation quando apropriado
2. THE Frontend SHALL implementar Streaming SSR para páginas complexas usando React Suspense
3. WHEN uma página usa SSR, THE Frontend SHALL retornar o HTML inicial em menos de 300ms
4. THE Frontend SHALL minimizar o uso de useEffect para carregamento de dados críticos, preferindo server components ou getServerSideProps
5. THE Frontend SHALL implementar Partial Prerendering para combinar partes estáticas e dinâmicas

### Requirement 8: Monitoramento de Performance

**User Story:** Como desenvolvedor, eu quero monitorar a performance do sistema, para que eu possa identificar e corrigir problemas de lentidão proativamente.

#### Acceptance Criteria

1. THE Backend SHALL logar o tempo de resposta de cada requisição usando o middleware request-logger
2. THE Backend SHALL logar queries lentas (acima de 100ms) com detalhes da query e parâmetros
3. THE Frontend SHALL implementar Web Vitals tracking (LCP, FID, CLS, TTFB)
4. THE Frontend SHALL reportar métricas de performance para análise (console.log em desenvolvimento, serviço de analytics em produção)
5. WHEN uma página carrega, THE Frontend SHALL medir e reportar o tempo total de carregamento e tempo até interatividade

### Requirement 9: Otimização de Dependências e Tree Shaking

**User Story:** Como desenvolvedor, eu quero que apenas o código necessário seja incluído no bundle, para que o tamanho final seja mínimo.

#### Acceptance Criteria

1. THE Frontend SHALL configurar tree shaking apropriado no Next.js config
2. THE Frontend SHALL usar imports nomeados em vez de imports default quando possível para melhor tree shaking
3. WHEN bibliotecas grandes são usadas, THE Frontend SHALL importar apenas os módulos necessários (ex: import { specific } from 'library' em vez de import library from 'library')
4. THE Frontend SHALL analisar o bundle usando @next/bundle-analyzer para identificar dependências pesadas
5. THE Frontend SHALL substituir bibliotecas pesadas por alternativas mais leves quando possível (ex: date-fns em vez de moment.js)

### Requirement 10: Otimização de CSS e Estilos

**User Story:** Como usuário, eu quero que os estilos da página carreguem rapidamente, para que eu veja a interface formatada corretamente desde o início.

#### Acceptance Criteria

1. THE Frontend SHALL usar Tailwind CSS com purge configurado para remover classes não utilizadas
2. THE Frontend SHALL inline critical CSS no HTML inicial
3. THE Frontend SHALL carregar CSS não-crítico de forma assíncrona
4. WHEN componentes de UI são usados, THE Frontend SHALL importar apenas os estilos necessários
5. THE Frontend SHALL minimizar o uso de CSS-in-JS runtime em favor de soluções build-time

