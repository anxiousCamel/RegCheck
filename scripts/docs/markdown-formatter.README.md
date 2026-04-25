# Markdown Formatter Utilities

Utility functions for generating well-formatted Markdown content. Used by the documentation generation system to create consistent, valid Markdown files.

## Installation

The markdown formatter is part of the RegCheck documentation generation system. No separate installation is required.

## Usage

```typescript
import { heading, codeBlock, table, list, link, mermaidDiagram } from './markdown-formatter';
```

## API Reference

### `heading(text: string, level: number): string`

Generates a Markdown heading with the specified level (1-6).

**Parameters:**

- `text` - The heading text
- `level` - The heading level (1-6)

**Returns:** Formatted heading with trailing newlines

**Example:**

```typescript
heading('Introduction', 1); // '# Introduction\n\n'
heading('Overview', 2); // '## Overview\n\n'
```

**Throws:** Error if level is not between 1 and 6

---

### `codeBlock(code: string, language: string): string`

Generates a Markdown code block with syntax highlighting.

**Parameters:**

- `code` - The code content
- `language` - The programming language for syntax highlighting

**Returns:** Formatted code block with trailing newlines

**Example:**

````typescript
codeBlock('const x = 1;', 'typescript');
// ```typescript
// const x = 1;
// ```
````

---

### `table(headers: string[], rows: string[][]): string`

Generates a Markdown table with headers and data rows.

**Parameters:**

- `headers` - Array of column header names
- `rows` - Array of data rows, where each row is an array of cell values

**Returns:** Formatted table with trailing newlines

**Example:**

```typescript
table(
  ['Name', 'Type'],
  [
    ['id', 'string'],
    ['age', 'number'],
  ],
);
// | Name | Type |
// |---|---|
// | id | string |
// | age | number |
```

---

### `list(items: string[], ordered?: boolean): string`

Generates a Markdown list (ordered or unordered).

**Parameters:**

- `items` - Array of list items
- `ordered` - Whether to create an ordered (numbered) list (default: false)

**Returns:** Formatted list with trailing newlines

**Example:**

```typescript
list(['First', 'Second', 'Third'], false);
// - First
// - Second
// - Third

list(['First', 'Second', 'Third'], true);
// 1. First
// 2. Second
// 3. Third
```

---

### `link(text: string, url: string): string`

Generates a Markdown link.

**Parameters:**

- `text` - The link text to display
- `url` - The URL or path to link to

**Returns:** Formatted link

**Example:**

```typescript
link('GitHub', 'https://github.com');
// [GitHub](https://github.com)

link('Architecture', './01-arquitetura.md');
// [Architecture](./01-arquitetura.md)
```

---

### `mermaidDiagram(type: string, content: string): string`

Generates a Mermaid diagram code block.

**Parameters:**

- `type` - The Mermaid diagram type (e.g., 'graph TB', 'erDiagram', 'sequenceDiagram')
- `content` - The diagram content (without the type declaration)

**Returns:** Formatted Mermaid code block with trailing newlines

**Example:**

````typescript
mermaidDiagram('graph TB', 'A --> B\nB --> C');
// ```mermaid
// graph TB
// A --> B
// B --> C
// ```

mermaidDiagram('sequenceDiagram', 'Alice->>Bob: Hello');
// ```mermaid
// sequenceDiagram
// Alice->>Bob: Hello
// ```
````

## Testing

Unit tests are available in `markdown-formatter.test.ts`. Run tests with:

```bash
pnpm exec vitest run scripts/docs/markdown-formatter.test.ts
```

Or use the simple test runner:

```bash
pnpm exec tsx scripts/docs/test-markdown-formatter.ts
```

## Examples

See `example-usage.md` for a complete demonstration of all formatter functions and their output.

## Design Principles

1. **Consistency**: All functions produce consistent formatting with proper spacing
2. **Trailing Newlines**: All block-level elements include trailing newlines for proper separation
3. **Validation**: Functions validate inputs and throw descriptive errors for invalid parameters
4. **Simplicity**: Simple, focused functions that do one thing well

## Requirements

This module satisfies **Requirement 12.2** from the documentation generation specification:

- Implements all required markdown formatting functions
- Ensures consistent formatting across generated documentation
- Provides proper validation and error handling
