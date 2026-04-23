/**
 * Infrastructure Documentation Generator
 */

import type { DocGenerator } from './types';
import { heading, codeBlock, table, list } from '../markdown-formatter';

export interface InfrastructureInput {
  projectName: string;
  generatedAt: string;
}

export const generateInfrastructureDocs: DocGenerator<InfrastructureInput> = (input) => {
  let markdown = '';
  
  markdown += heading('Infraestrutura', 1);
  markdown += 'Documentação da infraestrutura local e serviços do RegCheck.\n\n';
  markdown += `**Gerado em:** ${new Date(input.generatedAt).toLocaleString('pt-BR')}\n\n`;
  
  // Docker Compose setup
  markdown += heading('Docker Compose', 2);
  markdown += 'O projeto utiliza Docker Compose para gerenciar serviços locais:\n\n';
  markdown += list([
    '**PostgreSQL 16**: Banco de dados principal',
    '**Redis 7**: Cache e filas',
    '**MinIO**: Object storage S3-compatible',
  ], false);
  
  // Service ports
  markdown += heading('Portas dos Serviços', 2);
  const portsTable = [
    ['PostgreSQL', '5432', 'Banco de dados'],
    ['Redis', '6379', 'Cache e filas'],
    ['MinIO API', '9000', 'S3 API'],
    ['MinIO Console', '9001', 'Interface web'],
    ['API Backend', '4000', 'REST API'],
    ['Web Frontend', '3000', 'Aplicação web'],
    ['Prisma Studio', '5555', 'Database GUI'],
  ];
  markdown += table(['Serviço', 'Porta', 'Descrição'], portsTable);
  
  // Environment variables
  markdown += heading('Variáveis de Ambiente', 2);
  
  markdown += heading('Root .env', 3);
  markdown += codeBlock(`DATABASE_URL=postgresql://postgres:postgres@localhost:5432/regcheck
REDIS_URL=redis://localhost:6379
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin`, 'bash');
  
  markdown += heading('apps/api/.env', 3);
  markdown += codeBlock(`PORT=4000
NODE_ENV=development
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/regcheck
REDIS_URL=redis://localhost:6379`, 'bash');
  
  markdown += heading('apps/web/.env.local', 3);
  markdown += codeBlock(`NEXT_PUBLIC_API_URL=http://localhost:4000/api`, 'bash');
  
  // Local development setup
  markdown += heading('Setup Local', 2);
  markdown += list([
    'Clonar repositório',
    'Instalar dependências: `pnpm install`',
    'Copiar `.env.example` para `.env`',
    'Iniciar serviços: `docker-compose up -d`',
    'Executar migrações: `pnpm db:migrate`',
    'Iniciar aplicações: `pnpm dev`',
  ], true);
  
  // Available scripts
  markdown += heading('Scripts Disponíveis', 2);
  const scriptsTable = [
    ['pnpm dev', 'Inicia API e Web em modo desenvolvimento'],
    ['pnpm dev:api', 'Inicia apenas API'],
    ['pnpm dev:web', 'Inicia apenas Web'],
    ['pnpm build', 'Build de produção'],
    ['pnpm test', 'Executa testes'],
    ['pnpm db:migrate', 'Executa migrações Prisma'],
    ['pnpm db:studio', 'Abre Prisma Studio'],
    ['pnpm generate:docs', 'Gera documentação'],
  ];
  markdown += table(['Comando', 'Descrição'], scriptsTable);
  
  // Troubleshooting
  markdown += heading('Troubleshooting', 2);
  
  markdown += heading('Conflito de Portas', 3);
  markdown += 'Se alguma porta estiver em uso, edite `docker-compose.yml` ou pare o serviço conflitante.\n\n';
  
  markdown += heading('MinIO não Inicia', 3);
  markdown += 'Verifique permissões da pasta de dados ou remova volumes: `docker-compose down -v`\n\n';
  
  markdown += heading('Erro em Migrações Prisma', 3);
  markdown += 'Reset do banco: `pnpm db:reset` (⚠️ apaga todos os dados)\n\n';
  
  // Deployment
  markdown += heading('Estratégia de Deploy', 2);
  markdown += '**Status:** não identificado\n\n';
  
  // References
  markdown += heading('Referências', 2);
  markdown += list([
    'Docker Compose: `infra/docker-compose.yml`',
    'Variáveis de ambiente: `.env.example`',
  ], false);
  
  return markdown;
};
