# Requirements Document

## Introduction

Esta feature adiciona a capacidade de excluir documentos na aplicação RegCheck. Um documento pode ser excluído permanentemente (hard delete) via rota RESTful `DELETE /api/documents/:id`. O backend remove o registro e seus dados relacionados do banco de dados. O frontend exibe um diálogo de confirmação antes de executar a exclusão e atualiza a lista de documentos sem recarregar a página.

## Glossary

- **Document**: Registro persistido no banco de dados criado a partir de um template, podendo conter campos preenchidos e PDF gerado.
- **DocumentService**: Camada de serviço responsável pela lógica de negócio relacionada a documentos.
- **DocumentRouter**: Camada de roteamento Express que expõe os endpoints HTTP para documentos.
- **ApiClient**: Classe no frontend responsável por realizar chamadas HTTP à API.
- **DocumentsPage**: Página Next.js que lista os documentos e gerencia interações do usuário.
- **ConfirmationDialog**: Componente de UI que solicita confirmação explícita do usuário antes de executar ações destrutivas.
- **FilledField**: Registro relacionado a um documento que armazena os dados preenchidos pelo usuário.
- **AppError**: Classe de erro da aplicação que carrega código HTTP e código de erro semântico.

---

## Requirements

### Requirement 1: Exclusão de documento no backend

**User Story:** Como desenvolvedor, quero um endpoint `DELETE /api/documents/:id` que remova permanentemente um documento do banco de dados, para que documentos desnecessários possam ser eliminados de forma segura e previsível.

Como desenvolvedor, quero um botão "Enviar para GLPI" em cada documento, que dispare uma integração com a API do GLPI, para que o documento possa ser registrado ou anexado em um chamado. (por enquanto só visual sem logica)

#### Acceptance Criteria

1. WHEN uma requisição `DELETE /api/documents/:id` é recebida com um `id` válido existente, THE DocumentRouter SHALL encaminhar a requisição ao DocumentService e retornar HTTP 204 sem corpo de resposta.
2. WHEN uma requisição `DELETE /api/documents/:id` é recebida com um `id` que não corresponde a nenhum documento, THE DocumentService SHALL lançar um AppError com statusCode 404 e code `NOT_FOUND`.
3. WHEN uma requisição `DELETE /api/documents/:id` é recebida com um `id` em formato inválido (não-UUID), THE DocumentRouter SHALL retornar HTTP 400 com code `VALIDATION_ERROR` via middleware de validação Zod.
4. WHEN a exclusão de um documento é executada, THE DocumentService SHALL remover o documento e todos os seus FilledFields associados em uma única transação de banco de dados.
5. IF uma falha de banco de dados ocorrer durante a exclusão, THEN THE DocumentService SHALL propagar o erro para o middleware de tratamento de erros, que retornará HTTP 500 com code `INTERNAL_ERROR`.

---

### Requirement 2: Método de exclusão no ApiClient

**User Story:** Como desenvolvedor frontend, quero um método `deleteDocument(id)` no ApiClient, para que a página de documentos possa chamar a API de exclusão de forma consistente com os demais métodos existentes.

#### Acceptance Criteria

1. THE ApiClient SHALL expor um método `deleteDocument(id: string)` que realiza uma requisição `DELETE` para `/api/documents/:id`.
2. WHEN o servidor retorna HTTP 204, THE ApiClient SHALL resolver a Promise sem valor de retorno (`void`).
3. WHEN o servidor retorna um erro HTTP, THE ApiClient SHALL rejeitar a Promise com uma instância de `Error` contendo a mensagem retornada pela API.

---

### Requirement 3: Confirmação e exclusão na interface do usuário

**User Story:** Como usuário, quero confirmar a exclusão de um documento antes que ela seja executada, para que eu não perca dados por acidente.

#### Acceptance Criteria

1. THE DocumentsPage SHALL exibir um botão "Excluir" para cada documento listado.
2. WHEN o usuário clica no botão "Excluir", THE ConfirmationDialog SHALL ser exibido com o nome do documento e uma mensagem informando que a ação é irreversível.
3. WHEN o usuário confirma a exclusão no ConfirmationDialog, THE DocumentsPage SHALL chamar `api.deleteDocument(id)` e aguardar a resposta.
4. WHEN a exclusão é concluída com sucesso, THE DocumentsPage SHALL remover o documento da lista sem recarregar a página completa, invalidando a query `['documents']` via React Query.
5. WHEN o usuário cancela no ConfirmationDialog, THE ConfirmationDialog SHALL ser fechado sem realizar nenhuma chamada à API.
6. WHILE a requisição de exclusão está em andamento, THE DocumentsPage SHALL desabilitar o botão de confirmação e exibir um indicador de carregamento para prevenir submissões duplicadas.
7. IF a requisição de exclusão retornar um erro, THEN THE DocumentsPage SHALL exibir uma mensagem de erro ao usuário sem fechar o ConfirmationDialog.

---

### Requirement 4: Documentação da rota

**User Story:** Como desenvolvedor, quero que a rota `DELETE /api/documents/:id` esteja documentada em comentário JSDoc no arquivo de rotas, para que outros desenvolvedores entendam o contrato da API sem precisar ler o código de serviço.

#### Acceptance Criteria

1. THE DocumentRouter SHALL conter um comentário JSDoc acima do handler `DELETE /:id` descrevendo: método HTTP, path, parâmetros de entrada, respostas de sucesso e respostas de erro possíveis.
