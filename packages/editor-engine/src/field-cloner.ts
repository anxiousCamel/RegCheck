import type { TemplateField, RepetitionConfig, FieldPosition } from '@regcheck/shared';
import { RepetitionEngine } from './repetition-engine';

/**
 * Clones template fields across repeated items,
 * computing absolute positions from the repetition grid.
 */
export class FieldCloner {
  /**
   * Clone a set of base fields for all items in a repetition layout.
   * Each field's position is offset according to the grid placement.
   *
   * @param baseFields - Fields defined for a single item (repetition group)
   * @param totalItems - Total items to generate fields for
   * @param config - Repetition configuration
   * @returns Array of cloned fields with computed positions and item indices
   */
  static cloneForItems(
    baseFields: TemplateField[],
    totalItems: number,
    config: RepetitionConfig,
  ): Array<TemplateField & { computedItemIndex: number; computedPageIndex: number }> {
    const layout = RepetitionEngine.computeLayout(totalItems, config);
    const results: Array<TemplateField & { computedItemIndex: number; computedPageIndex: number }> =
      [];

    for (const pageLayout of layout.pageItems) {
      for (const itemPos of pageLayout.items) {
        for (const baseField of baseFields) {
          const clonedPosition: FieldPosition = {
            x: baseField.position.x + itemPos.offsetX,
            y: baseField.position.y + itemPos.offsetY,
            width: baseField.position.width,
            height: baseField.position.height,
          };

          results.push({
            ...baseField,
            id: `${baseField.id}_item${itemPos.itemIndex}`,
            position: clonedPosition,
            pageIndex: pageLayout.pageIndex,
            repetitionIndex: itemPos.itemIndex,
            computedItemIndex: itemPos.itemIndex,
            computedPageIndex: pageLayout.pageIndex,
          });
        }
      }
    }

    return results;
  }
}
