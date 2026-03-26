# Fluxos Principais do Sistema

Este documento descreve os fluxos end-to-end do RegCheck com diagramas de estado, sequência e fluxo. Use-o para rastrear uma funcionalidade do início ao fim sem precisar ler o código-fonte.

---

## Ciclo de Vida do Template

Diagrama de estado mostrando as transições possíveis de um Template desde sua criação até o arquivamento.

```mermaid
stateDiagram-v2
    [*] --> DRAFT : criar template
    DRAFT --> PUBLISHED : publicar
    PUBLISHED --> ARCHIVED : arquivar
    PUBLISHED --> DRAFT : despublicar
    ARCHIVED --> [*]
```

---

## Ciclo de Vida do Document

Diagrama de estado mostrando as transições de um Document desde o preenchimento até a geração do PDF final (ou erro).

```mermaid
stateDiagram-v2
    [*] --> DRAFT : criar documento
    DRAFT --> IN_PROGRESS : iniciar preenchimento
    IN_PROGRESS --> GENERATING : POST /api/documents/:id/generate
    GENERATING --> GENERATED : worker conclui com sucesso
    GENERATING --> ERROR : worker lança exceção
    GENERATED --> [*]
    ERROR --> GENERATING : retentar geração
```

---

## Criação de Template

Diagrama de sequência do fluxo completo de criação de um template: do upload do PDF base até a publicação com campos posicionados.

```mermaid
sequenceDiagram
    actor Usuário
    participant Web as Next.js (Web)
    participant API as Express (API)
    participant S3 as MinIO/S3
    participant DB as PostgreSQL

    Usuário->>Web: seleciona arquivo PDF
    Web->>API: POST /api/uploads (multipart/form-data)
    API->>S3: uploadFile(pdfBytes)
    S3-->>API: fileKey
    API->>DB: INSERT PdfFile (fileName, fileKey, pageCount)
    DB-->>API: pdfFile.id
    API-->>Web: { pdfFileId, pageCount }

    Web->>API: POST /api/templates (name, pdfFileId)
    API->>DB: INSERT Template (status: DRAFT)
    DB-->>API: template.id
    API-->>Web: template

    Web->>Web: redireciona para /editor/:templateId
    Web->>API: GET /api/templates/:id (campos + pdfFile)
    API-->>Web: template com fields[]

    Web->>S3: GET pdfFile.fileKey (URL pré-assinada)
    S3-->>Web: bytes do PDF
    Web->>Web: renderiza PDF com pdfjs (canvas)

    loop drag/drop de campos
        Usuário->>Web: arrasta campo para posição no canvas Konva
        Web->>Web: converte px → coordenadas relativas (0–1)
        Web->>Web: isDirty = true
    end

    Note over Web: useAutosave dispara a cada 5s quando isDirty=true
    Web->>API: PUT /api/templates/:id/fields (fields[])
    API->>DB: UPSERT TemplateField[]
    DB-->>API: ok
    API-->>Web: fields atualizados

    Usuário->>Web: clica em "Publicar"
    Web->>API: PATCH /api/templates/:id (status: PUBLISHED)
    API->>DB: UPDATE Template status=PUBLISHED
    DB-->>API: ok
    API-->>Web: template atualizado
```

---

## Geração de PDF

Diagrama de sequência do fluxo de geração assíncrona de PDF via BullMQ, incluindo o polling de status pelo frontend.

```mermaid
sequenceDiagram
    actor Usuário
    participant Web as Next.js (Web)
    participant API as Express (API)
    participant Queue as BullMQ (Redis)
    participant Worker as pdf-generation-worker
    participant S3 as MinIO/S3
    participant DB as PostgreSQL

    Usuário->>Web: clica em "Gerar PDF"
    Web->>API: POST /api/documents/:id/generate
    API->>DB: UPDATE Document status=GENERATING
    API->>Queue: queue.add('pdf-generation', { documentId })
    Queue-->>API: job enfileirado
    API-->>Web: 202 Accepted

    loop polling a cada 3s
        Web->>API: GET /api/documents/:id/status
        API->>DB: SELECT Document.status
        DB-->>API: status atual
        API-->>Web: { status }
    end

    Note over Worker: Worker processa job em background
    Worker->>DB: findUnique Document (template + fields + filledFields)
    DB-->>Worker: dados completos

    Worker->>S3: downloadFile(pdfFile.fileKey)
    S3-->>Worker: pdfBytes

    alt com RepetitionConfig
        Worker->>Worker: RepetitionEngine.computeLayout(totalItems, config)
        Worker->>Worker: FieldCloner.cloneForItems(baseFields, totalItems, config)
        Worker->>Worker: PdfProcessor.duplicatePages(pdfBytes, totalPages, pageCount)
        Worker->>S3: Promise.all — downloads paralelos de imagens/assinaturas
        S3-->>Worker: imageMap (fieldId → Buffer)
    else sem repetição
        Worker->>S3: Promise.all — downloads paralelos de imagens/assinaturas
        S3-->>Worker: imageMap (fieldId → Buffer)
    end

    Worker->>Worker: PdfGenerator.generate({ originalPdf, pages, fieldOverlays })
    Note over Worker: pdf-lib aplica overlays de texto, imagem, checkbox e assinatura

    Worker->>S3: uploadFile(generated/uuid.pdf)
    S3-->>Worker: outputKey
    Worker->>DB: UPDATE Document status=GENERATED, generatedPdfKey=outputKey

    Web->>API: GET /api/documents/:id/status
    API-->>Web: { status: "GENERATED" }
    Web->>Web: exibe link de download do PDF gerado
```

