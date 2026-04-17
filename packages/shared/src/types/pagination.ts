/**
 * Single item → page mapping produced by the paginator.
 * `pageOrdinal` is the index of the expanded (duplicated) page where the item renders.
 */
export interface SlotAssignment {
  pageOrdinal: number;
  slotIndex: number;
  itemIndex: number;
}

/** Layout produced by {@link TemplatePaginator.compute}. */
export interface PaginationLayout {
  /** Distinct SX slot count derived from the template's item-scope fields. */
  itemsPerPage: number;
  /** Total pages needed to fit all items (`ceil(totalItems / itemsPerPage)`; min 1). */
  totalPages: number;
  /** One entry per item, in order. */
  assignments: SlotAssignment[];
}
