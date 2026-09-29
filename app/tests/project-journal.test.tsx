import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ProjectList } from '@/components/projects/project-list';
vi.mock('@/components/projects/use-projects', () => ({
  useProjects: () => ({
    projects: [
      {
        id: 'old',
        name: 'Older idea',
        status: 'planned',
        updatedAt: new Date('2026-01-01'),
        createdAt: new Date('2026-01-01'),
      },
      {
        id: 'new',
        name: 'Latest idea',
        status: 'planned',
        updatedAt: new Date('2026-02-01'),
        createdAt: new Date('2025-01-01'),
      },
    ],
    loading: false,
    pending: false,
    cached: false,
  }),
}));
vi.mock('@/components/projects/journal-photos', () => ({ JournalPhotos: () => <div>Photo</div> }));
vi.mock('@/lib/firebase/project-repository', () => ({
  startProject: vi.fn(),
  deleteProject: vi.fn(),
}));
describe('Project journal', () => {
  it('orders the index by latest update and displays one project per page', () => {
    render(<ProjectList userId="silvi" status="planned" />);
    const index = screen.getAllByRole('listitem');
    expect(index[0]).toHaveTextContent('Latest idea');
    fireEvent.click(screen.getByRole('button', { name: /Latest idea/ }));
    expect(screen.getByRole('heading', { name: 'Latest idea' })).toBeVisible();
    expect(screen.queryByText('Older idea')).not.toBeInTheDocument();
    expect(screen.queryByText(/drag to reorder/)).not.toBeInTheDocument();
    fireEvent.keyDown(screen.getByLabelText('Latest idea'), { key: 'ArrowRight' });
    expect(screen.getByRole('heading', { name: 'Older idea' })).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Next page' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Index' }));
    expect(screen.getByRole('heading', { name: 'Index' })).toBeVisible();
  });
});
