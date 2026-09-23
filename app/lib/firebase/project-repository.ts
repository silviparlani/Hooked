import {
  addDoc,
  collection,
  deleteField,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
  writeBatch,
  where,
  type DocumentData,
  type FirestoreDataConverter,
  type QueryDocumentSnapshot,
  type SnapshotOptions,
} from 'firebase/firestore';
import {
  compactObject,
  compareProjects,
  parseProject,
  validateProjectName,
  type EditableProject,
  type Project,
  type ProjectStatus,
} from '@/lib/domain/project';
import {
  buildSectionTree,
  isSectionComplete,
  validateCounterValue,
  type RowCounter,
  type WorkSection,
} from '@/lib/domain/project-parts';
import { getFirebaseClient } from './client';
import { removeAllProjectPhotos } from './project-photo-repository';
import { clearSyncSource, reportSyncSource } from './sync-state';

function projectsPath(userId: string) {
  return collection(getFirebaseClient().firestore, 'users', userId, 'projects');
}

function toDateValue(value: unknown) {
  return value instanceof Timestamp ? value.toDate() : value;
}

const projectConverter: FirestoreDataConverter<Project> = {
  toFirestore(project: Project): DocumentData {
    return compactObject({ ...project, schemaVersion: 1 });
  },
  fromFirestore(snapshot: QueryDocumentSnapshot, options: SnapshotOptions): Project {
    const data = snapshot.data(options);
    return parseProject(snapshot.id, {
      ...data,
      createdAt: toDateValue(data.createdAt),
      updatedAt: toDateValue(data.updatedAt),
      completedAt: toDateValue(data.completedAt),
    });
  },
};

export function observeProjects(
  userId: string,
  status: ProjectStatus,
  onProjects: (projects: Project[], pending: boolean, cached: boolean) => void,
  onError: (error: Error) => void,
) {
  const projects = projectsPath(userId).withConverter(projectConverter);
  return onSnapshot(
    query(projects, where('status', '==', status)),
    { includeMetadataChanges: true },
    (snapshot) => {
      try {
        onProjects(
          snapshot.docs
            .map((item) => item.data({ serverTimestamps: 'estimate' }))
            .sort(compareProjects),
          snapshot.metadata.hasPendingWrites,
          snapshot.metadata.fromCache,
        );
      } catch (error) {
        onError(
          error instanceof Error ? error : new Error('Hooked could not read these projects.'),
        );
      }
    },
    (error) => onError(error),
  );
}

export async function getProject(userId: string, projectId: string) {
  const reference = doc(projectsPath(userId), projectId).withConverter(projectConverter);
  const snapshot = await getDoc(reference);
  return snapshot.exists() ? snapshot.data({ serverTimestamps: 'estimate' }) : null;
}

export function observeProject(
  userId: string,
  projectId: string,
  next: (project: Project | null) => void,
  fail: (error: Error) => void,
) {
  const reference = doc(projectsPath(userId), projectId).withConverter(projectConverter);
  const source = `project:${userId}:${projectId}`;
  const unsubscribe = onSnapshot(
    reference,
    { includeMetadataChanges: true },
    (snapshot) => {
      reportSyncSource(source, {
        pending: snapshot.metadata.hasPendingWrites,
        cached: snapshot.metadata.fromCache,
      });
      next(snapshot.exists() ? snapshot.data({ serverTimestamps: 'estimate' }) : null);
    },
    fail,
  );
  return () => {
    unsubscribe();
    clearSyncSource(source);
  };
}

export async function createProject(userId: string, input: EditableProject) {
  const name = validateProjectName(input.name);
  if (!name.valid) throw new Error(name.message);
  const reference = await addDoc(
    projectsPath(userId),
    compactObject({
      ...input,
      name: name.value,
      schemaVersion: 1,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }),
  );
  return reference.id;
}

export async function updateProject(userId: string, projectId: string, input: EditableProject) {
  const name = validateProjectName(input.name);
  if (!name.valid) throw new Error(name.message);
  await updateDoc(doc(projectsPath(userId), projectId), {
    ...input,
    name: name.value,
    description: input.description?.trim() || deleteField(),
    patternUrl: input.patternUrl?.trim() || deleteField(),
    materialsRequired: input.materialsRequired?.trim() || deleteField(),
    latestUpdate: input.latestUpdate?.trim() || deleteField(),
    hookSize: input.hookSize?.trim() || deleteField(),
    sourceCompletedProjectId: input.sourceCompletedProjectId?.trim() || deleteField(),
    schemaVersion: 1,
    updatedAt: serverTimestamp(),
  });
}

