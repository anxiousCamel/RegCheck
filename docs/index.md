# Documentação do RegCheck

Índice navegável de toda a documentação técnica do RegCheck. Use este arquivo como ponto de partida para encontrar qualquer documento do projeto.

> **Ponto de entrada:** Se você chegou aqui pela primeira vez, comece pelo [README.md](../README.md) na raiz do repositório.

---

## Arquitetura

| Documento | Descrição |
|---|---|
| [architecture.md](./architecture.md) | Diagrama C4 do sistema, dependências entre pacotes do monorepo, schema do banco de dados (ER), responsabilidades de cada app/pacote e explicação do sistema de coordenadas relativas (0–1). |

---

## Fluxos

| Documento | Descrição |
|---|---|
| [flows.md](./flows.md) | Diagramas de estado e sequência para os fluxos principais: criação de Template, geração de PDF via BullMQ, Editor Visual com Konva e funcionamento do RepetitionEngine. |

---

## Padrões

| Documento | Descrição |
|---|---|
| [conventions.md](./conventions.md) | Convenções de nomenclatura, estrutura de pastas, uso de Zod validators, React Query vs Zustand, tratamento de erros na API, coordenadas relativas e como adicionar novos pacotes ao monorepo. |

---

## Pacotes

| Documento | Descrição |
|---|---|
| [packages.md](./packages.md) | API pública dos pacotes compartilhados: `@regcheck/editor-engine` (RepetitionEngine, FieldCloner, SnapGrid, HistoryManager), `@regcheck/pdf-engine` (PdfProcessor, PdfGenerator, ImageCompressor), `@regcheck/shared` (tipos principais) e `@regcheck/validators` (schemas Zod). |

---

## Contribuição

| Documento | Descrição |
|---|---|
| [contributing.md](./contributing.md) | Fluxo completo de desenvolvimento local, convenções de commit, uso do Prisma Studio, como adicionar endpoints à API, como adicionar componentes ao `packages/ui` e checklist de PR. |

---

## ADRs — Architecture Decision Records

Registros das principais decisões técnicas do projeto, com contexto, alternativas consideradas e justificativa.

| Documento | Decisão | Status |
|---|---|---|
| [adr/README.md](./adr/README.md) | Índice de todos os ADRs e template padrão para criar novos. | — |
| [adr/001-konva-vs-fabricjs.md](./adr/001-konva-vs-fabricjs.md) | Uso de Konva.js (com `react-konva`) em vez de Fabric.js no Editor Visual. | Aceito |
| [adr/002-coordenadas-relativas.md](./adr/002-coordenadas-relativas.md) | Armazenamento de coordenadas de campos como valores relativos (0–1) em vez de pixels absolutos. | Aceito |
| [adr/003-bullmq-redis-pdf.md](./adr/003-bullmq-redis-pdf.md) | Uso de BullMQ + Redis para geração assíncrona de PDF em vez de processamento síncrono na request. | Aceito |
| [adr/004-zustand-react-query.md](./adr/004-zustand-react-query.md) | Uso de Zustand para estado local do editor e React Query para dados do servidor. | Aceito |
| [adr/005-minio-s3-storage.md](./adr/005-minio-s3-storage.md) | Uso de MinIO (dev) / AWS S3 (prod) para armazenamento de arquivos em vez de base64 ou filesystem local. | Aceito |
