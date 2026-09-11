import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { WorkSections } from '@/components/projects/work-sections';
import {
  addRowCounter,
  flattenNestedWorkSections,
  removeWorkSectionTree,
  setRowCounterComplete,
} from '@/lib/firebase/project-parts-repository';
import type { RowCounter, WorkSection } from '@/lib/domain/project-parts';

const time = new Date('2026-01-01');
const rootSections: WorkSection[] = [
  { id: 'body', name: 'Body', parentSectionId: null, createdAt: time, updatedAt: time },
  { id: 'straps', name: 'Straps', parentSectionId: null, createdAt: time, updatedAt: time },
];
let currentSections = rootSections;
const counters: Record<string, RowCounter[]> = {
  body: [
    {
      id: 'base',
      name: 'Base — Single crochet circles',
      current: 2,
      target: 10,
      createdAt: time,
      updatedAt: time,
    },
    {
      id: 'mesh',
      name: 'Mesh — Mesh DC',
      current: 10,
      target: 30,
      createdAt: time,
      updatedAt: time,
    },
    {
      id: 'top',
      name: 'Top — Single crochet',
      current: 0,
      target: 3,
      createdAt: time,
      updatedAt: time,
    },
  ],
  straps: [
    {
      id: 'strap-rows',
      name: 'Single crochet rows',
      current: 2,
      target: null,
      createdAt: time,
      updatedAt: time,
    },
  ],
};

vi.mock('@/lib/firebase/project-parts-repository', () => ({
  observeWorkSections: vi.fn((_userId, _projectId, next) => {
    next(currentSections);
    return vi.fn();
  }),
  observeSectionCounters: vi.fn((_userId, _projectId, sectionId, next) => {
    next(counters[sectionId] ?? []);
    return vi.fn();
  }),
  addWorkSection: vi.fn(),
  addRowCounter: vi.fn(),
  changeRowCounter: vi.fn(),
  updateRowCounterTarget: vi.fn(),
  updateRowCounterDetails: vi.fn(),
  removeRowCounter: vi.fn(),
  removeWorkSectionTree: vi.fn(),
  setRowCounterComplete: vi.fn(),
  flattenNestedWorkSections: vi.fn(),
}));

describe('WorkSections', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentSections = rootSections;
  });

  it('renders root sections with their named counters and no subsection controls', async () => {
    render(<WorkSections userId="silvi" projectId="tote" />);
    expect(await screen.findByText('Body')).toBeInTheDocument();
    expect(screen.getByText('Straps')).toBeInTheDocument();
    expect(screen.getByText('Work sections')).toHaveTextContent('2');
    expect(screen.getByText('Body').closest('summary')).toHaveTextContent('3 counters');
    expect(screen.getByText('Base — Single crochet circles')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Add subsection', hidden: true }),
    ).not.toBeInTheDocument();
  });

  it('opens a counter form from the section header action', async () => {
    render(<WorkSections userId="silvi" projectId="tote" />);
    await screen.findByText('Body');
    fireEvent.click(screen.getByText('Work sections').closest('summary')!);
    fireEvent.click(screen.getByRole('button', { name: 'Add counter to Body' }));
    expect(screen.getByLabelText('Counter name in Body')).toBeVisible();
  });

  it('allows an open-ended counter to be marked complete', async () => {
    vi.mocked(setRowCounterComplete).mockResolvedValue();
    render(<WorkSections userId="silvi" projectId="tote" />);
    await screen.findByText('Single crochet rows');
    fireEvent.click(screen.getByRole('button', { name: 'Complete', hidden: true }));
    await waitFor(() =>
      expect(setRowCounterComplete).toHaveBeenCalledWith(
        'silvi',
        'tote',
        'straps',
        'strap-rows',
        true,
      ),
    );
  });

  it('allows duplicate counter names in one root section', async () => {
    vi.mocked(addRowCounter).mockResolvedValue();
    render(<WorkSections userId="silvi" projectId="tote" />);
    await screen.findByText('Body');
    fireEvent.click(screen.getByText('Work sections').closest('summary')!);
    fireEvent.click(screen.getByRole('button', { name: 'Add counter to Body' }));
    fireEvent.change(screen.getByLabelText('Counter name in Body'), {
      target: { value: 'Mesh — Mesh DC' },
    });
    fireEvent.change(screen.getByLabelText('Counter target in Body'), { target: { value: '4' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add counter' }));
    await waitFor(() =>
      expect(addRowCounter).toHaveBeenCalledWith('silvi', 'tote', 'body', {
        name: 'Mesh — Mesh DC',
        target: 4,
        stitchType: 'sc',
        stitchesPerRow: null,
        customStitchName: '',
        customStitchInstructions: '',
      }),
    );
  });

  it('reveals custom stitch fields only for a custom stitch', async () => {
    render(<WorkSections userId="silvi" projectId="tote" />);
    await screen.findByText('Body');
    fireEvent.click(screen.getByText('Work sections').closest('summary')!);
    fireEvent.click(screen.getByRole('button', { name: 'Add counter to Body' }));
    expect(screen.queryByLabelText('Custom stitch name in Body')).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Stitch type'), { target: { value: 'custom' } });
    expect(screen.getByLabelText('Custom stitch name in Body')).toBeVisible();
    expect(screen.getByLabelText('How to produce custom stitch in Body')).toBeVisible();
  });

  it('starts the compatibility migration when old subsections are found', async () => {
    currentSections = [
      ...rootSections,
      { id: 'base-old', name: 'Base', parentSectionId: 'body', createdAt: time, updatedAt: time },
    ];
    vi.mocked(flattenNestedWorkSections).mockResolvedValue();
    render(<WorkSections userId="silvi" projectId="tote" />);
    await waitFor(() => expect(flattenNestedWorkSections).toHaveBeenCalledWith('silvi', 'tote'));
    expect(screen.queryByText('Base')).not.toBeInTheDocument();
  });

  it('requires confirmation before deleting a root section', async () => {
    vi.mocked(removeWorkSectionTree).mockResolvedValue();
    render(<WorkSections userId="silvi" projectId="tote" />);
    await screen.findByText('Body');
    fireEvent.click(screen.getAllByRole('button', { name: 'Delete section', hidden: true })[0]);
    expect(removeWorkSectionTree).not.toHaveBeenCalled();
    fireEvent.click(screen.getAllByRole('button', { name: 'Yes, delete', hidden: true })[0]);
    await waitFor(() =>
      expect(removeWorkSectionTree).toHaveBeenCalledWith('silvi', 'tote', 'body'),
    );
  });
});
