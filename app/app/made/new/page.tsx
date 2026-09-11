'use client';

import { AuthGate } from '@/components/auth/auth-gate';
import { NotebookPage } from '@/components/projects/notebook-page';
import { ProjectEditor } from '@/components/projects/project-editor';

export default function NewMadeProjectPage() {
  return (
    <AuthGate>
      {(user) => (
        <NotebookPage title="Add finished project" backHref="/made">
          <ProjectEditor userId={user.uid} initialStatus="completed" />
        </NotebookPage>
      )}
    </AuthGate>
  );
}
