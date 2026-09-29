import { describe, expect, it } from 'vitest';
import {
  inventoryDisplayName,
  inventoryPastelColour,
  validateInventoryDraft,
} from '@/lib/domain/inventory';
import { adjustStock, skeinsToMilli, validateConversion } from '@/lib/domain/materials';
const draft = {
  name: '',
  material: 'Merino wool',
  category: 'DK',
  colour: 'Green',
  recommendedHookSize: '',
  quantity: 1,
  unit: 'skeins' as const,
  conversion: { value: 100, unit: 'grams' as const },
};
describe('v2 inventory and materials arithmetic', () => {
  it.each([0, 0.001, 0.125, 0.3, 3.999, 1000000])('preserves %s skeins exactly', (quantity) => {
    expect(validateInventoryDraft({ ...draft, quantity })).toMatchObject({
      milliSkeins: Math.round(quantity * 1000),
      quantity,
      unit: 'skeins',
    });
  });
  it.each([-1, NaN, Infinity, 0.0001, 0.0000000001, 1000000.001])('rejects invalid quantity %s', (value) =>
    expect(() => skeinsToMilli(value)).toThrow(),
  );
  it('requires a supported positive label conversion', () => {
    for (const conversion of [
      undefined,
      { value: 0, unit: 'grams' },
      { value: 100, unit: 'ounces' },
    ])
      expect(() => validateConversion(conversion)).toThrow();
    for (const unit of ['grams', 'metres', 'yards'])
      expect(validateConversion({ value: 100, unit })).toEqual({ value: 100, unit });
    expect(() => validateInventoryDraft({ ...draft, unit: 'grams' })).toThrow('skeins');
    expect(() => validateInventoryDraft({ ...draft, material: '' })).toThrow('material');
  });
  it('deducts deltas, returns corrections, and leaves historical usage neutral', () => {
    expect(adjustStock(3000, 0, 250, true)).toBe(2750);
    expect(adjustStock(2250, 500, 200, true)).toBe(2550);
    expect(adjustStock(2550, 450, 0, true)).toBe(3000);
    expect(adjustStock(0, 2000, 1500, false)).toBe(0);
    expect(() => adjustStock(249, 0, 250, true)).toThrow('Not enough');
  });
  it('preserves yarn names and pastel colours', () => {
    expect(inventoryDisplayName(draft)).toBe('Green Merino wool DK');
    expect(inventoryDisplayName({ ...draft, name: 'Cardigan yarn' })).toBe('Cardigan yarn');
    expect(inventoryPastelColour('Teal')).toBe('rgb(203 227 227)');
    expect(inventoryPastelColour('#ff0000')).toBe('rgb(255 194 194)');
  });
});
