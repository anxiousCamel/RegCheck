import { describe, it, expect, vi } from 'vitest';
import { retry, retryBarcode, retryOCR } from '@/lib/scanner/core/retry-strategy';

describe('retry', () => {
  it('returns result on first success', async () => {
    const fn = vi.fn().mockResolvedValue('ok');
    const result = await retry(fn, { maxRetries: 2, baseDelay: 0 });
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('retries on failure and succeeds', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValue('ok');
    const result = await retry(fn, { maxRetries: 2, baseDelay: 0 });
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('throws after maxRetries exhausted', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('always fails'));
    await expect(retry(fn, { maxRetries: 2, baseDelay: 0 })).rejects.toThrow('always fails');
    expect(fn).toHaveBeenCalledTimes(3); // 1 initial + 2 retries
  });

  it('never retries AbortError', async () => {
    const fn = vi.fn().mockRejectedValue(new DOMException('Cancelled', 'AbortError'));
    await expect(retry(fn, { maxRetries: 3, baseDelay: 0 })).rejects.toThrow('Cancelled');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('calls onRetry callback before each retry', async () => {
    const onRetry = vi.fn();
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('fail'))
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValue('ok');
    await retry(fn, { maxRetries: 3, baseDelay: 0, onRetry });
    expect(onRetry).toHaveBeenCalledTimes(2);
  });

  it('aborts immediately if signal is already aborted', async () => {
    const controller = new AbortController();
    controller.abort();
    const fn = vi.fn().mockResolvedValue('ok');
    await expect(retry(fn, { maxRetries: 2, baseDelay: 0 }, controller.signal))
      .rejects.toThrow('Cancelled');
    expect(fn).not.toHaveBeenCalled();
  });

  it('passes attempt number to fn', async () => {
    const attempts: number[] = [];
    const fn = vi.fn().mockImplementation(async (attempt: number) => {
      attempts.push(attempt);
      if (attempt < 2) throw new Error('not yet');
      return 'done';
    });
    await retry(fn, { maxRetries: 3, baseDelay: 0 });
    expect(attempts).toEqual([0, 1, 2]);
  });
});

describe('retryBarcode', () => {
  it('retries once on failure', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValue([]);
    await retryBarcode(fn);
    expect(fn).toHaveBeenCalledTimes(2);
  });
});

describe('retryOCR', () => {
  it('retries twice on failure', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('fail'))
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValue([]);
    const onRetry = vi.fn();
    await retryOCR(fn, onRetry);
    expect(fn).toHaveBeenCalledTimes(3);
    expect(onRetry).toHaveBeenCalledTimes(2);
  });
});
