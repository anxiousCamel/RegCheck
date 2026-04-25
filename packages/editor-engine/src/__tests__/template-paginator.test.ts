import { describe, it, expect } from 'vitest';
import { TemplatePaginator } from '../template-paginator';
import type { TemplateField } from '@regcheck/shared';

function makeField(
  id: string,
  scope: 'global' | 'item',
  slotIndex: number | null = null,
): TemplateField {
  return {
    id,
    type: 'text',
    pageIndex: 0,
    position: { x: 0, y: 0, width: 0.2, height: 0.05 },
    config: { label: id, required: false },
    scope,
    slotIndex,
    bindingKey: null,
    createdAt: '',
    updatedAt: '',
  };
}

describe('TemplatePaginator.itemsPerPage', () => {
  it('counts distinct item-scope slotIndexes', () => {
    const fields = [
      makeField('a', 'item', 0),
      makeField('b', 'item', 0), // same slot as 'a'
      makeField('c', 'item', 1),
      makeField('d', 'item', 2),
      makeField('sig', 'global'),
    ];
    expect(TemplatePaginator.itemsPerPage(fields)).toBe(3);
  });

  it('returns 0 when there are only global fields', () => {
    expect(TemplatePaginator.itemsPerPage([makeField('x', 'global')])).toBe(0);
  });

  it('returns 0 for empty field list', () => {
    expect(TemplatePaginator.itemsPerPage([])).toBe(0);
  });
});

describe('TemplatePaginator.compute', () => {
  const fields = [
    makeField('f0', 'item', 0),
    makeField('f1', 'item', 1),
    makeField('f2', 'item', 2),
    makeField('sig', 'global'),
  ]; // itemsPerPage = 3

  it('distributes 9 items into 3 pages of 3', () => {
    const layout = TemplatePaginator.compute(fields, 9);
    expect(layout.totalPages).toBe(3);
    expect(layout.itemsPerPage).toBe(3);
    expect(layout.assignments).toHaveLength(9);
    expect(layout.assignments[0]).toEqual({ pageOrdinal: 0, slotIndex: 0, itemIndex: 0 });
    expect(layout.assignments[3]).toEqual({ pageOrdinal: 1, slotIndex: 0, itemIndex: 3 });
    expect(layout.assignments[8]).toEqual({ pageOrdinal: 2, slotIndex: 2, itemIndex: 8 });
  });

  it('rounds up pages — 10 items into 4 pages (last page has 1)', () => {
    const layout = TemplatePaginator.compute(fields, 10);
    expect(layout.totalPages).toBe(4);
    expect(layout.assignments).toHaveLength(10);
    expect(layout.assignments[9]).toEqual({ pageOrdinal: 3, slotIndex: 0, itemIndex: 9 });
  });

  it('returns 1 page with no assignments for 0 items', () => {
    const layout = TemplatePaginator.compute(fields, 0);
    expect(layout.totalPages).toBe(1);
    expect(layout.assignments).toHaveLength(0);
  });

  it('returns 1 page with no assignments for 0 items even with only globals', () => {
    const layout = TemplatePaginator.compute([makeField('g', 'global')], 0);
    expect(layout.totalPages).toBe(1);
    expect(layout.assignments).toHaveLength(0);
  });

  it('throws when totalItems > 0 but no SX slots exist', () => {
    expect(() => TemplatePaginator.compute([makeField('g', 'global')], 5)).toThrow();
  });

  it('handles exactly 1 item', () => {
    const layout = TemplatePaginator.compute(fields, 1);
    expect(layout.totalPages).toBe(1);
    expect(layout.assignments).toHaveLength(1);
    expect(layout.assignments[0]).toEqual({ pageOrdinal: 0, slotIndex: 0, itemIndex: 0 });
  });
});

describe('TemplatePaginator.validate', () => {
  it('passes a well-formed template', () => {
    const fields = [makeField('a', 'item', 0), makeField('b', 'item', 1), makeField('c', 'global')];
    expect(TemplatePaginator.validate(fields)).toHaveLength(0);
  });

  it('reports global field with non-null slotIndex', () => {
    const bad = makeField('g', 'global');
    bad.slotIndex = 1;
    const errs = TemplatePaginator.validate([bad]);
    expect(errs.length).toBeGreaterThan(0);
    expect(errs[0]).toContain('Global');
  });

  it('reports item field missing slotIndex', () => {
    const bad = makeField('i', 'item', null);
    const errs = TemplatePaginator.validate([bad]);
    expect(errs.length).toBeGreaterThan(0);
  });

  it('reports non-contiguous slots (0, 2 without 1)', () => {
    const fields = [makeField('a', 'item', 0), makeField('b', 'item', 2)];
    const errs = TemplatePaginator.validate(fields);
    expect(errs.some((e) => e.includes('contiguous'))).toBe(true);
  });
});
