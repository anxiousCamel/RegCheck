#!/usr/bin/env node
/**
 * Script completo de desenvolvimento
 * - Para containers existentes
 * - Sobe infraestrutura
 * - Aguarda serviços
 * - Roda migrações do Prisma
 * - Inicia API e Web
 */
import { spawnSync, spawn } from 'node:child_process';

const log = (msg) => console.log(`\n🚀 [dev-full] ${msg}\n`);
const error = (msg) => console.error(`\n❌ [dev-full] ${msg}\n`);

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
    run('docker', ['ps', '-q'], { stdio: 'pipe' });
    const psResult = spawnSync('docker', ['ps', '-q'], { 
      encoding: 'utf-8',
      shell: true 
    });
    
    if (psResult.stdout && psResult.stdout.trim()) {
      run('docker', ['stop', '$(docker ps -q)']);
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

    // 7. Iniciar aplicações
    log('Iniciando API e Web...');
    log('Pressione Ctrl+C para parar todos os serviços');
    
    const devProcess = spawn('pnpm', ['dev:all'], {
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
