/**
 * File Writer
 *
 * Responsible for writing generated documentation to disk.
 * Handles directory creation and prevents unnecessary overwrites.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

/**
 * Write options
 */
export interface WriteOptions {
  outputDir: string;
  filename: string;
  content: string;
  skipIfUnchanged?: boolean;
}

/**
 * Write result
 */
export interface WriteResult {
  filepath: string;
  written: boolean;
  reason?: string;
}

/**
 * Writes a document to disk
 *
 * @param options - Write options
 * @returns Write result with filepath and status
 */
export function writeDocument(options: WriteOptions): WriteResult {
  const { outputDir, filename, content, skipIfUnchanged = true } = options;

  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const filepath = path.join(outputDir, filename);

  // Check if file exists and content is unchanged
  if (skipIfUnchanged && fs.existsSync(filepath)) {
    const existingContent = fs.readFileSync(filepath, 'utf-8');
    const existingHash = hashContent(existingContent);
    const newHash = hashContent(content);

    if (existingHash === newHash) {
      return {
        filepath,
        written: false,
        reason: 'Content unchanged',
      };
    }
  }

  // Write file
  fs.writeFileSync(filepath, content, 'utf-8');

  return {
    filepath,
    written: true,
  };
}

/**
 * Writes multiple documents to disk
 *
 * @param documents - Array of documents to write
 * @param outputDir - Output directory
 * @returns Array of write results
 */
export function writeDocuments(
  documents: Array<{ filename: string; content: string }>,
  outputDir: string,
): WriteResult[] {
  return documents.map((doc) =>
    writeDocument({
      outputDir,
      filename: doc.filename,
      content: doc.content,
    }),
  );
}

/**
 * Generates a hash of content for comparison
 */
function hashContent(content: string): string {
  return crypto.createHash('sha256').update(content).digest('hex');
}

/**
 * Ensures a directory exists
 */
export function ensureDirectory(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}
