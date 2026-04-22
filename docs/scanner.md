# Scanner de Etiquetas — QR Code, Código de Barras e OCR

Documentação técnica do sistema de leitura de etiquetas de equipamentos via câmera.

---

## Visão Geral

O scanner é um pipeline de processamento de imagem que detecta automaticamente o melhor método de leitura disponível, na seguinte ordem de prioridade:

```
Imagem → Hash → Cache → Dedup → Resize → Barcode/QR → Preprocessing → OCR → Candidatos
```

O usuário **sempre escolhe** qual candidato usar — o sistema nunca auto-seleciona.

---

## Arquitetura

```
apps/web/src/lib/scanner/
├── index.ts                        # Exports públicos
├── types.ts                        # Tipos do pipeline
├── scan-pipeline.ts                # Orquestrador principal
├── ocr-parser.ts                   # Parser de texto OCR → candidatos
├── dedupe.ts                       # Deduplicação de candidatos por valor
├── core/
│   ├── task-controller.ts          # Gerencia AbortControllers
│   ├── processing-queue.ts         # Fila com prioridade e concorrência
│   └── retry-strategy.ts           # Retry com backoff exponencial
├── services/
│   ├── barcode.service.ts          # QR Code + Código de barras
│   ├── ocr.service.ts              # Tesseract.js wrapper
│   ├── adaptive-ocr.service.ts     # Parâmetros adaptativos por tentativa
│   ├── image-hash.service.ts       # Hash perceptual (dHash)
│   ├── image-resize.service.ts     # Redimensionamento via OffscreenCanvas
│   ├── image-worker.service.ts     # Preprocessing em Web Worker
│   ├── result-cache.service.ts     # Cache memória + IndexedDB (24h)
│   ├── deduplication.service.ts    # Dedup por hash de imagem
│   ├── analytics.service.ts        # Métricas de sessão (in-memory)
│   ├── camera-input.service.ts     # Captura via file input
│   └── text-extractor.service.ts   # Extração de texto (legado)
└── workers/
    └── preprocess.worker.ts        # Web Worker: grayscale + contraste + binarização
```

---

## QR Code e Código de Barras

### Formatos suportados

| Formato      | Tipo         | Uso típico                    |
|--------------|--------------|-------------------------------|
| QR Code      | 2D           | Etiquetas modernas, URLs      |
| Code 128     | 1D           | Série, patrimônio             |
| Code 39      | 1D           | Patrimônio legado             |
| EAN-13       | 1D           | Produtos                      |
| EAN-8        | 1D           | Produtos compactos            |
| Data Matrix  | 2D           | Componentes eletrônicos       |

### Estratégia de detecção

O `BarcodeService` usa dois métodos em cascata:

**1. Native BarcodeDetector (primário)**

API nativa do browser — disponível no Chrome/Android e Safari 17+. Mais rápida e sem dependências externas.

```typescript
const detector = new BarcodeDetector({
  formats: ['code_128', 'code_39', 'ean_13', 'ean_8', 'qr_code', 'data_matrix'],
});
const results = await detector.detect(imageBitmap);
// confidence: 0.95
```

**2. ZXing WASM (fallback)**

Carregado dinamicamente quando o BarcodeDetector não está disponível (Firefox, browsers antigos).

```typescript
const results = await zxing.readBarcodesFromImageData(imageData, {
  tryHarder: true,
  formats: ['Code128', 'Code39', 'EAN-13', 'EAN-8', 'QRCode', 'DataMatrix'],
  maxNumberOfSymbols: 5,
});
// confidence: 0.90
```

### Comportamento no pipeline

Se qualquer barcode/QR for detectado, o pipeline **para imediatamente** — OCR não é executado. Isso garante a leitura mais rápida e precisa possível.

---

## OCR (Reconhecimento Óptico de Caracteres)

### Motor

