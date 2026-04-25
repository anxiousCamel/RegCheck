// Feature: document-deletion, Property 3: Erros HTTP do servidor são propagados como Error

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { ApiClient } from '../api';

/**
 * Validates: Requirements 2.3
 *
 * Property 3: Erros HTTP do servidor são propagados como Error
 *
 * For any HTTP error response (4xx or 5xx), ApiClient.deleteDocument must
 * reject with an Error whose message matches the `error.message` field from
 * the response body.
 */
describe('ApiClient.deleteDocument — Property 3', () => {
  let client: ApiClient;

  beforeEach(() => {
    client = new ApiClient('http://test-api.example.com');
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('rejects with Error(message) for any 4xx or 5xx response', async () => {
    const errorStatusArb = fc.oneof(
      fc.integer({ min: 400, max: 499 }),
      fc.integer({ min: 500, max: 599 }),
    );

    const errorMessageArb = fc.string({ minLength: 1, maxLength: 200 });

    await fc.assert(
      fc.asyncProperty(errorStatusArb, errorMessageArb, async (status, message) => {
        vi.mocked(fetch).mockResolvedValueOnce(
          new Response(JSON.stringify({ success: false, error: { message } }), {
            status,
            headers: { 'Content-Type': 'application/json' },
          }),
        );

        const id = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d';
        await expect(client.deleteDocument(id)).rejects.toThrow(message);
      }),
      { numRuns: 100 },
    );
  });
});
