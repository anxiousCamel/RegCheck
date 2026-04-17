#!/usr/bin/env node
/**
 * Restaura o banco PostgreSQL + arquivos MinIO a partir de um zip gerado pelo db-export.
 * Uso: node scripts/db-import.mjs <arquivo.zip>
 *      node scripts/db-import.mjs backups/backup-2026-03-28T12-00-00.zip
 *
 * IMPORTANTE — MinIO no Linux/Podman:
 *   Copiar arquivos diretamente no volume do MinIO NÃO funciona — o MinIO não indexa
 *   arquivos adicionados fora da sua API. O script faz upload via API da aplicação
 *   (POST /api/uploads/pdf) e atualiza as referências no banco automaticamente.
 *   A API precisa estar rodando em http://localhost:4000 durante o import.
 */

import { execSync } from 'child_process';
import { mkdirSync, rmSync, existsSync, readFileSync, readdirSync } from 'fs';
import { join, resolve, basename } from 'path';

const IS_WINDOWS = process.platform === 'win32';
const docker = 'docker';

const POSTGRES_USER = 'regcheck';
const POSTGRES_DB = 'regcheck';
const API_URL = process.env.API_URL ?? 'http://localhost:4000';

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
    return out.split('\n').filter(Boolean)[0] || `regcheck-${name}`;
  } catch {
    return `regcheck-${name}`;
  }
}

function extract(zipFile, destDir) {
  if (IS_WINDOWS) {
    run(`powershell -Command "Expand-Archive -Path '${zipFile}' -DestinationPath '${destDir}' -Force"`);
  } else {
    // exit code 1 = warnings only (e.g. backslash separators from Windows zips), still ok
    try {
      run(`unzip -o "${zipFile}" -d "${destDir}"`);
    } catch (e) {
      if (!existsSync(join(destDir, 'database.sql'))) throw e;
      console.warn('  ⚠️  unzip retornou warnings, mas arquivos foram extraídos com sucesso.');
    }
  }
}

function psql(pgContainer, sql) {
  return execSync(`${docker} exec -i ${pgContainer} psql -U ${POSTGRES_USER} ${POSTGRES_DB} -t`, {
    input: sql,
    encoding: 'utf8',
    shell: true,
    stdio: ['pipe', 'pipe', 'inherit'],
  }).trim();
}

/**
 * Faz upload de um PDF via API e retorna a nova fileKey gerada.
 * Necessário porque o MinIO não indexa arquivos copiados diretamente no volume.
 */
function uploadPdf(filePath) {
  const result = execSync(
    `curl -s -X POST "${API_URL}/api/uploads/pdf" -F "file=@${filePath};type=application/pdf"`,
    { encoding: 'utf8', shell: true }
  );
  const data = JSON.parse(result);
  if (!data.success) throw new Error(`Upload falhou: ${JSON.stringify(data.error)}`);
  return data.data.fileKey;
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
  // Drop e recria o schema público para limpar tudo antes de restaurar
  execSync(`${docker} exec -i ${pgContainer} psql -U ${POSTGRES_USER} ${POSTGRES_DB} -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"`, {
    shell: true,
    stdio: 'inherit',
  });
  const sqlContent = readFileSync(sqlFile);
  execSync(`${docker} exec -i ${pgContainer} psql -U ${POSTGRES_USER} ${POSTGRES_DB}`, {
    input: sqlContent,
    shell: true,
    stdio: ['pipe', 'inherit', 'inherit'],
    maxBuffer: 512 * 1024 * 1024,
  });
  console.log('  ✓ banco restaurado');

  // 3. Restaurar arquivos MinIO via API
  // O MinIO não indexa arquivos copiados diretamente no volume — é necessário
  // fazer upload via API, que gera uma nova key, e atualizar as referências no banco.
  const pdfsDir = join(TMP_DIR, 'minio', 'pdfs');
  if (existsSync(pdfsDir)) {
    console.log('\n🗂️  Restaurando PDFs (via API)...');

    // Verifica se a API está acessível
    try {
      execSync(`curl -sf "${API_URL}/api/templates?page=1&pageSize=1" -o /dev/null`, { shell: true });
    } catch {
      console.error(`❌ API não acessível em ${API_URL}. Suba a aplicação com 'pnpm dev:all' e tente novamente.`);
      process.exit(1);
    }

    const files = readdirSync(pdfsDir).filter(f => f.endsWith('.pdf'));
    for (const file of files) {
      const oldKey = `pdfs/${file}`;
      const filePath = join(pdfsDir, file);

      try {
        const newKey = uploadPdf(filePath);

        // O upload já criou um novo registro em pdf_files com a nova key.
        // Atualiza templates que referenciam o pdf_file com a oldKey para apontar
        // para o novo registro.
        psql(pgContainer, `
          UPDATE templates
          SET "pdfFileId" = (SELECT id FROM pdf_files WHERE "fileKey" = '${newKey}')
          WHERE "pdfFileId" = (SELECT id FROM pdf_files WHERE "fileKey" = '${oldKey}');
        `);

        // Remove o registro antigo de pdf_files (agora órfão)
        psql(pgContainer, `DELETE FROM pdf_files WHERE "fileKey" = '${oldKey}';`);

        console.log(`  ✓ ${oldKey} → ${newKey}`);
      } catch (e) {
        console.warn(`  ⚠️  ${file}: ${e.message}`);
      }
    }
    console.log('  ✓ PDFs restaurados');
  } else {
    console.log('\n⚠️  Sem pasta minio/pdfs no backup, pulando restauração de arquivos.');
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
