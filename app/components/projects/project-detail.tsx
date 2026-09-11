'use client';

import { useEffect, useState } from 'react';
import type { Project } from '@/lib/domain/project';
import { observeProject } from '@/lib/firebase/project-repository';
import { NotebookPage } from './notebook-page';
import { ProjectEditor } from './project-editor';

export function ProjectDetail({ userId, projectId }: { userId: string; projectId: string }) {
  const [project, setProject] = useState<Project | null>();
  const [error, setError] = useState('');

  useEffect(() => {
    return observeProject(userId, projectId, setProject, (caughtError) =>
      setError(caughtError.message || 'Hooked could not open this project.'),
    );
  }, [projectId, userId]);

  if (error)
    return (
      <NotebookPage title="Project">
        <p role="alert" className="project-state project-state--error">
          {error}
        </p>
      </NotebookPage>
    );
  if (project === undefined)
    return (
      <NotebookPage title="Project">
        <output className="project-state">Turning the page…</output>
      </NotebookPage>
    );
  if (project === null)
    return (
      <NotebookPage title="Project">
        <p className="project-state">This project could not be found.</p>
      </NotebookPage>
    );

  const backHref =
    project.status === 'planned'
      ? '/inspiration'
      : project.status === 'completed'
        ? '/made'
        : '/wips';
  return (
    <NotebookPage title={project.name} backHref={backHref}>
      <ProjectEditor userId={userId} project={project} />
    </NotebookPage>
  );
}
