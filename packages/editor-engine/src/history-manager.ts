/**
 * Generic undo/redo history manager.
 * Stores snapshots of state and allows navigation through history.
 */
export class HistoryManager<T> {
  private history: T[] = [];
  private currentIndex = -1;
  private readonly maxSize: number;

  constructor(maxSize = 50) {
    this.maxSize = maxSize;
  }

  /**
   * Push a new state onto the history.
   * Discards any redo states ahead of current position.
   */
  push(state: T): void {
    // Remove everything after current position (discard redo stack)
    this.history = this.history.slice(0, this.currentIndex + 1);

    this.history.push(structuredClone(state));
    this.currentIndex = this.history.length - 1;

    // Trim to max size
    if (this.history.length > this.maxSize) {
      const excess = this.history.length - this.maxSize;
      this.history = this.history.slice(excess);
      this.currentIndex -= excess;
    }
  }

  /** Undo: move back one step. Returns the previous state or null. */
  undo(): T | null {
    if (!this.canUndo()) return null;
    this.currentIndex--;
    const state = this.history[this.currentIndex];
    return state ? structuredClone(state) : null;
  }

  /** Redo: move forward one step. Returns the next state or null. */
  redo(): T | null {
    if (!this.canRedo()) return null;
    this.currentIndex++;
    const state = this.history[this.currentIndex];
    return state ? structuredClone(state) : null;
  }

  canUndo(): boolean {
    return this.currentIndex > 0;
  }

  canRedo(): boolean {
    return this.currentIndex < this.history.length - 1;
  }

  /** Get the current state without modifying history */
  getCurrent(): T | null {
    const state = this.history[this.currentIndex];
    return state ? structuredClone(state) : null;
  }

  /** Clear all history */
  clear(): void {
    this.history = [];
    this.currentIndex = -1;
  }

  /** Get history stats for debugging */
  getStats(): { size: number; currentIndex: number; canUndo: boolean; canRedo: boolean } {
    return {
      size: this.history.length,
      currentIndex: this.currentIndex,
      canUndo: this.canUndo(),
      canRedo: this.canRedo(),
    };
  }
}
