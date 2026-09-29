import {
  collection,
  doc,
  getDocsFromServer,
  onSnapshot,
  query,
  runTransaction,
  serverTimestamp,
  where,
} from 'firebase/firestore';
import {
  adjustStock,
  skeinsToMilli,
  validateConversion,
  type MaterialUsage,
} from '@/lib/domain/materials';
import { inventoryDisplayName } from '@/lib/domain/inventory';
import { getFirebaseClient } from './client';

export function requireConnection() {
  if (typeof navigator !== 'undefined' && navigator.onLine === false)
    throw new Error('Connect to the internet to update materials or stock.');
}

export function observeMaterials(
  userId: string,
  projectId: string,
  next: (entries: MaterialUsage[]) => void,
  fail: (error: Error) => void,
) {
  return onSnapshot(
    query(
      collection(getFirebaseClient().firestore, 'users', userId, 'materialUsage'),
      where('projectId', '==', projectId),
    ),
    (snapshot) => {
      try {
        next(
          snapshot.docs
            .map((item) => {
              const data = item.data({ serverTimestamps: 'estimate' });
              return {
                ...data,
                id: item.id,
                conversion: validateConversion(data.conversion),
                createdAt: data.createdAt.toDate(),
                updatedAt: data.updatedAt.toDate(),
              } as MaterialUsage;
            })
            .filter((item) => item.milliSkeins > 0)
            .sort(
              (a, b) => a.createdAt.getTime() - b.createdAt.getTime() || a.id.localeCompare(b.id),
            ),
        );
      } catch (error) {
        fail(error instanceof Error ? error : new Error('Could not read materials.'));
      }
    },
    fail,
  );
}

// The operation ID belongs to the submission, not a transaction attempt.
export async function addMaterialUsage(
  userId: string,
  projectId: string,
  inventoryId: string,
  skeins: number,
  operationId: string,
) {
  requireConnection();
  const milliSkeins = skeinsToMilli(skeins);
  if (!milliSkeins) throw new Error('Enter an amount greater than zero.');
  const db = getFirebaseClient().firestore;
  const usageRef = doc(db, 'users', userId, 'materialUsage', operationId);
  const projectRef = doc(db, 'users', userId, 'projects', projectId);
  const stockRef = doc(db, 'users', userId, 'inventory', inventoryId);
  await runTransaction(db, async (tx) => {
    const [usage, project, stock] = await Promise.all([
      tx.get(usageRef),
      tx.get(projectRef),
      tx.get(stockRef),
    ]);
    if (usage.exists()) {
      if (usage.data().projectId !== projectId || usage.data().inventoryId !== inventoryId)
        throw new Error('This submission has already been used.');
      return;
    }
    const p = project.data();
    const yarn = stock.data();
    if (!p || p.deleting || !['active', 'completed'].includes(p.status))
      throw new Error('This project cannot accept materials.');
    if (!yarn || yarn.unit !== 'skeins' || !Number.isSafeInteger(yarn.milliSkeins))
      throw new Error('Set up this yarn in Stash with skeins and its label conversion first.');
    const conversion = validateConversion(yarn.conversion);
    const deductsStock = p.status === 'active' || p.materialsMode === 'consumed';
    const nextStock = adjustStock(yarn.milliSkeins, 0, milliSkeins, deductsStock);
    tx.set(usageRef, {
      projectId,
      inventoryId,
      name: inventoryDisplayName(yarn as Parameters<typeof inventoryDisplayName>[0]),
      colour: yarn.colour,
      material: yarn.material,
      conversion,
      milliSkeins,
      deductsStock,
      version: 1,
      operationId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    tx.update(stockRef, {
      milliSkeins: nextStock,
      quantity: nextStock / 1000,
      linkedUsageCount: (yarn.linkedUsageCount ?? 0) + 1,
      usageRevision: (yarn.usageRevision ?? 0) + 1,
      lastUsageId: usageRef.id,
      updatedAt: serverTimestamp(),
    });
    tx.update(projectRef, {
      usageCount: (p.usageCount ?? 0) + 1,
      usageRevision: (p.usageRevision ?? 0) + 1,
      lastUsageId: usageRef.id,
      updatedAt: serverTimestamp(),
    });
  });
}

export async function correctMaterialUsage(
  userId: string,
  entry: MaterialUsage,
  skeins: number,
  operationId: string,
) {
  requireConnection();
  const milliSkeins = skeinsToMilli(skeins);
  const db = getFirebaseClient().firestore;
  const usageRef = doc(db, 'users', userId, 'materialUsage', entry.id);
  const projectRef = doc(db, 'users', userId, 'projects', entry.projectId);
  const stockRef = doc(db, 'users', userId, 'inventory', entry.inventoryId);
  await runTransaction(db, async (tx) => {
    const [usage, project, stock] = await Promise.all([
      tx.get(usageRef),
      tx.get(projectRef),
      tx.get(stockRef),
    ]);
    const old = usage.data();
    const p = project.data();
    const yarn = stock.data();
    if (!old || !p || !yarn) throw new Error('This material or yarn no longer exists.');
    if (old.operationId === operationId) return;
    if (old.version !== entry.version || old.milliSkeins === 0)
      throw new Error('This entry changed elsewhere. Reopen it before correcting it.');
    if (p.deleting && milliSkeins !== 0) throw new Error('This project is being deleted.');
    const nextStock = adjustStock(yarn.milliSkeins, old.milliSkeins, milliSkeins, old.deductsStock);
    const countChange = milliSkeins === 0 ? -1 : 0;
    tx.update(usageRef, {
      milliSkeins,
      version: old.version + 1,
      operationId,
      updatedAt: serverTimestamp(),
    });
    tx.update(stockRef, {
      milliSkeins: nextStock,
      quantity: nextStock / 1000,
      linkedUsageCount: yarn.linkedUsageCount + countChange,
      usageRevision: (yarn.usageRevision ?? 0) + 1,
      lastUsageId: usageRef.id,
      updatedAt: serverTimestamp(),
    });
    tx.update(projectRef, {
      usageCount: p.usageCount + countChange,
      usageRevision: (p.usageRevision ?? 0) + 1,
      lastUsageId: usageRef.id,
      updatedAt: serverTimestamp(),
    });
  });
}

// Lock first; resumable refunds then make deletion safe across devices and retries.
export async function refundProjectMaterials(userId: string, projectId: string) {
  requireConnection();
  const db = getFirebaseClient().firestore;
  const projectRef = doc(db, 'users', userId, 'projects', projectId);
  await runTransaction(db, async (tx) => {
    const project = await tx.get(projectRef);
    if (project.exists()) tx.update(projectRef, { deleting: true, updatedAt: serverTimestamp() });
  });
  const entries = await getDocsFromServer(
    query(collection(db, 'users', userId, 'materialUsage'), where('projectId', '==', projectId)),
  );
  for (const item of entries.docs) {
    const entry = { ...item.data(), id: item.id } as MaterialUsage;
    if (entry.milliSkeins > 0)
      await correctMaterialUsage(
        userId,
        entry,
        0,
        `delete-${projectId}-${item.id}-${entry.version}`,
      );
  }
}