---

## Editor Visual

Diagrama de sequência do fluxo do Editor Visual: carregamento do template, renderização do PDF com pdfjs, posicionamento de campos via Konva, autosave e undo/redo.

```mermaid
sequenceDiagram
    actor Usuário
    participant Web as Next.js (Web)
    participant Store as editor-store (Zustand)
    participant API as Express (API)
    participant S3 as MinIO/S3

    Web->>API: GET /api/templates/:id
    API-->>Web: template (fields[], pdfFile)

    Web->>S3: GET pdfFile.fileKey (URL pré-assinada)
    S3-->>Web: bytes do PDF

    Web->>Web: pdfjs renderiza cada página em <canvas>
    Web->>Store: setFields(fields[])
    Web->>Store: HistoryManager.push(estadoInicial)

    loop posicionamento de campos
        Usuário->>Web: drag/drop campo no canvas Konva
        Web->>Store: updateField(id, { position })
        Store->>Store: HistoryManager.push(novoEstado)
        Store->>Store: isDirty = true
    end

    Note over Web,Store: useAutosave: intervalo de 5s, salva quando isDirty=true
    Store->>API: PUT /api/templates/:id/fields (fields[])
    API-->>Store: fields atualizados
    Store->>Store: isDirty = false

    alt Usuário pressiona Ctrl+Z (undo)
        Usuário->>Web: Ctrl+Z
        Web->>Store: HistoryManager.undo()
        Store-->>Web: estadoAnterior
        Web->>Web: re-renderiza canvas Konva
    else Usuário pressiona Ctrl+Y (redo)
        Usuário->>Web: Ctrl+Y
        Web->>Store: HistoryManager.redo()
        Store-->>Web: próximoEstado
        Web->>Web: re-renderiza canvas Konva
    end
```

---

## RepetitionEngine — Cálculo de Layout e Clonagem de Campos

Diagrama de fluxo explicando como o `RepetitionEngine` transforma uma `RepetitionConfig` em campos clonados distribuídos por páginas.

```mermaid
flowchart TD
    A["RepetitionConfig\n(rows, columns, itemsPerPage,\noffsetX, offsetY, startX, startY)"]
    B["RepetitionEngine.computeLayout\n(totalItems, config)"]
    C{"itemsPerPage\n≤ rows × columns?"}
    D["effectiveItemsPerPage =\nmin(itemsPerPage, rows × columns)"]
    E["totalPages =\nceil(totalItems / effectiveItemsPerPage)"]
    F["Para cada página:\ncalcula row/col de cada item\noffsetX = startX + col × config.offsetX\noffsetY = startY + row × config.offsetY"]
    G["RepetitionLayout\n{ totalPages, pageItems[] }"]
    H["FieldCloner.cloneForItems\n(baseFields, totalItems, config)"]
    I["Para cada item em cada página:\nclona baseFields com\nposition.x += offsetX\nposition.y += offsetY\npageIndex = pageLayout.pageIndex"]
    J["Campos clonados\ncom computedPageIndex\ne computedItemIndex"]
    K["PdfProcessor.duplicatePages\n(pdfBytes, totalPages, pageCount)"]
    L["PDF expandido\ncom páginas duplicadas"]
    M["PdfGenerator.generate\n(overlays por página)"]

    A --> B
    B --> C
    C -->|sim| D
    C -->|não| D
    D --> E
    E --> F
    F --> G
    G --> H
    H --> I
    I --> J
    G --> K
    K --> L
    J --> M
    L --> M
```
