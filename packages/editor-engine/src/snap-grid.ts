/** Configuration for the snap grid */
interface SnapGridConfig {
  /** Grid cell size in pixels */
  cellSize: number;
  /** Whether snapping is enabled */
  enabled: boolean;
}

/**
 * Implements snap-to-grid functionality for the editor.
 * Coordinates are snapped to the nearest grid intersection.
 */
export class SnapGrid {
  private config: SnapGridConfig;

  constructor(config?: Partial<SnapGridConfig>) {
    this.config = {
      cellSize: config?.cellSize ?? 10,
      enabled: config?.enabled ?? true,
    };
  }

  /** Snap a value to the nearest grid point */
  snap(value: number): number {
    if (!this.config.enabled) return value;
    return Math.round(value / this.config.cellSize) * this.config.cellSize;
  }

  /** Snap x,y coordinates */
  snapPosition(x: number, y: number): { x: number; y: number } {
    return {
      x: this.snap(x),
      y: this.snap(y),
    };
  }

  /** Snap width,height dimensions */
  snapSize(width: number, height: number): { width: number; height: number } {
    return {
      width: Math.max(this.config.cellSize, this.snap(width)),
      height: Math.max(this.config.cellSize, this.snap(height)),
    };
  }

  setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;
  }

  setCellSize(size: number): void {
    this.config.cellSize = Math.max(1, size);
  }

  getConfig(): Readonly<SnapGridConfig> {
    return { ...this.config };
  }
}
