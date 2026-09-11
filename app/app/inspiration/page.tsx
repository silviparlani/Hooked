'use client';

import Link from 'next/link';
import { AuthGate } from '@/components/auth/auth-gate';
import { NotebookPage } from '@/components/projects/notebook-page';
import { ProjectList } from '@/components/projects/project-list';

export default function InspirationPage() {
  return (
    <AuthGate>
      {(user) => (
        <NotebookPage
          title="Someday"
          action={
            <Link className="primary-button" href="/projects/new">
              New idea
            </Link>
          }
          separateSections
        >
          <ProjectList userId={user.uid} status="planned" />
        </NotebookPage>
      )}
    </AuthGate>
  );
}
