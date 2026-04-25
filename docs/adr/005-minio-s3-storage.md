# 005 — MinIO/S3 para Armazenamento de Arquivos

**Status:** Aceito

## Contexto

O RegCheck precisa armazenar três categorias de arquivos binários:

1. **PDFs base** — arquivos PDF enviados pelo usuário ao criar um template, armazenados via `POST /api/uploads/pdf`. Cada PDF recebe um `fileKey` no formato `pdfs/<uuid>.pdf` e é referenciado pelo registro `PdfFile` no banco.

2. **Imagens de campos** — imagens e assinaturas enviadas durante o preenchimento de um documento (`POST /api/uploads/image`). Imagens são comprimidas pelo `ImageCompressor` do `@regcheck/pdf-engine` antes do upload e recebem `fileKey` no formato `images/<uuid>.jpg` ou `signatures/<uuid>.png`. O `fileKey` é salvo no campo `fileKey` do registro `FilledField`.

3. **PDFs gerados** — PDFs finais produzidos pelo worker `pdf-generation-worker.ts`. O worker baixa o PDF base via `downloadFile(fileKey)`, aplica os overlays com `pdf-lib` e faz upload do resultado via `uploadFile(key, buffer, 'application/pdf')`. O `fileKey` do PDF gerado é salvo no campo `generatedFileKey` do registro `Document`.

Esses arquivos precisam ser:

- **Persistentes** — sobreviver a reinicializações do servidor
- **Acessíveis pelo worker** — o `pdf-generation-worker.ts` roda em processo separado e precisa baixar e fazer upload de arquivos sem acesso ao filesystem da API
- **Servidos com segurança** — o download pelo usuário final deve usar URLs pré-assinadas com expiração, sem expor credenciais

O projeto precisava de uma solução que funcionasse localmente sem dependências de nuvem e que fosse substituível por AWS S3 em produção sem mudança de código.

## Decisão

Decidimos usar **MinIO em desenvolvimento** e **AWS S3 em produção**, com o cliente `@aws-sdk/client-s3` como única interface de acesso.

### Implementação — `apps/api/src/lib/s3.ts`

O módulo `s3.ts` configura um `S3Client` único com suporte a endpoint customizável via variável de ambiente:

```ts
const s3Client = new S3Client({
  endpoint: process.env.S3_ENDPOINT ?? 'http://localhost:9000', // MinIO local
  region: process.env.S3_REGION ?? 'us-east-1',
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY ?? 'minioadmin',
    secretAccessKey: process.env.S3_SECRET_KEY ?? 'minioadmin',
  },
  forcePathStyle: true, // Obrigatório para MinIO
});

const BUCKET = process.env.S3_BUCKET ?? 'regcheck';
```

O módulo expõe quatro funções:

```ts
// Upload de arquivo (PDFs base, imagens, PDFs gerados)
await uploadFile('pdfs/abc-123.pdf', buffer, 'application/pdf');

// Download de arquivo (usado pelo worker para baixar PDF base)
const buffer = await downloadFile('pdfs/abc-123.pdf');

// Deleção de arquivo
await deleteFile('pdfs/abc-123.pdf');

// URL pré-assinada para download seguro (expira em 1 hora por padrão)
const url = await getPresignedUrl('pdfs/abc-123.pdf', 3600);
```

### Estrutura de chaves no bucket `regcheck`

| Prefixo       | Conteúdo                        | Exemplo                                               |
| ------------- | ------------------------------- | ----------------------------------------------------- |
| `pdfs/`       | PDFs base enviados pelo usuário | `pdfs/550e8400-e29b-41d4-a716-446655440000.pdf`       |
| `images/`     | Imagens de campos comprimidas   | `images/7c9e6679-7425-40de-944b-e07fc1f90ae7.jpg`     |
| `signatures/` | Assinaturas PNG comprimidas     | `signatures/3f2504e0-4f89-11d3-9a0c-0305e82c3301.png` |

### Configuração local (MinIO via Docker)

O MinIO é iniciado via `pnpm infra:up` (definido em `infra/docker-compose.yml`):

- API S3: `http://localhost:9000`
- Console web: `http://localhost:9001`
- Credenciais padrão: `minioadmin` / `minioadmin`
- Bucket: `regcheck` (criado automaticamente na primeira execução)

### Troca para produção (AWS S3)

Para usar AWS S3 em produção, basta configurar as variáveis de ambiente — nenhuma mudança de código é necessária:

```env
S3_ENDPOINT=           # deixar vazio para usar endpoint padrão da AWS
S3_REGION=us-east-1
S3_ACCESS_KEY=AKIA...
S3_SECRET_KEY=...
S3_BUCKET=regcheck-prod
```

## Alternativas Consideradas

- **Base64 no banco de dados** — armazenar arquivos como strings base64 em colunas `TEXT` do PostgreSQL. Descartado porque aumenta drasticamente o tamanho do banco, degrada performance de queries não relacionadas a arquivos, e torna inviável o streaming de PDFs grandes. Um PDF de 5MB vira ~6.7MB de texto no banco.

- **Filesystem local** — salvar arquivos em disco no servidor da API (ex: `uploads/`). Descartado porque o worker roda em processo separado e pode rodar em máquina diferente em produção; não funciona com múltiplas instâncias da API; arquivos são perdidos em redeploys de containers sem volumes persistentes configurados.

- **Cloudinary** — serviço de CDN e transformação de imagens. Descartado porque é otimizado para imagens e vídeos, não para PDFs; adiciona latência de rede para o worker que precisa baixar PDFs frequentemente; custo por transformação não se aplica ao caso de uso do RegCheck; e a API proprietária dificultaria a troca de provedor no futuro.

## Consequências

- **MinIO como dependência de infra local** — o ambiente de desenvolvimento requer Docker para subir o MinIO via `pnpm infra:up`. Sem o MinIO rodando, uploads e geração de PDF falham. O `docker-compose.yml` em `infra/` gerencia essa dependência junto com PostgreSQL e Redis.

- **`fileKey` armazenado no banco** — o banco de dados armazena apenas a chave do objeto (`fileKey`), não o conteúdo binário. O campo `PdfFile.fileKey` referencia o PDF base; `FilledField.fileKey` referencia imagens de campos; `Document.generatedFileKey` referencia o PDF gerado. Isso mantém o banco leve e permite mover arquivos entre buckets/regiões sem alterar registros.

- **URLs pré-assinadas para download seguro** — o bucket `regcheck` não é público. O acesso a arquivos é feito exclusivamente via `getPresignedUrl(key, expiresIn)`, que gera URLs temporárias assinadas com as credenciais do servidor. Por padrão, as URLs expiram em 1 hora (`expiresIn = 3600`). Isso evita exposição direta das credenciais S3 ao cliente.

- **`forcePathStyle: true` obrigatório para MinIO** — o MinIO usa path-style URLs (`http://localhost:9000/regcheck/key`) em vez de virtual-hosted-style (`http://regcheck.localhost:9000/key`). A flag `forcePathStyle: true` no `S3Client` é necessária em desenvolvimento mas inofensiva em produção com AWS S3.
