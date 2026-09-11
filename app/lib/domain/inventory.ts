import type { QuantityUnit } from './project';

export type InventoryItem = {
  id: string;
  name: string;
  material: string;
  category: string;
  colour: string;
  recommendedHookSize: string;
  quantity: number;
  unit: QuantityUnit;
  customUnit?: string;
  createdAt: Date;
  updatedAt: Date;
};

export type InventoryDraft = Pick<
  InventoryItem,
  | 'name'
  | 'material'
  | 'category'
  | 'colour'
  | 'recommendedHookSize'
  | 'quantity'
  | 'unit'
  | 'customUnit'
>;

export function inventoryDisplayName(
  item: Pick<InventoryDraft, 'name' | 'colour' | 'material' | 'category'>,
) {
  return (
    item.name.trim() ||
    [item.colour, item.material, item.category]
      .map((value) => value.trim())
      .filter(Boolean)
      .join(' ') ||
    'Yarn'
  );
}

const yarnColours: Record<string, string> = {
  black: '#292724',
  grey: '#8b8b87',
  gray: '#8b8b87',
  white: '#dedbd2',
  cream: '#e5d6aa',
  beige: '#c7aa7b',
  brown: '#795548',
  tan: '#b78d62',
  red: '#c5534e',
  coral: '#e47766',
  orange: '#df8845',
  yellow: '#d8b43f',
  gold: '#b9922e',
  green: '#4f8a62',
  teal: '#278c89',
  turquoise: '#37a7a4',
  blue: '#4b79aa',
  navy: '#344b70',
  purple: '#765a9e',
  violet: '#815da7',
  lilac: '#aa8fc1',
  pink: '#cf7795',
  rose: '#bd6879',
  burgundy: '#793c4b',
};

function blendWithWhite(hex: string, white = 0.76) {
  const channels = [1, 3, 5].map((start) => Number.parseInt(hex.slice(start, start + 2), 16));
  return `rgb(${channels.map((channel) => Math.round(channel * (1 - white) + 255 * white)).join(' ')})`;
}

export function inventoryPastelColour(colour: string) {
  const normalized = colour.trim().toLowerCase();
  const explicitHex = /^#[0-9a-f]{6}$/i.test(normalized) ? normalized : undefined;
  const namedHex = Object.entries(yarnColours).find(([name]) =>
    new RegExp(`\\b${name}\\b`).test(normalized),
  )?.[1];
  return blendWithWhite(explicitHex ?? namedHex ?? '#4f8a62');
}

export function validateInventoryDraft(draft: InventoryDraft) {
  const material = draft.material.trim();
  const name = draft.name.trim();
  const category = draft.category.trim();
  const colour = draft.colour.trim();
  const recommendedHookSize = draft.recommendedHookSize.trim();
  const customUnit = draft.customUnit?.trim();
  if (!material) throw new Error('Enter the yarn material.');
  if (!Number.isFinite(draft.quantity) || draft.quantity <= 0)
    throw new Error('Quantity must be a number greater than zero.');
  if (draft.unit === 'custom' && !customUnit) throw new Error('Enter a custom unit.');
  return {
    name,
    material,
    category,
    colour,
    recommendedHookSize,
    quantity: draft.quantity,
    unit: draft.unit,
    ...(draft.unit === 'custom' && { customUnit }),
  };
}
