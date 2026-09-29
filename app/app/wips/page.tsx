'use client';

import { AuthGate } from '@/components/auth/auth-gate';
import { NotebookPage } from '@/components/projects/notebook-page';
import { ProjectList } from '@/components/projects/project-list';

export default function WipsPage() {
  return (
    <AuthGate>
      {(user) => (
        <NotebookPage title="On the Hook" separateSections>
          <ProjectList userId={user.uid} status="active" />
        </NotebookPage>
      )}
    </AuthGate>
  );
}
