import type { TemplateField, PaginationLayout, SlotAssignment } from '@regcheck/shared';

/**
 * Derives pagination info from a template's field definitions.
 *
 * The number of SX slots on a page is not hardcoded — it is derived from the
 * template by counting distinct `slotIndex` values across item-scope fields.
 * This keeps the paginator free of domain coupling (equipments, inspections,
 * etc.) and makes SX naming purely a layout concept.
 */
export class TemplatePaginator {
  /**
   * How many items fit on a single page, derived from the template.
   *
   * @returns the count of distinct non-null `slotIndex` values across
   *          item-scope fields. `0` if the template has only global fields.
   */
  static itemsPerPage(fields: TemplateField[]): number {
    const slots = new Set<number>();
    for (const f of fields) {
      if (f.scope === 'item' && f.slotIndex !== null && f.slotIndex !== undefined) {
        slots.add(f.slotIndex);
      }
    }
    return slots.size;
  }

  /**
   * Compute the full layout: items-per-page, total pages, and per-item assignments.
   *
   * Contract:
   *   - `totalItems = 0`: returns 1 page, no assignments (only globals render).
   *   - `totalItems > 0` with no item-scope slots: throws — the template cannot
   *     render per-item data and would silently drop all items.
   *   - Otherwise: items are packed sequentially; assignment `i` goes to
   *     `(page = floor(i/ipp), slot = i mod ipp)`.
   */
  static compute(fields: TemplateField[], totalItems: number): PaginationLayout {
    if (totalItems < 0 || !Number.isFinite(totalItems)) {
      throw new Error(`Invalid totalItems: ${totalItems}`);
    }

    const ipp = this.itemsPerPage(fields);

    if (totalItems === 0) {
      return { itemsPerPage: ipp, totalPages: 1, assignments: [] };
    }
    if (ipp === 0) {
      throw new Error(
        'Template has item data to fill but defines no SX slots (no item-scope fields with slotIndex).',
      );
    }

    const totalPages = Math.ceil(totalItems / ipp);
    const assignments: SlotAssignment[] = [];
    for (let i = 0; i < totalItems; i++) {
      assignments.push({
        pageOrdinal: Math.floor(i / ipp),
        slotIndex: i % ipp,
        itemIndex: i,
      });
    }
    return { itemsPerPage: ipp, totalPages, assignments };
  }

  /**
   * Template-level invariant check. Intended to block publishing a broken template.
   * Returns human-readable error strings (empty = valid).
   */
  static validate(fields: TemplateField[]): string[] {
    const errors: string[] = [];
    const itemFields = fields.filter((f) => f.scope === 'item');
    const globalFields = fields.filter((f) => f.scope === 'global');

    // Global fields must have slotIndex=null.
    for (const f of globalFields) {
      if (f.slotIndex !== null && f.slotIndex !== undefined) {
        errors.push(`Global field "${f.config.label || f.id}" must not have a slotIndex.`);
      }
    }

    // Item fields must have a non-null slotIndex.
    for (const f of itemFields) {
      if (f.slotIndex === null || f.slotIndex === undefined) {
        errors.push(`Item field "${f.config.label || f.id}" requires a slotIndex (SX).`);
      } else if (!Number.isInteger(f.slotIndex) || f.slotIndex < 0) {
        errors.push(
          `Item field "${f.config.label || f.id}" has invalid slotIndex=${f.slotIndex}.`,
        );
      }
    }

    // Slots must be contiguous 0..N-1 so pagination math matches the page layout.
    const slots = [
      ...new Set(
        itemFields
          .map((f) => f.slotIndex)
          .filter((s): s is number => typeof s === 'number' && s >= 0),
      ),
    ].sort((a, b) => a - b);

    for (let i = 0; i < slots.length; i++) {
      if (slots[i] !== i) {
        errors.push(
          `SX slots must be contiguous starting at 0. Missing slotIndex=${i} (got [${slots.join(', ')}]).`,
        );
        break;
      }
    }

    return errors;
  }
}
