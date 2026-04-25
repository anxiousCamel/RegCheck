/**
 * Markdown Formatter Utilities
 *
 * Provides utility functions for generating well-formatted Markdown content.
 * Used by the documentation generation system to create consistent, valid Markdown files.
 */

/**
 * Generates a Markdown heading with the specified level.
 *
 * @param text - The heading text
 * @param level - The heading level (1-6)
 * @returns Formatted heading with trailing newlines
 *
 * @example
 * heading('Introduction', 1) // '# Introduction\n\n'
 * heading('Overview', 2)     // '## Overview\n\n'
 */
export function heading(text: string, level: number): string {
  if (level < 1 || level > 6) {
    throw new Error(`Invalid heading level: ${level}. Must be between 1 and 6.`);
  }
  return '#'.repeat(level) + ' ' + text + '\n\n';
}

/**
 * Generates a Markdown code block with syntax highlighting.
 *
 * @param code - The code content
 * @param language - The programming language for syntax highlighting
 * @returns Formatted code block with trailing newlines
 *
 * @example
 * codeBlock('const x = 1;', 'typescript')
 * // ```typescript
 * // const x = 1;
 * // ```
 */
export function codeBlock(code: string, language: string): string {
  return '```' + language + '\n' + code + '\n```\n\n';
}

/**
 * Generates a Markdown table with headers and data rows.
 *
 * @param headers - Array of column header names
 * @param rows - Array of data rows, where each row is an array of cell values
 * @returns Formatted table with trailing newlines
 *
 * @example
 * table(['Name', 'Type'], [['id', 'string'], ['age', 'number']])
 * // | Name | Type |
 * // |---|---|
 * // | id | string |
 * // | age | number |
 */
export function table(headers: string[], rows: string[][]): string {
  const headerRow = '| ' + headers.join(' | ') + ' |';
  const separator = '|' + headers.map(() => '---').join('|') + '|';
  const dataRows = rows.map((row) => '| ' + row.join(' | ') + ' |');

  return [headerRow, separator, ...dataRows].join('\n') + '\n\n';
}

/**
 * Generates a Markdown list (ordered or unordered).
 *
 * @param items - Array of list items
 * @param ordered - Whether to create an ordered (numbered) list
 * @returns Formatted list with trailing newlines
 *
 * @example
 * list(['First', 'Second', 'Third'], false)
 * // - First
 * // - Second
 * // - Third
 *
 * list(['First', 'Second', 'Third'], true)
 * // 1. First
 * // 2. Second
 * // 3. Third
 */
export function list(items: string[], ordered: boolean = false): string {
  const listItems = items.map((item, index) => {
    const prefix = ordered ? `${index + 1}. ` : '- ';
    return prefix + item;
  });

  return listItems.join('\n') + '\n\n';
}

/**
 * Generates a Markdown link.
 *
 * @param text - The link text to display
 * @param url - The URL or path to link to
 * @returns Formatted link
 *
 * @example
 * link('GitHub', 'https://github.com')
 * // [GitHub](https://github.com)
 *
 * link('Architecture', './01-arquitetura.md')
 * // [Architecture](./01-arquitetura.md)
 */
export function link(text: string, url: string): string {
  return `[${text}](${url})`;
}

/**
 * Generates a Mermaid diagram code block.
 *
 * @param type - The Mermaid diagram type (e.g., 'graph TB', 'erDiagram', 'sequenceDiagram')
 * @param content - The diagram content (without the type declaration)
 * @returns Formatted Mermaid code block with trailing newlines
 *
 * @example
 * mermaidDiagram('graph TB', 'A --> B\nB --> C')
 * // ```mermaid
 * // graph TB
 * // A --> B
 * // B --> C
 * // ```
 *
 * mermaidDiagram('sequenceDiagram', 'Alice->>Bob: Hello')
 * // ```mermaid
 * // sequenceDiagram
 * // Alice->>Bob: Hello
 * // ```
 */
export function mermaidDiagram(type: string, content: string): string {
  return '```mermaid\n' + type + '\n' + content + '\n```\n\n';
}
