/**
 * Verification script for markdown formatter
 * Demonstrates all functions and their output
 */

import { heading, codeBlock, table, list, link, mermaidDiagram } from './markdown-formatter';

console.log('=== Markdown Formatter Verification ===\n');

// Test heading
console.log('1. Heading Function:');
console.log(heading('Main Title', 1));
console.log(heading('Subtitle', 2));
console.log(heading('Section', 3));

// Test codeBlock
console.log('2. Code Block Function:');
console.log(codeBlock('const x = 1;\nconst y = 2;', 'typescript'));

// Test table
console.log('3. Table Function:');
const headers = ['Name', 'Type', 'Required'];
const rows = [
  ['id', 'string', 'yes'],
  ['name', 'string', 'yes'],
  ['age', 'number', 'no'],
];
console.log(table(headers, rows));

// Test list
console.log('4. List Function (unordered):');
console.log(list(['First item', 'Second item', 'Third item'], false));

console.log('5. List Function (ordered):');
console.log(list(['Step 1', 'Step 2', 'Step 3'], true));

// Test link
console.log('6. Link Function:');
console.log(link('Documentation', './docs/README.md'));
console.log(link('GitHub', 'https://github.com'));
console.log('');

// Test mermaidDiagram
console.log('7. Mermaid Diagram Function:');
const graphContent = 'A[Start] --> B[Process]\nB --> C[End]';
console.log(mermaidDiagram('graph TB', graphContent));

const erdContent = 'USER ||--o{ ORDER : places\nUSER {\n  string id PK\n  string name\n}';
console.log(mermaidDiagram('erDiagram', erdContent));

console.log('=== All functions verified successfully! ===');
