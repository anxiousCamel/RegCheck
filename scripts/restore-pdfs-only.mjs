#!/usr/bin/env node
/**
 * Restaura apenas os PDFs do backup, sem mexer no banco
 */
import { execSync } from 'child_process';
import { mkdirSync, rmSync, existsSync, readdirSync } from 'fs';
import { join, resolve, basename } from 'path';

const docker = 'docker';
const API_URL = process.env.API_URL ?? 'http://localhost:4000';

const zipArg = process.argv[2];
if (!zipArg) {
  console.error('❌ Informe o arquivo zip: node scripts/restore-pdfs-only.mjs <arquivo.zip>');
  process.exit(1);
}

const ZIP_FILE = resolve(zipArg);
if (!existsSync(ZIP_FILE)) {
  console.error(`❌ Arquivo não encontrado: ${ZIP_FILE}`);
  process.exit(1);
}

const TMP_DIR = resolve(`backups/.tmp-pdfs-${Date.now()}`);

function run(cmd, opts = {}) {
  console.log(`  $ ${cmd}`);
  execSync(cmd, { stdio: 'inherit', shell: true, ...opts });
}

function extract(zipFile, destDir) {
  run(`powershell -Command "Expand-Archive -Path '${zipFile}' -DestinationPath '${destDir}' -Force"`);
}

function uploadPdf(filePath) {
  const result = execSync(
    `curl -s -X POST "${API_URL}/api/uploads/pdf" -F "file=@${filePath};type=application/pdf"`,
    { encoding: 'utf8', shell: true }
  );
  const data = JSON.parse(result);
  if (!data.success) throw new Error(`Upload falhou: ${JSON.stringify(data.error)}`);
  return data.data.fileKey;
}

function psql(sql) {
  return execSync(`${docker} exec -i regcheck-postgres psql -U regcheck regcheck -t`, {
    input: sql,
    encoding: 'utf8',
    shell: true,
    stdio: ['pipe', 'pipe', 'inherit'],
  }).trim();
}

async function main() {
  mkdirSync(TMP_DIR, { recursive: true });

  console.log(`\n📂 Extraindo ${basename(ZIP_FILE)}...`);
  extract(ZIP_FILE, TMP_DIR);
  console.log('  ✓ extraído');

  const pdfsDir = join(TMP_DIR, 'minio', 'pdfs');
  if (!existsSync(pdfsDir)) {
    console.log('\n⚠️  Sem pasta minio/pdfs no backup.');
    rmSync(TMP_DIR, { recursive: true, force: true });
    process.exit(0);
  }

  console.log('\n🗂️  Restaurando PDFs (via API)...');

  // Verifica se a API está acessível
  try {
    execSync(`curl -sf "${API_URL}/api/templates?page=1&pageSize=1" -o nul`, { shell: true });
  } catch {
    console.error(`❌ API não acessível em ${API_URL}. Certifique-se que a API está rodando.`);
    rmSync(TMP_DIR, { recursive: true, force: true });
    process.exit(1);
  }

  const files = readdirSync(pdfsDir).filter(f => f.endsWith('.pdf'));
  console.log(`  Encontrados ${files.length} PDFs para restaurar`);

  for (const file of files) {
    const oldKey = `pdfs/${file}`;
    const filePath = join(pdfsDir, file);

    try {
      const newKey = uploadPdf(filePath);

      // Atualiza templates que referenciam o pdf_file antigo
      psql(`
        UPDATE templates
        SET "pdfFileId" = (SELECT id FROM pdf_files WHERE "fileKey" = '${newKey}')
        WHERE "pdfFileId" = (SELECT id FROM pdf_files WHERE "fileKey" = '${oldKey}');
      `);

      // Remove o registro antigo
      psql(`DELETE FROM pdf_files WHERE "fileKey" = '${oldKey}';`);

      console.log(`  ✓ ${file}`);
    } catch (e) {
      console.warn(`  ⚠️  ${file}: ${e.message}`);
    }
  }

  rmSync(TMP_DIR, { recursive: true, force: true });
  console.log('\n✅ PDFs restaurados!\n');
}

main().catch((e) => {
  console.error('\n❌ Erro:', e.message);
  rmSync(TMP_DIR, { recursive: true, force: true });
  process.exit(1);
});
