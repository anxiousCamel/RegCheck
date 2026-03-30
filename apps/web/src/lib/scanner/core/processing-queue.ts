/** FIFO queue with priority and concurrency control for mobile. */

import type { QueuedTask } from '../types';

const MAX_CONCURRENT = 2;
const MAX_QUEUE_SIZE = 4;

let idCounter = 0;
const queue: QueuedTask[] = [];
let running = 0;

function processNext(): void {
  while (running < MAX_CONCURRENT && queue.length > 0) {
    const task = queue.shift()!;
    running++;

    const controller = new AbortController();
    task
      .execute(controller.signal)
      .then(task.resolve)
      .catch(task.reject)
      .finally(() => {
        running--;
        processNext();
      });
  }
}

export const ProcessingQueue = {
  enqueue<T>(
    execute: (signal: AbortSignal) => Promise<T>,
    priority = 0,
  ): Promise<T> {
    // Drop oldest low-priority tasks if queue is full
    while (queue.length >= MAX_QUEUE_SIZE) {
      const dropped = queue.shift()!;
      dropped.reject(new DOMException('Task dropped from queue', 'AbortError'));
    }

    return new Promise<T>((resolve, reject) => {
      const task: QueuedTask = {
        id: `qtask-${++idCounter}`,
        priority,
        execute: execute as (signal: AbortSignal) => Promise<unknown>,
        resolve: resolve as (value: unknown) => void,
        reject,
      };

      // Insert by priority (higher = earlier)
      const idx = queue.findIndex((t) => t.priority < priority);
      if (idx === -1) {
        queue.push(task);
      } else {
        queue.splice(idx, 0, task);
      }

      processNext();
    });
  },

  clear(): void {
    for (const task of queue) {
      task.reject(new DOMException('Queue cleared', 'AbortError'));
    }
    queue.length = 0;
  },

  get pending(): number {
    return queue.length;
  },

  get active(): number {
    return running;
  },
};
