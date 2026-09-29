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
  milliSkeins: 500,
  unit: 'skeins',
  conversion: { value: 100, unit: 'grams' },
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
};
function openYarn() {
  fireEvent.click(screen.getByRole('button', { name: /Green Merino wool DK/ }));
}
describe('Stash journal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(observeInventory).mockImplementation((_user, next) => {
      next([item], false, false);
      return vi.fn();
    });
  });
  it('opens a yarn from the index with its label conversion and hook', () => {
    render(<Stash userId="silvi" />);
    expect(screen.getByRole('heading', { name: 'Index' })).toBeVisible();
    openYarn();
    expect(screen.getByRole('heading', { name: 'Green Merino wool DK' })).toBeVisible();
    expect(screen.getByText('1 skein = 100 grams')).toBeVisible();
    expect(screen.getByText('4–5 mm')).toBeVisible();
  });
  it('adds skeins with required label information', async () => {
    render(<Stash userId="silvi" />);
    fireEvent.click(screen.getByRole('button', { name: 'Add yarn' }));
    fireEvent.change(screen.getByLabelText('Material'), { target: { value: 'Cotton' } });
    fireEvent.change(screen.getByLabelText('Quantity'), { target: { value: '2.125' } });
    fireEvent.change(screen.getByLabelText('1 skein equals'), { target: { value: '240' } });
    fireEvent.change(screen.getByLabelText('Label unit'), { target: { value: 'metres' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add to stash' }));
    await waitFor(() =>
      expect(addInventoryItem).toHaveBeenCalledWith(
        'silvi',
        expect.objectContaining({
          quantity: 2.125,
          unit: 'skeins',
          conversion: { value: 240, unit: 'metres' },
        }),
      ),
    );
  });
  it('saves zero stock without deleting the yarn', async () => {
    render(<Stash userId="silvi" />);
    openYarn();
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    fireEvent.change(screen.getByLabelText('Quantity'), { target: { value: '0' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save yarn' }));
    await waitFor(() =>
      expect(updateInventoryItem).toHaveBeenCalledWith(
        'silvi',
        'green',
        expect.objectContaining({ quantity: 0 }),
        item,
      ),
    );
    expect(removeInventoryItem).not.toHaveBeenCalled();
  });
  it('asks for confirmation before manual deletion', async () => {
    render(<Stash userId="silvi" />);
    openYarn();
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(removeInventoryItem).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Yes, remove yarn' }));
    await waitFor(() => expect(removeInventoryItem).toHaveBeenCalledWith('silvi', 'green'));
  });
  it('disables deletion when yarn is linked', () => {
    vi.mocked(observeInventory).mockImplementation((_user, next) => {
      next([{ ...item, linkedUsageCount: 1 }], false, false);
      return vi.fn();
    });
    render(<Stash userId="silvi" />);
    openYarn();
    expect(screen.getByRole('button', { name: 'Delete' })).toBeDisabled();
  });
});
