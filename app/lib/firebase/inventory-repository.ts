import {
  addDoc,
  collection,
  deleteField,
  doc,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  runTransaction,
} from 'firebase/firestore';
import { quantityUnits } from '@/lib/domain/project';
import {
  validateInventoryDraft,
  type InventoryDraft,
  type InventoryItem,
} from '@/lib/domain/inventory';
import { requireConnection } from './materials-repository';
import { getFirebaseClient } from './client';

function inventory(userId: string) {
  return collection(getFirebaseClient().firestore, 'users', userId, 'inventory');
}

function date(value: unknown) {
  if (!(value instanceof Timestamp)) throw new Error('A stash item has an invalid date.');
  return value.toDate();
}

export function observeInventory(
  userId: string,
  next: (items: InventoryItem[], pending: boolean, cached: boolean) => void,
  fail: (error: Error) => void,
) {
  return onSnapshot(
    inventory(userId),
    { includeMetadataChanges: true },
    (snapshot) => {
      try {
        const items = snapshot.docs
          .map((item) => {
            const data = item.data({ serverTimestamps: 'estimate' });
            if (
              typeof data.material !== 'string' ||
              typeof data.category !== 'string' ||
              typeof data.colour !== 'string' ||
              typeof data.quantity !== 'number' ||
              !quantityUnits.includes(data.unit)
            )
              throw new Error(`Stash item ${item.id} is malformed.`);
            return {
              id: item.id,
              name: typeof data.name === 'string' ? data.name : '',
              material: data.material,
              category: data.category,
              colour: data.colour,
              recommendedHookSize:
                typeof data.recommendedHookSize === 'string' ? data.recommendedHookSize : '',
              conversion: data.conversion,
              milliSkeins: data.milliSkeins,
              linkedUsageCount: data.linkedUsageCount,
              usageRevision: data.usageRevision,
              quantity: data.quantity,
              unit: data.unit,
              ...(typeof data.customUnit === 'string' && { customUnit: data.customUnit }),
              createdAt: date(data.createdAt),
              updatedAt: date(data.updatedAt),
            };
          })
          .sort(
            (a, b) => a.createdAt.getTime() - b.createdAt.getTime() || a.id.localeCompare(b.id),
          );
        next(items, snapshot.metadata.hasPendingWrites, snapshot.metadata.fromCache);
      } catch (error) {
        fail(error instanceof Error ? error : new Error('Hooked could not read your stash.'));
      }
    },
    fail,
  );
}

export async function addInventoryItem(userId: string, draft: InventoryDraft) {
  requireConnection();
  const value = validateInventoryDraft(draft);
  await addDoc(inventory(userId), {
    ...value,
    linkedUsageCount: 0,
    usageRevision: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function updateInventoryItem(
  userId: string,
  itemId: string,
  draft: InventoryDraft,
  expected?: InventoryItem,
) {
  requireConnection();
  const value = validateInventoryDraft(draft);
  const ref = doc(inventory(userId), itemId);
  await runTransaction(getFirebaseClient().firestore, async (tx) => {
    const snapshot = await tx.get(ref);
    const old = snapshot.data();
    if (!old) throw new Error('This yarn no longer exists.');
    if (
      expected &&
      (old.quantity !== expected.quantity ||
        (old.usageRevision ?? 0) !== (expected.usageRevision ?? 0) ||
        old.updatedAt.toMillis() !== expected.updatedAt.getTime())
    )
      throw new Error(
        'This yarn changed while you were editing. Cancel and reopen to use the latest stock.',
      );
    tx.update(ref, {
      ...value,
      customUnit: deleteField(),
      linkedUsageCount: old.linkedUsageCount ?? 0,
      usageRevision: old.usageRevision ?? 0,
      updatedAt: serverTimestamp(),
    });
  });
}

export async function removeInventoryItem(userId: string, itemId: string) {
  requireConnection();
  const ref = doc(inventory(userId), itemId);
  await runTransaction(getFirebaseClient().firestore, async (tx) => {
    const snapshot = await tx.get(ref);
    if ((snapshot.data()?.linkedUsageCount ?? 0) > 0)
      throw new Error(
        'This yarn is linked to a project. Remove its materials entries before deleting it.',
      );
    tx.delete(ref);
  });
}
