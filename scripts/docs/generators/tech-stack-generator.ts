/**
 * Technology Stack Documentation Generator
 * 
 * Generates comprehensive technology stack documentation listing all
 * technologies, libraries, and their purposes.
 */

import type { DocGenerator } from './types';
import { heading, table, list } from '../markdown-formatter';

/**
 * Technology stack input (static, no parser needed)
 */
export interface TechStackInput {
  projectName: string;
  generatedAt: string;
}

/**
 * Generates technology stack documentation
 */
export const generateTechStackDocs: DocGenerator<TechStackInput> = (input) => {
  let markdown = '';
  
  // Title and introduction
  markdown += heading('Stack Tecnológica', 1);
  markdown += 'Este documento descreve todas as tecnologias, bibliotecas e ferramentas utilizadas no projeto RegCheck.\n\n';
  
  markdown += `**Gerado em:** ${new Date(input.generatedAt).toLocaleString('pt-BR')}\n\n`;
  
  // Backend technologies
  markdown += heading('Backend', 2);
  markdown += generateTechnologyTable([
    ['Express.js', '4.x', 'Framework web para Node.js', 'Servidor HTTP, rotas, middleware'],
    ['Prisma', '5.x', 'ORM TypeScript-first', 'Acesso ao banco de dados, migrações, type-safety'],
    ['PostgreSQL', '16', 'Banco de dados relacional', 'Persistência de dados'],
    ['BullMQ', '5.x', 'Fila de jobs com Redis', 'Processamento assíncrono de PDFs'],
    ['Redis', '7', 'Cache e message broker', 'Cache de dados, filas BullMQ'],
    ['pdf-lib', '1.x', 'Manipulação de PDFs', 'Geração e edição de arquivos PDF'],
    ['sharp', '0.33.x', 'Processamento de imagens', 'Redimensionamento e otimização de imagens'],
    ['multer', '1.x', 'Upload de arquivos', 'Recebimento de arquivos multipart/form-data'],
    ['zod', '3.x', 'Validação de schemas', 'Validação de entrada de dados'],
    ['MinIO', 'latest', 'Object storage S3-compatible', 'Armazenamento de PDFs e imagens'],
  ]);
  
  // Frontend technologies
  markdown += heading('Frontend', 2);
  markdown += generateTechnologyTable([
    ['Next.js', '14.x', 'Framework React', 'SSR, routing, otimizações'],
    ['React', '18.x', 'Biblioteca UI', 'Componentes, hooks, estado'],
    ['TypeScript', '5.x', 'Superset JavaScript', 'Type-safety, IntelliSense'],
    ['Konva', '9.x', 'Canvas 2D', 'Editor visual de templates'],
    ['react-konva', '18.x', 'React bindings para Konva', 'Componentes React para canvas'],
    ['pdfjs-dist', '4.x', 'Renderização de PDFs', 'Visualização de PDFs no navegador'],
    ['TanStack Query', '5.x', 'Data fetching e cache', 'Gerenciamento de estado servidor'],
    ['Zustand', '4.x', 'State management', 'Estado global da aplicação'],
    ['Tailwind CSS', '3.x', 'Framework CSS utility-first', 'Estilização de componentes'],
    ['Radix UI', 'latest', 'Componentes acessíveis', 'Primitivos UI headless'],
  ]);
  
  // Infrastructure
  markdown += heading('Infraestrutura', 2);
  markdown += generateTechnologyTable([
    ['Docker', 'latest', 'Containerização', 'Ambiente de desenvolvimento isolado'],
    ['Docker Compose', 'latest', 'Orquestração de containers', 'Gerenciamento de serviços locais'],
    ['pnpm', '9.x', 'Gerenciador de pacotes', 'Instalação rápida, monorepo workspace'],
    ['Turbo', '2.x', 'Build system para monorepos', 'Cache de builds, execução paralela'],
  ]);
  
  // Shared packages
  markdown += heading('Pacotes Compartilhados', 2);
  markdown += list([
    '**@regcheck/database**: Cliente Prisma e tipos do banco',
    '**@regcheck/types**: Tipos TypeScript compartilhados',
    '**@regcheck/utils**: Funções utilitárias reutilizáveis',
  ], false);
  
  // Development tools
  markdown += heading('Ferramentas de Desenvolvimento', 2);
  markdown += generateTechnologyTable([
    ['Vitest', '1.x', 'Framework de testes', 'Testes unitários e integração'],
    ['ESLint', '8.x', 'Linter JavaScript/TypeScript', 'Qualidade e consistência de código'],
    ['Prettier', '3.x', 'Formatador de código', 'Formatação automática'],
    ['tsx', '4.x', 'Executor TypeScript', 'Execução de scripts TS'],
  ]);
  
  // Architectural patterns
  markdown += heading('Padrões Arquiteturais', 2);
  
  markdown += heading('Monorepo', 3);
  markdown += 'Organização de múltiplos pacotes em um único repositório com workspaces pnpm.\n\n';
  
  markdown += heading('Service Layer', 3);
  markdown += 'Lógica de negócio encapsulada em services, separada das rotas.\n\n';
  
  markdown += heading('Repository Pattern', 3);
  markdown += 'Acesso a dados através do Prisma Client, abstraindo queries SQL.\n\n';
  
  markdown += heading('State Management', 3);
  markdown += list([
    '**Zustand**: Estado local da aplicação (UI, preferências)',
    '**TanStack Query**: Estado servidor (cache de API)',
  ], false);
  
  markdown += heading('Validation', 3);
  markdown += 'Schemas Zod para validação de entrada em rotas e formulários.\n\n';
  
  // References
  markdown += heading('Referências', 2);
  markdown += list([
    'package.json: Dependências completas',
    'Documentação oficial de cada tecnologia',
  ], false);
  
  return markdown;
};

/**
 * Generates technology table
 */
function generateTechnologyTable(technologies: string[][]): string {
  const headers = ['Tecnologia', 'Versão', 'Descrição', 'Propósito'];
  return table(headers, technologies);
}
