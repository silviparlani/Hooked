'use client';

import { AuthGate } from '@/components/auth/auth-gate';
import { NotebookPage } from '@/components/projects/notebook-page';
import { ProjectList } from '@/components/projects/project-list';

export default function MadePage() {
  return (
    <AuthGate>
      {(user) => (
        <NotebookPage title="Made" separateSections>
          <ProjectList userId={user.uid} status="completed" />
        </NotebookPage>
      )}
    </AuthGate>
  );
}
