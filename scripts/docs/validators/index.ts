/**
 * Validation Orchestrator
 * 
 * Coordinates all validators and provides a unified validation interface.
 */

import * as fs from 'fs';
import * as path from 'path';
import { validateMarkdown, type MarkdownValidationResult, formatValidationErrors } from './markdown-validator';
import { validateMermaidDiagrams, type MermaidValidationResult, formatMermaidErrors } from './mermaid-validator';
import { validateContent, type ContentValidationResult, formatContentErrors } from './content-validator';

export interface ValidationResult {
  success: boolean;
  errors: string[];
  warnings: string[];
  filesValidated: number;
  details: {
    markdown: Map<string, MarkdownValidationResult>;
    mermaid: Map<string, MermaidValidationResult>;
    content: Map<string, ContentValidationResult>;
  };
}

/**
 * Validates all documentation files in a directory
 * 
 * @param docsDir - Directory containing documentation files
 * @returns Consolidated validation result
 */
export function validateDocumentation(docsDir: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Find all markdown files
  const files = findMarkdownFiles(docsDir);
  
  if (files.length === 0) {
    errors.push('No documentation files found');
    return {
      success: false,
      errors,
      warnings,
      filesValidated: 0,
      details: {
        markdown: new Map(),
        mermaid: new Map(),
        content: new Map(),
      },
    };
  }
  
  // Load file contents
  const fileContents = files.map(filepath => ({
    path: path.relative(docsDir, filepath),
    content: fs.readFileSync(filepath, 'utf-8'),
  }));
  
  // Run all validators
  const markdownResults = new Map<string, MarkdownValidationResult>();
  const mermaidResults = new Map<string, MermaidValidationResult>();
  const contentResults = new Map<string, ContentValidationResult>();
  
  for (const file of fileContents) {
    // Validate Markdown
    const mdResult = validateMarkdown(file.content, file.path);
    markdownResults.set(file.path, mdResult);
    
    if (!mdResult.valid) {
      errors.push(`Markdown validation failed for ${file.path}`);
      for (const error of mdResult.errors) {
        const location = error.line ? ` (line ${error.line})` : '';
        errors.push(`  - [${error.type}]${location} ${error.message}`);
      }
    }
    
    if (mdResult.warnings.length > 0) {
      for (const warning of mdResult.warnings) {
        warnings.push(`${file.path}: ${warning}`);
      }
    }
    
    // Validate Mermaid
    const mermaidResult = validateMermaidDiagrams(file.content);
    mermaidResults.set(file.path, mermaidResult);
    
    if (!mermaidResult.valid) {
      errors.push(`Mermaid validation failed for ${file.path}`);
      for (const error of mermaidResult.errors) {
        const location = error.line ? ` (line ${error.line})` : '';
        errors.push(`  - [${error.type}]${location} ${error.message}`);
      }
    }
    
    // Validate Content
    const contentResult = validateContent(file.content, file.path);
    contentResults.set(file.path, contentResult);
    
    if (!contentResult.valid) {
      errors.push(`Content validation failed for ${file.path}`);
      for (const error of contentResult.errors.filter(e => e.severity === 'error')) {
        errors.push(`  - [${error.type}] ${error.message}`);
      }
    }
    
    // Add content warnings
    for (const error of contentResult.errors.filter(e => e.severity === 'warning')) {
      warnings.push(`${file.path}: [${error.type}] ${error.message}`);
    }
  }
  
  return {
    success: errors.length === 0,
    errors,
    warnings,
    filesValidated: files.length,
    details: {
      markdown: markdownResults,
      mermaid: mermaidResults,
      content: contentResults,
    },
  };
}

/**
 * Finds all markdown files in a directory
 */
function findMarkdownFiles(dir: string): string[] {
  const files: string[] = [];
  
  if (!fs.existsSync(dir)) {
    return files;
  }
  
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    
    if (entry.isDirectory()) {
      // Skip certain directories
      if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'adr') {
        continue;
      }
      files.push(...findMarkdownFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      files.push(fullPath);
    }
  }
  
  return files;
}

/**
 * Formats validation result for console output
 */
export function formatValidationResult(result: ValidationResult): string {
  let output = '';
  
  output += '\n';
  output += '='.repeat(80) + '\n';
  output += 'DOCUMENTATION VALIDATION\n';
  output += '='.repeat(80) + '\n';
  output += '\n';
  
  output += `Files validated: ${result.filesValidated}\n`;
  output += '\n';
  
  if (result.success) {
    output += '✅ All validations passed!\n';
  } else {
    output += `❌ Validation failed with ${result.errors.length} error(s)\n`;
  }
  
  if (result.warnings.length > 0) {
    output += `⚠️  ${result.warnings.length} warning(s)\n`;
  }
  
  output += '\n';
  
  // Display errors
  if (result.errors.length > 0) {
    output += 'ERRORS:\n';
    output += '-'.repeat(80) + '\n';
    for (const error of result.errors) {
      output += `  ${error}\n`;
    }
    output += '\n';
  }
  
  // Display warnings (limited)
  if (result.warnings.length > 0) {
    output += 'WARNINGS:\n';
    output += '-'.repeat(80) + '\n';
    const displayWarnings = result.warnings.slice(0, 10);
    for (const warning of displayWarnings) {
      output += `  ${warning}\n`;
    }
    if (result.warnings.length > 10) {
      output += `  ... and ${result.warnings.length - 10} more warnings\n`;
    }
    output += '\n';
  }
  
  // Display summary by file
  output += 'SUMMARY BY FILE:\n';
  output += '-'.repeat(80) + '\n';
  
  for (const [filepath, mdResult] of result.details.markdown) {
    const mermaidResult = result.details.mermaid.get(filepath)!;
    const contentResult = result.details.content.get(filepath)!;
    
    const mdStatus = mdResult.valid ? '✅' : '❌';
    const mermaidStatus = mermaidResult.valid ? '✅' : '❌';
    const contentStatus = contentResult.valid ? '✅' : '❌';
    
    output += `  ${filepath}:\n`;
    output += `    Markdown: ${mdStatus} (${mdResult.errors.length} errors, ${mdResult.warnings.length} warnings)\n`;
    output += `    Mermaid:  ${mermaidStatus} (${mermaidResult.errors.length} errors, ${mermaidResult.diagramCount} diagrams)\n`;
    output += `    Content:  ${contentStatus} (${contentResult.errors.filter(e => e.severity === 'error').length} errors, ${contentResult.stats.wordCount} words)\n`;
  }
  
  output += '\n';
  output += '='.repeat(80) + '\n';
  
  return output;
}

/**
 * Validates documentation and throws if validation fails
 */
export function validateDocumentationOrThrow(docsDir: string): void {
  const result = validateDocumentation(docsDir);
  
  console.log(formatValidationResult(result));
  
  if (!result.success) {
    throw new Error(`Documentation validation failed with ${result.errors.length} error(s)`);
  }
}
