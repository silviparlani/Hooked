'use client';

import { useEffect, useState } from 'react';
import { quantityUnits, type QuantityUnit } from '@/lib/domain/project';
import type { ProjectYarnEntry } from '@/lib/domain/project-parts';
import {
  addProjectYarn,
  changeYarnQuantity,
  observeProjectYarns,
  removeProjectYarn,
  updateProjectYarn,
} from '@/lib/firebase/project-parts-repository';

export function ProjectYarns({
  userId,
  projectId,
  editing,
}: {
  userId: string;
  projectId: string;
  editing: boolean;
}) {
  const [yarns, setYarns] = useState<ProjectYarnEntry[]>([]);
  const [error, setError] = useState('');
  const customUnits = [
    ...new Set(
      yarns
        .filter((yarn) => yarn.unit === 'custom' && yarn.customUnit)
        .map((yarn) => yarn.customUnit!),
    ),
  ];

  useEffect(
    () =>
      observeProjectYarns(userId, projectId, setYarns, (caughtError) =>
        setError(caughtError.message),
      ),
    [projectId, userId],
  );

  async function remove(yarn: ProjectYarnEntry) {
    if (!window.confirm('Delete this yarn entry? This cannot be undone.')) return;
    try {
      await removeProjectYarn(userId, projectId, yarn.id);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error ? caughtError.message : 'Hooked could not delete this yarn.',
      );
    }
  }

  async function add() {
    setError('');
    try {
      await addProjectYarn(userId, projectId, `Yarn ${yarns.length + 1}`);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error ? caughtError.message : 'Hooked could not add this yarn.',
      );
    }
  }

  return (
    <div className="yarn-list">
      {yarns.map((yarn, index) =>
        editing ? (
          <YarnEditor
            key={yarn.id}
            userId={userId}
            projectId={projectId}
            yarn={yarn}
            number={index + 1}
            customUnits={customUnits}
            remove={() => remove(yarn)}
          />
        ) : (
          <YarnDisplay key={yarn.id} yarn={yarn} number={index + 1} />
        ),
      )}
      {editing && (
        <button type="button" className="secondary-button add-yarn-button" onClick={add}>
          Add yarn
        </button>
      )}
      {error && (
        <p role="alert" className="project-form__error">
          {error}
        </p>
      )}
    </div>
  );
}

function YarnDisplay({ yarn, number }: { yarn: ProjectYarnEntry; number: number }) {
  const unit = yarn.unit === 'custom' ? yarn.customUnit || 'custom' : yarn.unit;
  return (
    <details className="nested-panel yarn-display">
      <summary>
        {yarn.name || `Yarn ${number}`}{' '}
        <span>
          {yarn.quantity} {unit}
        </span>
      </summary>
      <dl>
        <div>
          <dt>Material</dt>
          <dd>{yarn.material || 'Not set'}</dd>
        </div>
        <div>
          <dt>Category</dt>
          <dd>{yarn.category || 'Not set'}</dd>
        </div>
        <div>
          <dt>Colour</dt>
          <dd>{yarn.colour || 'Not set'}</dd>
        </div>
        <div>
          <dt>Quantity used</dt>
          <dd>
            {yarn.quantity} {unit}
          </dd>
        </div>
      </dl>
    </details>
  );
}

