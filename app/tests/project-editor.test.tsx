import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ProjectEditor } from '@/components/projects/project-editor';
import type { Project } from '@/lib/domain/project';
import {
  completeProject,
  createProject,
  deleteProject,
  getIncompleteSectionNames,
  reactivateProject,
  updateProject,
} from '@/lib/firebase/project-repository';

const push = vi.fn();

vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
vi.mock('@/components/projects/project-yarns', () => ({
  ProjectYarns: ({ editing }: { editing: boolean }) => (
    <div>{editing ? 'Yarns editable' : 'Yarns displayed'}</div>
  ),
}));
vi.mock('@/components/projects/work-sections', () => ({
  WorkSections: () => <div>Work sections</div>,
}));
vi.mock('@/components/projects/project-photos', () => ({
  ProjectPhotos: () => <div>Project photos</div>,
}));
vi.mock('@/lib/firebase/project-repository', () => ({
  completeProject: vi.fn(),
  createProject: vi.fn(),
  deleteProject: vi.fn(),
  getIncompleteSectionNames: vi.fn(),
  reactivateProject: vi.fn(),
  startProject: vi.fn(),
  updateProject: vi.fn(),
}));

const project: Project = {
  id: 'mesh-tote',
  name: 'Mesh Tote',
  status: 'planned',
  description: 'A grey mesh tote bag',
  patternUrl: 'https://example.com/one\nhttps://example.com/two',
  hookSize: '4.5 mm, 5.5 mm',
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
  schemaVersion: 1,
};

