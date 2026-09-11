import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { HomeCollection } from '@/app/page';

vi.mock('@/components/projects/use-projects', () => ({
  useProjects: (_userId: string, status: string) => ({
    projects: status === 'active' ? [{ id: 'one' }] : [],
    loading: false,
    pending: false,
    cached: false,
    error: '',
  }),
}));

vi.mock('@/components/inventory/stash', () => ({
  useInventory: () => ({ items: [], loading: false, pending: false, cached: false, error: '' }),
}));

describe('Home', () => {
  it('shows every crochet collection with its empty count', () => {
    render(<HomeCollection userId="silvi" />);

    expect(screen.getByRole('heading', { level: 1, name: 'Hooked' })).toBeVisible();
    expect(screen.getByRole('heading', { name: 'On the Hook' })).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Made' })).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Someday' })).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Stash' })).toBeVisible();
    expect(
      screen.getAllByRole('heading', { level: 2 }).map((heading) => heading.textContent),
    ).toEqual(['On the Hook', 'Someday', 'Made', 'Stash']);
    expect(screen.getByText('1 project')).toBeVisible();
    expect(screen.getAllByText('0 projects')).toHaveLength(2);
    expect(screen.getByText('0 yarns')).toBeVisible();
  });
});
