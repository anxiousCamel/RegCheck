/**
 * Mermaid Validator
 *
 * Validates Mermaid diagram syntax to ensure diagrams render correctly.
 */

export interface MermaidValidationError {
  type: 'syntax' | 'structure' | 'empty';
  message: string;
  diagram: string;
  line?: number;
}

export interface MermaidValidationResult {
  valid: boolean;
  errors: MermaidValidationError[];
  diagramCount: number;
}

/**
 * Validates all Mermaid diagrams in Markdown content
 *
 * @param content - Markdown content with Mermaid diagrams
 * @returns Validation result
 */
export function validateMermaidDiagrams(content: string): MermaidValidationResult {
  const errors: MermaidValidationError[] = [];
  const diagrams = extractMermaidDiagrams(content);

  for (const diagram of diagrams) {
    const diagramErrors = validateSingleDiagram(diagram);
    errors.push(...diagramErrors);
  }

  return {
    valid: errors.length === 0,
    errors,
    diagramCount: diagrams.length,
  };
}

/**
 * Extracts all Mermaid diagrams from content
 */
function extractMermaidDiagrams(
  content: string,
): Array<{ type: string; content: string; line: number }> {
  const diagrams: Array<{ type: string; content: string; line: number }> = [];
  const lines = content.split('\n');

  let inMermaid = false;
  let diagramLines: string[] = [];
  let diagramStartLine = 0;
  let diagramType = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? '';

    if (line.trim() === '```mermaid') {
      inMermaid = true;
      diagramStartLine = i + 1;
      diagramLines = [];
    } else if (inMermaid && line.trim() === '```') {
      // End of diagram
      const diagramContent = diagramLines.join('\n').trim();

      // Detect diagram type
      const firstLine = diagramLines[0]?.trim() || '';
      if (firstLine.startsWith('graph')) {
        diagramType = 'graph';
      } else if (firstLine === 'erDiagram') {
        diagramType = 'erDiagram';
      } else if (firstLine === 'sequenceDiagram') {
        diagramType = 'sequenceDiagram';
      } else if (firstLine.startsWith('flowchart')) {
        diagramType = 'flowchart';
      } else {
        diagramType = 'unknown';
      }

      diagrams.push({
        type: diagramType,
        content: diagramContent,
        line: diagramStartLine,
      });

      inMermaid = false;
    } else if (inMermaid) {
      diagramLines.push(line);
    }
  }

  return diagrams;
}

/**
 * Validates a single Mermaid diagram
 */
function validateSingleDiagram(diagram: {
  type: string;
  content: string;
  line: number;
}): MermaidValidationError[] {
  const errors: MermaidValidationError[] = [];

  // Check if diagram is empty
  if (!diagram.content.trim()) {
    errors.push({
      type: 'empty',
      message: `Empty Mermaid diagram at line ${diagram.line}`,
      diagram: diagram.type,
      line: diagram.line,
    });
    return errors;
  }

  // Validate based on diagram type
  switch (diagram.type) {
    case 'erDiagram':
      errors.push(...validateERDiagram(diagram));
      break;
    case 'graph':
    case 'flowchart':
      errors.push(...validateGraphDiagram(diagram));
      break;
    case 'sequenceDiagram':
      errors.push(...validateSequenceDiagram(diagram));
      break;
    case 'unknown':
      errors.push({
        type: 'syntax',
        message: `Unknown diagram type at line ${diagram.line}`,
        diagram: diagram.type,
        line: diagram.line,
      });
      break;
  }

  return errors;
}

/**
 * Validates ER Diagram syntax
 */
