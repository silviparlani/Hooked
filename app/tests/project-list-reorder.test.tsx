import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
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
  it('moves and saves projects with keyboard-accessible drag handles', async () => {
    vi.mocked(reorderProjects).mockResolvedValue();
    render(<ProjectList userId="silvi" status="planned" />);

    fireEvent.keyDown(screen.getByRole('button', { name: /Reorder First idea/ }), {
      key: 'ArrowDown',
    });

    await waitFor(() => expect(reorderProjects).toHaveBeenCalledWith('silvi', ['two', 'one']));
    expect(screen.getAllByRole('heading').map((heading) => heading.textContent)).toEqual([
      'Second idea',
      'First idea',
    ]);
  });
  it('moves and saves projects with pointer dragging', async () => {
    vi.mocked(reorderProjects).mockClear().mockResolvedValue();
    render(<ProjectList userId="silvi" status="planned" />);
    const handle = screen.getByRole('button', { name: /Reorder First idea/ });
    const destination = screen.getByRole('heading', { name: 'Second idea' });
    Object.defineProperty(handle, 'setPointerCapture', { configurable: true, value: vi.fn() });
    const previous = Object.getOwnPropertyDescriptor(document, 'elementFromPoint');
    Object.defineProperty(document, 'elementFromPoint', {
      configurable: true,
      value: () => destination,
    });
    try {
      fireEvent.pointerDown(handle, { pointerId: 1 });
      fireEvent.pointerMove(handle, { pointerId: 1, clientX: 20, clientY: 100 });
      fireEvent.pointerUp(handle, { pointerId: 1 });
      await waitFor(() => expect(reorderProjects).toHaveBeenCalledWith('silvi', ['two', 'one']));
      expect(screen.getAllByRole('heading').map((heading) => heading.textContent)).toEqual([
        'Second idea',
        'First idea',
      ]);
    } finally {
      if (previous) Object.defineProperty(document, 'elementFromPoint', previous);
      else Reflect.deleteProperty(document, 'elementFromPoint');
    }
  });
});
