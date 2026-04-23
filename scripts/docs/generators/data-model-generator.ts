/**
 * Data Model Documentation Generator
 * 
 * Generates comprehensive data model documentation from Prisma schema.
 * Includes entity descriptions, ERD diagram, field details, and relationships.
 */

import type { PrismaParserOutput, PrismaModel, PrismaEnum, PrismaRelationship } from '../prisma-parser';
import type { DocGenerator } from './types';
import { heading, codeBlock, table, list, mermaidDiagram } from '../markdown-formatter';
import { generateERD } from '../erd-generator';

/**
 * Generates data model documentation
 * 
 * @param output - Parsed Prisma schema output
 * @returns Markdown documentation string
 */
export const generateDataModelDocs: DocGenerator<PrismaParserOutput> = (output) => {
  let markdown = '';
  
  // Title and introduction
  markdown += heading('Modelagem de Dados', 1);
  markdown += 'Este documento descreve o modelo de dados do sistema RegCheck, incluindo todas as entidades, relacionamentos e enumerações.\n\n';
  
  markdown += `**Fonte:** ${output.source}\n`;
  markdown += `**Gerado em:** ${new Date(output.generatedAt).toLocaleString('pt-BR')}\n\n`;
  
  // Overview section
  markdown += heading('Visão Geral', 2);
  markdown += `O sistema possui **${output.data.models.length} entidades** e **${output.data.enums.length} enumerações**.\n\n`;
  
  // Entity list
  markdown += heading('Entidades', 3);
  markdown += list(
    output.data.models.map(m => `**${m.name}**: ${getModelDescription(m)}`),
    false
  );
  
  // ERD Diagram
  markdown += heading('Diagrama de Relacionamento (ERD)', 2);
  markdown += 'O diagrama abaixo mostra todas as entidades e seus relacionamentos:\n\n';
  markdown += mermaidDiagram('erDiagram', generateERD(output).replace('erDiagram\n', ''));
  
  // Detailed entity documentation
  markdown += heading('Detalhamento das Entidades', 2);
  for (const model of output.data.models) {
    markdown += generateModelSection(model);
  }
  
  // Enumerations
  if (output.data.enums.length > 0) {
    markdown += heading('Enumerações', 2);
    for (const enumDef of output.data.enums) {
      markdown += generateEnumSection(enumDef);
    }
  }
  
  // Relationships
  markdown += heading('Relacionamentos', 2);
  markdown += generateRelationshipsSection(output.data.relationships, output.data.models);
  
  // References
  markdown += heading('Referências', 2);
  markdown += list([
    'Schema Prisma: `packages/database/prisma/schema.prisma`',
    'Documentação Prisma: https://www.prisma.io/docs',
  ], false);
  
  return markdown;
};

/**
 * Gets a brief description of a model based on its name and fields
 */
function getModelDescription(model: PrismaModel): string {
  const descriptions: Record<string, string> = {
    Template: 'Templates de documentos PDF com campos configuráveis',
    TemplateField: 'Campos de preenchimento dos templates',
    Document: 'Documentos criados a partir de templates',
    DocumentField: 'Valores preenchidos nos campos dos documentos',
    PdfFile: 'Arquivos PDF originais enviados pelo usuário',
    Equipamento: 'Equipamentos cadastrados no sistema',
    Loja: 'Lojas onde os equipamentos estão localizados',
    Setor: 'Setores dentro das lojas',
    TipoEquipamento: 'Tipos de equipamentos',
    Upload: 'Registro de uploads de arquivos',
  };
  
  return descriptions[model.name] || 'Entidade do sistema';
}

/**
 * Generates documentation section for a single model
 */
function generateModelSection(model: PrismaModel): string {
  let markdown = '';
  
  markdown += heading(model.name, 3);
  
  if (model.comment) {
    markdown += `${model.comment}\n\n`;
  } else {
    markdown += `${getModelDescription(model)}\n\n`;
  }
  
  markdown += `**Tabela:** \`${model.tableName}\`\n\n`;
  
  // Fields table
  const headers = ['Campo', 'Tipo', 'Obrigatório', 'Descrição'];
  const rows = model.fields
    .filter(f => !f.isRelation) // Only data fields
    .map(f => [
      f.name,
      formatFieldType(f.type, f.isArray),
      f.isOptional ? 'Não' : 'Sim',
      getFieldDescription(f.name, f.isPrimaryKey, f.isUnique, f.defaultValue),
    ]);
  
  markdown += table(headers, rows);
  
  // Relation fields
  const relationFields = model.fields.filter(f => f.isRelation);
  if (relationFields.length > 0) {
    markdown += '\n**Relacionamentos:**\n\n';
    markdown += list(
      relationFields.map(f => 
        `**${f.name}**: ${f.isArray ? 'Lista de' : 'Referência para'} \`${f.relationTo}\``
      ),
      false
    );
  }
  
  return markdown;
}