[Tesseract.js](https://github.com/naptha/tesseract.js) v7 com modelos `eng+por` (inglês + português). O worker é inicializado uma vez e reutilizado durante toda a sessão (`warmupScanner()` no mount do componente).

### Pipeline de preprocessing

Antes do OCR, a imagem passa por 3 etapas no Web Worker (ou main thread como fallback):

**1. Grayscale**
```
gray = R×0.299 + G×0.587 + B×0.114
```

**2. Contrast stretch**
```
val = ((pixel - min) / range) × 255
val = (val - 128) × contrast + 128
```

**3. Binary threshold**
- Se `threshold = 0`: usa média dos pixels (adaptativo)
- Se `threshold > 0`: valor fixo
- Resultado: pixel branco (255) ou preto (0)

### Parâmetros adaptativos

O `AdaptiveOCRService` ajusta os parâmetros a cada tentativa:

| Tentativa | Threshold | Contrast | MaxWidth |
|-----------|-----------|----------|----------|
| 0 (padrão)| auto      | 1.0      | 800px    |
| 1         | auto      | 1.3      | 1000px   |
| 2         | 140       | 1.5      | 1200px   |

Após 3 falhas consecutivas, o padrão é automaticamente elevado para contraste 1.3.

### Extração de texto

O `ocr-parser.ts` classifica o texto bruto em candidatos tipados:

**Padrões com label (alta confiança: 0.88)**

| Tipo       | Exemplos de padrão                                    |
|------------|-------------------------------------------------------|
| patrimônio | `Patrimônio: 123456`, `Pat: 789`, `Tombamento: 456`   |
| serial     | `Série: ABC123`, `S/N: XY789`, `Serial No: DEF456`    |
| modelo     | `Modelo: HP LaserJet`, `Model: T450`, `Mod: X200`     |

**Padrões genéricos (confiança calculada)**

- Numérico longo (6–20 dígitos) → patrimônio
- Alfanumérico (letras + dígitos, 6–20 chars) → serial
- Score penaliza palavras de ruído: `INPUT`, `OUTPUT`, `VOLTAGE`, `MADE`, `CHINA`, etc.

### Retry

OCR tem até 2 retentativas com backoff exponencial (500ms base):
- Tentativa 0: parâmetros padrão
- Tentativa 1: contraste aumentado
- Tentativa 2: threshold fixo + contraste máximo

---

## Cache e Deduplicação

### Cache de resultados (ResultCacheService)

Cache em dois níveis com TTL de 24 horas:

| Nível    | Tecnologia | Velocidade | Persistência |
|----------|------------|------------|--------------|
| L1       | Map em memória | ~0ms   | Sessão       |
| L2       | IndexedDB  | ~5ms       | 24 horas     |

A chave do cache é o **hash perceptual** da imagem (dHash 64-bit). Imagens visualmente idênticas retornam o resultado em cache sem reprocessar.

### Hash perceptual (ImageHashService)

Algoritmo dHash:
1. Redimensiona para 9×8 pixels
2. Converte para grayscale
3. Compara pixels adjacentes em cada linha → 64 bits
4. Converte para hex (16 chars)

Distância de Hamming ≤ 5 = imagens consideradas iguais (tolerância a variações de câmera).

### Deduplicação de sessão (DeduplicationService)

Mantém histórico de até 100 imagens processadas na sessão. Evita reprocessar a mesma etiqueta fotografada múltiplas vezes.

### Deduplicação de candidatos (dedupe.ts)

Remove candidatos com mesmo `type:value`, mantendo o de maior confidence. Ordena por confidence DESC.

---

## Fila de Processamento

O `ProcessingQueue` controla concorrência para não sobrecarregar dispositivos móveis:

- Máximo 2 tarefas simultâneas
- Máximo 4 tarefas na fila
- Tarefas excedentes são descartadas (AbortError)
- Prioridade configurável (scans do usuário usam prioridade 10)

---

## Cancelamento

Todo o pipeline é cancelável via `AbortSignal`. O `TaskController` cancela automaticamente qualquer scan anterior quando um novo é iniciado — garantindo que apenas o scan mais recente seja processado.

```typescript
// Cancelar scan atual
cancelScan();

// Novo scan cancela o anterior automaticamente
await runScanPipeline(newImage, options);
```

---

## Analytics

O `AnalyticsService` rastreia eventos em memória (máx. 500) para análise de sessão:

```typescript
AnalyticsService.getStats();
// {
//   totalScans: 12,
//   successRate: 0.83,
//   avgDuration: 1240,   // ms
//   cacheHitRate: 0.25,
//   barcodeSuccessRate: 0.60,
// }
```

---

## Uso no componente

```typescript
import { CameraScanner } from '@/components/equipment/camera-scanner';

<CameraScanner
  targetField="all"          // 'serie' | 'patrimonio' | 'modelo' | 'all'
  onResult={(result) => {
    // result.serie, result.patrimonio, result.modelo
  }}
  onClose={() => setOpen(false)}
/>
```

### Hook useOcr

```typescript
const { status, candidates, progress, error, process, recapture } = useOcr();

// status: 'idle' | 'processing' | 'done' | 'error' | 'cancelled'
// candidates: OCRCandidate[] — sugestões para o usuário escolher
// progress: { stage, percent, label }
```

---

## Limitações conhecidas

| Limitação | Impacto | Mitigação |
|-----------|---------|-----------|
| BarcodeDetector não disponível no Firefox | Fallback ZXing mais lento (~500ms extra) | ZXing carregado automaticamente |
| Web Worker pode falhar em mobile com cross-origin | OCR não processa | Fallback main-thread implementado |
| Tesseract carrega ~10MB de dados de linguagem | Primeira leitura lenta (~3–5s) | `warmupScanner()` no mount |
| OCR sensível a iluminação e foco | Falsos negativos | Retry adaptativo + campos manuais |
| Cache IndexedDB não disponível em modo privado | Cache apenas em memória | Degradação graciosa |
