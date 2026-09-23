import { describe, expect, it } from 'vitest';
import {
  buildSectionTree,
  isSectionComplete,
  isRowCycleComplete,
  nextCounterValue,
  validateCounterDetails,
  validateCounterValue,
  type RowCounter,
  type WorkSection,
} from '@/lib/domain/project-parts';

const time = new Date('2026-01-01');
const section = (id: string, parentSectionId: string | null = null): WorkSection => ({
  id,
  name: id,
  parentSectionId,
  current: 0,
  target: null,
  createdAt: time,
  updatedAt: time,
});
const counter = (id: string, current: number, target: number | null): RowCounter => ({
  id,
  name: id,
  current,
  target,
  createdAt: time,
  updatedAt: time,
});

describe('section trees', () => {
  it('builds an empty tree', () => expect(buildSectionTree([])).toEqual([]));

  it('builds multiple roots, siblings, and four levels', () => {
    const roots = buildSectionTree([
      section('body'),
      section('front', 'body'),
      section('left', 'front'),
      section('edge', 'left'),
      section('back', 'body'),
      section('sleeve'),
    ]);
    expect(roots.map((item) => item.id)).toEqual(['body', 'sleeve']);
    expect(roots[0].children.map((item) => item.id)).toEqual(['front', 'back']);
    expect(roots[0].children[0].children[0].children[0].id).toBe('edge');
  });

  it('rejects self-parenting, missing parents, and cycles', () => {
    expect(() => buildSectionTree([section('body', 'body')])).toThrow('own parent');
    expect(() => buildSectionTree([section('body', 'missing')])).toThrow('missing parent');
    expect(() => buildSectionTree([section('body', 'front'), section('front', 'body')])).toThrow(
      'cycle',
    );
  });
});

describe('row counters', () => {
  it('increments to a target without passing it', () => {
    expect(nextCounterValue(0, 2, 1)).toBe(1);
    expect(nextCounterValue(1, 2, 1)).toBe(2);
    expect(nextCounterValue(2, 2, 1)).toBe(2);
  });

  it('never decrements below zero and supports open-ended counting', () => {
    expect(nextCounterValue(0, 2, -1)).toBe(0);
    expect(nextCounterValue(20, null, 1)).toBe(21);
  });

  it('finishes a piece only when every targeted row counter reaches its target', () => {
    const rows = [
      { current: 17, target: 18 },
      { current: 3, target: 3 },
    ];
    expect(isRowCycleComplete(rows, 0, 18)).toBe(true);
    expect(isRowCycleComplete(rows, 0, 17)).toBe(false);
    expect(isRowCycleComplete([{ current: 4, target: null }], 0, 5)).toBe(false);
  });

  it('rejects negative, decimal, and non-numeric values', () => {
    expect(() => validateCounterValue(-1, 'current')).toThrow('non-negative whole number');
    expect(() => validateCounterValue(1.5, 'target')).toThrow('non-negative whole number');
    expect(() => validateCounterValue('2', 'target')).toThrow('non-negative whole number');
    expect(validateCounterValue(null, 'target')).toBeNull();
  });

  it('validates stitch details and requires instructions for custom stitches', () => {
    expect(
      validateCounterDetails({ stitchType: 'dc', stitchesPerRow: 30, target: 20 }),
    ).toMatchObject({ stitchType: 'dc', stitchesPerRow: 30 });
    expect(() =>
      validateCounterDetails({
        stitchType: 'custom',
        stitchesPerRow: null,
        target: null,
      }),
    ).toThrow('custom stitch name');
    expect(() =>
      validateCounterDetails({ stitchType: 'sc', stitchesPerRow: 0, target: null }),
    ).toThrow('positive whole number');
  });
});

describe('derived section completion', () => {
  it('completes targeted counters but not open-ended-only or empty leaves', () => {
    const leaf = buildSectionTree([section('body')])[0];
    expect(isSectionComplete(leaf, { body: [counter('rows', 2, 2)] })).toBe(true);
    expect(isSectionComplete(leaf, { body: [counter('rows', 2, null)] })).toBe(false);
    expect(
      isSectionComplete(leaf, { body: [{ ...counter('rows', 2, null), completed: true }] }),
    ).toBe(true);
    expect(isSectionComplete(leaf, {})).toBe(false);
  });

  it('combines local counters with descendant completion and reopens ancestors', () => {
    const root = buildSectionTree([section('body'), section('front', 'body')])[0];
    const complete = { body: [counter('body rows', 2, 2)], front: [counter('front rows', 1, 1)] };
    expect(isSectionComplete(root, complete)).toBe(true);
    expect(isSectionComplete(root, { ...complete, front: [counter('front rows', 0, 1)] })).toBe(
      false,
    );
    expect(isSectionComplete(root, { ...complete, body: [counter('body rows', 2, 3)] })).toBe(
      false,
    );
  });
});