function YarnEditor({
  userId,
  projectId,
  yarn,
  number,
  customUnits,
  remove,
}: {
  userId: string;
  projectId: string;
  yarn: ProjectYarnEntry;
  number: number;
  customUnits: string[];
  remove: () => void;
}) {
  const [draft, setDraft] = useState(yarn);
  const [saveState, setSaveState] = useState<'clean' | 'dirty' | 'saving' | 'saved'>('clean');
  const [saveError, setSaveError] = useState('');

  function markAsEdited() {
    setSaveState('dirty');
    setSaveError('');
  }

  function change(
    field: 'name' | 'material' | 'category' | 'colour' | 'customUnit',
    value: string,
  ) {
    markAsEdited();
    setDraft((current) => ({ ...current, [field]: value }));
  }

  function selectUnit(value: string) {
    markAsEdited();
    if (value.startsWith('saved:'))
      setDraft((current) => ({ ...current, unit: 'custom', customUnit: value.slice(6) }));
    else
      setDraft((current) => ({
        ...current,
        unit: value as QuantityUnit,
        ...(value !== 'custom' && { customUnit: undefined }),
      }));
  }

  async function save() {
    setSaveState('saving');
    setSaveError('');
    try {
      await updateProjectYarn(userId, projectId, { ...draft, quantity: yarn.quantity });
      setSaveState('saved');
    } catch (caughtError) {
      setSaveState('dirty');
      setSaveError(
        caughtError instanceof Error ? caughtError.message : 'Hooked could not save this yarn.',
      );
    }
  }

  const selectedUnit =
    draft.unit === 'custom' && draft.customUnit && customUnits.includes(draft.customUnit)
      ? `saved:${draft.customUnit}`
      : draft.unit;

  return (
    <details className="nested-panel">
      <summary>
        {draft.name || `Yarn ${number}`}{' '}
        <span>
          {yarn.quantity} {draft.unit === 'custom' ? draft.customUnit || 'custom' : draft.unit}
        </span>
      </summary>
      <div className="yarn-fields">
        <label>
          Name
          <input value={draft.name} onChange={(event) => change('name', event.target.value)} />
        </label>
        <label>
          Material
          <input
            value={draft.material}
            onChange={(event) => change('material', event.target.value)}
          />
        </label>
        <label>
          Category
          <input
            value={draft.category}
            onChange={(event) => change('category', event.target.value)}
          />
        </label>
        <label>
          Colour
          <input value={draft.colour} onChange={(event) => change('colour', event.target.value)} />
        </label>
        <div className="quantity-counter">
          <span>Quantity used</span>
          <div>
            <button
              type="button"
              aria-label={`Decrease yarn ${number} quantity`}
              onClick={() => changeYarnQuantity(userId, projectId, yarn.id, -1)}
              disabled={yarn.quantity === 0}
            >
              −
            </button>
            <output>{yarn.quantity}</output>
            <button
              type="button"
              aria-label={`Increase yarn ${number} quantity`}
              onClick={() => changeYarnQuantity(userId, projectId, yarn.id, 1)}
            >
              +
            </button>
          </div>
        </div>
        <label>
          Unit
          <select value={selectedUnit} onChange={(event) => selectUnit(event.target.value)}>
            {quantityUnits
              .filter((unit) => unit !== 'custom')
              .map((unit) => (
                <option key={unit} value={unit}>
                  {unit}
                </option>
              ))}
            {customUnits.map((unit) => (
              <option key={unit} value={`saved:${unit}`}>
                {unit}
              </option>
            ))}
            <option value="custom">Custom…</option>
          </select>
        </label>
        {draft.unit === 'custom' && !customUnits.includes(draft.customUnit ?? '') && (
          <label>
            Custom unit
            <input
              value={draft.customUnit ?? ''}
              onChange={(event) => change('customUnit', event.target.value)}
            />
          </label>
        )}
        <div className="yarn-actions">
          {(saveState === 'dirty' || saveState === 'saving') && (
            <button
              type="button"
              className="secondary-button"
              onClick={save}
              disabled={saveState === 'saving'}
            >
              {saveState === 'saving' ? 'Saving…' : 'Save yarn'}
            </button>
          )}
          {saveState === 'saved' && <output className="saved-status">Saved</output>}
          <button type="button" className="text-delete-button" onClick={remove}>
            Delete yarn
          </button>
        </div>
        {saveError && (
          <p role="alert" className="project-form__error">
            {saveError}
          </p>
        )}
      </div>
    </details>
  );
}
