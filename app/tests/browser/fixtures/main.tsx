import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ProjectList } from '@/components/projects/project-list';
import '../../../app/globals.css';

const status =
  new URLSearchParams(location.search).get('status') === 'active' ? 'active' : 'planned';
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <main style={{ maxWidth: 560, margin: '24px auto', padding: 20 }}>
      <h1>{status === 'active' ? 'On the Hook' : 'Someday'}</h1>
      <ProjectList userId="browser-test" status={status} />
    </main>
  </StrictMode>,
);
