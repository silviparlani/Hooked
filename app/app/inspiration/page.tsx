'use client';

import { AuthGate } from '@/components/auth/auth-gate';
import { NotebookPage } from '@/components/projects/notebook-page';
import { ProjectList } from '@/components/projects/project-list';

export default function InspirationPage() {
  return (
    <AuthGate>
      {(user) => (
        <NotebookPage title="Someday" separateSections>
          <ProjectList userId={user.uid} status="planned" />
        </NotebookPage>
      )}
    </AuthGate>
  );
}
