import { readFile } from 'node:fs/promises';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  initializeTestEnvironment,
  assertFails,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  Timestamp,
  type Firestore,
} from 'firebase/firestore';
import {
  addMaterialUsage,
  correctMaterialUsage,
  refundProjectMaterials,
} from '@/lib/firebase/materials-repository';
import {
  addInventoryItem,
  updateInventoryItem,
  removeInventoryItem,
} from '@/lib/firebase/inventory-repository';
import {
  completeProject,
  createProject,
  deleteProject,
  reactivateProject,
} from '@/lib/firebase/project-repository';
import { addWorkSection } from '@/lib/firebase/project-parts-repository';
import type { MaterialUsage } from '@/lib/domain/materials';
import { parseProject } from '@/lib/domain/project';
let environment: RulesTestEnvironment;
let db: Firestore;
vi.mock('@/lib/firebase/client', () => ({ getFirebaseClient: () => ({ firestore: db }) }));
vi.mock('@/lib/firebase/project-photo-repository', () => ({
  removeAllProjectPhotos: vi.fn().mockResolvedValue(undefined),
}));
const user = 'v2-user';
const path = (collection: string, id: string) => doc(db, 'users', user, collection, id);
const stock = async () => (await getDoc(path('inventory', 'yarn'))).data()!;
const entry = async (id = 'use-1') =>
  ({ ...(await getDoc(path('materialUsage', id))).data(), id }) as MaterialUsage;
