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

  // Windows: Docker roda dentro do WSL2, precisa do IP do WSL2
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

function getWindowsLocalIP() {
  try {
    const output = execSync('ipconfig', { encoding: 'utf8' });
    const matches = [...output.matchAll(/IPv4[^:]+:\s*([\d.]+)/g)];
    // Pega o primeiro IP que não seja loopback nem WSL2 (172.x)
    const ip = matches
      .map(m => m[1])
      .find(ip => !ip.startsWith('127.') && !ip.startsWith('172.'));
    return ip || null;
  } catch {
    return null;
  }
}

function applyHost(content, serverHost, publicHost) {
  return content
    // DATABASE_URL, REDIS_URL, S3_ENDPOINT: substituir apenas o host interno
    .replace(/(@)localhost(:\d+)/g, `$1${serverHost}$2`)
    // URLs com // (S3_ENDPOINT, NEXT_PUBLIC_API_URL): separar por variável
    .replace(/(NEXT_PUBLIC_API_URL="https?:\/\/)localhost(:\d+)/g, `$1${publicHost}$2`)
    .replace(/(\/\/)localhost(:\d+)/g, `//${serverHost}$2`);
}

// On Windows, the API runs natively (not inside WSL), so Docker ports are
// reachable via localhost (Windows automatically forwards WSL2 exposed ports).
// The WSL2 IP is only needed when the consumer runs *inside* WSL.
const host = process.platform === 'win32' ? 'localhost' : getDockerHost();
const publicHost = process.platform !== 'linux' ? (getWindowsLocalIP() || host) : host;

if (publicHost !== host) {
  console.log(`[setup-env] IP público (mobile/browser): ${publicHost}`);
}

const rootEnv = readFileSync(resolve(root, '.env'), 'utf8');
const patched = applyHost(rootEnv, host, publicHost);

// Escreve .env local para a API
writeFileSync(resolve(root, 'apps/api/.env'), patched);
// Escreve .env local para o database (Prisma)
writeFileSync(resolve(root, 'packages/database/.env'), patched);

// Escreve .env.local para o web (Next.js lê este arquivo com prioridade máxima)
// Só precisa sobrescrever NEXT_PUBLIC_API_URL com o IP público correto
writeFileSync(
  resolve(root, 'apps/web/.env.local'),
  `# Gerado automaticamente por setup-env.mjs - nao commitar\nNEXT_PUBLIC_API_URL="http://${publicHost}:4000"\n`
);

console.log(`[setup-env] .env gerado com host: ${host}`);
