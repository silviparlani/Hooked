import { describe, expect, it } from 'vitest';
import {
  inventoryDisplayName,
  inventoryPastelColour,
  validateInventoryDraft,
} from '@/lib/domain/inventory';

const draft = {
  name: '',
  material: 'Merino wool',
  category: 'DK',
  colour: 'Green',
  recommendedHookSize: '',
  quantity: 1,
  unit: 'skeins' as const,
};

describe('inventory validation', () => {
  it.each(['skeins', 'grams', 'yards', 'metres'] as const)(
    'accepts decimal quantities in %s',
    (unit) => {
      expect(validateInventoryDraft({ ...draft, quantity: 0.5, unit })).toMatchObject({
        quantity: 0.5,
        unit,
      });
    },
  );

  it('accepts a named custom unit', () => {
    expect(validateInventoryDraft({ ...draft, unit: 'custom', customUnit: 'cakes' })).toMatchObject(
      { unit: 'custom', customUnit: 'cakes' },
    );
  });

  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY])(
    'rejects invalid quantity %s',
    (quantity) => {
      expect(() => validateInventoryDraft({ ...draft, quantity })).toThrow('greater than zero');
    },
  );

  it('requires material and custom unit text', () => {
    expect(() => validateInventoryDraft({ ...draft, material: ' ' })).toThrow('material');
    expect(() => validateInventoryDraft({ ...draft, unit: 'custom', customUnit: ' ' })).toThrow(
      'custom unit',
    );
  });

  it('uses a custom name or falls back to colour, material and category', () => {
    expect(inventoryDisplayName(draft)).toBe('Green Merino wool DK');
    expect(inventoryDisplayName({ ...draft, name: 'Cardigan yarn' })).toBe('Cardigan yarn');
  });

  it('derives pastel tile colours from names and hex values with a safe fallback', () => {
    expect(inventoryPastelColour('Teal')).toBe('rgb(203 227 227)');
    expect(inventoryPastelColour('Light Grey')).toBe('rgb(227 227 226)');
    expect(inventoryPastelColour('#ff0000')).toBe('rgb(255 194 194)');
    expect(inventoryPastelColour('Mystery')).toBe('rgb(213 227 217)');
  });
});
