/**
 * Generator Types
 *
 * Defines the standard contract for all document generators.
 * Generators are pure functions that transform parsed data into Markdown strings.
 */

/**
 * Standard document generator contract
 *
 * @template T - The input type (parser output)
 * @returns Markdown string
 */
export type DocGenerator<T> = (input: T) => string;

/**
 * Document metadata
 */
export interface DocumentMetadata {
  title: string;
  filename: string;
  description: string;
}

/**
 * Generated document
 */
export interface GeneratedDocument {
  metadata: DocumentMetadata;
  content: string;
}
