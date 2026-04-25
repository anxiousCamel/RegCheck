# Referência da API

Este documento descreve todos os endpoints da API REST do RegCheck.

**Fonte:** route-parser
**Gerado em:** 25/04/2026, 12:16:41

## URL Base

```text
http://localhost:4000/api
```

## Formato de Resposta

Todas as respostas seguem o formato padrão `ApiResponse`:

```json
{
  "success": true,
  "data": "{ ... }"
}
```

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Descrição do erro"
  }
}
```

## Autenticação

**Status:** não identificado

## Endpoints

### :id

Endpoints relacionados a **:id**.

#### DELETE /:id

— Exclui permanentemente um documento e todos os seus FilledFields.

**Parâmetros:**

| Nome | Localização | Tipo | Obrigatório | Descrição |
|---|---|---|---|---|
| id | Path | string | Sim | id parameter |

**Respostas:**

| Status | Descrição |
|---|---|
| 204 | No Content - Request successful, no content returned |
| 404 | Not Found - Resource not found |

**Exemplo:**

Requisição:

```http
DELETE /api/123e4567-e89b-12d3-a456-426614174000 HTTP/1.1
Host: localhost:4000
Content-Type: application/json
```

Resposta:

```json
{
  "success": true,
  "data": {
    "message": "Removido com sucesso"
  }
}
```

---

#### DELETE /:id

**Parâmetros:**

| Nome | Localização | Tipo | Obrigatório | Descrição |
|---|---|---|---|---|
| id | Path | string | Sim | id parameter |

**Respostas:**

| Status | Descrição |
|---|---|
| 200 | OK - Request successful |
| 404 | Not Found - Resource not found |

**Exemplo:**

Requisição:

```http
DELETE /api/123e4567-e89b-12d3-a456-426614174000 HTTP/1.1
Host: localhost:4000
Content-Type: application/json
```

Resposta:

```json
{
  "success": true,
  "data": {
    "message": "Removido com sucesso"
  }
}
```

---

#### DELETE /:id

**Parâmetros:**

| Nome | Localização | Tipo | Obrigatório | Descrição |
|---|---|---|---|---|
| id | Path | string | Sim | id parameter |

**Respostas:**

| Status | Descrição |
|---|---|
| 200 | OK - Request successful |
| 404 | Not Found - Resource not found |

**Exemplo:**

Requisição:

```http
DELETE /api/123e4567-e89b-12d3-a456-426614174000 HTTP/1.1
Host: localhost:4000
Content-Type: application/json
```

Resposta:

```json
{
  "success": true,
  "data": {
    "message": "Removido com sucesso"
  }
}
```

---

#### DELETE /:id

**Parâmetros:**

| Nome | Localização | Tipo | Obrigatório | Descrição |
|---|---|---|---|---|
| id | Path | string | Sim | id parameter |

**Respostas:**

| Status | Descrição |
|---|---|
| 200 | OK - Request successful |
| 404 | Not Found - Resource not found |

**Exemplo:**

Requisição:

```http
DELETE /api/123e4567-e89b-12d3-a456-426614174000 HTTP/1.1
Host: localhost:4000
Content-Type: application/json
```

Resposta:

```json
{
  "success": true,
  "data": {
    "message": "Removido com sucesso"
  }
}
```

---

#### DELETE /:id

**Parâmetros:**

| Nome | Localização | Tipo | Obrigatório | Descrição |
|---|---|---|---|---|
| id | Path | string | Sim | id parameter |

**Respostas:**

| Status | Descrição |
|---|---|
| 200 | OK - Request successful |
| 404 | Not Found - Resource not found |

**Exemplo:**

Requisição:

```http
DELETE /api/123e4567-e89b-12d3-a456-426614174000 HTTP/1.1
Host: localhost:4000
Content-Type: application/json
```

Resposta:

```json
{
  "success": true,
  "data": {
    "message": "Removido com sucesso"
  }
}
```

---

#### DELETE /:id

**Parâmetros:**

| Nome | Localização | Tipo | Obrigatório | Descrição |
|---|---|---|---|---|
| id | Path | string | Sim | id parameter |

**Respostas:**

| Status | Descrição |
|---|---|
| 200 | OK - Request successful |
| 404 | Not Found - Resource not found |

**Exemplo:**

Requisição:

```http
DELETE /api/123e4567-e89b-12d3-a456-426614174000 HTTP/1.1
Host: localhost:4000
Content-Type: application/json
```

Resposta:

```json
{
  "success": true,
  "data": {
    "message": "Removido com sucesso"
  }
}
```

---

#### DELETE /:id

**Parâmetros:**

| Nome | Localização | Tipo | Obrigatório | Descrição |
|---|---|---|---|---|
| id | Path | string | Sim | id parameter |

**Respostas:**

| Status | Descrição |
|---|---|
| 200 | OK - Request successful |
| 404 | Not Found - Resource not found |

**Exemplo:**

Requisição:

```http
DELETE /api/123e4567-e89b-12d3-a456-426614174000 HTTP/1.1
Host: localhost:4000
Content-Type: application/json
```

Resposta:

```json
{
  "success": true,
  "data": {
    "message": "Removido com sucesso"
  }
}
```

---

#### GET /:id

**Parâmetros:**

| Nome | Localização | Tipo | Obrigatório | Descrição |
|---|---|---|---|---|
| id | Path | string | Sim | id parameter |

**Respostas:**

| Status | Descrição |
|---|---|
| 200 | OK - Request successful |
| 404 | Not Found - Resource not found |

**Exemplo:**

Requisição:

```http
GET /api/123e4567-e89b-12d3-a456-426614174000 HTTP/1.1
Host: localhost:4000
Content-Type: application/json
```

Resposta:

```json
{
  "success": true,
  "data": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "name": "Exemplo",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

---

#### GET /:id

**Parâmetros:**

| Nome | Localização | Tipo | Obrigatório | Descrição |
|---|---|---|---|---|
| id | Path | string | Sim | id parameter |

**Respostas:**

| Status | Descrição |
|---|---|
| 200 | OK - Request successful |
| 404 | Not Found - Resource not found |

**Exemplo:**

Requisição:

```http
GET /api/123e4567-e89b-12d3-a456-426614174000 HTTP/1.1
Host: localhost:4000
Content-Type: application/json
```

Resposta:

```json
{
  "success": true,
  "data": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "name": "Exemplo",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

---

#### GET /:id

**Parâmetros:**

| Nome | Localização | Tipo | Obrigatório | Descrição |
|---|---|---|---|---|
| id | Path | string | Sim | id parameter |

**Respostas:**

| Status | Descrição |
|---|---|
| 200 | OK - Request successful |
| 404 | Not Found - Resource not found |

**Exemplo:**

Requisição:

```http
GET /api/123e4567-e89b-12d3-a456-426614174000 HTTP/1.1
Host: localhost:4000
Content-Type: application/json
```

Resposta:

```json
{
  "success": true,
  "data": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "name": "Exemplo",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

---

#### GET /:id

**Parâmetros:**

| Nome | Localização | Tipo | Obrigatório | Descrição |
|---|---|---|---|---|
| id | Path | string | Sim | id parameter |

**Respostas:**

| Status | Descrição |
|---|---|
| 200 | OK - Request successful |
| 404 | Not Found - Resource not found |

**Exemplo:**

Requisição:

```http
GET /api/123e4567-e89b-12d3-a456-426614174000 HTTP/1.1
Host: localhost:4000
Content-Type: application/json
```

Resposta:

```json
{
  "success": true,
  "data": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "name": "Exemplo",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

---

#### GET /:id

**Parâmetros:**

| Nome | Localização | Tipo | Obrigatório | Descrição |
|---|---|---|---|---|
| id | Path | string | Sim | id parameter |

**Respostas:**

| Status | Descrição |
|---|---|
| 200 | OK - Request successful |
| 404 | Not Found - Resource not found |

**Exemplo:**

Requisição:

```http
GET /api/123e4567-e89b-12d3-a456-426614174000 HTTP/1.1
Host: localhost:4000
Content-Type: application/json
```

Resposta:

```json
{
  "success": true,
  "data": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "name": "Exemplo",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

---

#### GET /:id

**Parâmetros:**

| Nome | Localização | Tipo | Obrigatório | Descrição |
|---|---|---|---|---|
| id | Path | string | Sim | id parameter |

**Respostas:**

| Status | Descrição |
|---|---|
| 200 | OK - Request successful |
| 404 | Not Found - Resource not found |

**Exemplo:**

Requisição:

```http
GET /api/123e4567-e89b-12d3-a456-426614174000 HTTP/1.1
Host: localhost:4000
Content-Type: application/json
```

Resposta:

```json
{
  "success": true,
  "data": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "name": "Exemplo",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

---

#### PATCH /:id

**Parâmetros:**

| Nome | Localização | Tipo | Obrigatório | Descrição |
|---|---|---|---|---|
| id | Path | string | Sim | id parameter |

**Corpo da Requisição:**

- **Content-Type:** `application/json`
- **Schema:** `updateDocumentSchema`
- **Descrição:** Request body validated by updateDocumentSchema

**Respostas:**

| Status | Descrição |
|---|---|
| 200 | OK - Request successful |
| 404 | Not Found - Resource not found |

**Exemplo:**

Requisição:

```http
PATCH /api/123e4567-e89b-12d3-a456-426614174000 HTTP/1.1
Host: localhost:4000
Content-Type: application/json

{
  "example": "data"
}
```

Resposta:

```json
{
  "success": true,
  "data": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "message": "Atualizado com sucesso"
  }
}
```

---

#### PATCH /:id

**Parâmetros:**

| Nome | Localização | Tipo | Obrigatório | Descrição |
|---|---|---|---|---|
| id | Path | string | Sim | id parameter |

**Corpo da Requisição:**

- **Content-Type:** `application/json`
- **Schema:** `updateEquipamentoSchema`
- **Descrição:** Request body validated by updateEquipamentoSchema

**Respostas:**

| Status | Descrição |
|---|---|
| 200 | OK - Request successful |
| 404 | Not Found - Resource not found |

**Exemplo:**

Requisição:

```http
PATCH /api/123e4567-e89b-12d3-a456-426614174000 HTTP/1.1
Host: localhost:4000
Content-Type: application/json

{
  "example": "data"
}
```

Resposta:

```json
{
  "success": true,
  "data": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "message": "Atualizado com sucesso"
  }
}
```

---

#### PATCH /:id

**Parâmetros:**

| Nome | Localização | Tipo | Obrigatório | Descrição |
|---|---|---|---|---|
| id | Path | string | Sim | id parameter |

**Corpo da Requisição:**

- **Content-Type:** `application/json`
- **Schema:** `updateLojaSchema`
- **Descrição:** Request body validated by updateLojaSchema

**Respostas:**

| Status | Descrição |
|---|---|
| 200 | OK - Request successful |
| 404 | Not Found - Resource not found |

**Exemplo:**

Requisição:

```http
PATCH /api/123e4567-e89b-12d3-a456-426614174000 HTTP/1.1
Host: localhost:4000
Content-Type: application/json

{
  "example": "data"
}
```

Resposta:

```json
{
  "success": true,
  "data": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "message": "Atualizado com sucesso"
  }
}
```

---

#### PATCH /:id

**Parâmetros:**

| Nome | Localização | Tipo | Obrigatório | Descrição |
|---|---|---|---|---|
| id | Path | string | Sim | id parameter |

**Corpo da Requisição:**

- **Content-Type:** `application/json`
- **Schema:** `updateSetorSchema`
- **Descrição:** Request body validated by updateSetorSchema

**Respostas:**

| Status | Descrição |
|---|---|
| 200 | OK - Request successful |
| 404 | Not Found - Resource not found |

**Exemplo:**

Requisição:

```http
PATCH /api/123e4567-e89b-12d3-a456-426614174000 HTTP/1.1
Host: localhost:4000
Content-Type: application/json

