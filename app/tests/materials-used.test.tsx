import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MaterialsUsed } from '@/components/projects/materials-used';
import {
  addMaterialUsage,
  correctMaterialUsage,
  observeMaterials,
} from '@/lib/firebase/materials-repository';
let online = true;
vi.mock('@/components/pwa/pwa-status', () => ({ useOnlineStatus: () => online }));
vi.mock('@/components/inventory/stash', () => ({
  useInventory: () => ({
    items: [
      {
        id: 'green',
        name: 'Green yarn',
        material: 'Wool',
        category: 'DK',
        colour: 'Green',
        quantity: 3,
        milliSkeins: 3000,
        unit: 'skeins',
        conversion: { value: 100, unit: 'grams' },
      },
    ],
    error: '',
  }),
}));
vi.mock('@/lib/firebase/materials-repository', () => ({
  addMaterialUsage: vi.fn(),
  correctMaterialUsage: vi.fn(),
  observeMaterials: vi.fn(),
}));
beforeEach(() => {
  online = true;
  vi.clearAllMocks();
  vi.mocked(observeMaterials).mockImplementation((_user, _project, next) => {
    next([]);
    return vi.fn();
  });
});
describe('Materials used form', () => {
  it('keeps the same submission ID on retry, then clears the amount after success', async () => {
    vi.mocked(addMaterialUsage)
      .mockRejectedValueOnce(new Error('Connection interrupted'))
      .mockResolvedValueOnce();
    render(<MaterialsUsed userId="owner" projectId="project" editing />);
    fireEvent.change(screen.getByLabelText('Stash yarn'), { target: { value: 'green' } });
    fireEvent.change(screen.getByLabelText('Skeins used this time'), {
      target: { value: '0.125' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Add amount used' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Connection interrupted');
    const firstId = vi.mocked(addMaterialUsage).mock.calls[0][4];
    fireEvent.click(screen.getByRole('button', { name: 'Add amount used' }));
    await waitFor(() =>
      expect(addMaterialUsage).toHaveBeenLastCalledWith(
        'owner',
        'project',
        'green',
        0.125,
        firstId,
      ),
    );
    expect(await screen.findByText('Materials saved.')).toBeVisible();
    expect(screen.getByLabelText('Skeins used this time')).toHaveValue(null);
  });
  it('keeps input unsaved while offline', () => {
    online = false;
    render(<MaterialsUsed userId="owner" projectId="project" editing />);
    fireEvent.change(screen.getByLabelText('Skeins used this time'), { target: { value: '0.25' } });
    expect(screen.getByRole('button', { name: 'Add amount used' })).toBeDisabled();
    expect(screen.getByText(/input has not been submitted/)).toBeVisible();
    expect(addMaterialUsage).not.toHaveBeenCalled();
  });
  it('shows snapshot conversion and stock-neutral historical correction', async () => {
    vi.mocked(observeMaterials).mockImplementation((_user, _project, next) => {
      next([
        {
          id: 'one',
          projectId: 'project',
          inventoryId: 'green',
          name: 'Green yarn',
          material: 'Wool',
          colour: 'Green',
          conversion: { value: 100, unit: 'grams' },
          milliSkeins: 500,
          deductsStock: false,
          version: 1,
          operationId: 'first',
          createdAt: new Date('2026-01-01'),
          updatedAt: new Date('2026-01-01'),
        },
      ]);
      return vi.fn();
    });
    render(<MaterialsUsed userId="owner" projectId="project" editing historical />);
    expect(screen.getByText('Total from recorded labels: 50 grams')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Correct entry' }));
    expect(screen.getByText('This historical entry will not change your stash.')).toBeVisible();
    fireEvent.change(screen.getByLabelText('Corrected skeins'), { target: { value: '0.25' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save correction' }));
    await waitFor(() =>
      expect(correctMaterialUsage).toHaveBeenCalledWith(
        'owner',
        expect.objectContaining({ deductsStock: false, version: 1 }),
        0.25,
        expect.any(String),
      ),
    );
  });
});
