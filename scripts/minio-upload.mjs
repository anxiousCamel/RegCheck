#!/usr/bin/env node
/**
 * Faz upload de arquivos para o MinIO usando o SDK S3.
 * Uso: node scripts/minio-upload.mjs <pasta>
 */
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { readdirSync, readFileSync } from 'fs';
import { join, basename } from 'path';

const folder = process.argv[2];
if (!folder) {
  console.error('Uso: node scripts/minio-upload.mjs <pasta>');
  process.exit(1);
}

const s3 = new S3Client({
  endpoint: process.env.S3_ENDPOINT ?? 'http://localhost:9000',
  region: process.env.S3_REGION ?? 'us-east-1',
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY ?? 'minioadmin',
    secretAccessKey: process.env.S3_SECRET_KEY ?? 'minioadmin',
  },
  forcePathStyle: true,
});

const BUCKET = 'regcheck';
const prefix = basename(folder); // 'pdfs' ou 'generated'

const files = readdirSync(folder);
for (const file of files) {
  const key = `${prefix}/${file}`;
  const body = readFileSync(join(folder, file));
  await s3.send(new PutObjectCommand({ Bucket: BUCKET, Key: key, Body: body, ContentType: 'application/pdf' }));
  console.log(`✓ ${key}`);
}
console.log(`\nDone: ${files.length} arquivos enviados.`);
