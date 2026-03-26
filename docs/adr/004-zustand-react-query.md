# 004 — Zustand para Estado do Editor e React Query para Dados do Servidor

**Status:** Aceito

## Contexto

O frontend do RegCheck (`apps/web`) lida com dois tipos distintos de estado:

**Estado local do editor visual** — ao abrir um template no editor (`/editor/[templateId]`), o usuário interage com campos Konva sobre o PDF renderizado. Esse estado inclui:
- Lista de campos posicionados (`fields: EditorField[]`)
- Campos selecionados para edição (`selectedFieldIds: string[]`)
- Histórico de undo/redo gerenciado pelo `HistoryManager` do `@regcheck/editor-engine` (até 50 snapshots)
- Página atual (`currentPage`) e total de páginas (`totalPages`)
- Zoom, snap, tamanho do grid, ferramenta ativa
- Clipboard para copy/paste de campos
- Preview de replicação inteligente (`replicationPreview`)
- Flag de alterações não salvas (`isDirty`)

Esse estado é efêmero, específico da sessão de edição e não precisa ser sincronizado com o servidor em tempo real — apenas persistido via autosave com debounce de 1 segundo.

**Dados do servidor** — templates, documentos, lojas, setores, tipos de equipamento e equipamentos são buscados da API Express (`apps/api`) e precisam de cache, invalidação e sincronização. Por exemplo, após deletar um template, a lista precisa ser atualizada; após publicar, o status precisa refletir `PUBLISHED`.

Antes de definir essa arquitetura, o projeto avaliou as opções disponíveis para cada caso de uso.

## Decisão

Decidimos usar **Zustand** para o estado local do editor e **React Query (TanStack Query v5)** para todas as chamadas à API.

### Zustand — `editor-store.ts`

O store do editor é definido em `apps/web/src/stores/editor-store.ts` com `create<EditorState>()` do Zustand:

```ts
// Acesso ao store em qualquer componente — sem Provider, sem boilerplate
const { fields, selectedFieldIds, addField, undo } = useEditorStore();

// Acesso direto ao estado fora de componentes React (ex: dentro de mutationFn)
const currentFields = useEditorStore.getState().fields;
```

O store expõe ações granulares como `addField`, `updateField`, `removeFields`, `selectField`, `toggleFieldSelection`, `copyFields`, `pasteFields`, `undo`, `redo`, `saveSnapshot`, `setReplicationPreview` e `applyReplication`.

### React Query — chamadas à API

O `QueryClientProvider` é configurado em `apps/web/src/app/providers.tsx` com `staleTime: 30_000` e `retry: 1`. Todas as páginas usam `useQuery` para leitura e `useMutation` para escrita:

```ts
// Leitura com cache automático
const { data, isLoading } = useQuery({
  queryKey: ['templates'],
  queryFn: () => api.listTemplates(),
});

// Escrita com invalidação de cache
const deleteMutation = useMutation({
  mutationFn: (id: string) => api.deleteTemplate(id),
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ['templates'] }),
});
```

No editor, o template é carregado via `useQuery` e as posições dos campos são salvas via `useMutation` (acionado pelo hook `useAutosave`):

```ts
// Carrega dados do servidor
const { data: template } = useQuery({
  queryKey: ['template', templateId],
  queryFn: () => api.getTemplate(templateId),
});

// Salva posições no servidor (acionado pelo useAutosave com debounce 1s)
const saveMutation = useMutation({
  mutationFn: async () => {
    const currentFields = useEditorStore.getState().fields;
    await api.batchUpdatePositions(templateId, updates);
  },
  onSuccess: () => markClean(),
});
```

## Alternativas Consideradas

- **Redux Toolkit** — solução completa com slices, thunks e RTK Query integrado. Descartado porque o boilerplate de actions, reducers e selectors é excessivo para o caso de uso do editor. O Zustand oferece a mesma reatividade com uma fração do código — o `editor-store.ts` inteiro cabe em um único arquivo sem arquitetura de pastas.

- **Context API + useReducer** — solução nativa do React sem dependências externas. Descartado porque Context re-renderiza todos os consumidores ao mudar qualquer parte do estado, o que seria problemático no editor com dezenas de campos sendo atualizados durante drag/drop. O Zustand usa seletores granulares e só re-renderiza os componentes que consomem o estado alterado.

- **SWR** — biblioteca de data fetching da Vercel, alternativa ao React Query. Descartado porque o React Query (TanStack Query) oferece suporte mais completo a mutations com `onSuccess`/`onError`/`onSettled`, invalidação de cache por `queryKey`, e o ecossistema TanStack é mais ativo. O projeto já usa outras libs do TanStack (`@tanstack/react-table` em componentes de listagem).

- **Estado local com useState** — gerenciar o estado do editor com `useState` em cada componente ou em um componente pai. Descartado porque o estado do editor é compartilhado entre componentes não relacionados na árvore (`EditorCanvas`, `FieldProperties`, `EditorToolbar`, `PageNavigator`, `RepetitionConfig`) — prop drilling seria inviável e Context teria os problemas de performance descritos acima.

## Consequências

- **Dois paradigmas de estado no frontend** — desenvolvedores precisam entender quando usar `useEditorStore` (estado local, efêmero, sem servidor) vs `useQuery`/`useMutation` (dados do servidor, com cache). A regra está documentada em [`docs/conventions.md`](../conventions.md).

- **Zustand é simples e sem boilerplate** — o store completo do editor (`editor-store.ts`) define estado, ações e lógica derivada em ~250 linhas sem arquivos auxiliares. Não há actions creators, reducers separados nem configuração de middleware obrigatória.

- **React Query elimina loading/error states manuais** — antes de React Query, cada página precisaria de `useState` para `isLoading`, `error` e `data`, além de `useEffect` para disparar o fetch. Com `useQuery`, esses estados são gerenciados automaticamente com cache e revalidação.

- **Cache com `staleTime: 30s`** — dados buscados ficam em cache por 30 segundos. Navegação entre páginas não dispara refetch desnecessário, mas dados ficam atualizados após meio minuto.

- **Invalidação explícita após mutations** — após criar, atualizar ou deletar um recurso, o código chama `queryClient.invalidateQueries({ queryKey: [...] })` para forçar refetch da lista afetada. Isso garante consistência sem polling.

- **Acesso ao store fora de componentes** — `useEditorStore.getState()` permite ler o estado atual do editor dentro de callbacks assíncronos (como `mutationFn`) sem criar closures sobre valores desatualizados.
