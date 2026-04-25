/**
 * Prisma Schema Parser
 *
 * Parses Prisma schema files to extract data model information including:
 * - Model definitions with fields and types
 * - Enum definitions
 * - Relationships between models
 * - Primary keys and unique constraints
 *
 * Follows standardized ParserOutput format for consistency.
 */

/**
 * Standardized parser output format
 */
export interface ParserOutput<T> {
  source: string;
  generatedAt: string;
  data: T;
}

export interface PrismaField {
  name: string;
  type: string;
  isArray: boolean;
  isOptional: boolean;
  isPrimaryKey: boolean;
  isUnique: boolean;
  isRelation: boolean;
  defaultValue?: string;
  relationTo?: string;
  relationFields?: string[];
  relationReferences?: string[];
  attributes: string[];
}

export interface PrismaModel {
  name: string;
  tableName: string;
  comment?: string;
  fields: PrismaField[];
  indexes: string[];
}

export interface PrismaEnum {
  name: string;
  values: string[];
}

export interface PrismaRelationship {
  from: string;
  to: string;
  type: 'one-to-many' | 'many-to-one' | 'one-to-one' | 'many-to-many';
  fromField: string;
  toField?: string;
}

export interface PrismaSchema {
  models: PrismaModel[];
  enums: PrismaEnum[];
  relationships: PrismaRelationship[];
}

/**
 * Prisma parser output following standardized format
 */
export interface PrismaParserOutput extends ParserOutput<PrismaSchema> {
  source: 'prisma-parser';
  generatedAt: string;
  data: PrismaSchema;
}

/**
 * Parses a Prisma schema file and extracts all models, enums, and relationships.
 *
 * @param schemaContent - The content of the Prisma schema file
 * @returns Standardized parser output with models, enums, and relationships
 */
export function parsePrismaSchema(schemaContent: string): PrismaParserOutput {
  const lines = schemaContent.split('\n');
  const models: PrismaModel[] = [];
  const enums: PrismaEnum[] = [];

  let i = 0;
  while (i < lines.length) {
    const currentLine = lines[i];
    if (currentLine === undefined) {
      i++;
      continue;
    }
    const line = currentLine.trim();

    // Parse model
    if (line.startsWith('model ')) {
      const model = parseModel(lines, i);
      if (model) {
        models.push(model.model);
        i = model.nextIndex;
        continue;
      }
    }

    // Parse enum
    if (line.startsWith('enum ')) {
      const enumDef = parseEnum(lines, i);
      enums.push(enumDef.enum);
      i = enumDef.nextIndex;
      continue;
    }

    i++;
  }

  // Extract relationships from models
  const relationships = extractRelationships(models);

  return {
    source: 'prisma-parser',
    generatedAt: new Date().toISOString(),
    data: { models, enums, relationships },
  };
}

/**
 * Parses a model definition starting at the given line index.
 */
