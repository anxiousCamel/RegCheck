/**
 * Configuration for intelligent field repetition.
 * Defines how fields are cloned across pages based on grid layout.
 */
export interface RepetitionConfig {
  /** How many items fit on a single page */
  itemsPerPage: number;
  /** Grid layout: number of columns */
  columns: number;
  /** Grid layout: number of rows */
  rows: number;
  /** Horizontal offset between items (relative 0-1) */
  offsetX: number;
  /** Vertical offset between items (relative 0-1) */
  offsetY: number;
  /** Starting X position for the grid (relative 0-1) */
  startX?: number;
  /** Starting Y position for the grid (relative 0-1) */
  startY?: number;
}

/** Result of computing repetition layout */
export interface RepetitionLayout {
  /** Total pages needed */
  totalPages: number;
  /** Items per page mapping */
  pageItems: PageItemLayout[];
}

/** Layout of items on a single page */
export interface PageItemLayout {
  pageIndex: number;
  items: ItemPosition[];
}

/** Computed position of a repeated item */
export interface ItemPosition {
  /** Global item index (0-based) */
  itemIndex: number;
  /** Row in the grid (0-based) */
  row: number;
  /** Column in the grid (0-based) */
  col: number;
  /** Computed X offset for this item */
  offsetX: number;
  /** Computed Y offset for this item */
  offsetY: number;
}
