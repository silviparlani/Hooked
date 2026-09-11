'use client';

import Link from 'next/link';
import { AuthGate } from '@/components/auth/auth-gate';
import { NotebookPage } from '@/components/projects/notebook-page';
import { ProjectList } from '@/components/projects/project-list';

export default function WipsPage() {
  return (
    <AuthGate>
      {(user) => (
        <NotebookPage
          title="On the Hook"
          action={
            <Link className="primary-button" href="/wips/new">
              New WIP
            </Link>
          }
          separateSections
        >
          <ProjectList userId={user.uid} status="active" />
        </NotebookPage>
      )}
    </AuthGate>
  );
}