/**
 * Formats field type for display
 */
function formatFieldType(type: string, isArray: boolean): string {
  const typeMap: Record<string, string> = {
    String: 'Texto',
    Int: 'Inteiro',
    Float: 'Decimal',
    Boolean: 'Booleano',
    DateTime: 'Data/Hora',
    Json: 'JSON',
  };
  
  const displayType = typeMap[type] || type;
  return isArray ? `${displayType}[]` : displayType;
}

/**
 * Gets field description based on attributes
 */
function getFieldDescription(
  name: string,
  isPrimaryKey: boolean,
  isUnique: boolean,
  defaultValue?: string
): string {
  const parts: string[] = [];
  
  if (isPrimaryKey) {
    parts.push('Chave primária');
  }
  
  if (isUnique && !isPrimaryKey) {
    parts.push('Valor único');
  }
  
  if (defaultValue) {
    parts.push(`Padrão: ${defaultValue}`);
  }
  
  // Common field descriptions
  const descriptions: Record<string, string> = {
    id: 'Identificador único',
    createdAt: 'Data de criação',
    updatedAt: 'Data de atualização',
    name: 'Nome',
    title: 'Título',
    description: 'Descrição',
    status: 'Status',
    ativo: 'Indica se está ativo',
  };
  
  if (descriptions[name]) {
    parts.unshift(descriptions[name]);
  }
  
  return parts.length > 0 ? parts.join('. ') : '-';
}

/**
 * Generates documentation section for an enum
 */
function generateEnumSection(enumDef: PrismaEnum): string {
  let markdown = '';
  
  markdown += heading(enumDef.name, 3);
  
  markdown += 'Valores possíveis:\n\n';
  markdown += list(
    enumDef.values.map(v => `**${v}**: ${getEnumValueDescription(enumDef.name, v)}`),
    false
  );
  
  return markdown;
}

/**
 * Gets description for enum values
 */
function getEnumValueDescription(enumName: string, value: string): string {
  const descriptions: Record<string, Record<string, string>> = {
    TemplateStatus: {
      DRAFT: 'Rascunho, em edição',
      PUBLISHED: 'Publicado, disponível para uso',
    },
    DocumentStatus: {
      DRAFT: 'Rascunho, em preenchimento',
      COMPLETED: 'Preenchido, pronto para gerar PDF',
      GENERATING: 'PDF em geração',
      READY: 'PDF gerado e disponível',
    },
    FieldType: {
      TEXT: 'Campo de texto livre',
      NUMBER: 'Campo numérico',
      DATE: 'Campo de data',
      CHECKBOX: 'Caixa de seleção',
      IMAGE: 'Imagem',
    },
    FieldScope: {
      GLOBAL: 'Campo global (aparece uma vez)',
      ITEM: 'Campo de item (repete para cada equipamento)',
    },
  };
  
  return descriptions[enumName]?.[value] || 'não identificado';
}

/**
 * Generates relationships section
 */
function generateRelationshipsSection(
  relationships: PrismaRelationship[],
  models: PrismaModel[]
): string {
  let markdown = '';
  
  markdown += 'O sistema possui os seguintes relacionamentos entre entidades:\n\n';
  
  const headers = ['De', 'Para', 'Tipo', 'Descrição'];
  const rows = relationships.map(rel => [
    rel.from,
    rel.to,
    formatRelationType(rel.type),
    getRelationshipDescription(rel, models),
  ]);
  
  markdown += table(headers, rows);
  
  return markdown;
}

/**
 * Formats relationship type for display
 */
function formatRelationType(type: PrismaRelationship['type']): string {
  const typeMap: Record<string, string> = {
    'one-to-many': '1:N',
    'many-to-one': 'N:1',
    'one-to-one': '1:1',
    'many-to-many': 'N:N',
  };
  
  return typeMap[type] || type;
}

/**
 * Gets relationship description
 */
function getRelationshipDescription(
  rel: PrismaRelationship,
  models: PrismaModel[]
): string {
  const descriptions: Record<string, string> = {
    'Template-PdfFile': 'Template baseado em arquivo PDF',
    'Template-TemplateField': 'Template possui campos configuráveis',
    'Template-Document': 'Template pode gerar múltiplos documentos',
    'Document-DocumentField': 'Documento possui valores preenchidos',
    'Equipamento-Loja': 'Equipamento pertence a uma loja',
    'Equipamento-Setor': 'Equipamento pertence a um setor',
    'Equipamento-TipoEquipamento': 'Equipamento possui um tipo',
  };
  
  const key = `${rel.from}-${rel.to}`;
  return descriptions[key] || 'não identificado';
}
