import { describe, it, expect, beforeEach } from 'vitest';
import { TaskController } from '@/lib/scanner/core/task-controller';

beforeEach(() => {
  TaskController.cancelAll();
});

describe('TaskController', () => {
  it('creates a task with a valid signal', () => {
    const { signal, id } = TaskController.createTask();
    expect(signal).toBeInstanceOf(AbortSignal);
    expect(signal.aborted).toBe(false);
    expect(typeof id).toBe('string');
  });

  it('cancels previous task when new one is created', () => {
    const { signal: s1 } = TaskController.createTask();
    TaskController.createTask(); // creates second, cancels first
    expect(s1.aborted).toBe(true);
  });

  it('cancelAll aborts all active tasks', () => {
    const { signal: s1 } = TaskController.createTask();
    const { signal: s2 } = TaskController.createTask();
    // s1 is already aborted by s2 creation, but let's test cancelAll directly
    TaskController.cancelAll();
    expect(s2.aborted).toBe(true);
  });

  it('cancelTask aborts specific task', () => {
    // Create a task without triggering auto-cancel
    TaskController.cancelAll();
    const { signal, id } = TaskController.createTask();
    TaskController.cancelTask(id);
    expect(signal.aborted).toBe(true);
  });

  it('each task gets a unique id', () => {
    TaskController.cancelAll();
    const { id: id1 } = TaskController.createTask();
    const { id: id2 } = TaskController.createTask();
    expect(id1).not.toBe(id2);
  });
});