function validateERDiagram(diagram: {
  type: string;
  content: string;
  line: number;
}): MermaidValidationError[] {
  const errors: MermaidValidationError[] = [];
  const lines = diagram.content.split('\n');

  // First line should be "erDiagram"
  if ((lines[0] ?? '').trim() !== 'erDiagram') {
    errors.push({
      type: 'syntax',
      message: `ER diagram must start with "erDiagram" at line ${diagram.line}`,
      diagram: diagram.type,
      line: diagram.line,
    });
  }

  let hasRelationships = false;
  let hasEntities = false;

  for (let i = 1; i < lines.length; i++) {
    const line = (lines[i] ?? '').trim();
    if (!line) continue;

    // Check for relationships (Entity1 ||--o{ Entity2 : "label")
    if (line.match(/\w+\s+[\|\}o][o\|]--[o\|][\|\{o]\s+\w+/)) {
      hasRelationships = true;
    }

    // Check for entity definitions (Entity { ... })
    if (line.match(/^\w+\s*\{/)) {
      hasEntities = true;
    }

    // Check for malformed relationships
    if (line.includes('--') && !line.match(/[\|\}o][o\|]--[o\|][\|\{o]/)) {
      errors.push({
        type: 'syntax',
        message: `Malformed relationship syntax at line ${diagram.line + i}: ${line}`,
        diagram: diagram.type,
        line: diagram.line + i,
      });
    }
  }

  // ER diagram should have at least relationships or entities
  if (!hasRelationships && !hasEntities) {
    errors.push({
      type: 'structure',
      message: `ER diagram has no relationships or entities at line ${diagram.line}`,
      diagram: diagram.type,
      line: diagram.line,
    });
  }

  return errors;
}

/**
 * Validates Graph/Flowchart diagram syntax
 */
function validateGraphDiagram(diagram: {
  type: string;
  content: string;
  line: number;
}): MermaidValidationError[] {
  const errors: MermaidValidationError[] = [];
  const lines = diagram.content.split('\n');

  // First line should be "graph TD/LR" or "flowchart TD/LR"
  const firstLine = (lines[0] ?? '').trim();
  if (!firstLine.match(/^(graph|flowchart)\s+(TD|LR|TB|RL|BT)/)) {
    errors.push({
      type: 'syntax',
      message: `Graph must start with "graph TD/LR" or "flowchart TD/LR" at line ${diagram.line}`,
      diagram: diagram.type,
      line: diagram.line,
    });
  }

  let hasNodes = false;

  for (let i = 1; i < lines.length; i++) {
    const line = (lines[i] ?? '').trim();
    if (!line) continue;

    // Check for nodes (Node1[Label] or Node1 --> Node2)
    if (line.match(/\w+[\[\(]/) || line.match(/--[->]|===|---/)) {
      hasNodes = true;
    }

    // Check for unclosed brackets
    const openBrackets = (line.match(/[\[\(]/g) || []).length;
    const closeBrackets = (line.match(/[\]\)]/g) || []).length;
    if (openBrackets !== closeBrackets) {
      errors.push({
        type: 'syntax',
        message: `Unclosed brackets at line ${diagram.line + i}: ${line}`,
        diagram: diagram.type,
        line: diagram.line + i,
      });
    }
  }

  // Graph should have at least one node
  if (!hasNodes) {
    errors.push({
      type: 'structure',
      message: `Graph has no nodes at line ${diagram.line}`,
      diagram: diagram.type,
      line: diagram.line,
    });
  }

  return errors;
}

/**
 * Validates Sequence Diagram syntax
 */
function validateSequenceDiagram(diagram: {
  type: string;
  content: string;
  line: number;
}): MermaidValidationError[] {
  const errors: MermaidValidationError[] = [];
  const lines = diagram.content.split('\n');

  // First line should be "sequenceDiagram"
  if ((lines[0] ?? '').trim() !== 'sequenceDiagram') {
    errors.push({
      type: 'syntax',
      message: `Sequence diagram must start with "sequenceDiagram" at line ${diagram.line}`,
      diagram: diagram.type,
      line: diagram.line,
    });
  }

  let hasInteractions = false;

  for (let i = 1; i < lines.length; i++) {
    const line = (lines[i] ?? '').trim();
    if (!line) continue;

    // Check for interactions (Actor1->>Actor2: Message)
    if (line.match(/\w+\s*-[->]+\s*\w+\s*:/)) {
      hasInteractions = true;
    }

    // Check for participant declarations
    if (line.startsWith('participant ')) {
      hasInteractions = true;
    }
  }

  // Sequence diagram should have at least one interaction
  if (!hasInteractions) {
    errors.push({
      type: 'structure',
      message: `Sequence diagram has no interactions at line ${diagram.line}`,
      diagram: diagram.type,
      line: diagram.line,
    });
  }

  return errors;
}

/**
 * Formats Mermaid validation errors for display
 */
export function formatMermaidErrors(result: MermaidValidationResult, filename?: string): string {
  let output = '';

  if (filename) {
    output += `\n${filename}:\n`;
  }

  output += `  Found ${result.diagramCount} Mermaid diagram(s)\n`;

  if (result.errors.length > 0) {
    output += `  ❌ ${result.errors.length} error(s):\n`;
    for (const error of result.errors) {
      const location = error.line ? ` (line ${error.line})` : '';
      output += `     - [${error.type}]${location} ${error.message}\n`;
    }
  } else {
    output += `  ✅ All diagrams valid\n`;
  }

  return output;
}

/**
 * Validates Mermaid diagrams in multiple files
 */
export function validateMermaidInFiles(
  files: Array<{ path: string; content: string }>,
): Map<string, MermaidValidationResult> {
  const results = new Map<string, MermaidValidationResult>();

  for (const file of files) {
    const result = validateMermaidDiagrams(file.content);
    results.set(file.path, result);
  }

  return results;
}
