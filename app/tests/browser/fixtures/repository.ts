import type { ProjectStatus } from '@/lib/domain/project';

// Browser gestures exercise the production components and styles. Only the
// data boundary is substituted so no private account or live writes are needed.
export function useProjects(_userId: string, status: ProjectStatus) {
  const saved = JSON.parse(localStorage.getItem('order:' + status) ?? '[]') as string[];
  const ids = saved.length ? saved : ['one', 'two', 'three', 'four', 'five', 'six'];
  return {
    projects: ids.map((id) => ({
      id,
      name: 'Project ' + id,
      status,
      schemaVersion: 1 as const,
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-01-01'),
    })),
    loading: false,
    pending: false,
    cached: false,
    error: '',
  };
}

export function reorderProjects(_userId: string, ids: string[]) {
  const status =
    new URLSearchParams(location.search).get('status') === 'active' ? 'active' : 'planned';
  localStorage.setItem('order:' + status, JSON.stringify(ids));
  return Promise.resolve();
}

export function observeWorkSections(
  _userId: string,
  _projectId: string,
  onChange: (sections: []) => void,
) {
  onChange([]);
  return () => {};
}
