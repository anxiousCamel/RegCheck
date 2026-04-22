# Implementation Plan: Document Deletion

## Overview

Implementação incremental da feature de exclusão de documentos, seguindo o padrão já estabelecido no projeto (Express + Zod + Prisma no backend, React Query + ApiClient no frontend). As tarefas cobrem backend, frontend e testes de propriedade com `fast-check`.

## Tasks

- [x] 1. Implementar `DocumentService.delete` no backend
  - Adicionar método estático `delete(id: string): Promise<void>` à classe `DocumentService` em `apps/api/src/services/document-service.ts`
  - Verificar existência do documento; lançar `AppError(404, 'Document not found', 'NOT_FOUND')` se ausente
  - Remover `FilledField`s e o `Document` em `prisma.$transaction` (deleteMany filledFields → delete document)
  - _Requirements: 1.4, 1.5_

- [x] 2. Adicionar rota `DELETE /:id` ao `documentRouter`
  - [x] 2.1 Implementar handler `DELETE /:id` em `apps/api/src/routes/documents.ts`
    - Validar `req.params` com `idParamSchema` (UUID); Zod retorna 400 `VALIDATION_ERROR` automaticamente
    - Chamar `DocumentService.delete(id)` e retornar `res.status(204).end()`
    - Adicionar comentário JSDoc descrevendo método, path, parâmetros, respostas de sucesso e de erro
    - _Requirements: 1.1, 1.2, 1.3, 4.1_

  - [x] 2.2 Escrever testes de exemplo para o endpoint DELETE
    - `DELETE /api/documents/:id` com id válido existente → 204 sem corpo
    - `DELETE /api/documents/:id` com id inexistente → 404 `NOT_FOUND`
    - `DELETE /api/documents/:id` com id não-UUID → 400 `VALIDATION_ERROR`
    - Falha de banco simulada → 500 `INTERNAL_ERROR`
    - _Requirements: 1.1, 1.2, 1.3, 1.5_

  - [x] 2.3 Escrever property test para `DocumentService.delete` (Property 1)
    - **Property 1: Exclusão remove documento e todos os FilledFields**
    - Para qualquer documento com N `FilledField`s gerados aleatoriamente, após `DocumentService.delete(id)`, nem o documento nem nenhum campo devem existir no banco
    - Tag: `// Feature: document-deletion, Property 1: Exclusão remove documento e todos os FilledFields`
    - _Requirements: 1.4_

  - [x] 2.4 Escrever property test para validação de UUID (Property 2)
    - **Property 2: Inputs inválidos são rejeitados com VALIDATION_ERROR**
    - Para qualquer string que não seja UUID v4 válido, o endpoint deve retornar HTTP 400 com `code: 'VALIDATION_ERROR'`
    - Tag: `// Feature: document-deletion, Property 2: Inputs inválidos são rejeitados com VALIDATION_ERROR`
    - _Requirements: 1.3_

- [x] 3. Checkpoint — Garantir que todos os testes do backend passam
  - Garantir que todos os testes passam; perguntar ao usuário se houver dúvidas.

- [-] 4. Adicionar `deleteDocument` ao `ApiClient`
  - [-] 4.1 Implementar método `deleteDocument(id: string): Promise<void>` em `apps/web/src/lib/api.ts`
    - Chamar `this.request<void>(\`/api/documents/${id}\`, { method: 'DELETE' })`
    - O método `request` existente já trata erros HTTP lançando `Error` com a mensagem da API
    - _Requirements: 2.1, 2.2, 2.3_

  - [ ] 4.2 Escrever testes de exemplo para `ApiClient.deleteDocument`
    - `deleteDocument(id)` faz requisição `DELETE` para a URL correta
    - Servidor retorna 204 → Promise resolve como `void`
    - _Requirements: 2.1, 2.2_

  - [ ] 4.3 Escrever property test para propagação de erros HTTP (Property 3)
    - **Property 3: Erros HTTP do servidor são propagados como Error**
    - Para qualquer resposta HTTP de erro (4xx ou 5xx), `ApiClient.deleteDocument` deve rejeitar com `Error` cuja mensagem corresponde ao campo `error.message` do corpo
    - Tag: `// Feature: document-deletion, Property 3: Erros HTTP do servidor são propagados como Error`
    - _Requirements: 2.3_

- [ ] 5. Criar componente `ConfirmationDialog`
  - Criar `apps/web/src/components/document/confirmation-dialog.tsx` com props: `open`, `documentName`, `isPending`, `onConfirm`, `onCancel`
  - Renderizar modal com nome do documento, mensagem de irreversibilidade, botão "Confirmar" (desabilitado + spinner quando `isPending`) e botão "Cancelar"
  - _Requirements: 3.2, 3.6_

- [ ] 6. Integrar exclusão na `DocumentsPage`
  - [ ] 6.1 Adicionar botão "Excluir" e lógica de estado em `apps/web/src/app/documents/page.tsx`
    - Adicionar estado `deletingDoc: { id: string; name: string } | null`
    - Adicionar botão "Excluir" em cada linha do documento que define `deletingDoc`
    - Adicionar botão "Enviar para GLPI" em cada linha (apenas visual, sem lógica)
    - _Requirements: 3.1_

  - [ ] 6.2 Conectar `ConfirmationDialog` e `useMutation` na `DocumentsPage`
    - Renderizar `<ConfirmationDialog>` controlado por `deletingDoc`
    - Usar `useMutation` para chamar `api.deleteDocument(id)`
    - Em `onSuccess`: `queryClient.invalidateQueries({ queryKey: ['documents'] })` e fechar dialog
    - Em `onError`: exibir mensagem de erro sem fechar o dialog
    - _Requirements: 3.3, 3.4, 3.5, 3.6, 3.7_

  - [ ] 6.3 Escrever testes de exemplo para a `DocumentsPage`
    - Confirmar no dialog chama `api.deleteDocument(id)` com o id correto
    - Sucesso → `invalidateQueries(['documents'])` chamado, dialog fechado
    - Cancelar → `api.deleteDocument` não chamado
    - Loading → botão confirmar desabilitado, spinner visível
    - Erro → mensagem exibida, dialog permanece aberto
    - _Requirements: 3.3, 3.4, 3.5, 3.6, 3.7_

  - [ ] 6.4 Escrever property test para botões de exclusão (Property 4)
    - **Property 4: Botão "Excluir" presente para cada documento listado**
    - Para qualquer lista de N documentos renderizada, exatamente N botões "Excluir" devem estar presentes no DOM
    - Tag: `// Feature: document-deletion, Property 4: Botão "Excluir" presente para cada documento listado`
    - _Requirements: 3.1_

  - [ ] 6.5 Escrever property test para nome no dialog (Property 5)
    - **Property 5: Dialog exibe o nome do documento correto**
    - Para qualquer documento na lista, ao clicar em "Excluir", o `ConfirmationDialog` deve exibir o nome exato daquele documento
    - Tag: `// Feature: document-deletion, Property 5: Dialog exibe o nome do documento correto`
    - _Requirements: 3.2_

- [ ] 7. Checkpoint final — Garantir que todos os testes passam
  - Garantir que todos os testes passam; perguntar ao usuário se houver dúvidas.

## Notes

- Tarefas marcadas com `*` são opcionais e podem ser puladas para um MVP mais rápido
- Testes de propriedade usam `fast-check` com mínimo de 100 iterações por propriedade
- Cada tarefa referencia os requisitos específicos para rastreabilidade
- A deleção em cascata é feita via transação explícita no serviço (não via `onDelete: Cascade` no schema), mantendo consistência com o padrão de `populate()`
