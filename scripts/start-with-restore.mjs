#!/usr/bin/env node
/**
 * Inicia o ambiente completo e restaura o backup automaticamente
 */
import { spawnSync } from 'node:child_process';

const log = (msg) => console.log(`\n🚀 ${msg}\n`);
const error = (msg) => console.error(`\n❌ ${msg}\n`);

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

    log('Subindo infraestrutura...');
    if (run('pnpm', ['infra:up']) !== 0) {
      error('Falha ao subir infraestrutura');
      process.exit(1);
    }

    log('Aguardando serviços...');
    if (run('pnpm', ['wait:infra']) !== 0) {
      error('Timeout aguardando infraestrutura');
      process.exit(1);
    }

    log('Configurando ambiente...');
    run('pnpm', ['setup:env']);

    log('Gerando Prisma Client...');
    run('pnpm', ['db:generate']);

    log('Restaurando backup do banco de dados...');
    run('pnpm', ['db:restore']);

    log('Iniciando aplicação completa...');
    log('API: http://localhost:4000');
    log('Web: http://localhost:3000');
    log('Prisma Studio: http://localhost:5555');
    log('\nPressione Ctrl+C para parar\n');
    
    run('pnpm', ['up:studio']);

  } catch (err) {
    error(`Erro: ${err.message}`);
    process.exit(1);
  }
}

main();

