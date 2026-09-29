'use client';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useInventory } from '@/components/inventory/stash';
import { useOnlineStatus } from '@/components/pwa/pwa-status';
import { inventoryDisplayName } from '@/lib/domain/inventory';
import { convertedUsage, type MaterialUsage } from '@/lib/domain/materials';
import {
  addMaterialUsage,
  correctMaterialUsage,
  observeMaterials,
} from '@/lib/firebase/materials-repository';

export function MaterialsUsed({
  userId,
  projectId,
  editing = false,
  historical = false,
}: {
  userId: string;
  projectId: string;
  editing?: boolean;
  historical?: boolean;
}) {
  const [entries, setEntries] = useState<MaterialUsage[]>([]);
  const [error, setError] = useState('');
  useEffect(
    () => observeMaterials(userId, projectId, setEntries, (caught) => setError(caught.message)),
    [userId, projectId],
  );
  const total = entries.reduce((sum, entry) => sum + entry.milliSkeins, 0) / 1000;
  return (
    <section className="materials-used" aria-label="Materials used">
      <h3>Materials used</h3>
      <p className="materials-total">{total} skeins recorded</p>
      {entries.length === 0 && (
        <p>
          No linked materials recorded. Earlier material history may be unavailable; nothing has
          been deducted automatically.
        </p>
      )}
      {Object.entries(Object.groupBy(entries, (entry) => entry.inventoryId)).map(
        ([id, yarnEntries]) => {
          const yarn = yarnEntries!;
          const convertedTotals = new Map<string, number>();
          for (const entry of yarn)
            convertedTotals.set(
              entry.conversion.unit,
              (convertedTotals.get(entry.conversion.unit) ?? 0) +
                (entry.milliSkeins / 1000) * entry.conversion.value,
            );
          return (
            <div className="material-yarn" key={id}>
              <h4>
                {yarn[0].name} · {yarn.reduce((sum, item) => sum + item.milliSkeins, 0) / 1000}{' '}
                skeins
              </h4>
              <p className="material-converted-total">
                Total from recorded labels:{' '}
                {[...convertedTotals]
                  .map(
                    ([unit, amount]) =>
                      new Intl.NumberFormat(undefined, { maximumFractionDigits: 6 }).format(
                        amount,
                      ) +
                      ' ' +
                      unit,
                  )
                  .join(' + ')}
              </p>
              {yarn.map((entry) => (
                <UsageEntry key={entry.id} entry={entry} userId={userId} editing={editing} />
              ))}
            </div>
          );
        },
      )}
      {editing && <AddUsage userId={userId} projectId={projectId} historical={historical} />}
      {error && <p role="alert">{error}</p>}
    </section>
  );
}

function AddUsage({
  userId,
  projectId,
  historical,
}: {
  userId: string;
  projectId: string;
  historical: boolean;
}) {
  const { items, error: inventoryError } = useInventory(userId);
  const [inventoryId, setInventoryId] = useState('');
  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState('');
  const operation = useRef<{ id: string; inventoryId: string; amount: string } | null>(null);
  const online = useOnlineStatus();
  async function add() {
    if (busy) return;
    setBusy(true);
    setError('');
    setSaved('');
    if (
      !operation.current ||
      operation.current.inventoryId !== inventoryId ||
      operation.current.amount !== amount
    )
      operation.current = { id: crypto.randomUUID(), inventoryId, amount };
    try {
      await addMaterialUsage(userId, projectId, inventoryId, Number(amount), operation.current.id);
      operation.current = null;
      setAmount('');
      setSaved('Materials saved.');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not save materials.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="usage-form" data-no-page-swipe>
      <p>
        {historical
          ? 'Record historical usage. Your stash balance will not change.'
          : 'Add the amount used this time. It will be deducted from your stash.'}
      </p>
      <label>
        Stash yarn
        <select
          value={inventoryId}
          onChange={(e) => setInventoryId(e.target.value)}
          disabled={busy}
        >
          <option value="">Choose yarn</option>
          {items
            .filter(
              (item) => item.unit === 'skeins' && item.conversion && item.milliSkeins !== undefined,
            )
            .map((item) => (
              <option key={item.id} value={item.id}>
                {inventoryDisplayName(item)} — {item.quantity} skeins available
              </option>
            ))}
        </select>
      </label>
      <Link href="/stash">Add or set up yarn in Stash</Link>
      <label>
        Skeins used this time
        <input
          type="number"
          inputMode="decimal"
          min="0.001"
          max="1000000"
          step="0.001"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          disabled={busy}
        />
      </label>
      <button
        className="primary-button"
        type="button"
        disabled={busy || !online || !inventoryId || !amount}
        onClick={add}
      >
        {busy ? 'Saving…' : 'Add amount used'}
      </button>
      {!online && (
        <p>Connect to the internet to save materials. Your input has not been submitted.</p>
      )}
      {(error || inventoryError) && <p role="alert">{error || inventoryError}</p>}
      {saved && <output>{saved}</output>}
    </div>
  );
}

function UsageEntry({
  entry,
  userId,
  editing,
}: {
  entry: MaterialUsage;
  userId: string;
  editing: boolean;
}) {
  const [correcting, setCorrecting] = useState(false);
  const [amount, setAmount] = useState(String(entry.milliSkeins / 1000));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const base = useRef(entry);
  const operation = useRef<{ id: string; value: number } | null>(null);
  const online = useOnlineStatus();
  async function save(value: number) {
    setBusy(true);
    setError('');
    if (!operation.current || operation.current.value !== value)
      operation.current = { id: crypto.randomUUID(), value };
    try {
      await correctMaterialUsage(userId, base.current, value, operation.current.id);
      setCorrecting(false);
      operation.current = null;
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not correct usage.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="usage-entry">
      <p>
        <strong>{entry.milliSkeins / 1000} skeins</strong> · {convertedUsage(entry)}{' '}
        {entry.conversion.unit}
      </p>
      <small>
        1 skein = {entry.conversion.value} {entry.conversion.unit} ·{' '}
        {entry.createdAt.toLocaleDateString()}
        {!entry.deductsStock && ' · Historical, stock unchanged'}
      </small>
      {editing && !correcting && (
        <button
          type="button"
          className="secondary-button"
          disabled={!online}
          onClick={() => {
            base.current = entry;
            setAmount(String(entry.milliSkeins / 1000));
            setError('');
            setCorrecting(true);
          }}
        >
          Correct entry
        </button>
      )}
      {editing && correcting && (
        <div className="usage-correction">
          <label>
            Corrected skeins
            <input
              type="number"
              min="0"
              max="1000000"
              step="0.001"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={busy}
            />
          </label>
          <p>
            {entry.deductsStock
              ? 'Reducing or removing this entry returns yarn to your stash.'
              : 'This historical entry will not change your stash.'}
          </p>
          <button
            type="button"
            disabled={busy || !online || amount === ''}
            onClick={() => save(Number(amount))}
          >
            Save correction
          </button>
          <button type="button" disabled={busy || !online} onClick={() => save(0)}>
            Remove entry
          </button>
          <button type="button" disabled={busy} onClick={() => setCorrecting(false)}>
            Cancel
          </button>
        </div>
      )}
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
