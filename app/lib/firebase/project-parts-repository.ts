import {
  addDoc,
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDoc,
  getDocs,
  increment,
  onSnapshot,
  runTransaction,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  writeBatch,
  type DocumentReference,
} from 'firebase/firestore';
import { quantityUnits } from '@/lib/domain/project';
import {
  stitchTypes,
  validateCounterDetails,
  validateCounterValue,
  type ProjectYarnEntry,
  type CounterDetails,
  type RowCounter,
  type StitchType,
  type WorkSection,
} from '@/lib/domain/project-parts';
import { getFirebaseClient } from './client';
import { clearSyncSource, reportSyncSource } from './sync-state';

function projectParts(userId: string, projectId: string, part: 'sections' | 'yarns') {
  return collection(getFirebaseClient().firestore, 'users', userId, 'projects', projectId, part);
}

function date(value: unknown) {
  if (!(value instanceof Timestamp)) throw new Error('A project item has an invalid date.');
  return value.toDate();
}

export function observeWorkSections(
  userId: string,
  projectId: string,
  next: (sections: WorkSection[]) => void,
  fail: (error: Error) => void,
) {
  const source = `sections:${userId}:${projectId}`;
  const unsubscribe = onSnapshot(
    projectParts(userId, projectId, 'sections'),
    { includeMetadataChanges: true },
    (snapshot) => {
      reportSyncSource(source, {
        pending: snapshot.metadata.hasPendingWrites,
        cached: snapshot.metadata.fromCache,
      });
      try {
        const sections = snapshot.docs
          .map((item) => {
            const data = item.data({ serverTimestamps: 'estimate' });
            if (
              typeof data.name !== 'string' ||
              (data.parentSectionId !== null && typeof data.parentSectionId !== 'string')
            )
              throw new Error(`Section ${item.id} is malformed.`);
            return {
              id: item.id,
              name: data.name,
              parentSectionId: data.parentSectionId,
              createdAt: date(data.createdAt),
              updatedAt: date(data.updatedAt),
            };
          })
          .sort(
            (a, b) => a.createdAt.getTime() - b.createdAt.getTime() || a.id.localeCompare(b.id),
          );
        next(sections);
      } catch (error) {
        fail(
          error instanceof Error ? error : new Error('Hooked could not read the work sections.'),
        );
      }
    },
    fail,
  );
  return () => {
    unsubscribe();
    clearSyncSource(source);
  };
}