beforeAll(async () => {
  environment = await initializeTestEnvironment({
    projectId: 'demo-hooked-v2',
    firestore: { rules: await readFile('firestore.rules', 'utf8') },
  });
  db = environment
    .authenticatedContext(user, { email_verified: true })
    .firestore() as unknown as Firestore;
});
afterAll(async () => {
  await environment?.cleanup();
});
beforeEach(async () => {
  await environment.clearFirestore();
  await setDoc(path('projects', 'project'), {
    name: 'Cardigan',
    status: 'active',
    materialsMode: 'consumed',
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
    schemaVersion: 1,
  });
  await setDoc(path('inventory', 'yarn'), {
    name: 'Green wool',
    material: 'Wool',
    category: 'DK',
    colour: 'Green',
    recommendedHookSize: '4 mm',
    quantity: 3,
    milliSkeins: 3000,
    unit: 'skeins',
    conversion: { value: 100, unit: 'grams' },
    linkedUsageCount: 0,
    usageRevision: 0,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });
});
describe('transactional v2 materials', () => {
  it('updates journal ordering on working changes without changing the note date', async () => {
    const noteDate = Timestamp.fromDate(new Date('2026-01-01'));
    await updateDoc(path('projects', 'project'), {
      latestUpdate: 'Started ribbing',
      latestUpdateAt: noteDate,
    });
    const before = (await getDoc(path('projects', 'project'))).data()!.updatedAt.toMillis();
    await addWorkSection(user, 'project', 'Body');
    const after = (await getDoc(path('projects', 'project'))).data()!;
    expect(after.updatedAt.toMillis()).toBeGreaterThan(before);
    expect(after.latestUpdateAt.toMillis()).toBe(noteDate.toMillis());
  });
  it('deducts fractional additions once and refunds corrections once', async () => {
    await addMaterialUsage(user, 'project', 'yarn', 0.25, 'use-1');
    await addMaterialUsage(user, 'project', 'yarn', 0.25, 'use-1');
    expect((await stock()).quantity).toBe(2.75);
    await addMaterialUsage(user, 'project', 'yarn', 0.5, 'use-2');
    const second = await entry('use-2');
    await correctMaterialUsage(user, second, 0.2, 'correction-1');
    await correctMaterialUsage(user, second, 0.2, 'correction-1');
    expect((await stock()).quantity).toBe(2.55);
    await expect(correctMaterialUsage(user, second, 0.1, 'stale')).rejects.toThrow(
      'changed elsewhere',
    );
  });
  it('serializes competing usage and refuses insufficient stock', async () => {
    const results = await Promise.allSettled([
      addMaterialUsage(user, 'project', 'yarn', 2, 'a'),
      addMaterialUsage(user, 'project', 'yarn', 2, 'b'),
    ]);
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect((await stock()).quantity).toBe(1);
  });
  it('blocks linked deletion and preserves a depleted yarn', async () => {
    await addMaterialUsage(user, 'project', 'yarn', 3, 'use-1');
    expect((await stock()).quantity).toBe(0);
    await expect(removeInventoryItem(user, 'yarn')).rejects.toThrow('linked');
    await assertFails(deleteDoc(path('inventory', 'yarn')));
    await correctMaterialUsage(user, await entry(), 0, 'remove');
    expect((await stock()).quantity).toBe(3);
    await removeInventoryItem(user, 'yarn');
    expect((await getDoc(path('inventory', 'yarn'))).exists()).toBe(false);
  });
  it('keeps consumption when completion and usage happen together', async () => {
    await Promise.all([
      completeProject(user, 'project'),
      addMaterialUsage(user, 'project', 'yarn', 1, 'concurrent'),
    ]);
    expect((await stock()).quantity).toBe(2);
    expect((await getDoc(path('projects', 'project'))).data()?.status).toBe('completed');
    expect((await entry('concurrent')).milliSkeins).toBe(1000);
  });
  it('retains material conversions across completion and stash edits', async () => {
    await addMaterialUsage(user, 'project', 'yarn', 0.5, 'use-1');
    await updateDoc(path('inventory', 'yarn'), { conversion: { value: 200, unit: 'yards' } });
    await completeProject(user, 'project');
    await completeProject(user, 'project');
    expect((await stock()).quantity).toBe(2.5);
    expect((await entry()).conversion).toEqual({ value: 100, unit: 'grams' });
    await correctMaterialUsage(user, await entry(), 0.25, 'made-correction');
    expect((await stock()).quantity).toBe(2.75);
    await addMaterialUsage(user, 'project', 'yarn', 0.1, 'made-extra');
    expect((await stock()).quantity).toBe(2.65);
  });
  it('keeps direct Made history stock-neutral through corrections and deletion', async () => {
    const projectId = await createProject(user, {
      name: 'Old scarf',
      status: 'completed',
      completedAt: new Date(),
    });
    await addMaterialUsage(user, projectId, 'yarn', 5, 'historical');
    await correctMaterialUsage(user, await entry('historical'), 7, 'historical-correction');
    expect((await stock()).quantity).toBe(3);
    await deleteProject(user, projectId);
    expect((await stock()).quantity).toBe(3);
    expect((await stock()).linkedUsageCount).toBe(0);
  });
  it('resumes refunds safely and prevents usage while deleting', async () => {
    await addMaterialUsage(user, 'project', 'yarn', 0.75, 'use-1');
    await refundProjectMaterials(user, 'project');
    await assertFails(
      setDoc(doc(db, 'users', user, 'projects', 'project', 'sections', 'late'), {
        name: 'Late section',
        parentSectionId: null,
        current: 0,
        target: null,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      }),
    );
    await refundProjectMaterials(user, 'project');
    expect((await stock()).quantity).toBe(3);
    await expect(addMaterialUsage(user, 'project', 'yarn', 1, 'late')).rejects.toThrow(
      'cannot accept',
    );
    await deleteProject(user, 'project');
    expect((await getDoc(path('projects', 'project'))).exists()).toBe(false);
    expect((await getDoc(path('materialUsage', 'use-1'))).exists()).toBe(false);
  });
  it('reactivates with no consumption and uses current stash factors', async () => {
    await addMaterialUsage(user, 'project', 'yarn', 1, 'use-1');
    await completeProject(user, 'project');
    const data = (await getDoc(path('projects', 'project'))).data()!;
    const project = parseProject('project', {
      ...data,
      createdAt: data.createdAt.toDate(),
      updatedAt: data.updatedAt.toDate(),
      completedAt: data.completedAt.toDate(),
    });
    const id = await reactivateProject(user, project);
    expect((await stock()).quantity).toBe(2);
    await updateDoc(path('inventory', 'yarn'), { conversion: { value: 200, unit: 'metres' } });
    await addMaterialUsage(user, id, 'yarn', 0.1, 'reactivated');
    expect((await entry('reactivated')).conversion).toEqual({ value: 200, unit: 'metres' });
    expect((await getDoc(path('projects', 'project'))).data()?.status).toBe('completed');
  });
  it('denies isolated writes that bypass accounting or rewrite history', async () => {
    await addMaterialUsage(user, 'project', 'yarn', 1, 'use-1');
    await assertFails(updateDoc(path('materialUsage', 'use-1'), { milliSkeins: 2000 }));
    await assertFails(
      updateDoc(path('materialUsage', 'use-1'), { conversion: { value: 500, unit: 'grams' } }),
    );
    await assertFails(updateDoc(path('inventory', 'yarn'), { linkedUsageCount: 0 }));
    await assertFails(updateDoc(path('projects', 'project'), { usageCount: 0 }));
    await assertFails(deleteDoc(path('projects', 'project')));
    await assertFails(updateDoc(path('inventory', 'yarn'), { milliSkeins: -1, quantity: -0.001 }));
    const outsider = environment
      .authenticatedContext('other', { email_verified: true })
      .firestore();
    await assertFails(getDoc(doc(outsider, 'users', user, 'materialUsage', 'use-1')));
  });
  it('rejects a stale stash edit after consumption', async () => {
    const before = await stock();
    const expected = {
      ...before,
      id: 'yarn',
      createdAt: before.createdAt.toDate(),
      updatedAt: before.updatedAt.toDate(),
    };
    await addMaterialUsage(user, 'project', 'yarn', 1, 'use-1');
    await expect(
      updateInventoryItem(
        user,
        'yarn',
        expected as unknown as Parameters<typeof updateInventoryItem>[2],
        expected as Parameters<typeof updateInventoryItem>[3],
      ),
    ).rejects.toThrow('changed while');
    expect((await stock()).quantity).toBe(2);
  });
  it('requires conversion for new yarn and never converts legacy stock implicitly', async () => {
    await expect(
      addInventoryItem(user, {
        name: '',
        material: 'Wool',
        category: '',
        colour: '',
        recommendedHookSize: '',
        quantity: 1,
        unit: 'skeins',
      }),
    ).rejects.toThrow('label');
    await environment.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'users', user, 'inventory', 'legacy'), {
        material: 'Wool',
        quantity: 100,
        unit: 'grams',
      });
    });
    await expect(addMaterialUsage(user, 'project', 'legacy', 1, 'legacy-use')).rejects.toThrow(
      'Set up',
    );
    expect((await getDoc(path('inventory', 'legacy'))).data()?.quantity).toBe(100);
  });
});
