import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Stash } from '@/components/inventory/stash';
import {
  addInventoryItem,
  observeInventory,
  removeInventoryItem,
  updateInventoryItem,
} from '@/lib/firebase/inventory-repository';
import type { InventoryItem } from '@/lib/domain/inventory';

vi.mock('@/lib/firebase/inventory-repository', () => ({
  observeInventory: vi.fn(),
  addInventoryItem: vi.fn(),
  updateInventoryItem: vi.fn(),
  removeInventoryItem: vi.fn(),
}));

const item: InventoryItem = {
  id: 'green',
  name: '',
  material: 'Merino wool',
  category: 'DK',
  colour: 'Green',
  recommendedHookSize: '4–5 mm',
  quantity: 0.5,
  unit: 'skeins',
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
};

describe('Stash', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(observeInventory).mockImplementation((_user, next) => {
      next([item], false, false);
      return vi.fn();
    });
  });

  it('displays yarn as a label and edits only after request', () => {
    render(<Stash userId="silvi" />);
    expect(screen.getByRole('heading', { name: 'Green Merino wool DK' })).toBeVisible();
    expect(screen.getByText('0.5 skeins')).toBeVisible();
    expect(screen.getByText('4–5 mm')).toBeVisible();
    expect(screen.queryByLabelText(/Name/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Use' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Delete' })).toBeEnabled();
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    expect(screen.getByLabelText('Material')).toHaveValue('Merino wool');
    expect(screen.getByLabelText(/Name/)).toHaveValue('');
    expect(screen.getByLabelText(/Recommended hook size/)).toHaveValue('4–5 mm');
  });

  it('creates a custom-unit yarn', async () => {
    vi.mocked(addInventoryItem).mockResolvedValue();
    render(<Stash userId="silvi" />);
    fireEvent.click(screen.getByRole('button', { name: 'Add yarn' }));
    fireEvent.change(screen.getByLabelText('Material'), { target: { value: 'Cotton' } });
    fireEvent.change(screen.getByLabelText('Quantity'), { target: { value: '2' } });
    fireEvent.change(screen.getByLabelText('Unit'), { target: { value: 'custom' } });
    fireEvent.change(screen.getByLabelText('Custom unit'), { target: { value: 'cakes' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add to stash' }));
    await waitFor(() =>
      expect(addInventoryItem).toHaveBeenCalledWith(
        'silvi',
        expect.objectContaining({
          name: '',
          material: 'Cotton',
          quantity: 2,
          unit: 'custom',
          customUnit: 'cakes',
        }),
      ),
    );
  });

  it('keeps an item when zero-quantity removal is cancelled', async () => {
    render(<Stash userId="silvi" />);
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    fireEvent.change(screen.getByLabelText('Quantity'), { target: { value: '0' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save yarn' }));
    expect(screen.getByText(/has no quantity left/)).toBeVisible();
    fireEvent.click(screen.getAllByRole('button', { name: 'Cancel' }).at(-1)!);
    expect(removeInventoryItem).not.toHaveBeenCalled();
    expect(updateInventoryItem).not.toHaveBeenCalled();
  });

  it('removes an item when zero-quantity removal is confirmed', async () => {
    vi.mocked(removeInventoryItem).mockResolvedValue();
    render(<Stash userId="silvi" />);
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    fireEvent.change(screen.getByLabelText('Quantity'), { target: { value: '0' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save yarn' }));
    expect(removeInventoryItem).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Yes, remove yarn' }));
    await waitFor(() => expect(removeInventoryItem).toHaveBeenCalledWith('silvi', 'green'));
  });

  it('deletes directly from the yarn tile after confirmation', async () => {
    vi.mocked(removeInventoryItem).mockResolvedValue();
    render(<Stash userId="silvi" />);
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(removeInventoryItem).not.toHaveBeenCalled();
    expect(screen.getByText(/Delete “Green Merino wool DK” permanently/)).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Yes, remove yarn' }));
    await waitFor(() => expect(removeInventoryItem).toHaveBeenCalledWith('silvi', 'green'));
  });
});