{
  "example": "data"
}
```

Resposta:

```json
{
  "success": true,
  "data": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "message": "Atualizado com sucesso"
  }
}
```

---

#### PATCH /:id

**Parâmetros:**

| Nome | Localização | Tipo | Obrigatório | Descrição |
|---|---|---|---|---|
| id | Path | string | Sim | id parameter |

**Corpo da Requisição:**

- **Content-Type:** `application/json`
- **Schema:** `updateTemplateSchema`
- **Descrição:** Request body validated by updateTemplateSchema

**Respostas:**

| Status | Descrição |
|---|---|
| 200 | OK - Request successful |
| 404 | Not Found - Resource not found |

**Exemplo:**

Requisição:

```http
PATCH /api/123e4567-e89b-12d3-a456-426614174000 HTTP/1.1
Host: localhost:4000
Content-Type: application/json

{
  "title": "Checklist Atualizado"
}
```

Resposta:

```json
{
  "success": true,
  "data": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "message": "Atualizado com sucesso"
  }
}
```

---

#### PATCH /:id

**Parâmetros:**

| Nome | Localização | Tipo | Obrigatório | Descrição |
|---|---|---|---|---|
| id | Path | string | Sim | id parameter |

**Corpo da Requisição:**

- **Content-Type:** `application/json`
- **Schema:** `updateTipoEquipamentoSchema`
- **Descrição:** Request body validated by updateTipoEquipamentoSchema

**Respostas:**

| Status | Descrição |
|---|---|
| 200 | OK - Request successful |
| 404 | Not Found - Resource not found |

**Exemplo:**

Requisição:

```http
PATCH /api/123e4567-e89b-12d3-a456-426614174000 HTTP/1.1
Host: localhost:4000
Content-Type: application/json

