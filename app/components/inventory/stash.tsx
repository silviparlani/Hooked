'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { conversionUnits, type ConversionUnit } from '@/lib/domain/materials';
import { Journal } from '@/components/journal/journal';
import {
  inventoryDisplayName,
  inventoryPastelColour,
  type InventoryDraft,
  type InventoryItem,
} from '@/lib/domain/inventory';
import {
  addInventoryItem,
  observeInventory,
  removeInventoryItem,
  updateInventoryItem,
} from '@/lib/firebase/inventory-repository';
import { clearSyncSource, reportSyncSource } from '@/lib/firebase/sync-state';

const emptyDraft: InventoryDraft = {
  name: '',
  material: '',
  category: '',
  colour: '',
  recommendedHookSize: '',
  quantity: 1,
  unit: 'skeins',
};

export function useInventory(userId: string) {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [cached, setCached] = useState(false);
  const [error, setError] = useState('');
  const source = `inventory:${userId}`;
  useEffect(() => {
    reportSyncSource(source, { pending, cached });
    return () => clearSyncSource(source);
  }, [cached, pending, source]);
  useEffect(
    () =>
      observeInventory(
        userId,
        (next, nextPending, nextCached) => {
          setItems(next);
          setPending(nextPending);
          setCached(nextCached);
          setLoading(false);
          setError('');
        },
        (caught) => {
          setError(caught.message);
          setLoading(false);
        },
      ),
    [userId],
  );
  return { items, loading, pending, cached, error };
}

export function Stash({ userId }: { userId: string }) {
  const { items, loading, pending, cached, error } = useInventory(userId);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState<InventoryDraft>(emptyDraft);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  async function add() {
    setSaving(true);
    setFormError('');
    try {
      await addInventoryItem(userId, draft);
      setDraft(emptyDraft);
      setAdding(false);
    } catch (caught) {
      setFormError(caught instanceof Error ? caught.message : 'Hooked could not add this yarn.');
    } finally {
      setSaving(false);
    }
  }
  return (
    <>
      <div className="stash-toolbar">
        <p>
          {items.length} {items.length === 1 ? 'yarn' : 'yarns'}
          {pending ? ' · Saving…' : cached ? ' · Offline copy' : ''}
        </p>
      </div>
      {adding && (
        <YarnForm
          draft={draft}
          setDraft={setDraft}
          title="New yarn"
          error={formError}
          actions={
            <>
              <button type="button" className="primary-button" onClick={add} disabled={saving}>
                {saving ? 'Adding…' : 'Add to stash'}
              </button>
              <button
                type="button"
                className="secondary-button"
                onClick={() => {
                  setAdding(false);
                  setDraft(emptyDraft);
                  setFormError('');
                }}
              >
                Cancel
              </button>
            </>
          }
        />
      )}
      {loading && <p className="project-state">Opening your stash…</p>}
      {error && (
        <p role="alert" className="project-form__error">
          {error}
        </p>
      )}
      {!loading && !error && (
        <Journal
          title="Stash"
          indexAction={
            <button
              type="button"
              className="primary-button"
              onClick={() => setAdding(true)}
              disabled={adding}
            >
              Add yarn
            </button>
          }
          pages={items.map((item) => ({
            id: item.id,
            title: inventoryDisplayName(item),
            subtitle: item.quantity + ' ' + item.unit,
            colour: inventoryPastelColour(item.colour),
          }))}
        >
          {(id) => (
            <StashItem key={id} userId={userId} item={items.find((item) => item.id === id)!} />
          )}
        </Journal>
      )}
    </>
  );
}

function YarnForm({
  draft,
  setDraft,
  title,
  error,
  actions,
}: {
  draft: InventoryDraft;
  setDraft: (draft: InventoryDraft) => void;
  title: string;
  error: string;
  actions: ReactNode;
}) {
  const change = <K extends keyof InventoryDraft>(key: K, value: InventoryDraft[K]) =>
    setDraft({ ...draft, [key]: value });
  return (
    <section className="stash-form">
      <div className="stash-stitches" aria-hidden="true">
        × × × × × × ×
      </div>
      <h2>{title}</h2>
      <div className="stash-fields">
        <label>
          Name <span>(optional)</span>
          <input
            value={draft.name}
            onChange={(event) => change('name', event.target.value)}
            placeholder="Uses colour, material and category if blank"
          />
        </label>
        <label>
          Material
          <input
            value={draft.material}
            onChange={(event) => change('material', event.target.value)}
            placeholder="e.g. Merino wool"
          />
        </label>
        <label>
          Category
          <input
            value={draft.category}
            onChange={(event) => change('category', event.target.value)}
            placeholder="e.g. DK"
          />
        </label>
        <label>
          Colour
          <input
            value={draft.colour}
            onChange={(event) => change('colour', event.target.value)}
            placeholder="e.g. Forest green"
          />
        </label>
        <label>
          Recommended hook size <span>(optional)</span>
          <input
            value={draft.recommendedHookSize}
            onChange={(event) => change('recommendedHookSize', event.target.value)}
            placeholder="e.g. 4–5 mm"
          />
        </label>
        <label>
          Quantity
          <input
            inputMode="decimal"
            type="number"
            min="0"
            step="0.001"
            max="1000000"
            value={Number.isFinite(draft.quantity) ? draft.quantity : ''}
            onChange={(event) => change('quantity', event.target.valueAsNumber)}
          />
        </label>
        <p>Quantities are measured in skeins.</p>
        <label>
          1 skein equals
          <input
            type="number"
            min="0.000001"
            step="any"
            inputMode="decimal"
            value={draft.conversion?.value ?? ''}
            onChange={(event) =>
              change('conversion', {
                value: event.target.valueAsNumber,
                unit: draft.conversion?.unit ?? 'grams',
              })
            }
          />
        </label>
        <label>
          Label unit
          <select
            value={draft.conversion?.unit ?? 'grams'}
            onChange={(event) =>
              change('conversion', {
                value: draft.conversion?.value ?? 0,
                unit: event.target.value as ConversionUnit,
              })
            }
          >
            {conversionUnits.map((unit) => (
              <option key={unit} value={unit}>
                {unit}
              </option>
            ))}
          </select>
        </label>
      </div>
      {error && (
        <p role="alert" className="project-form__error">
          {error}
        </p>
      )}
      <div className="stash-actions">{actions}</div>
    </section>
  );
}

