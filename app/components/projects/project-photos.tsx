'use client';

import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import Image from 'next/image';
import { deleteRecentCloudinaryUpload, uploadCompletedProjectPhoto } from '@/lib/cloudinary/client';
import { MAX_PROJECT_PHOTOS, type ProjectPhoto } from '@/lib/domain/project-photo';
import { useOnlineStatus } from '@/components/pwa/pwa-status';
import {
  addProjectPhoto,
  observeProjectPhotos,
  removeProjectPhoto,
} from '@/lib/firebase/project-photo-repository';

export function ProjectPhotos({ userId, projectId }: { userId: string; projectId: string }) {
  const [photos, setPhotos] = useState<ProjectPhoto[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const online = useOnlineStatus();
  const input = useRef<HTMLInputElement>(null);

  useEffect(
    () => observeProjectPhotos(userId, projectId, setPhotos, (caught) => setError(caught.message)),
    [projectId, userId],
  );

  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!online) return setError('Connect to the internet before adding a photo.');
    if (photos.length >= MAX_PROJECT_PHOTOS)
      return setError('This project already has five photos.');
    setBusy(true);
    setError('');
    let uploaded: Awaited<ReturnType<typeof uploadCompletedProjectPhoto>> | undefined;
    try {
      uploaded = await uploadCompletedProjectPhoto(file);
      await addProjectPhoto(userId, projectId, uploaded);
    } catch (caught) {
      if (uploaded?.deleteToken)
        await deleteRecentCloudinaryUpload(uploaded.deleteToken).catch(() => undefined);
      setError(caught instanceof Error ? caught.message : 'Hooked could not add the photo.');
    } finally {
      setBusy(false);
    }
  }

  async function remove(photo: ProjectPhoto) {
    if (!online) return setError('Connect to the internet before deleting a photo.');
    setBusy(true);
    setError('');
    try {
      await removeProjectPhoto(userId, projectId, photo.id);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Hooked could not remove the photo.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="project-photos" aria-labelledby="project-photos-heading">
      <div className="project-photos__heading">
        <div>
          <h2 id="project-photos-heading">Photos</h2>
          <span>
            {photos.length}/{MAX_PROJECT_PHOTOS}
          </span>
        </div>
        <button
          type="button"
          className="primary-button"
          disabled={!online || busy || photos.length >= MAX_PROJECT_PHOTOS}
          onClick={() => input.current?.click()}
        >
          {busy ? 'Uploading…' : 'Add photo'}
        </button>
      </div>
      {!online && (
        <p className="photo-offline-message">Photo changes need an internet connection.</p>
      )}
      <input
        ref={input}
        className="visually-hidden"
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
        onChange={upload}
      />
      {photos.length === 0 ? (
        <p>No photos added yet.</p>
      ) : (
        <div className="photo-grid">
          {photos.map((photo) => (
            <article key={photo.id} className="photo-card">
              <Image
                src={photo.secureUrl}
                alt="Completed crochet project"
                width={photo.width}
                height={photo.height}
                unoptimized
              />
              <div className="photo-card__actions">
                <button
                  type="button"
                  className="delete-button"
                  disabled={busy}
                  onClick={() => remove(photo)}
                >
                  Remove
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
      {error && (
        <p role="alert" className="project-form__error">
          {error}
        </p>
      )}
    </section>
  );
}