{
  "example": "data"
}
```

Resposta:

```json
{
  "success": true,
  "data": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "message": "Atualizado com sucesso"
  }
}
```

---

#### GET /:id/download

**Parâmetros:**

| Nome | Localização | Tipo | Obrigatório | Descrição |
|---|---|---|---|---|
| id | Path | string | Sim | id parameter |

**Respostas:**

| Status | Descrição |
|---|---|
| 400 | Bad Request - Validation error or business logic error |
| 404 | Not Found - Resource not found |

**Exemplo:**

Requisição:

```http
GET /api/123e4567-e89b-12d3-a456-426614174000/download HTTP/1.1
Host: localhost:4000
Content-Type: application/json
```

---

#### POST /:id/fields

**Parâmetros:**

| Nome | Localização | Tipo | Obrigatório | Descrição |
|---|---|---|---|---|
| id | Path | string | Sim | id parameter |

**Corpo da Requisição:**

- **Content-Type:** `application/json`
- **Schema:** `createFieldSchema`
- **Descrição:** Request body validated by createFieldSchema

**Respostas:**

| Status | Descrição |
|---|---|
| 201 | Created - Resource created successfully |
| 404 | Not Found - Resource not found |

**Exemplo:**

Requisição:

```http
POST /api/123e4567-e89b-12d3-a456-426614174000/fields HTTP/1.1
Host: localhost:4000
Content-Type: application/json

