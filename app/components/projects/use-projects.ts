'use client';

import { useEffect, useState } from 'react';
import type { Project, ProjectStatus } from '@/lib/domain/project';
import { observeProjects } from '@/lib/firebase/project-repository';
import { clearSyncSource, reportSyncSource } from '@/lib/firebase/sync-state';

export function useProjects(userId: string, status: ProjectStatus) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [cached, setCached] = useState(false);
  const [error, setError] = useState('');
  const source = `projects:${userId}:${status}`;

  useEffect(() => {
    reportSyncSource(source, { pending, cached });
    return () => clearSyncSource(source);
  }, [cached, pending, source]);

  useEffect(
    () =>
      observeProjects(
        userId,
        status,
        (nextProjects, hasPendingWrites, fromCache) => {
          setProjects(nextProjects);
          setPending(hasPendingWrites);
          setCached(fromCache);
          setLoading(false);
          setError('');
        },
        (caughtError) => {
          setError(caughtError.message || 'Hooked could not load these projects.');
          setLoading(false);
        },
      ),
    [status, userId],
  );

  return { projects, loading, pending, cached, error };
}
