#!/usr/bin/env tsx
/**
 * Documentation Generator
 *
 * Main entry point for generating all project documentation.
 * Orchestrates parsing and generation of all documentation files.
 */

import * as path from 'path';
import * as fs from 'fs';
import { parsePrismaSchema } from './docs/prisma-parser';
import { parseRouteFiles } from './docs/route-parser';
import { parseErrorCodes } from './docs/error-parser';
import { generateDataModelDocs } from './docs/generators/data-model-generator';
import { generateApiReferenceDocs } from './docs/generators/api-reference-generator';
import { generateErrorCodesDocs } from './docs/generators/error-codes-generator';
import { generateArchitectureDocs } from './docs/generators/architecture-generator';
import { generateTechStackDocs } from './docs/generators/tech-stack-generator';
import { generateInfrastructureDocs } from './docs/generators/infrastructure-generator';
import { generateIndexDocs, type DocumentEntry } from './docs/generators/index-generator';
import { writeDocument, type WriteResult } from './docs/writers/file-writer';
import { validateDocumentation, formatValidationResult } from './docs/validators';

/**
 * Main documentation generation function
 */
async function main() {
  console.log('='.repeat(80));
  console.log('REGCHECK - DOCUMENTATION GENERATOR');
  console.log('='.repeat(80));
  console.log();

  const startTime = Date.now();
  const outputDir = path.join(__dirname, '../docs');
  const generatedAt = new Date().toISOString();

  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const results: WriteResult[] = [];
  const documents: DocumentEntry[] = [];

  try {
    // Step 1: Parse Prisma schema
    console.log('📊 Parsing Prisma schema...');
    const schemaPath = path.join(__dirname, '../packages/database/prisma/schema.prisma');
    const schemaContent = fs.readFileSync(schemaPath, 'utf-8');
    const prismaOutput = parsePrismaSchema(schemaContent);
    console.log(
      `   ✓ Found ${prismaOutput.data.models.length} models, ${prismaOutput.data.enums.length} enums\n`,
    );

    // Step 2: Parse routes
    console.log('🛣️  Parsing API routes...');
    const routesDir = path.join(__dirname, '../apps/api/src/routes');
    const routesOutput = parseRouteFiles(routesDir);
    console.log(`   ✓ Found ${routesOutput.data.length} endpoints\n`);

    // Step 3: Parse error codes
    console.log('⚠️  Parsing error codes...');
    const servicesDir = path.join(__dirname, '../apps/api/src/services');
    const errorHandlerPath = path.join(__dirname, '../apps/api/src/middleware/error-handler.ts');
    const errorsOutput = parseErrorCodes(routesDir, servicesDir, errorHandlerPath);
    console.log(`   ✓ Found ${errorsOutput.data.length} error codes\n`);

    console.log('='.repeat(80));
    console.log('GENERATING DOCUMENTATION FILES');
    console.log('='.repeat(80));
    console.log();

    // Generate 1: Architecture
    console.log('📐 Generating architecture documentation...');
    const archContent = generateArchitectureDocs({ projectName: 'RegCheck', generatedAt });
    const archResult = writeDocument({
      outputDir,
      filename: '01-arquitetura.md',
      content: archContent,
    });
    results.push(archResult);
    documents.push({
      filename: '01-arquitetura.md',
      title: 'Arquitetura do Sistema',
      description: 'Estrutura, camadas e componentes',
      category: 'Arquitetura',
    });
    console.log(`   ${archResult.written ? '✓ Written' : '○ Skipped'}: ${archResult.filepath}\n`);

    // Generate 2: Tech Stack
    console.log('🔧 Generating tech stack documentation...');
    const stackContent = generateTechStackDocs({ projectName: 'RegCheck', generatedAt });
    const stackResult = writeDocument({
      outputDir,
      filename: '02-stack-tecnologica.md',
      content: stackContent,
    });
    results.push(stackResult);
    documents.push({
      filename: '02-stack-tecnologica.md',
      title: 'Stack Tecnológica',
      description: 'Tecnologias, bibliotecas e ferramentas',
      category: 'Arquitetura',
    });
    console.log(`   ${stackResult.written ? '✓ Written' : '○ Skipped'}: ${stackResult.filepath}\n`);

    // Generate 3: Infrastructure
    console.log('🏗️  Generating infrastructure documentation...');
    const infraContent = generateInfrastructureDocs({ projectName: 'RegCheck', generatedAt });
    const infraResult = writeDocument({
      outputDir,
      filename: '03-infraestrutura.md',
      content: infraContent,
    });
    results.push(infraResult);
    documents.push({
      filename: '03-infraestrutura.md',
      title: 'Infraestrutura',
      description: 'Docker, serviços e configuração',
      category: 'Desenvolvimento',
    });
    console.log(`   ${infraResult.written ? '✓ Written' : '○ Skipped'}: ${infraResult.filepath}\n`);

    // Generate 4: Data Model
    console.log('💾 Generating data model documentation...');
    const dataModelContent = generateDataModelDocs(prismaOutput);
    const dataModelResult = writeDocument({
      outputDir,
      filename: '04-modelagem-dados.md',
      content: dataModelContent,
    });
    results.push(dataModelResult);
    documents.push({
      filename: '04-modelagem-dados.md',
      title: 'Modelagem de Dados',
      description: 'Entidades, relacionamentos e ERD',
      category: 'Desenvolvimento',
    });
    console.log(
      `   ${dataModelResult.written ? '✓ Written' : '○ Skipped'}: ${dataModelResult.filepath}\n`,
    );

    // Generate 5: API Reference
    console.log('📡 Generating API reference documentation...');
    const apiRefContent = generateApiReferenceDocs(routesOutput);
    const apiRefResult = writeDocument({
      outputDir,
      filename: '06-api-reference.md',
      content: apiRefContent,
    });
    results.push(apiRefResult);
    documents.push({
      filename: '06-api-reference.md',
      title: 'Referência da API',
      description: 'Endpoints, parâmetros e exemplos',
      category: 'API',
    });
    console.log(
      `   ${apiRefResult.written ? '✓ Written' : '○ Skipped'}: ${apiRefResult.filepath}\n`,
    );

    // Generate 6: Error Codes
    console.log('❌ Generating error codes documentation...');
    const errorCodesContent = generateErrorCodesDocs(errorsOutput);
    const errorCodesResult = writeDocument({
      outputDir,
      filename: '07-codigos-erro.md',
      content: errorCodesContent,
    });
    results.push(errorCodesResult);
    documents.push({
      filename: '07-codigos-erro.md',
      title: 'Códigos de Erro',
      description: 'Referência completa de erros da API',
      category: 'API',
    });
    console.log(
      `   ${errorCodesResult.written ? '✓ Written' : '○ Skipped'}: ${errorCodesResult.filepath}\n`,
    );

    // Generate 7: Index (README.md)
    console.log('📋 Generating documentation index...');
    const indexContent = generateIndexDocs({ documents, generatedAt });
    const indexResult = writeDocument({
      outputDir,
      filename: 'README.md',
      content: indexContent,
    });
    results.push(indexResult);
    console.log(`   ${indexResult.written ? '✓ Written' : '○ Skipped'}: ${indexResult.filepath}\n`);

    // Summary
    console.log('='.repeat(80));
    console.log('GENERATION SUMMARY');
    console.log('='.repeat(80));
    console.log();

    const written = results.filter((r) => r.written).length;
    const skipped = results.filter((r) => !r.written).length;
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log(`   Files written: ${written}`);
    console.log(`   Files skipped: ${skipped} (unchanged)`);
    console.log(`   Total files:   ${results.length}`);
    console.log(`   Time elapsed:  ${elapsed}s`);
    console.log();

    // Validation
    console.log('='.repeat(80));
    console.log('VALIDATING DOCUMENTATION');
    console.log('='.repeat(80));
    console.log();

    const validationResult = validateDocumentation(outputDir);
    console.log(formatValidationResult(validationResult));

    if (!validationResult.success) {
      console.error('❌ Documentation validation failed!');
      console.error(`   ${validationResult.errors.length} error(s) found`);
      console.error();
      console.error('Please fix the errors above and regenerate documentation.');
      process.exit(1);
    }

    console.log('✅ Documentation generation and validation complete!');
    console.log();
    console.log(`📁 Output directory: ${outputDir}`);
    console.log();
  } catch (error) {
    console.error('❌ Error generating documentation:');
    console.error(error);
    process.exit(1);
  }
}

// Run main function
main().catch(console.error);
