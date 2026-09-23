import type { QuantityUnit } from './project';

export type WorkSection = {
  id: string;
  name: string;
  parentSectionId: string | null;
  current: number;
  target: number | null;
  createdAt: Date;
  updatedAt: Date;
};

export type RowCounter = {
  id: string;
  name: string;
  current: number;
  target: number | null;
  stitchType?: StitchType;
  customStitchName?: string;
  customStitchInstructions?: string;
  stitchesPerRow?: number | null;
  completed?: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export const stitchTypes = ['sc', 'dc', 'hdc', 'tc', 'sk', 'sl st', 'custom'] as const;
export type StitchType = (typeof stitchTypes)[number];

export type CounterDetails = {
  target: number | null;
  stitchType: StitchType;
  customStitchName?: string;
  customStitchInstructions?: string;
  stitchesPerRow: number | null;
};

export function validateCounterDetails(details: CounterDetails): CounterDetails {
  if (!stitchTypes.includes(details.stitchType)) throw new Error('Choose a valid stitch type.');
  validateCounterValue(details.target, 'target');
  if (
    details.stitchesPerRow !== null &&
    (!Number.isInteger(details.stitchesPerRow) || details.stitchesPerRow < 1)
  )
    throw new Error('Stitches per row must be a positive whole number or blank.');
  const customStitchName = details.customStitchName?.trim();
  const customStitchInstructions = details.customStitchInstructions?.trim();
  if (details.stitchType === 'custom' && (!customStitchName || !customStitchInstructions))
    throw new Error('Enter the custom stitch name and how to produce it.');
  return {
    target: details.target,
    stitchType: details.stitchType,
    stitchesPerRow: details.stitchesPerRow,
    ...(details.stitchType === 'custom' && { customStitchName, customStitchInstructions }),
  };
}

export function counterDisplayName(
  counter: Pick<RowCounter, 'name' | 'stitchType' | 'customStitchName'>,
) {
  if (counter.stitchType === 'custom') return counter.customStitchName?.trim() || counter.name;
  return counter.stitchType?.toUpperCase() || counter.name;
}

export type SectionNode = WorkSection & { children: SectionNode[] };

export function validateCounterValue(value: unknown, field: 'current'): number;
export function validateCounterValue(value: unknown, field: 'target'): number | null;
export function validateCounterValue(value: unknown, field: 'current' | 'target') {
  if (value === null && field === 'target') return null;
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0)
    throw new Error(
      `Counter ${field} must be a non-negative whole number${field === 'target' ? ' or blank' : ''}.`,
    );
  return value;
}

export function nextCounterValue(current: number, target: number | null, change: -1 | 1) {
  validateCounterValue(current, 'current');
  validateCounterValue(target, 'target');
  return Math.max(0, target === null ? current + change : Math.min(target, current + change));
}

export function isRowCycleComplete(
  counters: Pick<RowCounter, 'current' | 'target'>[],
  changedIndex: number,
  changedCurrent: number,
) {
  return (
    counters.length > 0 &&
    counters.every(
      (counter, index) =>
        counter.target !== null &&
        (index === changedIndex ? changedCurrent : counter.current) === counter.target,
    )
  );
}

export function buildSectionTree(sections: WorkSection[]): SectionNode[] {
  const nodes = new Map(
    sections.map((section) => [section.id, { ...section, children: [] as SectionNode[] }]),
  );
  for (const section of sections) {
    if (section.parentSectionId === section.id)
      throw new Error(`Section “${section.name}” cannot be its own parent.`);
    if (section.parentSectionId && !nodes.has(section.parentSectionId))
      throw new Error(`Section “${section.name}” has a missing parent.`);
  }

  for (const section of sections) {
    const visited = new Set<string>();
    let current: WorkSection | undefined = section;
    while (current?.parentSectionId) {
      if (visited.has(current.id)) throw new Error('The section hierarchy contains a cycle.');
      visited.add(current.id);
      current = nodes.get(current.parentSectionId);
    }
  }

  const roots: SectionNode[] = [];
  for (const section of sections) {
    const node = nodes.get(section.id)!;
    if (section.parentSectionId) nodes.get(section.parentSectionId)!.children.push(node);
    else roots.push(node);
  }
  return roots;
}

export function isCounterComplete(counter: RowCounter) {
  return counter.target === null ? counter.completed === true : counter.current === counter.target;
}

export function isSectionComplete(
  section: SectionNode,
  countersBySection: Record<string, RowCounter[]>,
): boolean {
  if (section.target !== null) return section.current === section.target;
  const counters = countersBySection[section.id] ?? [];
  const childrenComplete =
    section.children.length > 0 &&
    section.children.every((child) => isSectionComplete(child, countersBySection));
  const countersComplete = counters.length > 0 && counters.every(isCounterComplete);
  if (section.children.length > 0 && counters.length > 0)
    return childrenComplete && countersComplete;
  if (section.children.length > 0) return childrenComplete;
  return countersComplete;
}

export type ProjectYarnEntry = {
  id: string;
  name: string;
  material: string;
  category: string;
  colour: string;
  quantity: number;
  unit: QuantityUnit;
  customUnit?: string;
  createdAt: Date;
  updatedAt: Date;
};

