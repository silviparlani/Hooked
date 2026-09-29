export const conversionUnits = ['grams', 'metres', 'yards'] as const;
export type ConversionUnit = (typeof conversionUnits)[number];
export type YarnConversion = { value: number; unit: ConversionUnit };
export const MAX_MILLI_SKEINS = 1_000_000_000;

export function skeinsToMilli(value: number): number {
  const scaled = value * 1000;
  const rounded = Math.round(scaled);
  if (
    !Number.isFinite(value) ||
    value < 0 ||
    rounded > MAX_MILLI_SKEINS ||
    Math.abs(scaled - rounded) > Number.EPSILON * Math.max(1, Math.abs(scaled)) * 4
  )
    throw new Error('Enter 0 to 1,000,000 skeins with at most three decimal places.');
  return rounded;
}

export function validateConversion(value: unknown): YarnConversion {
  const conversion = value as YarnConversion | undefined;
  if (
    !conversion ||
    !conversionUnits.includes(conversion.unit) ||
    !Number.isFinite(conversion.value) ||
    conversion.value <= 0 ||
    conversion.value > 1_000_000_000
  )
    throw new Error('Enter a positive label amount in grams, metres, or yards for one skein.');
  return { value: conversion.value, unit: conversion.unit };
}

export function adjustStock(
  stock: number,
  oldUsed: number,
  newUsed: number,
  deductsStock: boolean,
) {
  for (const value of [stock, oldUsed, newUsed]) {
    if (!Number.isSafeInteger(value) || value < 0 || value > MAX_MILLI_SKEINS)
      throw new Error('Invalid skein quantity.');
  }
  const next = stock + (deductsStock ? oldUsed - newUsed : 0);
  if (next < 0) throw new Error('Not enough yarn in your stash.');
  if (next > MAX_MILLI_SKEINS)
    throw new Error('The returned yarn exceeds the supported stash quantity.');
  return next;
}

export type MaterialUsage = {
  id: string;
  projectId: string;
  inventoryId: string;
  name: string;
  colour: string;
  material: string;
  conversion: YarnConversion;
  milliSkeins: number;
  deductsStock: boolean;
  version: number;
  operationId: string;
  createdAt: Date;
  updatedAt: Date;
};

export function convertedUsage(entry: Pick<MaterialUsage, 'milliSkeins' | 'conversion'>) {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 6 }).format(
    (entry.milliSkeins / 1000) * entry.conversion.value,
  );
}
