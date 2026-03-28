#!/usr/bin/env node
/**
 * Exporta o banco PostgreSQL + arquivos MinIO para um zip.
 * Uso: node scripts/db-export.mjs
 * Saída: backups/backup-<timestamp>.zip
 */

import { execSync } from 'child_process';
import { mkdirSync, rmSync, existsSync, writeFileSync } from 'fs';
import { join, resolve } from 'path';
import { platform } from 'os';

// No Windows o docker roda via WSL (igual ao scripts/docker.mjs)
const IS_WINDOWS = process.platform === 'win32';
const docker = IS_WINDOWS ? 'wsl -- docker' : 'docker';

const BACKUP_DIR = resolve('backups');
const TIMESTAMP = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const TMP_DIR = join(BACKUP_DIR, `.tmp-${TIMESTAMP}`);
const OUTPUT_ZIP = join(BACKUP_DIR, `backup-${TIMESTAMP}.zip`);

const POSTGRES_USER = 'regcheck';
const POSTGRES_DB = 'regcheck';
const MINIO_BUCKET = 'regcheck';

function run(cmd, opts = {}) {
  console.log(`  $ ${cmd}`);
  execSync(cmd, { stdio: 'inherit', shell: true, ...opts });
}

function getContainer(name) {
  try {
    const out = execSync(`${docker} ps --filter "name=${name}" --format "{{.Names}}"`, {
      encoding: 'utf8', shell: true,
    }).trim();
    return out.split('\n').filter(Boolean)[0] || name;
  } catch {
    return name;
  }
}

function toWslPath(winPath) {
  // Converte C:\foo\bar -> /mnt/c/foo/bar
  return winPath.replace(/\\/g, '/').replace(/^([A-Za-z]):/, (_, d) => `/mnt/${d.toLowerCase()}`);
}

function compress(sourceDir, outputZip) {
  if (IS_WINDOWS) {
    run(`powershell -Command "Compress-Archive -Path '${sourceDir}\\*' -DestinationPath '${outputZip}' -Force"`);
  } else {
    run(`zip -r "${outputZip}" .`, { cwd: sourceDir });
  }
}

async function main() {
  mkdirSync(TMP_DIR, { recursive: true });

  const pgContainer = getContainer('postgres');
  const minioContainer = getContainer('minio');

  // 1. Dump do PostgreSQL
  console.log('\n📦 Exportando banco de dados (PostgreSQL)...');
  const sqlFile = join(TMP_DIR, 'database.sql');
  // Captura o dump direto no Node para evitar problemas com redirecionamento no Windows
  const dump = execSync(`${docker} exec ${pgContainer} pg_dump -U ${POSTGRES_USER} ${POSTGRES_DB}`, {
    shell: true,
    maxBuffer: 512 * 1024 * 1024, // 512MB
  });
  writeFileSync(sqlFile, dump);
  console.log('  ✓ dump gerado');

  // 2. Arquivos do MinIO
  console.log('\n🗂️  Exportando arquivos (MinIO)...');
  const minioDir = join(TMP_DIR, 'minio');
  mkdirSync(minioDir, { recursive: true });
  const minioDirWsl = IS_WINDOWS ? toWslPath(minioDir) : minioDir;
  try {
    run(
      `${docker} run --rm --network infra_default ` +
      `-v "${minioDirWsl}:/backup" ` +
      `--entrypoint sh minio/mc:latest -c ` +
      `"mc alias set local http://minio:9000 minioadmin minioadmin && mc mirror local/${MINIO_BUCKET} /backup --overwrite"`
    );
    console.log('  ✓ arquivos exportados');
  } catch {
    console.warn('  ⚠️  MinIO vazio ou offline, continuando sem arquivos...');
  }

  // 3. Compactar
  console.log('\n🗜️  Compactando...');
  compress(TMP_DIR, OUTPUT_ZIP);
  console.log('  ✓ zip criado');

  // 4. Limpar tmp
  rmSync(TMP_DIR, { recursive: true, force: true });

  console.log(`\n✅ Backup salvo em: ${OUTPUT_ZIP}`);
  console.log('   Para restaurar: node scripts/db-import.mjs ' + `backup-${TIMESTAMP}.zip\n`);
}

main().catch((e) => {
  console.error('\n❌ Erro:', e.message);
  rmSync(TMP_DIR, { recursive: true, force: true });
  process.exit(1);
});
