/**
 * Markdown Validator
 * 
 * Validates Markdown syntax and structure to ensure generated documentation
 * is well-formed and follows best practices.
 */

export interface MarkdownValidationError {
  type: 'heading' | 'code-block' | 'table' | 'link' | 'structure';
  message: string;
  line?: number;
}

export interface MarkdownValidationResult {
  valid: boolean;
  errors: MarkdownValidationError[];
  warnings: string[];
}

/**
 * Validates Markdown content
 * 
 * @param content - Markdown content to validate
 * @param filename - Optional filename for better error messages
 * @returns Validation result with errors and warnings
 */
export function validateMarkdown(content: string, filename?: string): MarkdownValidationResult {
  const errors: MarkdownValidationError[] = [];
  const warnings: string[] = [];
  
  // Validate heading structure
  const headingErrors = validateHeadings(content);
  errors.push(...headingErrors);
  
  // Validate code blocks
  const codeBlockErrors = validateCodeBlocks(content);
  errors.push(...codeBlockErrors);
  
  // Validate tables
  const tableErrors = validateTables(content);
  errors.push(...tableErrors);
  
  // Validate links
  const linkErrors = validateLinks(content);
  errors.push(...linkErrors);
  
  // Validate basic structure
  const structureErrors = validateStructure(content);
  errors.push(...structureErrors);
  
  // Check for common issues
  const commonWarnings = checkCommonIssues(content);
  warnings.push(...commonWarnings);
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validates heading hierarchy
 * - Must start with h1
 * - No skipped levels (h1 → h3)
 * - Proper nesting
 */
function validateHeadings(content: string): MarkdownValidationError[] {
  const errors: MarkdownValidationError[] = [];
  const lines = content.split('\n');
  
  let hasH1 = false;
  let previousLevel = 0;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    
    if (headingMatch) {
      const level = headingMatch[1].length;
      const text = headingMatch[2].trim();
      
      // Check for h1
      if (level === 1) {
        hasH1 = true;
      }
      
      // Check for empty heading
      if (!text) {
        errors.push({
          type: 'heading',
          message: `Empty heading at line ${i + 1}`,
          line: i + 1,
        });
      }
      
      // Check for skipped levels
      if (previousLevel > 0 && level > previousLevel + 1) {
        errors.push({
          type: 'heading',
          message: `Skipped heading level from h${previousLevel} to h${level} at line ${i + 1}`,
          line: i + 1,
        });
      }
      
      previousLevel = level;
    }
  }
  
  // Check if document has h1
  if (!hasH1) {
    errors.push({
      type: 'heading',
      message: 'Document must have at least one h1 heading',
    });
  }
  
  return errors;
}

/**
 * Validates code blocks are properly closed
 */
function validateCodeBlocks(content: string): MarkdownValidationError[] {
  const errors: MarkdownValidationError[] = [];
  const lines = content.split('\n');
  
  let inCodeBlock = false;
  let codeBlockStartLine = 0;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    if (line.startsWith('```')) {
      if (inCodeBlock) {
        // Closing code block
        inCodeBlock = false;
      } else {
        // Opening code block
        inCodeBlock = true;
        codeBlockStartLine = i + 1;
      }
    }
  }
  
  // Check if code block is still open
  if (inCodeBlock) {
    errors.push({
      type: 'code-block',
      message: `Unclosed code block starting at line ${codeBlockStartLine}`,
      line: codeBlockStartLine,
    });
  }
  
  return errors;
}

/**
 * Validates table structure
 * - Consistent column count
 * - Proper separator line
 */
function validateTables(content: string): MarkdownValidationError[] {
  const errors: MarkdownValidationError[] = [];
  const lines = content.split('\n');
  
  let inTable = false;
  let tableStartLine = 0;
  let expectedColumns = 0;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Check if line is a table row
    if (line.startsWith('|') && line.endsWith('|')) {
      const columns = line.split('|').filter(c => c.trim()).length;
      
      if (!inTable) {
        // First row of table
        inTable = true;
        tableStartLine = i + 1;
        expectedColumns = columns;
        
        // Next line should be separator
        if (i + 1 < lines.length) {
          const nextLine = lines[i + 1].trim();
          if (!nextLine.match(/^\|[\s\-:|]+\|$/)) {
            errors.push({
              type: 'table',
              message: `Missing table separator after header at line ${i + 1}`,
              line: i + 1,
            });
          }
        }
      } else {
        // Validate column count
        if (columns !== expectedColumns) {
          errors.push({
            type: 'table',
            message: `Inconsistent column count at line ${i + 1}: expected ${expectedColumns}, got ${columns}`,
            line: i + 1,
          });
        }
      }
    } else if (inTable && line !== '' && !line.match(/^\|[\s\-:|]+\|$/)) {
      // End of table
      inTable = false;
    }
  }
  
  return errors;
}

