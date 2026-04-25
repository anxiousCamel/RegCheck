# Backup e Restauração

Guia para exportar os dados do ambiente local e restaurar em outra máquina.

O backup cobre:

- Banco de dados PostgreSQL (dump completo)
- Arquivos armazenados no MinIO (PDFs, imagens, assinaturas)

Os zips ficam em `backups/` que está no `.gitignore` — nunca sobem pro repositório.

---

## Exportar (gerar backup)

Com a infra rodando (`pnpm infra:up`), execute:

```bash
pnpm db:export
```

Isso gera um arquivo em `backups/backup-<timestamp>.zip` contendo:

- `database.sql` — dump completo do PostgreSQL
- `minio/` — todos os arquivos do bucket

Copie esse zip para um pendrive, Google Drive, etc.

---

## Importar (restaurar backup)

Na máquina de destino, suba a infra e a aplicação primeiro:

```bash
pnpm infra:up
pnpm dev:all   # a API precisa estar rodando em localhost:4000
```

Em outro terminal, rode o import:

```bash
pnpm db:import backups/backup-<timestamp>.zip
```

O script vai:

1. Extrair o zip
2. Restaurar o banco no PostgreSQL (sobrescreve os dados atuais)
3. Fazer upload dos PDFs via API da aplicação e atualizar as referências no banco

> ⚠️ A restauração sobrescreve os dados atuais do banco. Use com cuidado.

> ℹ️ **Por que a API precisa estar rodando?**
> O MinIO não indexa arquivos copiados diretamente no volume do container.
> O script faz upload via `POST /api/uploads/pdf`, que usa a API do MinIO corretamente,
> e atualiza as referências no banco automaticamente.

---

## Pré-requisitos

- Docker/Podman rodando com os containers `postgres`, `minio` e `redis` ativos
- Aplicação rodando (`pnpm dev:all`) — necessário para o upload dos PDFs
- Node.js >= 20
- Linux/Mac: requer `unzip` instalado
- Windows: usa `Compress-Archive` / `Expand-Archive` (nativo no PowerShell)

---

## Após o import

Rode as migrações pendentes para garantir que o schema está atualizado:

```bash
cd packages/database && npx prisma db push
```
