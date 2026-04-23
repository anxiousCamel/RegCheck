/**
 * Simple test runner for markdown formatter utilities
 * Runs basic tests to verify functionality
 */

import {
  heading,
  codeBlock,
  table,
  list,
  link,
  mermaidDiagram,
} from './markdown-formatter';

let passed = 0;
let failed = 0;

function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`✓ ${name}`);
    passed++;
  } catch (error) {
    console.error(`✗ ${name}`);
    console.error(`  ${error instanceof Error ? error.message : String(error)}`);
    failed++;
  }
}

function assertEquals(actual: string, expected: string, message?: string) {
  if (actual !== expected) {
    throw new Error(
      message || `Expected:\n${expected}\n\nActual:\n${actual}`
    );
  }
}

function assertThrows(fn: () => void, message?: string) {
  try {
    fn();
    throw new Error(message || 'Expected function to throw');
  } catch (error) {
    // Expected to throw
  }
}

console.log('Testing Markdown Formatter Utilities\n');

// Test heading
test('heading with level 1', () => {
  assertEquals(heading('Title', 1), '# Title\n\n');
});

test('heading with level 2', () => {
  assertEquals(heading('Subtitle', 2), '## Subtitle\n\n');
});

test('heading with level 6', () => {
  assertEquals(heading('Deep', 6), '###### Deep\n\n');
});

test('heading throws error for invalid level', () => {
  assertThrows(() => heading('Invalid', 0));
  assertThrows(() => heading('Invalid', 7));
});

// Test codeBlock
test('codeBlock with typescript', () => {
  assertEquals(
    codeBlock('const x = 1;', 'typescript'),
    '```typescript\nconst x = 1;\n```\n\n'
  );
});

test('codeBlock with multi-line code', () => {
  const code = 'function test() {\n  return true;\n}';
  const expected = '```typescript\nfunction test() {\n  return true;\n}\n```\n\n';
  assertEquals(codeBlock(code, 'typescript'), expected);
});

// Test table
test('table with headers and rows', () => {
  const headers = ['Name', 'Type'];
  const rows = [['id', 'string'], ['name', 'string']];
  const expected = '| Name | Type |\n|---|---|\n| id | string |\n| name | string |\n\n';
  assertEquals(table(headers, rows), expected);
});

test('table with three columns', () => {
  const headers = ['Field', 'Type', 'Required'];
  const rows = [['id', 'string', 'yes']];
  const result = table(headers, rows);
  assertEquals(result.includes('| Field | Type | Required |'), true);
  assertEquals(result.includes('|---|---|---|'), true);
});

// Test list
test('unordered list', () => {
  const items = ['First', 'Second', 'Third'];
  const expected = '- First\n- Second\n- Third\n\n';
  assertEquals(list(items, false), expected);
});

test('ordered list', () => {
  const items = ['First', 'Second', 'Third'];
  const expected = '1. First\n2. Second\n3. Third\n\n';
  assertEquals(list(items, true), expected);
});

test('list defaults to unordered', () => {
  const items = ['Item A', 'Item B'];
  const expected = '- Item A\n- Item B\n\n';
  assertEquals(list(items), expected);
});

// Test link
test('internal link', () => {
  assertEquals(
    link('Architecture', './01-arquitetura.md'),
    '[Architecture](./01-arquitetura.md)'
  );
});

test('external link', () => {
  assertEquals(
    link('GitHub', 'https://github.com'),
    '[GitHub](https://github.com)'
  );
});

// Test mermaidDiagram
test('mermaid graph diagram', () => {
  const type = 'graph TB';
  const content = 'A --> B\nB --> C';
  const expected = '```mermaid\ngraph TB\nA --> B\nB --> C\n```\n\n';
  assertEquals(mermaidDiagram(type, content), expected);
});

test('mermaid erDiagram', () => {
  const type = 'erDiagram';
  const content = 'USER ||--o{ ORDER : places';
  const expected = '```mermaid\nerDiagram\nUSER ||--o{ ORDER : places\n```\n\n';
  assertEquals(mermaidDiagram(type, content), expected);
});

test('mermaid sequenceDiagram', () => {
  const type = 'sequenceDiagram';
  const content = 'Alice->>Bob: Hello';
  const expected = '```mermaid\nsequenceDiagram\nAlice->>Bob: Hello\n```\n\n';
  assertEquals(mermaidDiagram(type, content), expected);
});

// Summary
console.log(`\n${passed} passed, ${failed} failed`);

if (failed > 0) {
  process.exit(1);
}
