/**
 * Documentation Index Generator
 *
 * Generates the main README.md index for all documentation files.
 */

import type { DocGenerator } from './types';
import { heading, list, link } from '../markdown-formatter';

/**
 * Document entry for index
 */
export interface DocumentEntry {
  filename: string;
  title: string;
  description: string;
  category: string;
}

/**
 * Index input
 */
export interface IndexInput {
  documents: DocumentEntry[];
  generatedAt: string;
}

/**
 * Generates documentation index (README.md)
 */
export const generateIndexDocs: DocGenerator<IndexInput> = (input) => {
  let markdown = '';

  // Title
  markdown += heading('Documentação Técnica - RegCheck', 1);
  markdown += 'Documentação completa do sistema RegCheck gerada automaticamente.\n\n';
  markdown += `**Última atualização:** ${new Date(input.generatedAt).toLocaleString('pt-BR')}\n\n`;

  // How to use
  markdown += heading('Como Usar Esta Documentação', 2);
  markdown +=
    'A documentação está organizada por categorias. Recomendamos a seguinte ordem de leitura:\n\n';
  markdown += list(
    [
      '**Arquitetura**: Entenda a estrutura geral do sistema',
      '**Stack Tecnológica**: Conheça as tecnologias utilizadas',
      '**Infraestrutura**: Configure o ambiente de desenvolvimento',
      '**Modelagem de Dados**: Compreenda o modelo de dados',
      '**API Reference**: Consulte os endpoints disponíveis',
      '**Códigos de Erro**: Entenda os erros da API',
    ],
    true,
  );

  // Group documents by category
  const categories = groupByCategory(input.documents);

  // Arquitetura
  if (categories['Arquitetura']) {
    markdown += heading('Arquitetura', 2);
    markdown += generateDocumentLinks(categories['Arquitetura']);
  }

  // Desenvolvimento
  if (categories['Desenvolvimento']) {
    markdown += heading('Desenvolvimento', 2);
    markdown += generateDocumentLinks(categories['Desenvolvimento']);
  }

  // API
  if (categories['API']) {
    markdown += heading('API', 2);
    markdown += generateDocumentLinks(categories['API']);
  }

  // Processos
  if (categories['Processos']) {
    markdown += heading('Processos', 2);
    markdown += generateDocumentLinks(categories['Processos']);
  }

  // Regenerating docs
  markdown += heading('Regenerar Documentação', 2);
  markdown += 'Para regenerar esta documentação:\n\n';
  markdown += '```bash\npnpm generate:docs\n```\n\n';

  // References
  markdown += heading('Referências', 2);
  markdown += list(
    ['Código fonte: Repositório principal', 'Gerador de docs: `scripts/generate-docs.ts`'],
    false,
  );

  return markdown;
};

/**
 * Groups documents by category
 */
function groupByCategory(documents: DocumentEntry[]): Record<string, DocumentEntry[]> {
  const groups: Record<string, DocumentEntry[]> = {};

  for (const doc of documents) {
    if (!groups[doc.category]) {
      groups[doc.category] = [];
    }
    groups[doc.category]!.push(doc);
  }

  return groups;
}

/**
 * Generates links for documents
 */
function generateDocumentLinks(documents: DocumentEntry[]): string {
  return list(
    documents.map((doc) => `${link(doc.title, doc.filename)}: ${doc.description}`),
    false,
  );
}
