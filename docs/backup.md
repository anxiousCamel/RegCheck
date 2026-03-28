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

Na máquina de destino, com a infra rodando:

```bash
pnpm db:import backups/backup-<timestamp>.zip
```

Ou com o caminho completo do arquivo:

```bash
node scripts/db-import.mjs /caminho/para/backup-2026-03-28T12-00-00.zip
```

O script vai:
1. Extrair o zip
2. Restaurar o banco no PostgreSQL existente (sobrescreve os dados atuais)
3. Restaurar os arquivos no MinIO

> ⚠️ A restauração sobrescreve os dados atuais do banco. Use com cuidado em ambientes com dados que não devem ser perdidos.

---

## Pré-requisitos

- Docker rodando com os containers `postgres` e `minio` ativos
- Node.js >= 20
- Windows: usa `Compress-Archive` / `Expand-Archive` (nativo no PowerShell)
- Linux/Mac: requer `zip` e `unzip` instalados