describe('ProjectEditor milestone 2 controls', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows saved pattern sources as links until editing begins', () => {
    render(<ProjectEditor userId="silvi" project={project} />);

    expect(screen.getByRole('link', { name: /Pattern 1/ })).toHaveAttribute(
      'href',
      'https://example.com/one',
    );
    expect(screen.getByRole('link', { name: /Pattern 2/ })).toHaveAttribute(
      'href',
      'https://example.com/two',
    );
    expect(screen.queryByLabelText('Pattern 1')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Edit pattern sources' }));
    expect(screen.getByLabelText('Pattern 1')).toHaveValue('https://example.com/one');
  });

  it('adds and saves another pattern source', async () => {
    vi.mocked(updateProject).mockResolvedValue();
    render(<ProjectEditor userId="silvi" project={project} />);

    fireEvent.click(screen.getByRole('button', { name: 'Edit pattern sources' }));
    fireEvent.click(screen.getByRole('button', { name: 'Add pattern source' }));
    fireEvent.change(screen.getByLabelText('Pattern 3'), {
      target: { value: 'https://example.com/three' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save pattern sources' }));

    await waitFor(() =>
      expect(updateProject).toHaveBeenCalledWith(
        'silvi',
        'mesh-tote',
        expect.objectContaining({
          patternUrl: 'https://example.com/one\nhttps://example.com/two\nhttps://example.com/three',
        }),
      ),
    );
    expect(await screen.findByRole('link', { name: /Pattern 3/ })).toHaveAttribute(
      'href',
      'https://example.com/three',
    );
  });

  it('keeps materials read-only until editing and allows multiple hooks', async () => {
    vi.mocked(updateProject).mockResolvedValue();
    render(<ProjectEditor userId="silvi" project={project} />);

    fireEvent.click(screen.getByText('Materials'));
    expect(screen.getByText('4.5 mm, 5.5 mm')).toBeVisible();
    expect(screen.getByText('Yarns displayed')).toBeVisible();
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Edit materials' }));
    expect(screen.getByText('Yarns editable')).toBeVisible();
    expect(screen.getByRole('checkbox', { name: '4.5 mm' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: '5.5 mm' })).toBeChecked();
    fireEvent.click(screen.getByRole('checkbox', { name: '6 mm' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save materials' }));

    await waitFor(() =>
      expect(updateProject).toHaveBeenCalledWith(
        'silvi',
        'mesh-tote',
        expect.objectContaining({ hookSize: '4.5 mm, 5.5 mm, 6 mm' }),
      ),
    );
    expect(await screen.findByText('4.5 mm, 5.5 mm, 6 mm')).toBeVisible();
  });

  it('requires an in-page confirmation before deleting a WIP', async () => {
    vi.mocked(deleteProject).mockResolvedValue();
    render(<ProjectEditor userId="silvi" project={{ ...project, status: 'active' }} />);

    fireEvent.click(screen.getByRole('button', { name: 'Delete WIP' }));
    expect(deleteProject).not.toHaveBeenCalled();
    expect(screen.getByText(/Delete “Mesh Tote” permanently/)).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Yes, delete WIP' }));

    await waitFor(() => expect(deleteProject).toHaveBeenCalledWith('silvi', 'mesh-tote'));
    expect(push).toHaveBeenCalledWith('/wips');
  });

  it('shows deletion progress without changing the Save label', async () => {
    let finishDelete!: () => void;
    vi.mocked(deleteProject).mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          finishDelete = resolve;
        }),
    );
    render(<ProjectEditor userId="silvi" project={project} />);

    fireEvent.click(screen.getByRole('button', { name: 'Delete project' }));
    fireEvent.click(screen.getByRole('button', { name: 'Yes, delete project' }));

    expect(screen.getByRole('button', { name: 'Deleting…' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Saving…' })).not.toBeInTheDocument();

    finishDelete();
    await waitFor(() => expect(push).toHaveBeenCalledWith('/inspiration'));
  });

  it('warns about incomplete sections before completing a WIP', async () => {
    vi.mocked(getIncompleteSectionNames).mockResolvedValue(['Body', 'Sleeve']);
    vi.mocked(completeProject).mockResolvedValue();
    render(<ProjectEditor userId="silvi" project={{ ...project, status: 'active' }} />);
    fireEvent.click(screen.getByRole('button', { name: 'Complete project' }));
    expect(await screen.findByText('Incomplete sections')).toBeVisible();
    expect(screen.getByText('Body')).toBeVisible();
    expect(completeProject).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Complete anyway' }));
    await waitFor(() => expect(completeProject).toHaveBeenCalledWith('silvi', 'mesh-tote'));
    expect(push).toHaveBeenCalledWith('/made');
  });

  it('reactivates a completed project as a new active project', async () => {
    vi.mocked(reactivateProject).mockResolvedValue('new-active');
    render(
      <ProjectEditor
        userId="silvi"
        project={{ ...project, status: 'completed', completedAt: new Date('2026-02-01') }}
      />,
    );
    expect(screen.queryByText('Materials')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Reactivate' }));
    await waitFor(() => expect(reactivateProject).toHaveBeenCalled());
    expect(push).toHaveBeenCalledWith('/projects/new-active');
  });

  it('saves an edited completed-project description', async () => {
    vi.mocked(updateProject).mockResolvedValue();
    render(<ProjectEditor userId="silvi" project={{ ...project, status: 'completed' }} />);
    fireEvent.change(screen.getByLabelText('Description'), { target: { value: 'Updated make' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() =>
      expect(updateProject).toHaveBeenCalledWith(
        'silvi',
        'mesh-tote',
        expect.objectContaining({ description: 'Updated make', status: 'completed' }),
      ),
    );
    expect(push).toHaveBeenCalledWith('/made');
  });

  it('stores a completion date for a manually added Made project', async () => {
    vi.mocked(createProject).mockResolvedValue('finished-project');
    render(<ProjectEditor userId="silvi" initialStatus="completed" />);
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Finished skirt' } });
    fireEvent.change(screen.getByLabelText('Date completed'), { target: { value: '2026-08-21' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() =>
      expect(createProject).toHaveBeenCalledWith(
        'silvi',
        expect.objectContaining({
          name: 'Finished skirt',
          status: 'completed',
          completedAt: expect.any(Date),
        }),
      ),
    );
    const saved = vi.mocked(createProject).mock.calls[0][1].completedAt;
    expect(saved).toEqual(expect.any(Date));
    expect([saved?.getFullYear(), saved && saved.getMonth() + 1, saved?.getDate()]).toEqual([
      2026, 8, 21,
    ]);
    expect(push).toHaveBeenCalledWith('/made');
  });
});