function StashItem({ userId, item }: { userId: string; item: InventoryItem }) {
  const [editing, setEditing] = useState(false);
  const editBase = useRef(item);
  const [draft, setDraft] = useState<InventoryDraft>(item);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [deleteReason, setDeleteReason] = useState<'delete' | 'zero' | null>(null);
  const unit = item.unit === 'custom' ? item.customUnit : item.unit;
  const displayName = inventoryDisplayName(item);
  async function save() {
    setBusy(true);
    setError('');
    try {
      await updateInventoryItem(userId, item.id, draft, editBase.current);
      setEditing(false);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Hooked could not save this yarn.');
    } finally {
      setBusy(false);
    }
  }
  async function remove() {
    setBusy(true);
    try {
      await removeInventoryItem(userId, item.id);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Hooked could not delete this yarn.');
      setBusy(false);
    }
  }
  const confirmation = deleteReason && (
    <div className="delete-confirmation stash-delete-confirmation">
      <p>
        {deleteReason === 'zero'
          ? `“${displayName}” has no quantity left. Remove it from your stash?`
          : `Delete “${displayName}” permanently?`}{' '}
        Yarn linked to projects cannot be deleted.
      </p>
      <div>
        <button type="button" className="delete-button" onClick={remove} disabled={busy}>
          {busy ? 'Deleting…' : 'Yes, remove yarn'}
        </button>
        <button
          type="button"
          className="secondary-button"
          onClick={() => setDeleteReason(null)}
          disabled={busy}
        >
          Cancel
        </button>
      </div>
    </div>
  );
  if (editing)
    return (
      <YarnForm
        draft={draft}
        setDraft={setDraft}
        title={displayName}
        error={error}
        actions={
          <>
            <button type="button" className="primary-button" onClick={save} disabled={busy}>
              {busy ? 'Saving…' : 'Save yarn'}
            </button>
            <button
              type="button"
              className="secondary-button"
              onClick={() => {
                setDraft(item);
                setEditing(false);
                setDeleteReason(null);
                setError('');
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              className="delete-button"
              onClick={() => setDeleteReason('delete')}
              disabled={busy}
            >
              Delete yarn
            </button>
            {confirmation}
          </>
        }
      />
    );
  return (
    <article
      className="stash-label"
      style={{ backgroundColor: inventoryPastelColour(item.colour) }}
    >
      <div className="stash-stitches" aria-hidden="true">
        × × × × × × ×
      </div>
      <div className="stash-label__heading">
        <h2>{displayName}</h2>
        <strong>
          {item.quantity} {unit}
        </strong>
      </div>
      <dl>
        <div>
          <dt>Material</dt>
          <dd>{item.material}</dd>
        </div>
        <div>
          <dt>Category</dt>
          <dd>{item.category || 'Not set'}</dd>
        </div>
        <div>
          <dt>Colour</dt>
          <dd>{item.colour || 'Not set'}</dd>
        </div>
        {item.recommendedHookSize && (
          <div>
            <dt>Recommended hook</dt>
            <dd>{item.recommendedHookSize}</dd>
          </div>
        )}
      </dl>
      {item.conversion ? (
        <p className="stash-conversion">
          1 skein = {item.conversion.value} {item.conversion.unit}
        </p>
      ) : (
        <output>
          Needs setup: enter the available skeins and label conversion before using this yarn.
          Existing quantity: {item.quantity} {unit}.
        </output>
      )}
      <div className="stash-tile-actions">
        <button
          type="button"
          className="secondary-button"
          onClick={() => {
            editBase.current = item;
            setDraft({
              ...item,
              unit: 'skeins',
              quantity: item.unit === 'skeins' ? item.quantity : Number.NaN,
            });
            setEditing(true);
          }}
        >
          Edit
        </button>
        <button
          type="button"
          className="delete-button"
          onClick={() => setDeleteReason('delete')}
          disabled={busy || (item.linkedUsageCount ?? 0) > 0}
          title={(item.linkedUsageCount ?? 0) > 0 ? 'This yarn is linked to a project.' : undefined}
        >
          {busy ? 'Deleting…' : 'Delete'}
        </button>
      </div>
      <p className="stash-usage-hint">Record yarn use in your project’s Materials used section.</p>
      {confirmation}
      {error && (
        <p role="alert" className="project-form__error">
          {error}
        </p>
      )}
    </article>
  );
}
