import {
  addDoc,
  collection,
  doc,
  getDocs,
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

function photosRef(userId: string, projectId: string) {
  return collection(projectRef(userId, projectId), 'photos');
}

export function observeProjectPhotos(
  userId: string,
  projectId: string,
  next: (photos: ProjectPhoto[]) => void,
  fail: (error: Error) => void,
) {
  return onSnapshot(
    photosRef(userId, projectId),
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
            .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime()),
        );
      } catch (error) {
        fail(error instanceof Error ? error : new Error('Hooked could not read the photos.'));
      }
    },
    fail,
  );
}

export async function addProjectPhoto(userId: string, projectId: string, photo: CloudinaryPhoto) {
  const existing = await getDocs(photosRef(userId, projectId));
  if (existing.size >= MAX_PROJECT_PHOTOS) throw new Error('This project already has five photos.');
  const { deleteToken: _deleteToken, ...stored } = photo;
  return (await addDoc(photosRef(userId, projectId), { ...stored, createdAt: serverTimestamp() }))
    .id;
}

export async function removeProjectPhoto(userId: string, projectId: string, photoId: string) {
  const user = getFirebaseClient().auth.currentUser;
  if (!user || user.uid !== userId) throw new Error('Sign in again before deleting this photo.');
  const response = await fetch('/api/photos/delete', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${await user.getIdToken()}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ projectId, photoId }),
  });
  if (!response.ok) {
    const result = (await response.json().catch(() => ({}))) as { message?: string };
    throw new Error(result.message ?? 'Hooked could not permanently delete this photo.');
  }
}

export async function removeAllProjectPhotos(userId: string, projectId: string) {
  const photos = await getDocs(photosRef(userId, projectId));
  for (const photo of photos.docs) await removeProjectPhoto(userId, projectId, photo.id);
}
