/**
 * ERD Generator
 *
 * Generates Mermaid Entity Relationship Diagrams from parsed Prisma schemas.
 *
 * The generator creates ERD syntax with:
 * - Relationship lines with cardinality notation
 * - Entity definitions with fields and types
 * - Primary key markers (PK suffix)
 */

import type {
  PrismaParserOutput,
  PrismaModel,
  PrismaField,
  PrismaRelationship,
} from './prisma-parser';

/**
 * Generates a Mermaid ERD diagram from a parsed Prisma schema.
 *
 * The diagram includes:
 * - All relationships between entities with cardinality
 * - All entity definitions with their fields
 * - Field types and primary key markers
 *
 * @param output - The parsed Prisma schema output
 * @returns Mermaid ERD syntax as a string
 */
export function generateERD(output: PrismaParserOutput): string {
  let mermaid = 'erDiagram\n';

  // Add relationships first
  mermaid += generateRelationships(output.data.relationships);

  // Add entity definitions
  mermaid += generateEntities(output.data.models);

  return mermaid;
}

/**
 * Generates relationship lines for the ERD.
 *
 * Converts Prisma relationship types to Mermaid cardinality notation:
 * - one-to-many: ||--o{
 * - many-to-one: }o--||
 * - one-to-one: ||--||
 * - many-to-many: }o--o{
 *
 * @param relationships - Array of relationships from the schema
 * @returns Mermaid relationship syntax
 */
function generateRelationships(relationships: PrismaRelationship[]): string {
  if (relationships.length === 0) {
    return '';
  }

  let result = '';

  for (const rel of relationships) {
    const cardinality = getCardinalityNotation(rel.type);
    const label = rel.toField || rel.fromField;

    result += `    ${rel.from} ${cardinality} ${rel.to} : "${label}"\n`;
  }

  return result;
}

/**
 * Converts relationship type to Mermaid cardinality notation.
 *
 * @param type - The relationship type
 * @returns Mermaid cardinality notation
 */
function getCardinalityNotation(type: PrismaRelationship['type']): string {
  switch (type) {
    case 'one-to-many':
      return '||--o{';
    case 'many-to-one':
      return '}o--||';
    case 'one-to-one':
      return '||--||';
    case 'many-to-many':
      return '}o--o{';
    default:
      return '||--o{'; // Default to one-to-many
  }
}

/**
 * Generates entity definitions for the ERD.
 *
 * Each entity includes:
 * - Entity name
 * - All non-relation fields with their types
 * - Primary key markers (PK suffix)
 *
 * @param models - Array of models from the schema
 * @returns Mermaid entity definition syntax
 */
function generateEntities(models: PrismaModel[]): string {
  let result = '';

  for (const model of models) {
    result += `    ${model.name} {\n`;

    // Add only data fields (non-relation fields)
    const dataFields = model.fields.filter((f) => !f.isRelation);

    for (const field of dataFields) {
      const fieldType = getMermaidFieldType(field);
      const pkMarker = field.isPrimaryKey ? ' PK' : '';

      result += `        ${fieldType} ${field.name}${pkMarker}\n`;
    }

    result += `    }\n`;
  }

  return result;
}

/**
 * Converts Prisma field type to Mermaid-compatible type notation.
 *
 * Maps Prisma types to simpler type names suitable for ERD display:
 * - String -> string
 * - Int -> int
 * - DateTime -> datetime
 * - Boolean -> boolean
 * - Json -> json
 * - Enum types -> string (enums are displayed as strings in ERD)
 *
 * @param field - The Prisma field
 * @returns Mermaid-compatible type string
 */
function getMermaidFieldType(field: PrismaField): string {
  let type = field.type;

  // Map Prisma types to Mermaid types
  const typeMap: Record<string, string> = {
    String: 'string',
    Int: 'int',
    Float: 'float',
    Boolean: 'boolean',
    DateTime: 'datetime',
    Json: 'json',
    Bytes: 'bytes',
    Decimal: 'decimal',
    BigInt: 'bigint',
  };

  // Use mapped type if available, otherwise use lowercase version (for enums)
  type = typeMap[type] || type.toLowerCase();

  // Add array notation if needed
  if (field.isArray) {
    type += '[]';
  }

  return type;
}

/**
 * Generates a complete ERD wrapped in a Mermaid code block.
 *
 * This is useful for generating documentation that can be directly
 * embedded in Markdown files.
 *
 * @param schema - The parsed Prisma schema
 * @returns Mermaid ERD wrapped in markdown code block
 */
export function generateERDCodeBlock(schema: PrismaParserOutput): string {
  const erd = generateERD(schema);
  return '```mermaid\n' + erd + '```\n';
}

/**
 * Generates an ERD for a subset of models.
 *
 * Useful for creating focused diagrams that show only specific
 * parts of the data model.
 *
 * @param schema - The parsed Prisma schema
 * @param modelNames - Array of model names to include
 * @returns Mermaid ERD syntax for the specified models
 */
export function generatePartialERD(schema: PrismaParserOutput, modelNames: string[]): string {
  // Filter models
  const filteredModels = schema.data.models.filter((m: PrismaModel) => modelNames.includes(m.name));

  // Filter relationships to only include those between the selected models
  const filteredRelationships = schema.data.relationships.filter(
    (r: PrismaRelationship) => modelNames.includes(r.from) && modelNames.includes(r.to),
  );

  const partialSchema: PrismaParserOutput = {
    source: schema.source,
    generatedAt: schema.generatedAt,
    data: {
      models: filteredModels,
      enums: schema.data.enums,
      relationships: filteredRelationships,
    },
  };

  return generateERD(partialSchema);
}
