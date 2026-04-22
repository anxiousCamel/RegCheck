import { describe, it, expect } from 'vitest';
import { FieldBindingResolver } from '../field-binding-resolver';
import type { BindingContext } from '../field-binding-resolver';

const ctx: BindingContext = {
  globals: { data: '2026-04-17', tecnico: 'Ana Silva' },
  items: [
    { numero: 'EQ-001', serie: 'SN-A', patrimonio: 'PAT-1', setor: 'TI' },
    { numero: 'EQ-002', serie: 'SN-B' },
  ],
};

describe('FieldBindingResolver.resolve', () => {
  it('resolves global.* bindings', () => {
    expect(FieldBindingResolver.resolve('global.data', ctx)).toBe('2026-04-17');
    expect(FieldBindingResolver.resolve('global.tecnico', ctx)).toBe('Ana Silva');
  });

  it('returns undefined for missing global key', () => {
    expect(FieldBindingResolver.resolve('global.missing', ctx)).toBeUndefined();
  });

  it('resolves eq.* bindings with itemIndex', () => {
    expect(FieldBindingResolver.resolve('eq.numero', ctx, 0)).toBe('EQ-001');
    expect(FieldBindingResolver.resolve('eq.serie', ctx, 1)).toBe('SN-B');
    expect(FieldBindingResolver.resolve('eq.setor', ctx, 0)).toBe('TI');
  });

  it('returns undefined for missing eq key', () => {
    expect(FieldBindingResolver.resolve('eq.ip', ctx, 0)).toBeUndefined();
  });

  it('returns undefined for eq.* without itemIndex', () => {
    expect(FieldBindingResolver.resolve('eq.numero', ctx)).toBeUndefined();
  });

  it('returns undefined for eq.* with out-of-range itemIndex', () => {
    expect(FieldBindingResolver.resolve('eq.numero', ctx, 99)).toBeUndefined();
  });

  it('returns undefined for malformed binding key', () => {
    expect(FieldBindingResolver.resolve('bad-key', ctx)).toBeUndefined();
    expect(FieldBindingResolver.resolve('unknown.field', ctx)).toBeUndefined();
    expect(FieldBindingResolver.resolve('', ctx)).toBeUndefined();
  });
});

describe('FieldBindingResolver.isValidKey', () => {
  it('accepts valid keys', () => {
    expect(FieldBindingResolver.isValidKey('global.data')).toBe(true);
    expect(FieldBindingResolver.isValidKey('eq.numero_equipamento')).toBe(true);
    expect(FieldBindingResolver.isValidKey('eq.serie')).toBe(true);
  });

  it('rejects invalid keys', () => {
    expect(FieldBindingResolver.isValidKey('data')).toBe(false);
    expect(FieldBindingResolver.isValidKey('global.')).toBe(false);
    expect(FieldBindingResolver.isValidKey('other.field')).toBe(false);
    expect(FieldBindingResolver.isValidKey('eq.123')).toBe(false);
  });
});

describe('FieldBindingResolver.parse', () => {
  it('parses valid keys', () => {
    expect(FieldBindingResolver.parse('global.data')).toEqual({ namespace: 'global', key: 'data' });
    expect(FieldBindingResolver.parse('eq.serie')).toEqual({ namespace: 'eq', key: 'serie' });
  });

  it('returns null for invalid keys', () => {
    expect(FieldBindingResolver.parse('bad')).toBeNull();
  });
});