{
  "example": "data"
}
```

Resposta:

```json
{
  "success": true,
  "data": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "message": "Criado com sucesso"
  }
}
```

---

#### DELETE /:id/fields/:fieldId

**Parâmetros:**

| Nome | Localização | Tipo | Obrigatório | Descrição |
|---|---|---|---|---|
| id | Path | string | Sim | id parameter |
| fieldId | Path | string | Sim | fieldId parameter |

**Respostas:**

| Status | Descrição |
|---|---|
| 200 | OK - Request successful |

**Exemplo:**

Requisição:

```http
DELETE /api/123e4567-e89b-12d3-a456-426614174000/fields/example-fieldId HTTP/1.1
Host: localhost:4000
Content-Type: application/json
```

Resposta:

```json
{
  "success": true,
  "data": {
    "message": "Removido com sucesso"
  }
}
```

---

#### PATCH /:id/fields/:fieldId

**Parâmetros:**

| Nome | Localização | Tipo | Obrigatório | Descrição |
|---|---|---|---|---|
| id | Path | string | Sim | id parameter |
| fieldId | Path | string | Sim | fieldId parameter |

**Corpo da Requisição:**

- **Content-Type:** `application/json`
- **Schema:** `updateFieldSchema`
- **Descrição:** Request body validated by updateFieldSchema

**Respostas:**

| Status | Descrição |
|---|---|
| 200 | OK - Request successful |

**Exemplo:**

Requisição:

```http
PATCH /api/123e4567-e89b-12d3-a456-426614174000/fields/example-fieldId HTTP/1.1
Host: localhost:4000
Content-Type: application/json

{
  "example": "data"
}
```

Resposta:

```json
{
  "success": true,
  "data": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "message": "Atualizado com sucesso"
  }
}
```

---

#### POST /:id/fields/batch-positions

**Parâmetros:**

| Nome | Localização | Tipo | Obrigatório | Descrição |
|---|---|---|---|---|
| id | Path | string | Sim | id parameter |

**Corpo da Requisição:**

- **Content-Type:** `application/json`
- **Schema:** `batchSchema`
- **Descrição:** Request body validated by batchSchema

**Respostas:**

| Status | Descrição |
|---|---|
| 201 | Created - Resource created successfully |

**Exemplo:**

Requisição:

```http
POST /api/123e4567-e89b-12d3-a456-426614174000/fields/batch-positions HTTP/1.1
Host: localhost:4000
Content-Type: application/json

