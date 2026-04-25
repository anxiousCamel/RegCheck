import { describe, it, expect, beforeEach } from 'vitest';
import { ProcessingQueue } from '@/lib/scanner/core/processing-queue';

beforeEach(() => {
  ProcessingQueue.clear();
});

describe('ProcessingQueue', () => {
  it('executes a task and resolves', async () => {
    const result = await ProcessingQueue.enqueue(async () => 'done');
    expect(result).toBe('done');
  });

  it('executes multiple tasks', async () => {
    const results = await Promise.all([
      ProcessingQueue.enqueue(async () => 1),
      ProcessingQueue.enqueue(async () => 2),
      ProcessingQueue.enqueue(async () => 3),
    ]);
    expect(results).toContain(1);
    expect(results).toContain(2);
    expect(results).toContain(3);
  });

  it('rejects task when queue is cleared', async () => {
    // Fill queue beyond MAX_CONCURRENT to force queuing
    const slow = () => new Promise<string>((resolve) => setTimeout(() => resolve('slow'), 200));

    const tasks = [
      ProcessingQueue.enqueue(slow),
      ProcessingQueue.enqueue(slow),
      ProcessingQueue.enqueue(slow),
      ProcessingQueue.enqueue(slow),
      ProcessingQueue.enqueue(slow),
    ];

    ProcessingQueue.clear();

    const results = await Promise.allSettled(tasks);
    const rejected = results.filter((r) => r.status === 'rejected');
    expect(rejected.length).toBeGreaterThan(0);
  });

  it('propagates task errors', async () => {
    await expect(
      ProcessingQueue.enqueue(async () => {
        throw new Error('task error');
      }),
    ).rejects.toThrow('task error');
  });

  it('higher priority tasks run before lower priority', async () => {
    const order: number[] = [];

    // Fill both concurrency slots with slow tasks
    const blocker1 = ProcessingQueue.enqueue(
      () => new Promise((resolve) => setTimeout(resolve, 80)),
      0,
    );
    const blocker2 = ProcessingQueue.enqueue(
      () => new Promise((resolve) => setTimeout(resolve, 80)),
      0,
    );

    // Now queue tasks with different priorities — they'll wait for a slot
    const low = ProcessingQueue.enqueue(async () => {
      order.push(1);
    }, 1);
    const high = ProcessingQueue.enqueue(async () => {
      order.push(10);
    }, 10);

    await Promise.all([blocker1, blocker2, low, high]);
    // High priority should have run before low
    expect(order.indexOf(10)).toBeLessThan(order.indexOf(1));
  });
});
