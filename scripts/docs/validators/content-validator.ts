/**
 * Content Validator
 * 
 * Validates that generated documentation contains real data and meaningful content,
 * not just empty structure.
 */

export interface ContentValidationError {
  type: 'empty' | 'missing-title' | 'missing-sections' | 'placeholder' | 'insufficient-data';
  message: string;
  severity: 'error' | 'warning';
}

export interface ContentValidationResult {
  valid: boolean;
  errors: ContentValidationError[];
  stats: ContentStats;
}

export interface ContentStats {
  totalLines: number;
  nonEmptyLines: number;
  headingCount: number;
  sectionCount: number;
  tableCount: number;
  codeBlockCount: number;
  listCount: number;
  wordCount: number;
}

/**
 * Validates document content quality
 * 
 * @param content - Document content
 * @param filename - Optional filename for context
 * @returns Validation result
 */
export function validateContent(content: string, filename?: string): ContentValidationResult {
  const errors: ContentValidationError[] = [];
  const stats = analyzeContent(content);
  
  // Check if document is empty
  if (!content.trim()) {
    errors.push({
      type: 'empty',
      message: 'Document is completely empty',
      severity: 'error',
    });
    return { valid: false, errors, stats };
  }
  
  // Check for title (h1)
  if (!content.match(/^#\s+.+$/m)) {
    errors.push({
      type: 'missing-title',
      message: 'Document is missing a title (h1 heading)',
      severity: 'error',
    });
  }
  
  // Check for sections (h2)
  if (stats.sectionCount === 0) {
    errors.push({
      type: 'missing-sections',
      message: 'Document has no sections (h2 headings)',
      severity: 'error',
    });
  }
  
  // Check for minimum content
  if (stats.wordCount < 50) {
    errors.push({
      type: 'insufficient-data',
      message: `Document has insufficient content (${stats.wordCount} words, minimum 50)`,
      severity: 'error',
    });
  }
  
  // Check for placeholder text
  const placeholderErrors = checkForPlaceholders(content);
  errors.push(...placeholderErrors);
  
  // Check for meaningful data
  const dataErrors = checkForMeaningfulData(content, stats);
  errors.push(...dataErrors);
  
  return {
    valid: errors.filter(e => e.severity === 'error').length === 0,
    errors,
    stats,
  };
}

/**
 * Analyzes content and extracts statistics
 */
function analyzeContent(content: string): ContentStats {
  const lines = content.split('\n');
  const nonEmptyLines = lines.filter(l => l.trim()).length;
  
  // Count headings
  const h1Count = (content.match(/^#\s+/gm) || []).length;
  const h2Count = (content.match(/^##\s+/gm) || []).length;
  const h3Count = (content.match(/^###\s+/gm) || []).length;
  const headingCount = h1Count + h2Count + h3Count;
  
  // Count tables
  const tableCount = (content.match(/^\|.+\|$/gm) || []).length / 2; // Approximate
  
  // Count code blocks
  const codeBlockCount = (content.match(/```/g) || []).length / 2;
  
  // Count lists
  const listCount = (content.match(/^[\s]*[-*]\s+/gm) || []).length;
  
  // Count words (excluding code blocks)
  const contentWithoutCode = content.replace(/```[\s\S]*?```/g, '');
  const words = contentWithoutCode.match(/\b\w+\b/g) || [];
  const wordCount = words.length;
  
  return {
    totalLines: lines.length,
    nonEmptyLines,
    headingCount,
    sectionCount: h2Count,
    tableCount: Math.floor(tableCount),
    codeBlockCount: Math.floor(codeBlockCount),
    listCount,
    wordCount,
  };
}

/**
 * Checks for placeholder text that should be replaced
 */
function checkForPlaceholders(content: string): ContentValidationError[] {
  const errors: ContentValidationError[] = [];
  
  const placeholders = [
    'TODO',
    'FIXME',
    'XXX',
    'PLACEHOLDER',
    'Coming soon',
    'To be implemented',
    'Not yet documented',
  ];
  
  for (const placeholder of placeholders) {
    if (content.includes(placeholder)) {
      errors.push({
        type: 'placeholder',
        message: `Document contains placeholder text: "${placeholder}"`,
        severity: 'warning',
      });
    }
  }
  
  return errors;
}

/**
 * Checks for meaningful data vs empty structure
 */
function checkForMeaningfulData(content: string, stats: ContentStats): ContentValidationError[] {
  const errors: ContentValidationError[] = [];
  
  // Check if document is mostly headings (structure without content)
  const contentRatio = stats.nonEmptyLines / (stats.headingCount || 1);
  if (contentRatio < 3) {
    errors.push({
      type: 'insufficient-data',
      message: `Document appears to be mostly structure without content (${stats.nonEmptyLines} lines, ${stats.headingCount} headings)`,
      severity: 'warning',
    });
  }
  
  // Check for data-specific patterns based on document type
  const dataPatterns = checkDataPatterns(content);
  errors.push(...dataPatterns);
  
  return errors;
}

/**
 * Checks for data-specific patterns that indicate real content
 */
function checkDataPatterns(content: string): ContentValidationError[] {
  const errors: ContentValidationError[] = [];
  
  // Check for API documentation patterns
  if (content.includes('API') || content.includes('Endpoint')) {
    const hasHttpMethods = /\b(GET|POST|PATCH|DELETE|PUT)\b/.test(content);
    const hasPaths = /\/api\/\w+/.test(content);
    
    if (!hasHttpMethods || !hasPaths) {
      errors.push({
        type: 'insufficient-data',
        message: 'API documentation is missing HTTP methods or endpoint paths',
        severity: 'warning',
      });
    }
  }
  
  // Check for data model patterns
  if (content.includes('Entidade') || content.includes('Model') || content.includes('erDiagram')) {
    const hasFieldTypes = /\b(String|Int|Boolean|DateTime|Float)\b/.test(content);
    
    if (!hasFieldTypes) {
      errors.push({
        type: 'insufficient-data',
        message: 'Data model documentation is missing field type information',
        severity: 'warning',
      });
    }
  }
  
  // Check for error documentation patterns
  if (content.includes('Erro') || content.includes('Error Code')) {
    const hasStatusCodes = /\b(400|404|500|409|422)\b/.test(content);
    
    if (!hasStatusCodes) {
      errors.push({
        type: 'insufficient-data',
        message: 'Error documentation is missing HTTP status codes',
        severity: 'warning',
      });
    }
  }
  
  return errors;
}

/**
 * Validates content in multiple files
 */
export function validateContentInFiles(files: Array<{ path: string; content: string }>): Map<string, ContentValidationResult> {
  const results = new Map<string, ContentValidationResult>();
  
  for (const file of files) {
    const result = validateContent(file.content, file.path);
    results.set(file.path, result);
  }
  
  return results;
}

/**
 * Formats content validation errors for display
 */
export function formatContentErrors(result: ContentValidationResult, filename?: string): string {
  let output = '';
  
  if (filename) {
    output += `\n${filename}:\n`;
  }
  
  // Display stats
  output += `  📊 Stats:\n`;
  output += `     - Lines: ${result.stats.nonEmptyLines}/${result.stats.totalLines}\n`;
  output += `     - Words: ${result.stats.wordCount}\n`;
  output += `     - Headings: ${result.stats.headingCount} (${result.stats.sectionCount} sections)\n`;
  output += `     - Tables: ${result.stats.tableCount}\n`;
  output += `     - Code blocks: ${result.stats.codeBlockCount}\n`;
  output += `     - Lists: ${result.stats.listCount}\n`;
  
  // Display errors
  const errorCount = result.errors.filter(e => e.severity === 'error').length;
  const warningCount = result.errors.filter(e => e.severity === 'warning').length;
  
  if (errorCount > 0) {
    output += `  ❌ ${errorCount} error(s):\n`;
    for (const error of result.errors.filter(e => e.severity === 'error')) {
      output += `     - [${error.type}] ${error.message}\n`;
    }
  }
  
  if (warningCount > 0) {
    output += `  ⚠️  ${warningCount} warning(s):\n`;
    for (const error of result.errors.filter(e => e.severity === 'warning')) {
      output += `     - [${error.type}] ${error.message}\n`;
    }
  }
  
  if (result.valid) {
    output += `  ✅ Content valid\n`;
  }
  
  return output;
}