{
  "example": "data"
}
```

Resposta:

```json
{
  "success": true,
  "data": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "message": "Criado com sucesso"
  }
}
```

---

#### POST /:id/fill

**Parâmetros:**

| Nome | Localização | Tipo | Obrigatório | Descrição |
|---|---|---|---|---|
| id | Path | string | Sim | id parameter |

**Corpo da Requisição:**

- **Content-Type:** `application/json`
- **Schema:** `saveFilledDataSchema`
- **Descrição:** Request body validated by saveFilledDataSchema

**Respostas:**

| Status | Descrição |
|---|---|
| 201 | Created - Resource created successfully |
| 404 | Not Found - Resource not found |

**Exemplo:**

Requisição:

```http
POST /api/123e4567-e89b-12d3-a456-426614174000/fill HTTP/1.1
Host: localhost:4000
Content-Type: application/json

{
  "fields": [
    {
      "fieldId": "field-1",
      "value": "Valor preenchido"
    }
  ]
}
```

Resposta:

```json
{
  "success": true,
  "data": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "message": "Criado com sucesso"
  }
}
```

---

#### POST /:id/generate

**Parâmetros:**

| Nome | Localização | Tipo | Obrigatório | Descrição |
|---|---|---|---|---|
| id | Path | string | Sim | id parameter |

**Respostas:**

| Status | Descrição |
|---|---|
| 201 | Created - Resource created successfully |
| 404 | Not Found - Resource not found |

**Exemplo:**

Requisição:

```http
POST /api/123e4567-e89b-12d3-a456-426614174000/generate HTTP/1.1
Host: localhost:4000
Content-Type: application/json
```

Resposta:

```json
{
  "success": true,
  "data": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "message": "Criado com sucesso"
  }
}
```

---

#### POST /:id/populate

**Parâmetros:**

| Nome | Localização | Tipo | Obrigatório | Descrição |
|---|---|---|---|---|
| id | Path | string | Sim | id parameter |

**Corpo da Requisição:**

- **Content-Type:** `application/json`
- **Schema:** `populateDocumentSchema`
- **Descrição:** Request body validated by populateDocumentSchema

**Respostas:**

| Status | Descrição |
|---|---|
| 201 | Created - Resource created successfully |
| 404 | Not Found - Resource not found |

**Exemplo:**

Requisição:

```http
POST /api/123e4567-e89b-12d3-a456-426614174000/populate HTTP/1.1
Host: localhost:4000
Content-Type: application/json

{
  "example": "data"
}
```

Resposta:

```json
{
  "success": true,
  "data": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "message": "Criado com sucesso"
  }
}
```

---

#### POST /:id/publish

**Parâmetros:**

| Nome | Localização | Tipo | Obrigatório | Descrição |
|---|---|---|---|---|
| id | Path | string | Sim | id parameter |

**Respostas:**

| Status | Descrição |
|---|---|
| 201 | Created - Resource created successfully |
| 404 | Not Found - Resource not found |

**Exemplo:**

Requisição:

```http
POST /api/123e4567-e89b-12d3-a456-426614174000/publish HTTP/1.1
Host: localhost:4000
Content-Type: application/json
```

Resposta:

```json
{
  "success": true,
  "data": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "message": "Criado com sucesso"
  }
}
```

---

#### POST /:id/select-equipment

**Parâmetros:**

| Nome | Localização | Tipo | Obrigatório | Descrição |
|---|---|---|---|---|
| id | Path | string | Sim | id parameter |

**Corpo da Requisição:**

- **Content-Type:** `application/json`
- **Schema:** `manualSelectSchema`
- **Descrição:** Request body validated by manualSelectSchema

**Respostas:**

| Status | Descrição |
|---|---|
| 201 | Created - Resource created successfully |
| 404 | Not Found - Resource not found |

**Exemplo:**

Requisição:

```http
POST /api/123e4567-e89b-12d3-a456-426614174000/select-equipment HTTP/1.1
Host: localhost:4000
Content-Type: application/json

