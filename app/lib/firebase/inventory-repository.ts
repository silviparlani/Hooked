import {
  addDoc,
  collection,
  deleteDoc,
  deleteField,
  doc,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  updateDoc,
} from 'firebase/firestore';
import { quantityUnits } from '@/lib/domain/project';
import {
  validateInventoryDraft,
  type InventoryDraft,
  type InventoryItem,
} from '@/lib/domain/inventory';
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
  const value = validateInventoryDraft(draft);
  await addDoc(inventory(userId), {
    ...value,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function updateInventoryItem(userId: string, itemId: string, draft: InventoryDraft) {
  const value = validateInventoryDraft(draft);
  await updateDoc(doc(inventory(userId), itemId), {
    ...value,
    customUnit: value.unit === 'custom' ? value.customUnit : deleteField(),
    updatedAt: serverTimestamp(),
  });
}

export async function removeInventoryItem(userId: string, itemId: string) {
  await deleteDoc(doc(inventory(userId), itemId));
}