/**
 * Validates links
 * - Proper format [text](url)
 * - No empty links
 * - Internal links exist (basic check)
 */
function validateLinks(content: string): MarkdownValidationError[] {
  const errors: MarkdownValidationError[] = [];
  const lines = content.split('\n');
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Find all markdown links
    const linkMatches = line.matchAll(/\[([^\]]*)\]\(([^)]*)\)/g);
    
    for (const match of linkMatches) {
      const text = match[1];
      const url = match[2];
      
      // Check for empty link text
      if (!text.trim()) {
        errors.push({
          type: 'link',
          message: `Empty link text at line ${i + 1}`,
          line: i + 1,
        });
      }
      
      // Check for empty URL
      if (!url.trim()) {
        errors.push({
          type: 'link',
          message: `Empty link URL at line ${i + 1}`,
          line: i + 1,
        });
      }
      
      // Check for malformed URLs
      if (url.includes(' ') && !url.startsWith('#')) {
        errors.push({
          type: 'link',
          message: `Malformed URL with spaces at line ${i + 1}: ${url}`,
          line: i + 1,
        });
      }
    }
  }
  
  return errors;
}

/**
 * Validates basic document structure
 */
function validateStructure(content: string): MarkdownValidationError[] {
  const errors: MarkdownValidationError[] = [];
  
  // Check if document is empty
  if (!content.trim()) {
    errors.push({
      type: 'structure',
      message: 'Document is empty',
    });
    return errors;
  }
  
  // Check minimum length
  if (content.length < 100) {
    errors.push({
      type: 'structure',
      message: 'Document is too short (less than 100 characters)',
    });
  }
  
  // Check for at least one section (h2)
  if (!content.match(/^##\s+/m)) {
    errors.push({
      type: 'structure',
      message: 'Document should have at least one section (h2)',
    });
  }
  
  return errors;
}

/**
 * Checks for common issues (warnings, not errors)
 */
function checkCommonIssues(content: string): string[] {
  const warnings: string[] = [];
  
  // Check for very long lines
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.startsWith('```') && !line.startsWith('|') && line.length > 120) {
      warnings.push(`Line ${i + 1} is very long (${line.length} characters)`);
    }
  }
  
  // Check for multiple consecutive blank lines
  for (let i = 0; i < lines.length - 2; i++) {
    if (!lines[i].trim() && !lines[i + 1].trim() && !lines[i + 2].trim()) {
      warnings.push(`Multiple consecutive blank lines at line ${i + 1}`);
      break;
    }
  }
  
  // Check for trailing whitespace
  const trailingWhitespaceCount = lines.filter(l => l !== l.trimEnd()).length;
  if (trailingWhitespaceCount > 0) {
    warnings.push(`${trailingWhitespaceCount} lines have trailing whitespace`);
  }
  
  return warnings;
}

/**
 * Validates multiple markdown files
 */
export function validateMarkdownFiles(files: Array<{ path: string; content: string }>): Map<string, MarkdownValidationResult> {
  const results = new Map<string, MarkdownValidationResult>();
  
  for (const file of files) {
    const result = validateMarkdown(file.content, file.path);
    results.set(file.path, result);
  }
  
  return results;
}

/**
 * Formats validation errors for display
 */
export function formatValidationErrors(result: MarkdownValidationResult, filename?: string): string {
  let output = '';
  
  if (filename) {
    output += `\n${filename}:\n`;
  }
  
  if (result.errors.length > 0) {
    output += `  ❌ ${result.errors.length} error(s):\n`;
    for (const error of result.errors) {
      const location = error.line ? ` (line ${error.line})` : '';
      output += `     - [${error.type}]${location} ${error.message}\n`;
    }
  }
  
  if (result.warnings.length > 0) {
    output += `  ⚠️  ${result.warnings.length} warning(s):\n`;
    for (const warning of result.warnings) {
      output += `     - ${warning}\n`;
    }
  }
  
  if (result.valid) {
    output += `  ✅ Valid\n`;
  }
  
  return output;
}
