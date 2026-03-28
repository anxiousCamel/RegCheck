#!/usr/bin/env node
/**
 * Restaura o banco PostgreSQL + arquivos MinIO a partir de um zip gerado pelo db-export.
 * Uso: node scripts/db-import.mjs <arquivo.zip>
 *      node scripts/db-import.mjs backups/backup-2026-03-28T12-00-00.zip
 */

import { execSync } from 'child_process';
import { mkdirSync, rmSync, existsSync, readFileSync } from 'fs';
import { join, resolve, basename } from 'path';
import { platform } from 'os';

const IS_WINDOWS = process.platform === 'win32';
const docker = IS_WINDOWS ? 'wsl -- docker' : 'docker';

const POSTGRES_USER = 'regcheck';
const POSTGRES_DB = 'regcheck';
const MINIO_BUCKET = 'regcheck';

const zipArg = process.argv[2];
if (!zipArg) {
  console.error('❌ Informe o arquivo zip: node scripts/db-import.mjs <arquivo.zip>');
  process.exit(1);
}

const ZIP_FILE = resolve(zipArg);
if (!existsSync(ZIP_FILE)) {
  console.error(`❌ Arquivo não encontrado: ${ZIP_FILE}`);
  process.exit(1);
}

const TMP_DIR = resolve(`backups/.tmp-import-${Date.now()}`);

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
  return winPath.replace(/\\/g, '/').replace(/^([A-Za-z]):/, (_, d) => `/mnt/${d.toLowerCase()}`);
}

function extract(zipFile, destDir) {
  if (IS_WINDOWS) {
    run(`powershell -Command "Expand-Archive -Path '${zipFile}' -DestinationPath '${destDir}' -Force"`);
  } else {
    run(`unzip -o "${zipFile}" -d "${destDir}"`);
  }
}

async function main() {
  mkdirSync(TMP_DIR, { recursive: true });

  // 1. Extrair zip
  console.log(`\n📂 Extraindo ${basename(ZIP_FILE)}...`);
  extract(ZIP_FILE, TMP_DIR);
  console.log('  ✓ extraído');

  const pgContainer = getContainer('postgres');

  // 2. Restaurar banco
  const sqlFile = join(TMP_DIR, 'database.sql');
  if (!existsSync(sqlFile)) {
    console.error('❌ database.sql não encontrado no zip.');
    process.exit(1);
  }

  console.log('\n🗄️  Restaurando banco de dados...');
  const sqlContent = readFileSync(sqlFile);
  execSync(`${docker} exec -i ${pgContainer} psql -U ${POSTGRES_USER} ${POSTGRES_DB}`, {
    input: sqlContent,
    shell: true,
    stdio: ['pipe', 'inherit', 'inherit'],
    maxBuffer: 512 * 1024 * 1024,
  });
  console.log('  ✓ banco restaurado');

  // 3. Restaurar arquivos MinIO
  const minioDir = join(TMP_DIR, 'minio');
  if (existsSync(minioDir)) {
    console.log('\n🗂️  Restaurando arquivos (MinIO)...');
    const minioDirWsl = IS_WINDOWS ? toWslPath(minioDir) : minioDir;
    try {
      run(
        `${docker} run --rm --network infra_default ` +
        `-v "${minioDirWsl}:/backup" ` +
        `--entrypoint sh minio/mc:latest -c ` +
        `"mc alias set local http://minio:9000 minioadmin minioadmin && mc mirror /backup local/${MINIO_BUCKET} --overwrite"`
      );
      console.log('  ✓ arquivos restaurados');
    } catch {
      console.warn('  ⚠️  MinIO offline ou sem arquivos, pulando...');
    }
  } else {
    console.log('\n⚠️  Sem pasta minio no backup, pulando restauração de arquivos.');
  }

  // 4. Limpar tmp
  rmSync(TMP_DIR, { recursive: true, force: true });

  console.log('\n✅ Restauração concluída!\n');
}

main().catch((e) => {
  console.error('\n❌ Erro:', e.message);
  rmSync(TMP_DIR, { recursive: true, force: true });
  process.exit(1);
});
