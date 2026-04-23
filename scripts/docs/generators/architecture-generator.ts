/**
 * Architecture Documentation Generator
 * 
 * Generates architecture documentation describing the system structure,
 * layers, and component responsibilities.
 */

import type { DocGenerator } from './types';
import { heading, codeBlock, list, mermaidDiagram } from '../markdown-formatter';

/**
 * Architecture documentation input (static, no parser needed)
 */
export interface ArchitectureInput {
  projectName: string;
  generatedAt: string;
}

/**
 * Generates architecture documentation
 */
export const generateArchitectureDocs: DocGenerator<ArchitectureInput> = (input) => {
  let markdown = '';
  
  // Title and introduction
  markdown += heading('Arquitetura do Sistema', 1);
  markdown += 'Este documento descreve a arquitetura do sistema RegCheck, incluindo estrutura, camadas e responsabilidades dos componentes.\n\n';
  
  markdown += `**Gerado em:** ${new Date(input.generatedAt).toLocaleString('pt-BR')}\n\n`;
  
  // Architecture type
  markdown += heading('Tipo de Arquitetura', 2);
  markdown += '**Monorepo Modular**\n\n';
  markdown += 'O projeto utiliza uma arquitetura de monorepo com múltiplos pacotes e aplicações organizados em um único repositório.\n\n';
  
  // Monorepo structure diagram
  markdown += heading('Estrutura do Monorepo', 2);
  const monorepoStructure = `
graph TD
    Root[RegCheck Monorepo]
    Root --> Apps[apps/]
    Root --> Packages[packages/]
    Root --> Infra[infra/]
    Root --> Scripts[scripts/]
    
    Apps --> API[api - Backend Express]
    Apps --> Web[web - Frontend Next.js]
    
    Packages --> Database[database - Prisma]
    Packages --> Types[types - TypeScript types]
    Packages --> Utils[utils - Shared utilities]
    
    Infra --> Docker[docker-compose.yml]
    
    Scripts --> Docs[docs/ - Generators]
`;
  markdown += mermaidDiagram('graph', monorepoStructure);
  
  // Architectural layers
  markdown += heading('Camadas Arquiteturais', 2);
  
  markdown += heading('1. Aplicações (apps/)', 3);
  markdown += list([
    '**api**: Backend REST API construído com Express.js',
    '**web**: Frontend SPA construído com Next.js 14',
  ], false);
  
  markdown += heading('2. Pacotes Compartilhados (packages/)', 3);
  markdown += list([
    '**database**: Schema Prisma e cliente de banco de dados',
    '**types**: Tipos TypeScript compartilhados entre apps',
    '**utils**: Funções utilitárias reutilizáveis',
  ], false);
  
  markdown += heading('3. Infraestrutura (infra/)', 3);
  markdown += list([
    'Configuração Docker Compose para serviços locais',
    'PostgreSQL, Redis, MinIO',
  ], false);
  
  // Technology stack by layer
  markdown += heading('Stack Tecnológica por Camada', 2);
  const stackDiagram = `
graph LR
    Frontend[Frontend Layer]
    Backend[Backend Layer]
    Data[Data Layer]
    Infra[Infrastructure Layer]
    
    Frontend --> NextJS[Next.js 14]
    Frontend --> React[React 18]
    Frontend --> Konva[Konva Canvas]
    
    Backend --> Express[Express.js]
    Backend --> Prisma[Prisma ORM]
    Backend --> BullMQ[BullMQ]
    
    Data --> PostgreSQL[PostgreSQL 16]
    Data --> Redis[Redis 7]
    
    Infra --> Docker[Docker Compose]
    Infra --> MinIO[MinIO S3]
`;
  markdown += mermaidDiagram('graph', stackDiagram);
  
  // Application flow
  markdown += heading('Fluxo Geral da Aplicação', 2);
  markdown += 'O sistema segue o fluxo:\n\n';
  markdown += list([
    '**Upload**: Usuário faz upload de PDF',
    '**Template**: Sistema cria template baseado no PDF',
    '**Edição**: Usuário configura campos no template',
    '**Documento**: Usuário cria documento a partir do template',
    '**Preenchimento**: Sistema ou usuário preenche campos',
    '**PDF**: Sistema gera PDF final com dados preenchidos',
  ], true);
  
  // Component responsibilities
  markdown += heading('Responsabilidades dos Componentes', 2);
  
  markdown += heading('Backend (API)', 3);
  markdown += list([
    'Gerenciar templates e documentos',
    'Processar uploads de PDF',
    'Validar dados com Zod',
    'Gerar PDFs em background (BullMQ)',
    'Armazenar arquivos no MinIO',
    'Persistir dados no PostgreSQL',
  ], false);
  
  markdown += heading('Frontend (Web)', 3);
  markdown += list([
    'Interface de edição de templates (Konva)',
    'Formulários de preenchimento de documentos',
    'Visualização de PDFs (pdf.js)',
    'Gerenciamento de estado (Zustand)',
    'Cache de requisições (TanStack Query)',
  ], false);
  
  markdown += heading('Database', 3);
  markdown += list([
    'Schema Prisma com 10 modelos',
    'Migrações de banco de dados',
    'Cliente TypeScript type-safe',
  ], false);
  
  // References
  markdown += heading('Referências', 2);
  markdown += list([
    'Estrutura do projeto: Diretório raiz',
    'Configuração do monorepo: `package.json`, `turbo.json`',
    'Docker Compose: `infra/docker-compose.yml`',
  ], false);
  
  return markdown;
};