export async function reorderProjects(userId: string, projectIds: string[]) {
  const batch = writeBatch(getFirebaseClient().firestore);
  projectIds.forEach((projectId, displayOrder) => {
    batch.update(doc(projectsPath(userId), projectId), {
      displayOrder,
      updatedAt: serverTimestamp(),
    });
  });
  await batch.commit();
}

export async function startProject(userId: string, projectId: string, input: EditableProject) {
  await updateProject(userId, projectId, { ...input, status: 'active' });
}

export async function getIncompleteSectionNames(userId: string, projectId: string) {
  const project = doc(projectsPath(userId), projectId);
  const sections = await getDocs(collection(project, 'sections'));
  const counterSnapshots = await Promise.all(
    sections.docs.map((section) => getDocs(collection(section.ref, 'counters'))),
  );
  const sectionValues: WorkSection[] = sections.docs.map((section) => ({
    id: section.id,
    name: typeof section.data().name === 'string' ? section.data().name : 'Unnamed section',
    parentSectionId:
      typeof section.data().parentSectionId === 'string' ? section.data().parentSectionId : null,
    current:
      typeof section.data().current === 'number'
        ? validateCounterValue(section.data().current, 'current')
        : 0,
    target:
      section.data().target === undefined
        ? null
        : validateCounterValue(section.data().target, 'target'),
    createdAt: new Date(0),
    updatedAt: new Date(0),
  }));
  const countersBySection = Object.fromEntries(
    counterSnapshots.map((snapshot, index) => [
      sectionValues[index].id,
      snapshot.docs.map((counter): RowCounter => {
        const data = counter.data();
        return {
          id: counter.id,
          name: typeof data.name === 'string' ? data.name : 'Counter',
          current: validateCounterValue(data.current, 'current'),
          target: validateCounterValue(data.target, 'target'),
          completed: data.completed === true,
          createdAt: new Date(0),
          updatedAt: new Date(0),
        };
      }),
    ]),
  );
  const incomplete: string[] = [];
  const visit = (section: ReturnType<typeof buildSectionTree>[number]) => {
    if (!isSectionComplete(section, countersBySection)) incomplete.push(section.name);
    section.children.forEach(visit);
  };
  buildSectionTree(sectionValues).forEach(visit);
  return incomplete;
}

export async function completeProject(userId: string, projectId: string) {
  const { firestore } = getFirebaseClient();
  const project = doc(projectsPath(userId), projectId);
  const existing = await getDoc(project);
  await updateDoc(project, {
    status: 'completed',
    ...(existing.data()?.completedAt ? {} : { completedAt: serverTimestamp() }),
    updatedAt: serverTimestamp(),
    materialsRequired: deleteField(),
    latestUpdate: deleteField(),
    hookSize: deleteField(),
    yarn: deleteField(),
    amountUsed: deleteField(),
    sourceCompletedProjectId: deleteField(),
  });
  const [sections, yarns] = await Promise.all([
    getDocs(collection(project, 'sections')),
    getDocs(collection(project, 'yarns')),
  ]);
  const counterSnapshots = await Promise.all(
    sections.docs.map((section) => getDocs(collection(section.ref, 'counters'))),
  );
  const references = [
    ...counterSnapshots.flatMap((snapshot) => snapshot.docs.map((item) => item.ref)),
    ...sections.docs.map((item) => item.ref),
    ...yarns.docs.map((item) => item.ref),
  ];
  for (let index = 0; index < references.length; index += 450) {
    const batch = writeBatch(firestore);
    references.slice(index, index + 450).forEach((reference) => batch.delete(reference));
    await batch.commit();
  }
}

export async function reactivateProject(userId: string, project: Project) {
  return createProject(
    userId,
    compactObject({
      name: project.name,
      status: 'active',
      description: project.description,
      patternUrl: project.patternUrl,
      sourceCompletedProjectId: project.id,
    }),
  );
}

export async function deleteProject(userId: string, projectId: string) {
  const { firestore } = getFirebaseClient();
  const project = doc(projectsPath(userId), projectId);
  await removeAllProjectPhotos(userId, projectId);
  const [sections, yarns] = await Promise.all([
    getDocs(collection(project, 'sections')),
    getDocs(collection(project, 'yarns')),
  ]);
  const counterSnapshots = await Promise.all(
    sections.docs.map((section) => getDocs(collection(section.ref, 'counters'))),
  );
  const references = [
    ...counterSnapshots.flatMap((snapshot) => snapshot.docs.map((item) => item.ref)),
    ...sections.docs.map((item) => item.ref),
    ...yarns.docs.map((item) => item.ref),
  ];
  for (let index = 0; index < references.length; index += 450) {
    const batch = writeBatch(firestore);
    references.slice(index, index + 450).forEach((reference) => batch.delete(reference));
    await batch.commit();
  }
  const finalBatch = writeBatch(firestore);
  finalBatch.delete(project);
  await finalBatch.commit();
}

