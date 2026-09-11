'use client';

import { AuthGate } from '@/components/auth/auth-gate';
import { NotebookPage } from '@/components/projects/notebook-page';
import { ProjectEditor } from '@/components/projects/project-editor';

export default function NewWipPage() {
  return (
    <AuthGate>
      {(user) => (
        <NotebookPage title="New WIP" backHref="/wips">
          <ProjectEditor userId={user.uid} initialStatus="active" />
        </NotebookPage>
      )}
    </AuthGate>
  );
}
