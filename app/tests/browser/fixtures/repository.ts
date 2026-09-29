import type { ProjectStatus } from '@/lib/domain/project';
import type { InventoryItem } from '@/lib/domain/inventory';
const now = new Date('2026-09-27T12:00:00Z');
export function useProjects(_userId: string, status: ProjectStatus) {
  return {
    projects: (new URLSearchParams(location.search).has('many')
      ? Array.from({ length: 20 }, (_, i) => 'project-' + i)
      : ['one', 'two', 'three']
    ).map((id, index) => ({
      id,
      name:
        ['Meadow cardigan', 'Sunday market tote', 'Little woodland fox'][index] ??
        'Crochet project ' + (index + 1),
      status,
      description:
        index === 0
          ? 'A soft cardigan for slow mornings.\n' +
            'Keeping notes on every stitch and every small change. '.repeat(8)
          : 'A small project, made with care.',
      latestUpdate: 'Finished the ribbing and started the body. '.repeat(10),
      latestUpdateAt: now,
      completedAt: new Date(now.getTime() - index * 86400000),
      schemaVersion: 1 as const,
      createdAt: now,
      updatedAt: new Date(now.getTime() - index * 86400000),
    })),
    loading: false,
    pending: false,
    cached: false,
    error: '',
  };
}
export async function startProject() {}
export async function deleteProject() {}
export function observeWorkSections(_user: string, _project: string, next: (data: []) => void) {
  next([]);
  return () => {};
}
export function observeMaterials(_user: string, _project: string, next: (data: []) => void) {
  next([]);
  return () => {};
}
export async function addMaterialUsage() {}
export async function correctMaterialUsage() {}
export function observeProjectPhotos(
  _user: string,
  _project: string,
  next: (data: import('@/lib/domain/project-photo').ProjectPhoto[]) => void,
  _fail?: unknown,
  reference = false,
) {
  const count = reference ? 1 : 3;
  next(
    Array.from({ length: count }, (_, index) => ({
      id: String(index),
      cloudinaryPublicId: 'fixture',
      secureUrl:
        'data:image/svg+xml,' +
        encodeURIComponent(
          '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect width="400" height="300" fill="' +
            ['#d5e1d4', '#e6d2bd', '#ccdce5'][index] +
            '"/><text x="200" y="150" text-anchor="middle" font-size="24" fill="#31594a">Photo fixture ' +
            (index + 1) +
            '</text></svg>',
        ),
      assetVersion: 1,
      format: 'png',
      contentType: 'image/png',
      byteSize: 100,
      width: 400,
      height: 300,
      createdAt: now,
    })),
  );
  return () => {};
}
export function observeInventory(
  _user: string,
  next: (items: InventoryItem[], pending: boolean, cached: boolean) => void,
) {
  next(
    [
      {
        id: 'green',
        name: 'Meadow wool',
        material: 'Merino wool',
        category: 'DK',
        colour: 'Green',
        recommendedHookSize: '4–5 mm',
        quantity: 2.75,
        milliSkeins: 2750,
        unit: 'skeins',
        conversion: { value: 100, unit: 'grams' },
        createdAt: now,
        updatedAt: now,
      },
    ],
    false,
    false,
  );
  return () => {};
}
export async function addInventoryItem() {}
export async function updateInventoryItem() {}
export async function removeInventoryItem() {}
