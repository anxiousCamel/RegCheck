# Códigos de Erro

Este documento lista todos os códigos de erro utilizados na API do RegCheck.

**Fonte:** error-code-parser
**Gerado em:** 23/04/2026, 12:20:29
**Total de erros:** 20

## Formato de Resposta de Erro

Todas as respostas de erro seguem o formato padrão:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Descrição do erro"
  }
}
```

## Referência de Códigos de Erro

Tabela completa com todos os códigos de erro:

| Código                 | Status HTTP | Mensagem                                                                                  | Contexto                       |
| ---------------------- | ----------- | ----------------------------------------------------------------------------------------- | ------------------------------ |
| ALREADY_GENERATING     | 409         | PDF generation already in progress                                                        | -                              |
| FILE_TOO_LARGE         | 400         | Unknown error                                                                             | File size exceeds limit        |
| IN_USE                 | 409         | Loja possui equipamentos vinculados                                                       | Resource not found in database |
| INTERNAL_ERROR         | 500         | An unexpected error occurred                                                              | Unhandled error                |
| INVALID_FILE_TYPE      | 400         | Only PDF files are allowed                                                                | File size exceeds limit        |
| INVALID_LOJA           | 400         | Loja não encontrada ou inativa                                                            | Resource not found in database |
| INVALID_SETOR          | 400         | Setor não encontrado ou inativo                                                           | Resource not found in database |
| INVALID_TIPO           | 400         | Tipo não encontrado ou inativo                                                            | Resource not found in database |
| MISSING_KEY            | 400         | key is required                                                                           | -                              |
| NO_EQUIPMENT           | 400         | Nenhum equipamento encontrado para os filtros selecionados                                | -                              |
| NO_FILE                | 400         | No file uploaded                                                                          | -                              |
| NOT_FOUND              | 404         | Template not found                                                                        | Resource not found in database |
| PDF_NOT_FOUND          | 400         | PDF file not found. Upload first.                                                         | Resource not found in database |
| PDF_NOT_GENERATED      | 400         | PDF has not been generated yet                                                            | -                              |
| TEMPLATE_INVALID       | 400         | Unknown error                                                                             | -                              |
| TEMPLATE_NO_SLOTS      | 400         | Template não define slots SX (nenhum campo de item). Configure os slots antes de popular. | -                              |
| TEMPLATE_NOT_PUBLISHED | 400         | Template must be published before filling                                                 | Resource not found in database |
| TEMPLATE_PUBLISHED     | 400         | Cannot modify a published template. Create a new version.                                 | Resource not found in database |
| TOO_MANY_PAGES         | 400         | Unknown error                                                                             | PDF has too many pages         |
| VALIDATION_ERROR       | 400         | Request validation failed                                                                 | Zod schema validation failure  |

## Erros por Status HTTP

### 400 - Bad Request

Total: **16** erro(s)

- **FILE_TOO_LARGE**: Unknown error
  - _Contexto:_ File size exceeds limit
- **INVALID_FILE_TYPE**: Only PDF files are allowed
  - _Contexto:_ File size exceeds limit
- **INVALID_LOJA**: Loja não encontrada ou inativa
  - _Contexto:_ Resource not found in database
- **INVALID_SETOR**: Setor não encontrado ou inativo
  - _Contexto:_ Resource not found in database
- **INVALID_TIPO**: Tipo não encontrado ou inativo
  - _Contexto:_ Resource not found in database
- **MISSING_KEY**: key is required
- **NO_EQUIPMENT**: Nenhum equipamento encontrado para os filtros selecionados
- **NO_FILE**: No file uploaded
- **PDF_NOT_FOUND**: PDF file not found. Upload first.
  - _Contexto:_ Resource not found in database
- **PDF_NOT_GENERATED**: PDF has not been generated yet
- **TEMPLATE_INVALID**: Unknown error
- **TEMPLATE_NO_SLOTS**: Template não define slots SX (nenhum campo de item). Configure os slots antes de popular.
- **TEMPLATE_NOT_PUBLISHED**: Template must be published before filling
  - _Contexto:_ Resource not found in database
- **TEMPLATE_PUBLISHED**: Cannot modify a published template. Create a new version.
  - _Contexto:_ Resource not found in database
- **TOO_MANY_PAGES**: Unknown error
  - _Contexto:_ PDF has too many pages
- **VALIDATION_ERROR**: Request validation failed
  - _Contexto:_ Zod schema validation failure

### 404 - Not Found

Total: **1** erro(s)

- **NOT_FOUND**: Template not found
  - _Contexto:_ Resource not found in database

### 409 - Conflict

Total: **2** erro(s)

- **ALREADY_GENERATING**: PDF generation already in progress
- **IN_USE**: Loja possui equipamentos vinculados
  - _Contexto:_ Resource not found in database

### 500 - Internal Server Error

Total: **1** erro(s)

- **INTERNAL_ERROR**: An unexpected error occurred
  - _Contexto:_ Unhandled error

## Exemplos de Respostas de Erro

### Exemplo: NOT_FOUND

**Contexto:** Resource not found in database

**Requisição:**

```http
GET /api/templates/invalid-id HTTP/1.1
```

**Resposta:**

```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Template not found"
  }
}
```

### Exemplo: VALIDATION_ERROR

**Contexto:** Zod schema validation failure

**Requisição:**

```http
POST /api/templates HTTP/1.1

{ "title": "" }
```

**Resposta:**

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed"
  }
}
```

### Exemplo: TEMPLATE_NOT_PUBLISHED

**Contexto:** Resource not found in database

**Requisição:**

```http
POST /api/documents HTTP/1.1

{ "templateId": "draft-template-id" }
```

**Resposta:**

```json
{
  "success": false,
  "error": {
    "code": "TEMPLATE_NOT_PUBLISHED",
    "message": "Template must be published before filling"
  }
}
```

### Exemplo: IN_USE

**Contexto:** Resource not found in database

**Requisição:**

```http
DELETE /api/lojas/loja-with-equipments HTTP/1.1
```

**Resposta:**

```json
{
  "success": false,
  "error": {
    "code": "IN_USE",
    "message": "Loja possui equipamentos vinculados"
  }
}
```

### Exemplo: FILE_TOO_LARGE

**Contexto:** File size exceeds limit

**Requisição:**

```http
POST /api/uploads/pdf HTTP/1.1

[arquivo muito grande]
```

**Resposta:**

```json
{
  "success": false,
  "error": {
    "code": "FILE_TOO_LARGE",
    "message": "Unknown error"
  }
}
```

### Exemplo: ALREADY_GENERATING

**Requisição:**

```http
POST /api/documents/doc-id/generate HTTP/1.1
```

**Resposta:**

```json
{
  "success": false,
  "error": {
    "code": "ALREADY_GENERATING",
    "message": "PDF generation already in progress"
  }
}
```

## Referências

- Error handler: `apps/api/src/middleware/error-handler.ts`
- Service files: `apps/api/src/services/`
- Route files: `apps/api/src/routes/`
