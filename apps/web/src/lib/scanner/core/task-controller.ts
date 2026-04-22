/** Manages AbortControllers for cancellable pipeline tasks. */

let idCounter = 0;

interface ManagedTask {
  id: string;
  controller: AbortController;
}

const tasks = new Map<string, ManagedTask>();

export const TaskController = {
  /** Create a new cancellable task. Cancels any previous task automatically. */
  createTask(): { signal: AbortSignal; id: string } {
    // Cancel all previous tasks when a new scan starts
    this.cancelAll();

    const id = `scan-${++idCounter}`;
    const controller = new AbortController();
    tasks.set(id, { id, controller });
    return { signal: controller.signal, id };
  },

  cancelTask(id: string): void {
    const task = tasks.get(id);
    if (task) {
      task.controller.abort();
      tasks.delete(id);
    }
  },

  cancelAll(): void {
    for (const task of tasks.values()) {
      task.controller.abort();
    }
    tasks.clear();
  },
};