function parseModel(
  lines: string[],
  startIndex: number,
): { model: PrismaModel; nextIndex: number } {
  const firstLine = lines[startIndex]?.trim() ?? '';
  const modelNameMatch = firstLine.match(/^model\s+(\w+)\s*{/);

  if (!modelNameMatch) {
    throw new Error(`Invalid model definition at line ${startIndex + 1}`);
  }

  const modelName = modelNameMatch[1] ?? 'Unknown';
  const fields: PrismaField[] = [];
  const indexes: string[] = [];
  let tableName = modelName.toLowerCase();
  let comment: string | undefined;

  // Check for comment on previous line
  if (startIndex > 0) {
    const prevLine = lines[startIndex - 1]?.trim();
    if (prevLine?.startsWith('///')) {
      comment = prevLine.replace(/^\/\/\/\s*/, '');
    }
  }

  let i = startIndex + 1;
  while (i < lines.length) {
    const currentLine = lines[i];
    if (currentLine === undefined) {
      i++;
      continue;
    }
    const line = currentLine.trim();

    // End of model
    if (line === '}') {
      const model: PrismaModel = { name: modelName, tableName, fields, indexes };
      if (comment !== undefined) {
        model.comment = comment;
      }
      return { model, nextIndex: i + 1 };
    }

    // Skip empty lines and comments
    if (!line || line.startsWith('//')) {
      i++;
      continue;
    }

    // Parse @@map attribute
    if (line.startsWith('@@map(')) {
      const mapMatch = line.match(/@@map\("([^"]+)"\)/);
      if (mapMatch?.[1]) {
        tableName = mapMatch[1];
      }
      i++;
      continue;
    }

    // Parse @@index attribute
    if (line.startsWith('@@index(') || line.startsWith('@@unique(')) {
      indexes.push(line);
      i++;
      continue;
    }

    // Parse field
    const field = parseField(line, lines[i - 1]?.trim());
    if (field) {
      fields.push(field);
    }

    i++;
  }

  throw new Error(`Unclosed model definition for ${modelName}`);
}

/**
 * Parses a field definition line.
 */
function parseField(line: string, _prevLine?: string): PrismaField | null {
  // Skip lines that don't look like field definitions
  if (line.startsWith('@@') || line.startsWith('//') || !line.includes(' ')) {
    return null;
  }

  // Parse field: fieldName Type[] ? @attributes
  const parts = line.split(/\s+/);
  if (parts.length < 2) {
    return null;
  }

  const fieldName = parts[0] ?? '';
  let fieldType = parts[1];

  if (!fieldType) {
    return null;
  }

  // Check for array type
  const isArray = fieldType.endsWith('[]');
  if (isArray) {
    fieldType = fieldType.slice(0, -2);
  }

  // Check for optional type
  const isOptional = fieldType.endsWith('?');
  if (isOptional) {
    fieldType = fieldType.slice(0, -1);
  }

  // Parse attributes
  const attributes: string[] = [];
  let isPrimaryKey = false;
  let isUnique = false;
  let defaultValue: string | undefined;
  let relationTo: string | undefined;
  let relationFields: string[] | undefined;
  let relationReferences: string[] | undefined;

  // Check if this is a relation field (type starts with uppercase and is not a primitive or enum)
  // We'll determine if it's an enum later by checking if it has @relation attribute
  const primitiveTypes = [
    'String',
    'Int',
    'Float',
    'Boolean',
    'DateTime',
    'Json',
    'Bytes',
    'Decimal',
    'BigInt',
  ];
  let isRelation =
    fieldType.length > 0 &&
    fieldType[0] === fieldType[0]!.toUpperCase() &&
    !primitiveTypes.includes(fieldType);

  // Parse attributes from the rest of the line
  const attributesStr = parts.slice(2).join(' ');

  // Check if this field has @relation attribute - only then it's a true relation
  // Fields without @relation but with uppercase types could be enums OR reverse relations
  const hasRelationAttribute = attributesStr.includes('@relation(');

  if (isRelation && hasRelationAttribute) {
    relationTo = fieldType;
  } else if (isRelation && !hasRelationAttribute) {
    // If it's an array type with no attributes, it's likely a reverse relation
    // If it's optional with no attributes, it's also likely a reverse relation
    // Otherwise, it's an enum type
    if (isArray && attributesStr.trim() === '') {
      // This is a reverse relation field (e.g., templates Template[])
      relationTo = fieldType;
    } else if (isOptional && attributesStr.trim() === '') {
      // This is an optional reverse relation field (e.g., profile Profile?)
      relationTo = fieldType;
    } else {
      // This is an enum type, not a relation
      isRelation = false;
    }
  }

  // Extract @id
  if (attributesStr.includes('@id')) {
    isPrimaryKey = true;
    attributes.push('@id');
  }

  // Extract @unique
  if (attributesStr.includes('@unique')) {
    isUnique = true;
    attributes.push('@unique');
  }

  // Extract @default (handle nested parentheses like uuid())
  const defaultMatch = attributesStr.match(/@default\((.+?)\)(?:\s|$)/);
  if (defaultMatch?.[1]) {
    defaultValue = defaultMatch[1];
    attributes.push(`@default(${defaultValue})`);
  }

  // Extract @relation
  const relationMatch = attributesStr.match(/@relation\(([^)]+)\)/);
  if (relationMatch) {
    const relationArgs = relationMatch[1] ?? '';
    attributes.push(`@relation(${relationArgs})`);

    // Parse fields
    const fieldsMatch = relationArgs.match(/fields:\s*\[([^\]]+)\]/);
    if (fieldsMatch?.[1]) {
      relationFields = fieldsMatch[1].split(',').map((f) => f.trim());
    }

    // Parse references
    const referencesMatch = relationArgs.match(/references:\s*\[([^\]]+)\]/);
    if (referencesMatch?.[1]) {
      relationReferences = referencesMatch[1].split(',').map((r) => r.trim());
    }
  }

  const result: PrismaField = {
    name: fieldName,
    type: fieldType,
    isArray,
    isOptional,
    isPrimaryKey,
    isUnique,
    isRelation,
    attributes,
  };

  if (defaultValue !== undefined) {
    result.defaultValue = defaultValue;
  }
  if (relationTo !== undefined) {
    result.relationTo = relationTo;
  }
  if (relationFields !== undefined) {
    result.relationFields = relationFields;
  }
  if (relationReferences !== undefined) {
    result.relationReferences = relationReferences;
  }

  return result;
}

