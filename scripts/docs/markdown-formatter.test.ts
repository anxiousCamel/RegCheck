/**
 * Unit tests for Markdown Formatter Utilities
 * 
 * Tests all markdown generation functions to ensure they produce valid,
 * well-formatted Markdown output.
 */

import { describe, it, expect } from 'vitest';
import {
  heading,
  codeBlock,
  table,
  list,
  link,
  mermaidDiagram,
} from './markdown-formatter';

describe('Markdown Formatter', () => {
  describe('heading', () => {
    it('should generate heading with level 1', () => {
      const result = heading('Title', 1);
      expect(result).toBe('# Title\n\n');
    });

    it('should generate heading with level 2', () => {
      const result = heading('Subtitle', 2);
      expect(result).toBe('## Subtitle\n\n');
    });

    it('should generate heading with level 3', () => {
      const result = heading('Section', 3);
      expect(result).toBe('### Section\n\n');
    });

    it('should generate heading with level 6', () => {
      const result = heading('Deep Section', 6);
      expect(result).toBe('###### Deep Section\n\n');
    });

    it('should throw error for invalid level 0', () => {
      expect(() => heading('Invalid', 0)).toThrow('Invalid heading level: 0');
    });

    it('should throw error for invalid level 7', () => {
      expect(() => heading('Invalid', 7)).toThrow('Invalid heading level: 7');
    });

    it('should handle text with special characters', () => {
      const result = heading('API & Configuration', 2);
      expect(result).toBe('## API & Configuration\n\n');
    });
  });

  describe('codeBlock', () => {
    it('should generate code block with typescript language', () => {
      const result = codeBlock('const x = 1;', 'typescript');
      expect(result).toBe('```typescript\nconst x = 1;\n```\n\n');
    });

    it('should generate code block with javascript language', () => {
      const result = codeBlock('console.log("hello");', 'javascript');
      expect(result).toBe('```javascript\nconsole.log("hello");\n```\n\n');
    });

    it('should generate code block with json language', () => {
      const code = '{\n  "name": "test"\n}';
      const result = codeBlock(code, 'json');
      expect(result).toBe('```json\n{\n  "name": "test"\n}\n```\n\n');
    });

    it('should handle multi-line code', () => {
      const code = 'function test() {\n  return true;\n}';
      const result = codeBlock(code, 'typescript');
      expect(result).toBe('```typescript\nfunction test() {\n  return true;\n}\n```\n\n');
    });

    it('should handle empty code', () => {
      const result = codeBlock('', 'typescript');
      expect(result).toBe('```typescript\n\n```\n\n');
    });
  });

  describe('table', () => {
    it('should generate table with headers and rows', () => {
      const headers = ['Name', 'Type'];
      const rows = [['id', 'string'], ['name', 'string']];
      const result = table(headers, rows);
      
      expect(result).toBe(
        '| Name | Type |\n' +
        '|---|---|\n' +
        '| id | string |\n' +
        '| name | string |\n\n'
      );
    });

    it('should generate table with three columns', () => {
      const headers = ['Field', 'Type', 'Required'];
      const rows = [
        ['id', 'string', 'yes'],
        ['email', 'string', 'yes'],
        ['age', 'number', 'no'],
      ];
      const result = table(headers, rows);
      
      expect(result).toContain('| Field | Type | Required |');
      expect(result).toContain('|---|---|---|');
      expect(result).toContain('| id | string | yes |');
      expect(result).toContain('| email | string | yes |');
      expect(result).toContain('| age | number | no |');
    });

    it('should generate table with single row', () => {
      const headers = ['Name', 'Value'];
      const rows = [['status', 'active']];
      const result = table(headers, rows);
      
      expect(result).toBe(
        '| Name | Value |\n' +
        '|---|---|\n' +
        '| status | active |\n\n'
      );
    });

    it('should generate table with empty rows', () => {
      const headers = ['Column1', 'Column2'];
      const rows: string[][] = [];
      const result = table(headers, rows);
      
      expect(result).toBe(
        '| Column1 | Column2 |\n' +
        '|---|---|\n\n'
      );
    });

    it('should handle cells with special characters', () => {
      const headers = ['Name', 'Description'];
      const rows = [['API & SDK', 'REST | GraphQL']];
      const result = table(headers, rows);
      
      expect(result).toContain('| API & SDK | REST | GraphQL |');
    });
  });

  describe('list', () => {
    it('should generate unordered list', () => {
      const items = ['First', 'Second', 'Third'];
      const result = list(items, false);
      
      expect(result).toBe(
        '- First\n' +
        '- Second\n' +
        '- Third\n\n'
      );
    });

    it('should generate ordered list', () => {
      const items = ['First', 'Second', 'Third'];
      const result = list(items, true);
      
      expect(result).toBe(
        '1. First\n' +
        '2. Second\n' +
        '3. Third\n\n'
      );
    });

    it('should default to unordered list when ordered parameter is omitted', () => {
      const items = ['Item A', 'Item B'];
      const result = list(items);
      
      expect(result).toBe(
        '- Item A\n' +
        '- Item B\n\n'
      );
    });

    it('should handle single item list', () => {
      const items = ['Only one'];
      const result = list(items, false);
      
      expect(result).toBe('- Only one\n\n');
    });

    it('should handle empty list', () => {
      const items: string[] = [];
      const result = list(items, false);
      
      expect(result).toBe('\n\n');
    });

    it('should handle items with special characters', () => {
      const items = ['Item with & ampersand', 'Item with | pipe'];
      const result = list(items, false);
      
      expect(result).toContain('- Item with & ampersand');
      expect(result).toContain('- Item with | pipe');
    });
  });

  describe('link', () => {
    it('should generate internal link', () => {
      const result = link('Architecture', './01-arquitetura.md');
      expect(result).toBe('[Architecture](./01-arquitetura.md)');
    });

    it('should generate external link', () => {
      const result = link('GitHub', 'https://github.com');
      expect(result).toBe('[GitHub](https://github.com)');
    });

    it('should handle link text with special characters', () => {
      const result = link('API & SDK', 'https://example.com/api');
      expect(result).toBe('[API & SDK](https://example.com/api)');
    });

    it('should handle URL with query parameters', () => {
      const result = link('Search', 'https://example.com/search?q=test&lang=en');
      expect(result).toBe('[Search](https://example.com/search?q=test&lang=en)');
    });

    it('should handle URL with anchor', () => {
      const result = link('Section', './doc.md#section-1');
      expect(result).toBe('[Section](./doc.md#section-1)');
    });
  });

  describe('mermaidDiagram', () => {
    it('should generate graph diagram', () => {
      const type = 'graph TB';
      const content = 'A --> B\nB --> C';
      const result = mermaidDiagram(type, content);
      
      expect(result).toBe(
        '```mermaid\n' +
        'graph TB\n' +
        'A --> B\n' +
        'B --> C\n' +
        '```\n\n'
      );
    });

    it('should generate erDiagram', () => {
      const type = 'erDiagram';
      const content = 'USER ||--o{ ORDER : places';
      const result = mermaidDiagram(type, content);
      
      expect(result).toBe(
        '```mermaid\n' +
        'erDiagram\n' +
        'USER ||--o{ ORDER : places\n' +
        '```\n\n'
      );
    });

    it('should generate sequenceDiagram', () => {
      const type = 'sequenceDiagram';
      const content = 'Alice->>Bob: Hello\nBob-->>Alice: Hi';
      const result = mermaidDiagram(type, content);
      
      expect(result).toBe(
        '```mermaid\n' +
        'sequenceDiagram\n' +
        'Alice->>Bob: Hello\n' +
        'Bob-->>Alice: Hi\n' +
        '```\n\n'
      );
    });

    it('should handle complex multi-line diagram', () => {
      const type = 'graph TB';
      const content = [
        'subgraph Apps',
        '  API[apps/api]',
        '  WEB[apps/web]',
        'end',
        'API --> DB',
        'WEB --> API',
      ].join('\n');
      const result = mermaidDiagram(type, content);
      
      expect(result).toContain('```mermaid');
      expect(result).toContain('graph TB');
      expect(result).toContain('subgraph Apps');
      expect(result).toContain('```\n\n');
    });

    it('should handle empty content', () => {
      const result = mermaidDiagram('graph TB', '');
      expect(result).toBe('```mermaid\ngraph TB\n\n```\n\n');
    });
  });
});
