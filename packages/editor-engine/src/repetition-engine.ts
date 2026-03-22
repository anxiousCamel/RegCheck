import type {
  RepetitionConfig,
  RepetitionLayout,
  PageItemLayout,
  ItemPosition,
} from '@regcheck/shared';

/**
 * Computes the layout for repeated items across pages.
 * Core logic for the intelligent repetition system.
 */
export class RepetitionEngine {
  /**
   * Compute how items should be distributed across pages.
   * @param totalItems - Total number of items to place
   * @param config - Repetition configuration
   * @returns Layout with page assignments and positions
   */
  static computeLayout(totalItems: number, config: RepetitionConfig): RepetitionLayout {
    const effectiveItemsPerPage = Math.min(config.itemsPerPage, config.rows * config.columns);
    const totalPages = Math.ceil(totalItems / effectiveItemsPerPage);
    const pageItems: PageItemLayout[] = [];

    for (let pageIdx = 0; pageIdx < totalPages; pageIdx++) {
      const startItem = pageIdx * effectiveItemsPerPage;
      const endItem = Math.min(startItem + effectiveItemsPerPage, totalItems);
      const items: ItemPosition[] = [];

      for (let itemIdx = startItem; itemIdx < endItem; itemIdx++) {
        const localIdx = itemIdx - startItem;
        const row = Math.floor(localIdx / config.columns);
        const col = localIdx % config.columns;

        items.push({
          itemIndex: itemIdx,
          row,
          col,
          offsetX: (config.startX ?? 0) + col * config.offsetX,
          offsetY: (config.startY ?? 0) + row * config.offsetY,
        });
      }

      pageItems.push({ pageIndex: pageIdx, items });
    }

    return { totalPages, pageItems };
  }

  /**
   * Validate that a repetition config is internally consistent.
   * @param config - Config to validate
   * @returns Array of validation error messages (empty if valid)
   */
  static validate(config: RepetitionConfig): string[] {
    const errors: string[] = [];

    if (config.itemsPerPage > config.rows * config.columns) {
      errors.push(
        `itemsPerPage (${config.itemsPerPage}) exceeds grid capacity (${config.rows} × ${config.columns} = ${config.rows * config.columns})`,
      );
    }

    const maxOffsetX = (config.startX ?? 0) + (config.columns - 1) * config.offsetX;
    if (maxOffsetX > 1) {
      errors.push(`Horizontal layout exceeds page bounds (max X offset: ${maxOffsetX.toFixed(3)})`);
    }

    const maxOffsetY = (config.startY ?? 0) + (config.rows - 1) * config.offsetY;
    if (maxOffsetY > 1) {
      errors.push(`Vertical layout exceeds page bounds (max Y offset: ${maxOffsetY.toFixed(3)})`);
    }

    return errors;
  }
}