/**
 * Parses an enum definition starting at the given line index.
 */
function parseEnum(lines: string[], startIndex: number): { enum: PrismaEnum; nextIndex: number } {
  const firstLine = lines[startIndex]?.trim() ?? '';
  const enumNameMatch = firstLine.match(/^enum\s+(\w+)\s*{/);

  if (!enumNameMatch) {
    throw new Error(`Invalid enum definition at line ${startIndex + 1}`);
  }

  const enumName = enumNameMatch[1] ?? 'Unknown';
  const values: string[] = [];

  let i = startIndex + 1;
  while (i < lines.length) {
    const currentLine = lines[i];
    if (currentLine === undefined) {
      i++;
      continue;
    }
    const line = currentLine.trim();

    // End of enum
    if (line === '}') {
      return { enum: { name: enumName, values }, nextIndex: i + 1 };
    }

    // Skip empty lines and comments
    if (!line || line.startsWith('//')) {
      i++;
      continue;
    }

    // Add enum value
    values.push(line);
    i++;
  }

  throw new Error(`Unclosed enum definition for ${enumName}`);
}

/**
 * Extracts relationships between models based on relation fields.
 */
function extractRelationships(models: PrismaModel[]): PrismaRelationship[] {
  const relationships: PrismaRelationship[] = [];
  const processedRelations = new Set<string>();

  for (const model of models) {
    for (const field of model.fields) {
      if (!field.isRelation || !field.relationTo) {
        continue;
      }

      // Create a unique key for this relationship to avoid duplicates
      const relationKey = [model.name, field.relationTo, field.name].sort().join('::');

      if (processedRelations.has(relationKey)) {
        continue;
      }

      processedRelations.add(relationKey);

      // Determine relationship type
      let type: PrismaRelationship['type'];

      if (field.isArray) {
        // This side is "many"
        type = 'one-to-many';
        relationships.push({
          from: field.relationTo,
          to: model.name,
          type,
          fromField: findReverseRelationField(models, field.relationTo, model.name) || 'id',
          toField: field.name,
        });
      } else if (field.relationFields && field.relationFields.length > 0) {
        // This side has the foreign key, so it's "many-to-one"
        type = 'many-to-one';
        relationships.push({
          from: model.name,
          to: field.relationTo,
          type,
          fromField: field.name,
        });
      }
    }
  }

  return relationships;
}

/**
 * Finds the reverse relation field name in the target model.
 */
function findReverseRelationField(
  models: PrismaModel[],
  modelName: string,
  targetModelName: string,
): string | undefined {
  const model = models.find((m) => m.name === modelName);
  if (!model) return undefined;

  const reverseField = model.fields.find((f) => f.isRelation && f.relationTo === targetModelName);
  return reverseField?.name;
}

/**
 * Gets all models from the parsed schema.
 */
export function getModels(output: PrismaParserOutput): PrismaModel[] {
  return output.data.models;
}

/**
 * Gets all enums from the parsed schema.
 */
export function getEnums(output: PrismaParserOutput): PrismaEnum[] {
  return output.data.enums;
}

/**
 * Gets all relationships from the parsed schema.
 */
export function getRelationships(output: PrismaParserOutput): PrismaRelationship[] {
  return output.data.relationships;
}

/**
 * Gets a specific model by name.
 */
export function getModelByName(output: PrismaParserOutput, name: string): PrismaModel | undefined {
  return output.data.models.find((m) => m.name === name);
}

/**
 * Gets all primary key fields for a model.
 */
export function getPrimaryKeys(model: PrismaModel): PrismaField[] {
  return model.fields.filter((f) => f.isPrimaryKey);
}

/**
 * Gets all unique fields for a model.
 */
export function getUniqueFields(model: PrismaModel): PrismaField[] {
  return model.fields.filter((f) => f.isUnique);
}

/**
 * Gets all relation fields for a model.
 */
export function getRelationFields(model: PrismaModel): PrismaField[] {
  return model.fields.filter((f) => f.isRelation);
}

/**
 * Gets all non-relation (data) fields for a model.
 */
export function getDataFields(model: PrismaModel): PrismaField[] {
  return model.fields.filter((f) => !f.isRelation);
}