{
  "example": "data"
}
```

Resposta:

```json
{
  "success": true,
  "data": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "message": "Criado com sucesso"
  }
}
```

---

#### GET /:id/status

**Parâmetros:**

| Nome | Localização | Tipo | Obrigatório | Descrição |
|---|---|---|---|---|
| id | Path | string | Sim | id parameter |

**Respostas:**

| Status | Descrição |
|---|---|
| 200 | OK - Request successful |
| 404 | Not Found - Resource not found |

**Exemplo:**

Requisição:

```http
GET /api/123e4567-e89b-12d3-a456-426614174000/status HTTP/1.1
Host: localhost:4000
Content-Type: application/json
```

Resposta:

```json
{
  "success": true,
  "data": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "name": "Exemplo",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

---

#### PATCH /:id/toggle

**Parâmetros:**

| Nome | Localização | Tipo | Obrigatório | Descrição |
|---|---|---|---|---|
| id | Path | string | Sim | id parameter |

**Respostas:**

| Status | Descrição |
|---|---|
| 200 | OK - Request successful |
| 404 | Not Found - Resource not found |

**Exemplo:**

Requisição:

```http
PATCH /api/123e4567-e89b-12d3-a456-426614174000/toggle HTTP/1.1
Host: localhost:4000
Content-Type: application/json
```

Resposta:

```json
{
  "success": true,
  "data": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "message": "Atualizado com sucesso"
  }
}
```

---

#### PATCH /:id/toggle

**Parâmetros:**

| Nome | Localização | Tipo | Obrigatório | Descrição |
|---|---|---|---|---|
| id | Path | string | Sim | id parameter |

**Respostas:**

| Status | Descrição |
|---|---|
| 200 | OK - Request successful |
| 404 | Not Found - Resource not found |

**Exemplo:**

Requisição:

```http
PATCH /api/123e4567-e89b-12d3-a456-426614174000/toggle HTTP/1.1
Host: localhost:4000
Content-Type: application/json
```

Resposta:

```json
{
  "success": true,
  "data": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "message": "Atualizado com sucesso"
  }
}
```

---

#### PATCH /:id/toggle

**Parâmetros:**

| Nome | Localização | Tipo | Obrigatório | Descrição |
|---|---|---|---|---|
| id | Path | string | Sim | id parameter |

**Respostas:**

| Status | Descrição |
|---|---|
| 200 | OK - Request successful |
| 404 | Not Found - Resource not found |

**Exemplo:**

Requisição:

```http
PATCH /api/123e4567-e89b-12d3-a456-426614174000/toggle HTTP/1.1
Host: localhost:4000
Content-Type: application/json
```

Resposta:

```json
{
  "success": true,
  "data": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "message": "Atualizado com sucesso"
  }
}
```

---

#### POST /:id/unpublish

**Parâmetros:**

| Nome | Localização | Tipo | Obrigatório | Descrição |
|---|---|---|---|---|
| id | Path | string | Sim | id parameter |

**Respostas:**

| Status | Descrição |
|---|---|
| 201 | Created - Resource created successfully |
| 404 | Not Found - Resource not found |

**Exemplo:**

Requisição:

```http
POST /api/123e4567-e89b-12d3-a456-426614174000/unpublish HTTP/1.1
Host: localhost:4000
Content-Type: application/json
```

Resposta:

```json
{
  "success": true,
  "data": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "message": "Criado com sucesso"
  }
}
```

---

### Active

Endpoints relacionados a **active**.

#### GET /active

**Respostas:**

| Status | Descrição |
|---|---|
| 200 | OK - Request successful |

**Exemplo:**

Requisição:

```http
GET /api/active HTTP/1.1
Host: localhost:4000
Content-Type: application/json
```

Resposta:

```json
{
  "success": true,
  "data": {
    "example": "data"
  }
}
```

---

#### GET /active

**Respostas:**

| Status | Descrição |
|---|---|
| 200 | OK - Request successful |

**Exemplo:**

Requisição:

```http
GET /api/active HTTP/1.1
Host: localhost:4000
Content-Type: application/json
```

Resposta:

```json
{
  "success": true,
  "data": {
    "example": "data"
  }
}
```

---

#### GET /active

**Respostas:**

| Status | Descrição |
|---|---|
| 200 | OK - Request successful |

**Exemplo:**

Requisição:

```http
GET /api/active HTTP/1.1
Host: localhost:4000
Content-Type: application/json
```

Resposta:

```json
{
  "success": true,
  "data": {
    "example": "data"
  }
}
```

---

### File

Endpoints relacionados a **file**.

#### GET /file

**Parâmetros:**

| Nome | Localização | Tipo | Obrigatório | Descrição |
|---|---|---|---|---|
| key | Query | string | Não | key query parameter |

**Respostas:**

| Status | Descrição |
|---|---|
| 200 | OK - Request successful |
| 400 | Bad Request - Validation error or business logic error |

**Exemplo:**

Requisição:

```http
GET /api/file?key=example HTTP/1.1
Host: localhost:4000
Content-Type: application/json
```

Resposta:

```json
{
  "success": true,
  "data": {
    "example": "data"
  }
}
```

---

### Image

Endpoints relacionados a **image**.

#### POST /image

**Exemplo:**

Requisição:

```http
POST /api/image HTTP/1.1
Host: localhost:4000
Content-Type: application/json
```

---

### Pdf

Endpoints relacionados a **pdf**.

#### POST /pdf

**Exemplo:**

Requisição:

```http
POST /api/pdf HTTP/1.1
Host: localhost:4000
Content-Type: application/json
```

---

### Presigned

Endpoints relacionados a **presigned**.

#### GET /presigned

**Parâmetros:**

| Nome | Localização | Tipo | Obrigatório | Descrição |
|---|---|---|---|---|
| key | Query | string | Não | key query parameter |

**Respostas:**

| Status | Descrição |
|---|---|
| 200 | OK - Request successful |
| 400 | Bad Request - Validation error or business logic error |

**Exemplo:**

Requisição:

```http
GET /api/presigned?key=example HTTP/1.1
Host: localhost:4000
Content-Type: application/json
```

Resposta:

```json
{
  "success": true,
  "data": {
    "example": "data"
  }
}
```

---

### Restore

Endpoints relacionados a **restore**.

#### POST /restore

**Exemplo:**

Requisição:

```http
POST /api/restore HTTP/1.1
Host: localhost:4000
Content-Type: application/json
```

---

### Unknown

Endpoints relacionados a **unknown**.

#### GET /

**Parâmetros:**

| Nome | Localização | Tipo | Obrigatório | Descrição |
|---|---|---|---|---|
| page | Query | number | Não | Page number (default: 1) |
| pageSize | Query | number | Não | Items per page (default: 20, max: 100) |

**Respostas:**

| Status | Descrição |
|---|---|
| 200 | OK - Request successful |

**Exemplo:**

Requisição:

```http
GET /api/?page=10&pageSize=10 HTTP/1.1
Host: localhost:4000
Content-Type: application/json
```

Resposta:

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "123",
        "name": "Exemplo"
      }
    ],
    "total": 1,
    "page": 1,
    "pageSize": 20
  }
}
```

---

#### GET /

**Parâmetros:**

| Nome | Localização | Tipo | Obrigatório | Descrição |
|---|---|---|---|---|
| page | Query | number | Não | Page number (default: 1) |
| pageSize | Query | number | Não | Items per page (default: 20, max: 100) |

**Respostas:**

| Status | Descrição |
|---|---|
| 200 | OK - Request successful |

**Exemplo:**

Requisição:

```http
GET /api/?page=10&pageSize=10 HTTP/1.1
Host: localhost:4000
Content-Type: application/json
```

Resposta:

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "123",
        "name": "Exemplo"
      }
    ],
    "total": 1,
    "page": 1,
    "pageSize": 20
  }
}
```

