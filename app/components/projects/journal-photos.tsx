'use client';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import type { ProjectPhoto } from '@/lib/domain/project-photo';
import { observeProjectPhotos } from '@/lib/firebase/project-photo-repository';

export function JournalPhotos({
  userId,
  projectId,
  reference = false,
}: {
  userId: string;
  projectId: string;
  reference?: boolean;
}) {
  const [photos, setPhotos] = useState<ProjectPhoto[]>([]);
  const [error, setError] = useState('');
  useEffect(
    () =>
      observeProjectPhotos(
        userId,
        projectId,
        setPhotos,
        (caught) => setError(caught.message),
        reference,
      ),
    [userId, projectId, reference],
  );
  if (error) return <p role="alert">{error}</p>;
  if (!photos.length)
    return (
      <div className="journal-photo-empty">
        <span aria-hidden="true">✳</span>
        <p>{reference ? 'A little inspiration belongs here' : 'A place for your finished piece'}</p>
      </div>
    );
  return (
    <div className="journal-photos" data-no-page-swipe>
      <Image
        className="journal-cover"
        src={photos[0].secureUrl}
        alt={reference ? 'Project reference' : 'Completed project cover'}
        width={photos[0].width}
        height={photos[0].height}
        unoptimized
      />
      {photos.length > 1 && (
        <section
          className="journal-photo-strip"
          aria-label="More project photos — scroll horizontally"
        >
          {photos.slice(1).map((photo, index) => (
            <Image
              key={photo.id}
              src={photo.secureUrl}
              alt={`Completed project photo ${index + 2}`}
              width={photo.width}
              height={photo.height}
              unoptimized
            />
          ))}
        </section>
      )}
    </div>
  );
}
