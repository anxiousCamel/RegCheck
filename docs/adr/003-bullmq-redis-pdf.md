# 003 — BullMQ + Redis para Geração Assíncrona de PDF

**Status:** Aceito

## Contexto

O RegCheck permite que o usuário preencha um documento e solicite a geração do PDF final. Esse processo é CPU e IO intensivo: envolve download do PDF base do S3/MinIO, download paralelo de imagens e assinaturas preenchidas, processamento com `pdf-lib` para duplicar páginas (quando há repetição) e aplicar overlays de campos, e upload do PDF gerado de volta ao S3/MinIO.

Em um template com repetição de 20 itens, por exemplo, o worker precisa:

1. Baixar o PDF base (`downloadFile` via `@aws-sdk/client-s3`)
2. Duplicar páginas com `PdfProcessor.duplicatePages`
3. Baixar em paralelo todas as imagens/assinaturas dos campos preenchidos (`Promise.all`)
4. Aplicar overlays em cada página com `PdfGenerator.generate`
5. Fazer upload do PDF resultante

Esse fluxo pode levar vários segundos. Executar tudo isso de forma síncrona dentro da request HTTP bloquearia o event loop do Node.js, causaria timeout no cliente e impediria que a API respondesse outras requisições durante o processamento.

## Decisão

Decidimos usar **BullMQ** com **Redis** (via `ioredis`) para enfileirar e processar os jobs de geração de PDF de forma assíncrona.

A fila é definida em `apps/api/src/lib/queue.ts`:

```ts
// Fila nomeada "pdf-generation" conectada ao Redis
export const pdfGenerationQueue = new Queue('pdf-generation', { connection });

// Worker com concorrência 2 — processa até 2 jobs simultaneamente
export function createPdfWorker(processor): Worker {
  return new Worker(
    'pdf-generation',
    async (job) => {
      await processor(job.data);
    },
    { connection, concurrency: 2 },
  );
}
```

O job carrega apenas o `documentId`. O worker em `apps/api/src/jobs/pdf-generation-worker.ts` busca todos os dados necessários do banco via Prisma, executa o pipeline completo e atualiza o status do documento para `GENERATED` (ou `ERROR` em caso de falha).

O frontend faz polling do endpoint `GET /api/documents/:id/status` a cada 3 segundos para verificar quando o PDF está pronto.

## Alternativas Consideradas

- **Geração síncrona na request HTTP** — executar todo o pipeline de PDF dentro do handler Express antes de responder. Descartado porque bloqueia o event loop do Node.js durante o processamento (que pode levar vários segundos), causa timeout em clientes com conexão lenta, e impede que a API processe outras requisições simultaneamente.

- **AWS Lambda** — disparar uma função Lambda para cada job de geração. Descartado porque adiciona complexidade de infraestrutura (IAM, VPC, cold starts), dificulta o desenvolvimento local (sem emulação fiel do ambiente), e introduz latência de invocação. O BullMQ com Redis oferece a mesma desacoplagem com muito menos overhead operacional.

- **Worker Threads do Node.js** — usar `worker_threads` nativo para processar o PDF em uma thread separada, evitando bloquear o event loop. Descartado porque não resolve o problema de persistência e retry de jobs (se o processo morrer, o job é perdido), não oferece visibilidade de estado (fila, progresso, falhas), e não escala horizontalmente para múltiplos processos/instâncias.

## Consequências

- **Positivo:** A request HTTP retorna imediatamente com o `documentId` e status `GENERATING`, sem bloquear o cliente.
- **Positivo:** Jobs com falha são retentados automaticamente pelo BullMQ com backoff configurável — se o S3 estiver temporariamente indisponível, o job é reagendado.
- **Positivo:** O worker pode ser escalado horizontalmente: múltiplas instâncias do processo worker consomem a mesma fila Redis, com `concurrency: 2` por instância.
- **Positivo:** Visibilidade de estado via `getJobStatus()` — é possível consultar se o job está `waiting`, `active`, `completed` ou `failed`, além do `failedReason`.
- **Negativo/Tradeoff:** O frontend precisa implementar polling de status (`GET /api/documents/:id/status` a cada 3s) em vez de receber o PDF diretamente na resposta da request de geração.
- **Negativo/Tradeoff:** Redis passa a ser uma dependência de infraestrutura obrigatória — o `docker-compose.yml` em `infra/` já inclui o serviço Redis na porta `6379`.
- **Negativo/Tradeoff:** O worker roda como processo separado da API Express. Em desenvolvimento, ambos precisam estar rodando simultaneamente para que a geração funcione.

Veja também: [`docs/flows.md`](../flows.md) — seção "Fluxo de Geração de PDF".
