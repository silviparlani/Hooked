'use client';

import { AuthGate } from '@/components/auth/auth-gate';
import { NotebookPage } from '@/components/projects/notebook-page';
import { ProjectEditor } from '@/components/projects/project-editor';

export default function NewProjectPage() {
  return (
    <AuthGate>
      {(user) => (
        <NotebookPage title="New idea" backHref="/inspiration">
          <ProjectEditor userId={user.uid} />
        </NotebookPage>
      )}
    </AuthGate>
  );
}
