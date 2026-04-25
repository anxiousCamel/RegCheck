import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ApiClient } from '../api';

const API_BASE = 'http://test-api.example.com';

describe('ApiClient.deleteDocument — example tests', () => {
  let client: ApiClient;

  beforeEach(() => {
    client = new ApiClient(API_BASE);
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('makes a DELETE request to /api/documents/:id', async () => {
    const id = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d';

    vi.mocked(fetch).mockResolvedValueOnce(new Response(null, { status: 204 }));

    await client.deleteDocument(id);

    expect(fetch).toHaveBeenCalledTimes(1);
    const [url, options] = vi.mocked(fetch).mock.calls[0]!;
    expect(url).toBe(`${API_BASE}/api/documents/${id}`);
    expect((options as RequestInit).method).toBe('DELETE');
  });

  it('resolves as void when server returns 204', async () => {
    const id = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d';

    vi.mocked(fetch).mockResolvedValueOnce(new Response(null, { status: 204 }));

    const result = await client.deleteDocument(id);

    expect(result).toBeUndefined();
  });
});