---

#### GET /

**Parâmetros:**

| Nome | Localização | Tipo | Obrigatório | Descrição |
|---|---|---|---|---|
| page | Query | number | Não | Page number (default: 1) |
| pageSize | Query | number | Não | Items per page (default: 20, max: 100) |

**Respostas:**

| Status | Descrição |
|---|---|
| 200 | OK - Request successful |

**Exemplo:**

Requisição:

```http
GET /api/?page=10&pageSize=10 HTTP/1.1
Host: localhost:4000
Content-Type: application/json
```

Resposta:

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "123",
        "name": "Exemplo"
      }
    ],
    "total": 1,
    "page": 1,
    "pageSize": 20
  }
}
```

---

#### GET /

**Parâmetros:**

| Nome | Localização | Tipo | Obrigatório | Descrição |
|---|---|---|---|---|
| page | Query | number | Não | Page number (default: 1) |
| pageSize | Query | number | Não | Items per page (default: 20, max: 100) |

**Respostas:**

| Status | Descrição |
|---|---|
| 200 | OK - Request successful |

**Exemplo:**

Requisição:

```http
GET /api/?page=10&pageSize=10 HTTP/1.1
Host: localhost:4000
Content-Type: application/json
```

Resposta:

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "123",
        "name": "Exemplo"
      }
    ],
    "total": 1,
    "page": 1,
    "pageSize": 20
  }
}
```

---

#### GET /

**Parâmetros:**

| Nome | Localização | Tipo | Obrigatório | Descrição |
|---|---|---|---|---|
| page | Query | number | Não | Page number (default: 1) |
| pageSize | Query | number | Não | Items per page (default: 20, max: 100) |

**Respostas:**

| Status | Descrição |
|---|---|
| 200 | OK - Request successful |

**Exemplo:**

Requisição:

```http
GET /api/?page=10&pageSize=10 HTTP/1.1
Host: localhost:4000
Content-Type: application/json
```

