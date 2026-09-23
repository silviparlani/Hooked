import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ProjectList } from '@/components/projects/project-list';
import { reorderProjects } from '@/lib/firebase/project-repository';

const time = new Date('2026-01-01');
const projects = [
  {
    id: 'one',
    name: 'First idea',
    status: 'planned' as const,
    createdAt: time,
    updatedAt: time,
    schemaVersion: 1 as const,
  },
  {
    id: 'two',
    name: 'Second idea',
    status: 'planned' as const,
    createdAt: time,
    updatedAt: time,
    schemaVersion: 1 as const,
  },
];

vi.mock('@/components/projects/use-projects', () => ({
  useProjects: () => ({
    projects,
    loading: false,
    pending: false,
    cached: false,
    error: '',
  }),
}));

vi.mock('@/lib/firebase/project-repository', () => ({ reorderProjects: vi.fn() }));

describe('project list reordering', () => {
  beforeEach(() => {
    vi.mocked(reorderProjects).mockReset().mockResolvedValue();
  });

  it('keeps cards as links, removes corner buttons, and supports keyboard reordering', async () => {
    render(<ProjectList userId="silvi" status="planned" />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    const first = screen.getByRole('link', { name: /First idea/ });
    expect(first).toHaveAttribute('href', '/projects/one');
    fireEvent.keyDown(first, { key: 'ArrowDown' });
    await waitFor(() => expect(reorderProjects).toHaveBeenCalledWith('silvi', ['two', 'one']));
    expect(screen.getAllByRole('heading').map((heading) => heading.textContent)).toEqual([
      'Second idea',
      'First idea',
    ]);
  });

  it('does not write when moving beyond a list boundary', () => {
    render(<ProjectList userId="silvi" status="planned" />);
    fireEvent.keyDown(screen.getByRole('link', { name: /First idea/ }), { key: 'ArrowUp' });
    expect(reorderProjects).not.toHaveBeenCalled();
  });

  it('restores the displayed order and reports a failed save', async () => {
    vi.mocked(reorderProjects).mockRejectedValue(new Error('Could not save order'));
    render(<ProjectList userId="silvi" status="planned" />);
    fireEvent.keyDown(screen.getByRole('link', { name: /First idea/ }), { key: 'ArrowDown' });
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not save order');
    expect(screen.getAllByRole('heading').map((heading) => heading.textContent)).toEqual([
      'First idea',
      'Second idea',
    ]);
  });

  it('does not reorder completed projects', () => {
    render(<ProjectList userId="silvi" status="completed" />);
    fireEvent.keyDown(screen.getByRole('link', { name: /First idea/ }), { key: 'ArrowDown' });
    expect(reorderProjects).not.toHaveBeenCalled();
    expect(screen.queryByText('Hold a project, then drag to reorder.')).not.toBeInTheDocument();
  });
});
