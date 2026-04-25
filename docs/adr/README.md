# ADRs — Architecture Decision Records

Este diretório contém os registros de decisões arquiteturais (ADRs) do RegCheck. Cada ADR documenta uma decisão técnica relevante: o contexto que motivou a decisão, as alternativas consideradas e as consequências da escolha feita.

## Índice de ADRs

| #   | Título                                                             | Status | Link                                                           |
| --- | ------------------------------------------------------------------ | ------ | -------------------------------------------------------------- |
| 001 | Uso de Konva.js em vez de Fabric.js no Editor Visual               | Aceito | [001-konva-vs-fabricjs.md](./001-konva-vs-fabricjs.md)         |
| 002 | Armazenamento de coordenadas relativas (0–1)                       | Aceito | [002-coordenadas-relativas.md](./002-coordenadas-relativas.md) |
| 003 | BullMQ + Redis para geração assíncrona de PDF                      | Aceito | [003-bullmq-redis-pdf.md](./003-bullmq-redis-pdf.md)           |
| 004 | Zustand para estado do editor + React Query para dados do servidor | Aceito | [004-zustand-react-query.md](./004-zustand-react-query.md)     |
| 005 | MinIO/S3 para armazenamento de arquivos                            | Aceito | [005-minio-s3-storage.md](./005-minio-s3-storage.md)           |

---

## Como criar um novo ADR

### 1. Nomear o arquivo

Use o padrão `NNN-titulo-em-kebab-case.md`, onde `NNN` é o próximo número sequencial com três dígitos:

```
docs/adr/006-nome-da-decisao.md
```

### 2. Preencher o template

Copie o template abaixo e preencha todos os campos. Não deixe seções vazias — se uma seção não se aplica, explique brevemente o motivo.

### 3. Atualizar o índice

Adicione uma linha na tabela de índice acima com o número, título, status e link relativo para o novo arquivo.

---

## Template padrão de ADR

```markdown
# NNN — Título da Decisão

**Status:** Aceito | Proposto | Depreciado | Substituído por [NNN](./NNN-titulo.md)

## Contexto

Descreva o problema ou necessidade que motivou esta decisão. Inclua as restrições técnicas,
de negócio ou de equipe relevantes. O leitor deve entender por que uma decisão precisava
ser tomada sem precisar ler código.

## Decisão

Descreva claramente a decisão tomada. Use linguagem afirmativa: "Decidimos usar X porque Y."
Explique o raciocínio principal que levou a esta escolha.

## Alternativas Consideradas

Liste as alternativas que foram avaliadas antes de chegar à decisão:

- **Alternativa A** — breve descrição e por que foi descartada
- **Alternativa B** — breve descrição e por que foi descartada
- **Alternativa C** — breve descrição e por que foi descartada

## Consequências

Descreva os efeitos da decisão — tanto positivos quanto negativos:

- **Positivo:** ...
- **Positivo:** ...
- **Negativo/Tradeoff:** ...
- **Negativo/Tradeoff:** ...
```

---

## Status possíveis

| Status          | Significado                                                               |
| --------------- | ------------------------------------------------------------------------- |
| **Proposto**    | A decisão está sendo discutida e ainda não foi implementada               |
| **Aceito**      | A decisão foi tomada e está em vigor no projeto                           |
| **Depreciado**  | A decisão ainda está em vigor mas não é mais recomendada para novos casos |
| **Substituído** | A decisão foi substituída por outro ADR (incluir link)                    |