Resposta:

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "123",
        "name": "Exemplo"
      }
    ],
    "total": 1,
    "page": 1,
    "pageSize": 20
  }
}
```

---

#### GET /

**Parâmetros:**

| Nome | Localização | Tipo | Obrigatório | Descrição |
|---|---|---|---|---|
| page | Query | number | Não | Page number (default: 1) |
| pageSize | Query | number | Não | Items per page (default: 20, max: 100) |

**Respostas:**

| Status | Descrição |
|---|---|
| 200 | OK - Request successful |

**Exemplo:**

Requisição:

```http
GET /api/?page=10&pageSize=10 HTTP/1.1
Host: localhost:4000
Content-Type: application/json
```

Resposta:

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "123",
        "name": "Exemplo"
      }
    ],
    "total": 1,
    "page": 1,
    "pageSize": 20
  }
}
```

---

#### POST /

**Corpo da Requisição:**

- **Content-Type:** `application/json`
- **Schema:** `createDocumentSchema`
- **Descrição:** Request body validated by createDocumentSchema

**Respostas:**

| Status | Descrição |
|---|---|
| 201 | Created - Resource created successfully |

**Exemplo:**

Requisição:

```http
POST /api/ HTTP/1.1
Host: localhost:4000
Content-Type: application/json

{
  "templateId": "123e4567-e89b-12d3-a456-426614174000",
  "title": "Documento 001"
}
```

Resposta:

```json
{
  "success": true,
  "data": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "message": "Criado com sucesso"
  }
}
```

---

#### POST /

**Corpo da Requisição:**

- **Content-Type:** `application/json`
- **Schema:** `createEquipamentoSchema`
- **Descrição:** Request body validated by createEquipamentoSchema

**Respostas:**

| Status | Descrição |
|---|---|
| 201 | Created - Resource created successfully |

**Exemplo:**

Requisição:

```http
POST /api/ HTTP/1.1
Host: localhost:4000
Content-Type: application/json

{
  "example": "data"
}
```

Resposta:

```json
{
  "success": true,
  "data": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "message": "Criado com sucesso"
  }
}
```

---

#### POST /

**Corpo da Requisição:**

- **Content-Type:** `application/json`
- **Schema:** `createLojaSchema`
- **Descrição:** Request body validated by createLojaSchema

**Respostas:**

| Status | Descrição |
|---|---|
| 201 | Created - Resource created successfully |

**Exemplo:**

Requisição:

```http
POST /api/ HTTP/1.1
Host: localhost:4000
Content-Type: application/json

{
  "example": "data"
}
```

Resposta:

```json
{
  "success": true,
  "data": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "message": "Criado com sucesso"
  }
}
```

---

#### POST /

**Corpo da Requisição:**

- **Content-Type:** `application/json`
- **Schema:** `createSetorSchema`
- **Descrição:** Request body validated by createSetorSchema

**Respostas:**

| Status | Descrição |
|---|---|
| 201 | Created - Resource created successfully |

**Exemplo:**

Requisição:

```http
POST /api/ HTTP/1.1
Host: localhost:4000
Content-Type: application/json

{
  "example": "data"
}
```

Resposta:

```json
{
  "success": true,
  "data": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "message": "Criado com sucesso"
  }
}
```

---

#### POST /

**Corpo da Requisição:**

- **Content-Type:** `application/json`
- **Schema:** `createTemplateSchema`
- **Descrição:** Request body validated by createTemplateSchema

**Respostas:**

| Status | Descrição |
|---|---|
| 201 | Created - Resource created successfully |
| 400 | Bad Request - Validation error or business logic error |

**Exemplo:**

Requisição:

```http
POST /api/ HTTP/1.1
Host: localhost:4000
Content-Type: application/json

{
  "title": "Checklist de Manutenção",
  "pdfFileId": "123e4567-e89b-12d3-a456-426614174000"
}
```

Resposta:

```json
{
  "success": true,
  "data": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "message": "Criado com sucesso"
  }
}
```

---

#### POST /

**Corpo da Requisição:**

- **Content-Type:** `application/json`
- **Schema:** `createTipoEquipamentoSchema`
- **Descrição:** Request body validated by createTipoEquipamentoSchema

**Respostas:**

| Status | Descrição |
|---|---|
| 201 | Created - Resource created successfully |

**Exemplo:**

Requisição:

```http
POST /api/ HTTP/1.1
Host: localhost:4000
Content-Type: application/json

{
  "example": "data"
}
```

Resposta:

```json
{
  "success": true,
  "data": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "message": "Criado com sucesso"
  }
}
```

---

## Referências

- Código fonte das rotas: `apps/api/src/routes/`
- Schemas de validação: Zod schemas nos arquivos de rota