export async function addWorkSection(
  userId: string,
  projectId: string,
  name: string,
  parentSectionId: string | null = null,
) {
  const trimmed = name.trim();
  if (!trimmed) throw new Error('Enter a section name.');
  if (parentSectionId) {
    const parent = await getDoc(doc(projectParts(userId, projectId, 'sections'), parentSectionId));
    if (!parent.exists()) throw new Error('The parent section could not be found in this project.');
  }
  await addDoc(projectParts(userId, projectId, 'sections'), {
    name: trimmed,
    parentSectionId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function flattenNestedWorkSections(userId: string, projectId: string) {
  const sectionCollection = projectParts(userId, projectId, 'sections');
  const snapshot = await getDocs(sectionCollection);
  const records = new Map(snapshot.docs.map((item) => [item.id, item.data()]));
  const nested = snapshot.docs.filter((item) => typeof item.data().parentSectionId === 'string');
  const parents = new Set(nested.map((item) => item.data().parentSectionId as string));
  for (const section of nested) {
    const names: string[] = [];
    let currentId = section.id;
    let rootId = section.id;
    const visited = new Set<string>();
    while (currentId) {
      if (visited.has(currentId)) throw new Error('The section hierarchy contains a cycle.');
      visited.add(currentId);
      const current = records.get(currentId);
      if (!current) throw new Error('A subsection has a missing parent.');
      const parentId = typeof current.parentSectionId === 'string' ? current.parentSectionId : null;
      if (!parentId) {
        rootId = currentId;
        break;
      }
      names.unshift(typeof current.name === 'string' ? current.name : 'Section');
      currentId = parentId;
    }
    const sourceCounters = await getDocs(counterParts(userId, projectId, section.id));
    const targetCollection = counterParts(userId, projectId, rootId);
    if (sourceCounters.empty && !parents.has(section.id)) {
      const placeholder = doc(targetCollection, `${section.id}__section`);
      if (!(await getDoc(placeholder)).exists())
        await setDoc(placeholder, {
          name: names.join(' — '),
          current: 0,
          target: null,
          completed: false,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
    } else if (!sourceCounters.empty) {
      for (const counter of sourceCounters.docs)
        await setDoc(doc(targetCollection, `${section.id}__${counter.id}`), {
          ...counter.data(),
          name: [...names, counter.data().name].filter(Boolean).join(' — '),
          updatedAt: serverTimestamp(),
        });
      await commitDeletes(sourceCounters.docs.map((item) => item.ref));
    }
    await deleteDoc(section.ref);
  }
}

function counterParts(userId: string, projectId: string, sectionId: string) {
  return collection(
    getFirebaseClient().firestore,
    'users',
    userId,
    'projects',
    projectId,
    'sections',
    sectionId,
    'counters',
  );
}

export function observeSectionCounters(
  userId: string,
  projectId: string,
  sectionId: string,
  next: (counters: RowCounter[]) => void,
  fail: (error: Error) => void,
) {
  const source = `counters:${userId}:${projectId}:${sectionId}`;
  const unsubscribe = onSnapshot(
    counterParts(userId, projectId, sectionId),
    { includeMetadataChanges: true },
    (snapshot) => {
      reportSyncSource(source, {
        pending: snapshot.metadata.hasPendingWrites,
        cached: snapshot.metadata.fromCache,
      });
      try {
        next(
          snapshot.docs
            .map((item) => {
              const data = item.data({ serverTimestamps: 'estimate' });
              if (typeof data.name !== 'string' || !data.name.trim())
                throw new Error(`Counter ${item.id} has an invalid name.`);
              return {
                id: item.id,
                name: data.name,
                current: validateCounterValue(data.current, 'current'),
                target: validateCounterValue(data.target, 'target'),
                ...(typeof data.stitchType === 'string' &&
                  stitchTypes.includes(data.stitchType as StitchType) && {
                    stitchType: data.stitchType as StitchType,
                  }),
                ...(typeof data.customStitchName === 'string' && {
                  customStitchName: data.customStitchName,
                }),
                ...(typeof data.customStitchInstructions === 'string' && {
                  customStitchInstructions: data.customStitchInstructions,
                }),
                ...(typeof data.stitchesPerRow === 'number' && {
                  stitchesPerRow: data.stitchesPerRow,
                }),
                completed: data.completed === true,
                createdAt: date(data.createdAt),
                updatedAt: date(data.updatedAt),
              };
            })
            .sort(
              (a, b) => a.createdAt.getTime() - b.createdAt.getTime() || a.id.localeCompare(b.id),
            ),
        );
      } catch (error) {
        fail(error instanceof Error ? error : new Error('Hooked could not read the row counters.'));
      }
    },
    fail,
  );
  return () => {
    unsubscribe();
    clearSyncSource(source);
  };
}

export async function addRowCounter(
  userId: string,
  projectId: string,
  sectionId: string,
  details: CounterDetails,
) {
  const validated = validateCounterDetails(details);
  await addDoc(counterParts(userId, projectId, sectionId), {
    ...validated,
    current: 0,
    completed: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function updateRowCounterDetails(
  userId: string,
  projectId: string,
  sectionId: string,
  counterId: string,
  details: CounterDetails,
) {
  const validated = validateCounterDetails(details);
  const reference = doc(counterParts(userId, projectId, sectionId), counterId);
  const snapshot = await getDoc(reference);
  const current = validateCounterValue(snapshot.data()?.current, 'current');
  await updateDoc(reference, {
    ...validated,
    current: validated.target === null ? current : Math.min(current, validated.target),
    completed: false,
    customStitchName: validated.customStitchName ?? deleteField(),
    customStitchInstructions: validated.customStitchInstructions ?? deleteField(),
    updatedAt: serverTimestamp(),
  });
}

export async function setRowCounterComplete(
  userId: string,
  projectId: string,
  sectionId: string,
  counterId: string,
  completed: boolean,
) {
  const reference = doc(counterParts(userId, projectId, sectionId), counterId);
  const snapshot = await getDoc(reference);
  if (snapshot.data()?.target !== null)
    throw new Error('Only counters without a target can be completed manually.');
  await updateDoc(reference, { completed, updatedAt: serverTimestamp() });
}

export async function changeRowCounter(
  userId: string,
  projectId: string,
  sectionId: string,
  counterId: string,
  change: -1 | 1,
) {
  const reference = doc(counterParts(userId, projectId, sectionId), counterId);
  await updateDoc(reference, {
    current: increment(change),
    updatedAt: serverTimestamp(),
  });
}

export async function updateRowCounterTarget(
  userId: string,
  projectId: string,
  sectionId: string,
  counterId: string,
  target: number | null,
) {
  validateCounterValue(target, 'target');
  const reference = doc(counterParts(userId, projectId, sectionId), counterId);
  await runTransaction(getFirebaseClient().firestore, async (transaction) => {
    const snapshot = await transaction.get(reference);
    const current = validateCounterValue(snapshot.data()?.current, 'current');
    transaction.update(reference, {
      target,
      current: target === null ? current : Math.min(current, target),
      completed: false,
      updatedAt: serverTimestamp(),
    });
  });
}

export async function removeRowCounter(
  userId: string,
  projectId: string,
  sectionId: string,
  counterId: string,
) {
  await deleteDoc(doc(counterParts(userId, projectId, sectionId), counterId));
}

async function commitDeletes(references: DocumentReference[]) {
  for (let index = 0; index < references.length; index += 450) {
    const batch = writeBatch(getFirebaseClient().firestore);
    references.slice(index, index + 450).forEach((reference) => batch.delete(reference));
    await batch.commit();
  }
}

export async function removeWorkSectionTree(userId: string, projectId: string, sectionId: string) {
  const sections = await getDocs(projectParts(userId, projectId, 'sections'));
  const children = new Map<string, string[]>();
  sections.docs.forEach((item) => {
    const parent = item.data().parentSectionId;
    if (typeof parent === 'string')
      children.set(parent, [...(children.get(parent) ?? []), item.id]);
  });
  const ids: string[] = [];
  const visit = (id: string) => {
    ids.push(id);
    (children.get(id) ?? []).forEach(visit);
  };
  visit(sectionId);
  const counterSnapshots = await Promise.all(
    ids.map((id) => getDocs(counterParts(userId, projectId, id))),
  );
  await commitDeletes(
    counterSnapshots.flatMap((snapshot) => snapshot.docs.map((item) => item.ref)),
  );
  await commitDeletes(
    ids.reverse().map((id) => doc(projectParts(userId, projectId, 'sections'), id)),
  );
}

export function observeProjectYarns(
  userId: string,
  projectId: string,
  next: (yarns: ProjectYarnEntry[]) => void,
  fail: (error: Error) => void,
) {
  return onSnapshot(
    projectParts(userId, projectId, 'yarns'),
    { includeMetadataChanges: true },
    (snapshot) => {
      try {
        next(
          snapshot.docs
            .map((item) => {
              const data = item.data({ serverTimestamps: 'estimate' });
              if (
                typeof data.material !== 'string' ||
                typeof data.category !== 'string' ||
                typeof data.colour !== 'string' ||
                typeof data.quantity !== 'number' ||
                !quantityUnits.includes(data.unit)
              )
                throw new Error(`Yarn ${item.id} is malformed.`);
              return {
                id: item.id,
                name: typeof data.name === 'string' && data.name.trim() ? data.name : 'Yarn',
                material: data.material,
                category: data.category,
                colour: data.colour,
                quantity: data.quantity,
                unit: data.unit,
                ...(typeof data.customUnit === 'string' && { customUnit: data.customUnit }),
                createdAt: date(data.createdAt),
                updatedAt: date(data.updatedAt),
              };
            })
            .sort(
              (a, b) => a.createdAt.getTime() - b.createdAt.getTime() || a.id.localeCompare(b.id),
            ),
        );
      } catch (error) {
        fail(error instanceof Error ? error : new Error('Hooked could not read the yarns.'));
      }
    },
    fail,
  );
}

export async function addProjectYarn(userId: string, projectId: string, name: string) {
  await addDoc(projectParts(userId, projectId, 'yarns'), {
    name,
    material: '',
    category: '',
    colour: '',
    quantity: 0,
    unit: 'skeins',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function updateProjectYarn(userId: string, projectId: string, yarn: ProjectYarnEntry) {
  if (yarn.unit === 'custom' && !yarn.customUnit?.trim()) throw new Error('Enter a custom unit.');
  await updateDoc(doc(projectParts(userId, projectId, 'yarns'), yarn.id), {
    name: yarn.name.trim() || 'Yarn',
    material: yarn.material.trim(),
    category: yarn.category.trim(),
    colour: yarn.colour.trim(),
    quantity: yarn.quantity,
    unit: yarn.unit,
    customUnit: yarn.unit === 'custom' ? (yarn.customUnit?.trim() ?? '') : deleteField(),
    updatedAt: serverTimestamp(),
  });
}

export async function changeYarnQuantity(
  userId: string,
  projectId: string,
  yarnId: string,
  change: -1 | 1,
) {
  const reference = doc(projectParts(userId, projectId, 'yarns'), yarnId);
  await runTransaction(getFirebaseClient().firestore, async (transaction) => {
    const snapshot = await transaction.get(reference);
    const current = snapshot.data()?.quantity;
    if (typeof current !== 'number') throw new Error('This yarn quantity is invalid.');
    transaction.update(reference, {
      quantity: Math.max(0, current + change),
      updatedAt: serverTimestamp(),
    });
  });
}

export async function removeProjectYarn(userId: string, projectId: string, yarnId: string) {
  await deleteDoc(doc(projectParts(userId, projectId, 'yarns'), yarnId));
}
