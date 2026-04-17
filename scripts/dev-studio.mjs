#!/usr/bin/env node
/**
 * Script completo de desenvolvimento com Prisma Studio
 * - Para containers existentes
 * - Sobe infraestrutura
 * - Aguarda serviços
 * - Roda migrações do Prisma
 * - Inicia API, Web e Prisma Studio
 */
import { spawnSync, spawn } from 'node:child_process';

const log = (msg) => console.log(`\n🚀 [dev-studio] ${msg}\n`);
const error = (msg) => console.error(`\n❌ [dev-studio] ${msg}\n`);

function run(cmd, args = [], options = {}) {
  const result = spawnSync(cmd, args, { 
    stdio: 'inherit', 
    shell: true,
    ...options 
  });
  
  if (result.error) {
    error(`Falha ao executar: ${cmd} ${args.join(' ')}`);
    throw result.error;
  }
  
  return result.status;
}

async function main() {
  try {
    // 1. Parar todos os containers Docker
    log('Parando containers existentes...');
    const psResult = spawnSync('docker', ['ps', '-q'], { 
      encoding: 'utf-8',
      shell: true,
      stdio: 'pipe'
    });
    
    if (psResult.stdout && psResult.stdout.trim()) {
      const containerIds = psResult.stdout.trim().split('\n');
      for (const id of containerIds) {
        spawnSync('docker', ['stop', id], { shell: true, stdio: 'inherit' });
      }
    }

    // 2. Subir infraestrutura
    log('Subindo infraestrutura (Postgres, Redis, MinIO)...');
    const infraStatus = run('pnpm', ['infra:up']);
    if (infraStatus !== 0) {
      error('Falha ao subir infraestrutura');
      process.exit(1);
    }

    // 3. Aguardar serviços
    log('Aguardando Postgres e Redis ficarem prontos...');
    const waitStatus = run('pnpm', ['wait:infra']);
    if (waitStatus !== 0) {
      error('Timeout aguardando infraestrutura');
      process.exit(1);
    }

    // 4. Setup de variáveis de ambiente
    log('Configurando variáveis de ambiente...');
    run('pnpm', ['setup:env']);

    // 5. Gerar cliente Prisma
    log('Gerando cliente Prisma...');
    run('pnpm', ['db:generate']);

    // 6. Rodar migrações
    log('Aplicando migrações do banco de dados...');
    run('pnpm', ['db:push']);

    // 7. Iniciar aplicações com Studio
    log('Iniciando API, Web e Prisma Studio...');
    log('Prisma Studio: http://localhost:5555');
    log('Pressione Ctrl+C para parar todos os serviços');
    
    const devProcess = spawn('pnpm', ['up:studio'], {
      stdio: 'inherit',
      shell: true
    });

    // Capturar Ctrl+C para limpar
    process.on('SIGINT', () => {
      log('Parando serviços...');
      devProcess.kill('SIGINT');
      process.exit(0);
    });

    devProcess.on('exit', (code) => {
      process.exit(code || 0);
    });

  } catch (err) {
    error(`Erro: ${err.message}`);
    process.exit(1);
  }
}

main();
