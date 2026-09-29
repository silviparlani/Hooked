import {
  collection,
  doc,
  getDocs,
  getDocFromServer,
  getDocsFromServer,
  runTransaction,
  onSnapshot,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { MAX_PROJECT_PHOTOS, type ProjectPhoto } from '@/lib/domain/project-photo';
import type { CloudinaryPhoto } from '@/lib/cloudinary/client';
import { getFirebaseClient } from './client';

function projectRef(userId: string, projectId: string) {
  return doc(getFirebaseClient().firestore, 'users', userId, 'projects', projectId);
}

function photosRef(userId: string, projectId: string, reference = false) {
  return collection(projectRef(userId, projectId), reference ? 'referencePhotos' : 'photos');
}

export function observeProjectPhotos(
  userId: string,
  projectId: string,
  next: (photos: ProjectPhoto[]) => void,
  fail: (error: Error) => void,
  reference = false,
) {
  return onSnapshot(
    photosRef(userId, projectId, reference),
    (snapshot) => {
      try {
        next(
          snapshot.docs
            .map((item) => {
              const data = item.data({ serverTimestamps: 'estimate' });
              if (
                !(data.createdAt instanceof Timestamp) ||
                typeof data.secureUrl !== 'string' ||
                typeof data.cloudinaryPublicId !== 'string'
              )
                throw new Error('A project photo is malformed.');
              return {
                id: item.id,
                cloudinaryPublicId: data.cloudinaryPublicId,
                secureUrl: data.secureUrl,
                assetVersion: data.assetVersion,
                format: data.format,
                contentType: data.contentType,
                byteSize: data.byteSize,
                width: data.width,
                height: data.height,
                createdAt: data.createdAt.toDate(),
              };
            })
            .sort(
              (a, b) => a.createdAt.getTime() - b.createdAt.getTime() || a.id.localeCompare(b.id),
            ),
        );
      } catch (error) {
        fail(error instanceof Error ? error : new Error('Hooked could not read the photos.'));
      }
    },
    fail,
  );
}

export async function addProjectPhoto(
  userId: string,
  projectId: string,
  photo: CloudinaryPhoto,
  reference = false,
) {
  const parent = projectRef(userId, projectId);
  const before = await getDocFromServer(parent);
  const existing = await getDocsFromServer(photosRef(userId, projectId, reference));
  const maximum = reference ? 1 : MAX_PROJECT_PHOTOS;
  if (existing.size >= maximum)
    throw new Error(
      reference
        ? 'Remove the existing reference image before adding another.'
        : 'This project already has five photos.',
    );
  const target = reference
    ? doc(photosRef(userId, projectId, true), 'cover')
    : doc(photosRef(userId, projectId));
  const { deleteToken: _deleteToken, ...stored } = photo;
  await runTransaction(getFirebaseClient().firestore, async (tx) => {
    const current = await tx.get(parent);
    if (!current.exists() || current.data().deleting)
      throw new Error('This project is unavailable.');
    if ((current.data().photoRevision ?? 0) !== (before.data()?.photoRevision ?? 0))
      throw new Error('The photos changed on another device. Please try again.');
    if (reference && current.data().status !== 'planned')
      throw new Error('Reference images are only allowed in Someday.');
    if (!reference && current.data().status !== 'completed')
      throw new Error('Complete this project before adding finished photos.');
    tx.set(target, { ...stored, createdAt: serverTimestamp() });
    tx.update(parent, {
      photoRevision: (current.data().photoRevision ?? 0) + 1,
      updatedAt: serverTimestamp(),
    });
  });
  return target.id;
}

export async function removeProjectPhoto(
  userId: string,
  projectId: string,
  photoId: string,
  reference = false,
) {
  const user = getFirebaseClient().auth.currentUser;
  if (!user || user.uid !== userId) throw new Error('Sign in again before deleting this photo.');
  const response = await fetch('/api/photos/delete', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${await user.getIdToken()}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ projectId, photoId, ...(reference && { reference: true }) }),
  });
  if (!response.ok) {
    const result = (await response.json().catch(() => ({}))) as { message?: string };
    throw new Error(result.message ?? 'Hooked could not permanently delete this photo.');
  }
}

export async function removeAllProjectPhotos(userId: string, projectId: string) {
  for (const reference of [false, true]) {
    const photos = await getDocs(photosRef(userId, projectId, reference));
    for (const photo of photos.docs)
      await removeProjectPhoto(userId, projectId, photo.id, reference);
  }
}

export async function removeProjectReferencePhotos(userId: string, projectId: string) {
  const photos = await getDocsFromServer(photosRef(userId, projectId, true));
  for (const photo of photos.docs) await removeProjectPhoto(userId, projectId, photo.id, true);
}
