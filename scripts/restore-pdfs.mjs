#!/usr/bin/env node
/**
 * Faz upload dos PDFs do backup via API e atualiza as referências no banco.
 * Uso: node scripts/restore-pdfs.mjs <pasta-pdfs>
 */
import { readdirSync, readFileSync, createReadStream } from 'fs';
import { join, basename } from 'path';
import { execSync } from 'child_process';

const folder = process.argv[2];
if (!folder) {
  console.error('Uso: node scripts/restore-pdfs.mjs /tmp/regcheck-restore/minio/pdfs');
  process.exit(1);
}

const API = 'http://localhost:4000';
const DB_CONTAINER = execSync('docker ps --filter "name=postgres" --format "{{.Names}}"', { encoding: 'utf8' }).trim().split('\n')[0];
const PG_USER = 'regcheck';
const PG_DB = 'regcheck';

function psql(sql) {
  return execSync(`docker exec -i ${DB_CONTAINER} psql -U ${PG_USER} ${PG_DB} -t -c '${sql}'`, { encoding: 'utf8' }).trim();
}

const files = readdirSync(folder).filter(f => f.endsWith('.pdf'));
console.log(`\nProcessando ${files.length} arquivos...\n`);

for (const file of files) {
  const oldKey = `pdfs/${file}`;
  const filePath = join(folder, file);

  // Upload via API
  const res = execSync(
    `curl -s -X POST "${API}/api/uploads/pdf" -F "file=@${filePath};type=application/pdf"`,
    { encoding: 'utf8' }
  );
  const data = JSON.parse(res);
  if (!data.success) {
    console.error(`✗ ${file}: ${JSON.stringify(data.error)}`);
    continue;
  }

  const newKey = data.data.fileKey;

  // Atualiza pdf_files — usa $$ para evitar problemas com aspas
  const sql = `UPDATE pdf_files SET "fileKey" = '${newKey}' WHERE "fileKey" = '${oldKey}'`;
  execSync(`docker exec -i ${DB_CONTAINER} psql -U ${PG_USER} ${PG_DB} -t`, {
    input: sql,
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'inherit'],
  });

  console.log(`✓ ${oldKey} → ${newKey}`);
}

console.log('\nDone.\n');
