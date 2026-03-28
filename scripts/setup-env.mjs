#!/usr/bin/env node
/**
 * Detecta o host correto para serviços Docker dependendo do ambiente:
 * - Linux nativo: localhost
 * - Windows com Docker no WSL2: IP do WSL2 (muda a cada boot)
 *
 * Gera apps/api/.env e packages/database/.env com o host correto.
 */

import { execSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

function getDockerHost() {
  // Linux nativo: Docker roda local, usa localhost
  if (process.platform === 'linux') return 'localhost';

  // Windows: tenta pegar o IP do WSL2
  try {
    const ip = execSync('wsl hostname -I', { encoding: 'utf8' })
      .trim()
      .split(' ')[0];
    if (ip) {
      console.log(`[setup-env] WSL2 detectado, usando host: ${ip}`);
      return ip;
    }
  } catch {
    // WSL não disponível, usa localhost
  }

  return 'localhost';
}

function applyHost(content, host) {
  return content
    .replace(/(@)localhost(:\d+)/g, `$1${host}$2`)
    .replace(/(\/\/)localhost(:\d+)/g, `//${host}$2`);
}

const host = getDockerHost();
const rootEnv = readFileSync(resolve(root, '.env'), 'utf8');
const patched = applyHost(rootEnv, host);

// Escreve .env local para a API
writeFileSync(resolve(root, 'apps/api/.env'), patched);
// Escreve .env local para o database (Prisma)
writeFileSync(resolve(root, 'packages/database/.env'), patched);

console.log(`[setup-env] .env gerado com host: ${host}`);
