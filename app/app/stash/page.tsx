'use client';

import { AuthGate } from '@/components/auth/auth-gate';
import { NotebookPage } from '@/components/projects/notebook-page';
import { Stash } from '@/components/inventory/stash';

export default function StashPage() {
  return (
    <AuthGate>
      {(user) => (
        <NotebookPage title="Stash">
          <Stash userId={user.uid} />
        </NotebookPage>
      )}
    </AuthGate>
  );
}
