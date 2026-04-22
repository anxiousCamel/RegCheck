/** Retry with exponential backoff and parameter variation. */

interface RetryOptions {
  maxRetries: number;
  baseDelay: number;
  /** Called before each retry to adjust parameters */
  onRetry?: (attempt: number) => void;
}

function isAbortError(err: unknown): boolean {
  return err instanceof DOMException && err.name === 'AbortError';
}

export async function retry<T>(
  fn: (attempt: number) => Promise<T>,
  options: RetryOptions,
  signal?: AbortSignal,
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= options.maxRetries; attempt++) {
    if (signal?.aborted) {
      throw new DOMException('Cancelled', 'AbortError');
    }

    try {
      return await fn(attempt);
    } catch (err) {
      // Never retry abort errors
      if (isAbortError(err)) throw err;

      lastError = err;

      if (attempt < options.maxRetries) {
        options.onRetry?.(attempt + 1);
        const delay = options.baseDelay * Math.pow(2, attempt);
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }

  throw lastError;
}

/** Preset: barcode retry (1 retry, fast) */
export function retryBarcode<T>(fn: (attempt: number) => Promise<T>, signal?: AbortSignal): Promise<T> {
  return retry(fn, { maxRetries: 1, baseDelay: 100 }, signal);
}

/** Preset: OCR retry (2 retries, with parameter callback) */
export function retryOCR<T>(
  fn: (attempt: number) => Promise<T>,
  onRetry: (attempt: number) => void,
  signal?: AbortSignal,
): Promise<T> {
  return retry(fn, { maxRetries: 2, baseDelay: 500, onRetry }, signal);
}
