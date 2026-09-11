'use client';

import { useEffect, useRef, useState, type MouseEvent } from 'react';
import {
  isCounterComplete,
  isSectionComplete,
  stitchTypes,
  type CounterDetails,
  type RowCounter,
  type SectionNode,
  type WorkSection,
} from '@/lib/domain/project-parts';
import {
  addRowCounter,
  addWorkSection,
  changeRowCounter,
  flattenNestedWorkSections,
  observeSectionCounters,
  observeWorkSections,
  removeRowCounter,
  removeWorkSectionTree,
  setRowCounterComplete,
  updateRowCounterDetails,
} from '@/lib/firebase/project-parts-repository';

function countSectionCounters(
  section: SectionNode,
  counters: Record<string, RowCounter[]>,
): number {
  return (
    (counters[section.id] ?? []).length +
    section.children.reduce((total, child) => total + countSectionCounters(child, counters), 0)
  );
}

export function WorkSections({ userId, projectId }: { userId: string; projectId: string }) {
  const [sections, setSections] = useState<WorkSection[]>([]);
  const [counters, setCounters] = useState<Record<string, RowCounter[]>>({});
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const migrationRunning = useRef(false);

  useEffect(
    () =>
      observeWorkSections(userId, projectId, setSections, (caughtError) =>
        setError(caughtError.message),
      ),
    [projectId, userId],
  );
  useEffect(() => {
    const unsubscribes = sections.map((section) =>
      observeSectionCounters(
        userId,
        projectId,
        section.id,
        (next) => setCounters((current) => ({ ...current, [section.id]: next })),
        (caughtError) => setError(caughtError.message),
      ),
    );
    return () => unsubscribes.forEach((unsubscribe) => unsubscribe());
  }, [projectId, sections, userId]);

  async function addRoot() {
    setError('');
    try {
      await addWorkSection(userId, projectId, name);
      setName('');
    } catch (caughtError) {
      setError(
        caughtError instanceof Error ? caughtError.message : 'Hooked could not add the section.',
      );
    }
  }

  function removeSectionFromView(sectionId: string) {
    setSections((current) => {
      const removed = new Set([sectionId]);
      let changed = true;
      while (changed) {
        changed = false;
        current.forEach((section) => {
          if (
            section.parentSectionId &&
            removed.has(section.parentSectionId) &&
            !removed.has(section.id)
          ) {
            removed.add(section.id);
            changed = true;
          }
        });
      }
      return current.filter((section) => !removed.has(section.id));
    });
  }

  const roots: SectionNode[] = sections
    .filter((section) => section.parentSectionId === null)
    .map((section) => ({ ...section, children: [] }));

  useEffect(() => {
    if (!sections.some((section) => section.parentSectionId !== null) || migrationRunning.current)
      return;
    migrationRunning.current = true;
    void flattenNestedWorkSections(userId, projectId)
      .catch((caughtError) =>
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : 'Hooked could not simplify the old subsections.',
        ),
      )
      .finally(() => {
        migrationRunning.current = false;
      });
  }, [projectId, sections, userId]);

  return (
    <details className="collapsible-panel">
      <summary>
        Work sections <span>{roots.length}</span>
      </summary>
      <div className="collapsible-panel__body">
        <div className="add-row">
          <input
            aria-label="Section name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="New section"
          />
          <button type="button" className="secondary-button" onClick={addRoot}>
            Add section
          </button>
        </div>
        {roots.map((section) => (
          <SectionCard
            key={section.id}
            userId={userId}
            projectId={projectId}
            section={section}
            counters={counters}
            reportError={setError}
            onSectionDeleted={removeSectionFromView}
          />
        ))}
        {sections.length === 0 && <p className="project-state">No work sections yet.</p>}
        {error && (
          <p role="alert" className="project-form__error">
            {error}
          </p>
        )}
      </div>
    </details>
  );
}

function SectionCard({
  userId,
  projectId,
  section,
  counters,
  reportError,
  onSectionDeleted,
}: {
  userId: string;
  projectId: string;
  section: SectionNode;
  counters: Record<string, RowCounter[]>;
  reportError: (message: string) => void;
  onSectionDeleted: (sectionId: string) => void;
}) {
  const [counterName, setCounterName] = useState('');
  const [counterTarget, setCounterTarget] = useState('');
  const [stitchType, setStitchType] = useState<CounterDetails['stitchType']>('sc');
  const [stitchesPerRow, setStitchesPerRow] = useState('');
  const [customStitchName, setCustomStitchName] = useState('');
  const [customStitchInstructions, setCustomStitchInstructions] = useState('');
  const [addingCounter, setAddingCounter] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const complete = isSectionComplete(section, counters);
  const counterCount = countSectionCounters(section, counters);

  async function addCounter() {
    const target = counterTarget.trim() === '' ? null : Number(counterTarget);
    reportError('');
    try {
      await addRowCounter(userId, projectId, section.id, {
        name: counterName,
        target,
        stitchType,
        stitchesPerRow: stitchesPerRow.trim() === '' ? null : Number(stitchesPerRow),
        customStitchName,
        customStitchInstructions,
      });
      setCounterName('');
      setCounterTarget('');
      setStitchType('sc');
      setStitchesPerRow('');
      setCustomStitchName('');
      setCustomStitchInstructions('');
      setAddingCounter(false);
      reportError('');
    } catch (caughtError) {
      reportError(
        caughtError instanceof Error ? caughtError.message : 'Hooked could not add the counter.',
      );
    }
  }

  async function removeTree() {
    try {
      await removeWorkSectionTree(userId, projectId, section.id);
      onSectionDeleted(section.id);
    } catch (caughtError) {
      reportError(
        caughtError instanceof Error
          ? caughtError.message
          : 'Hooked could not delete this section.',
      );
    }
  }

  function beginCounterFromHeader(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    setAddingCounter(true);
    event.currentTarget.closest('details')?.setAttribute('open', '');
  }

  return (
    <details
      className={`nested-panel work-section work-section--root${complete ? ' work-section--complete' : ''}`}
    >
      <summary>
        <span className="section-heading">
          <span className="section-name">{section.name}</span>
          <small>
            {complete
              ? 'Complete'
              : `${counterCount} ${counterCount === 1 ? 'counter' : 'counters'}`}
          </small>
        </span>
        <button
          type="button"
          className="section-header-add"
          aria-label={`Add counter to ${section.name}`}
          onClick={beginCounterFromHeader}
        >
          + Counter
        </button>
      </summary>
      <div className="section-body">
        {(counters[section.id] ?? []).map((counter) => (
          <CounterRow
            key={counter.id}
            userId={userId}
            projectId={projectId}
            sectionId={section.id}
            counter={counter}
            reportError={reportError}
          />
        ))}
        {addingCounter ? (
          <>
            {addingCounter && (
              <div className="counter-add">
                <input
                  aria-label={`Counter name in ${section.name}`}
                  value={counterName}
                  onChange={(event) => setCounterName(event.target.value)}
                  placeholder="Counter name"
                />
                <label>
                  Stitch type
                  <select
                    value={stitchType}
                    onChange={(event) => {
                      reportError('');
                      setStitchType(event.target.value as CounterDetails['stitchType']);
                    }}
                  >
                    {stitchTypes.map((type) => (
                      <option key={type} value={type}>
                        {type === 'custom' ? 'Custom' : type.toUpperCase()}
                      </option>
                    ))}
                  </select>
                </label>
                {stitchType === 'custom' && (
                  <>
                    <input
                      aria-label={`Custom stitch name in ${section.name}`}
                      value={customStitchName}
                      onChange={(event) => {
                        reportError('');
                        setCustomStitchName(event.target.value);
                      }}
                      placeholder="Custom stitch name"
                    />
                    <textarea
                      aria-label={`How to produce custom stitch in ${section.name}`}
                      value={customStitchInstructions}
                      onChange={(event) => {
                        reportError('');
                        setCustomStitchInstructions(event.target.value);
                      }}
                      placeholder="How to produce this stitch"
                    />
                  </>
                )}
                <input
                  aria-label={`Stitches per row in ${section.name}`}
                  type="number"
                  min="1"
                  step="1"
                  inputMode="numeric"
                  value={stitchesPerRow}
                  onChange={(event) => setStitchesPerRow(event.target.value)}
                  placeholder="Stitches per row (optional)"
                />
                <input
                  aria-label={`Counter target in ${section.name}`}
                  type="number"
                  min="0"
                  step="1"
                  inputMode="numeric"
                  value={counterTarget}
                  onChange={(event) => setCounterTarget(event.target.value)}
                  placeholder="Row target (optional)"
                />
                <div className="counter-add-actions">
                  <button type="button" className="primary-button" onClick={addCounter}>
                    Add counter
                  </button>
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => {
                      setCounterName('');
                      setCounterTarget('');
                      setAddingCounter(false);
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <span />
        )}
        {confirmingDelete ? (
          <div className="inline-confirmation">
            <span>Delete this section and everything inside it?</span>
            <button type="button" className="text-delete-button" onClick={removeTree}>
              Yes, delete
            </button>
            <button
              type="button"
              className="text-button"
              onClick={() => setConfirmingDelete(false)}
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="text-delete-button"
            onClick={() => setConfirmingDelete(true)}
          >
            Delete section
          </button>
        )}
      </div>
    </details>
  );
}

function CounterRow({
  userId,
  projectId,
  sectionId,
  counter,
  reportError,
}: {
  userId: string;
  projectId: string;
  sectionId: string;
  counter: RowCounter;
  reportError: (message: string) => void;
}) {
  const [editingTarget, setEditingTarget] = useState(false);
  const [name, setName] = useState(counter.name);
  const [stitchType, setStitchType] = useState<CounterDetails['stitchType']>(
    counter.stitchType ?? 'sc',
  );
  const [stitchesPerRow, setStitchesPerRow] = useState(counter.stitchesPerRow?.toString() ?? '');
  const [customStitchName, setCustomStitchName] = useState(counter.customStitchName ?? '');
  const [customStitchInstructions, setCustomStitchInstructions] = useState(
    counter.customStitchInstructions ?? '',
  );
  const [target, setTarget] = useState(counter.target?.toString() ?? '');
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const complete = isCounterComplete(counter);

  async function change(changeBy: -1 | 1) {
    try {
      await changeRowCounter(userId, projectId, sectionId, counter.id, changeBy);
    } catch (caughtError) {
      reportError(
        caughtError instanceof Error
          ? caughtError.message
          : 'Hooked could not update this counter.',
      );
    }
  }

  async function saveTarget() {
    const value = target.trim() === '' ? null : Number(target);
    reportError('');
    try {
      await updateRowCounterDetails(userId, projectId, sectionId, counter.id, {
        name,
        target: value,
        stitchType,
        stitchesPerRow: stitchesPerRow.trim() === '' ? null : Number(stitchesPerRow),
        customStitchName,
        customStitchInstructions,
      });
      setEditingTarget(false);
      reportError('');
    } catch (caughtError) {
      reportError(
        caughtError instanceof Error ? caughtError.message : 'Hooked could not update the target.',
      );
    }
  }

  async function toggleComplete() {
    reportError('');
    try {
      await setRowCounterComplete(userId, projectId, sectionId, counter.id, !complete);
      reportError('');
    } catch (caughtError) {
      reportError(
        caughtError instanceof Error ? caughtError.message : 'Hooked could not update completion.',
      );
    }
  }

  async function remove() {
    try {
      await removeRowCounter(userId, projectId, sectionId, counter.id);
    } catch (caughtError) {
      reportError(
        caughtError instanceof Error
          ? caughtError.message
          : 'Hooked could not delete this counter.',
      );
    }
  }

  return (
    <article className={`row-counter${complete ? ' row-counter--complete' : ''}`}>
      <div className="counter-heading">
        <strong>{counter.name}</strong>
        {complete && <span>Complete</span>}
      </div>
      {(counter.stitchType || counter.stitchesPerRow) && (
        <div className="counter-details">
          {counter.stitchType && (
            <span>
              {counter.stitchType === 'custom'
                ? counter.customStitchName
                : counter.stitchType.toUpperCase()}
            </span>
          )}
          {counter.stitchesPerRow && <span>{counter.stitchesPerRow} stitches per row</span>}
          {counter.stitchType === 'custom' && counter.customStitchInstructions && (
            <p>{counter.customStitchInstructions}</p>
          )}
        </div>
      )}
      <div className="counter-controls">
        <button
          type="button"
          aria-label={`Decrease ${counter.name}`}
          onClick={() => change(-1)}
          disabled={counter.current === 0}
        >
          −
        </button>
        <output aria-label={`${counter.name} progress`}>
          {counter.target === null ? counter.current : `${counter.current}/${counter.target}`}
        </output>
        <button
          type="button"
          aria-label={`Increase ${counter.name}`}
          onClick={() => change(1)}
          disabled={counter.target !== null && counter.current >= counter.target}
        >
          +
        </button>
      </div>
      {editingTarget ? (
        <div className="target-editor">
          <label>
            Name
            <input value={name} onChange={(event) => setName(event.target.value)} />
          </label>
          <label>
            Stitch type
            <select
              value={stitchType}
              onChange={(event) =>
                setStitchType(event.target.value as CounterDetails['stitchType'])
              }
            >
              {stitchTypes.map((type) => (
                <option key={type} value={type}>
                  {type === 'custom' ? 'Custom' : type.toUpperCase()}
                </option>
              ))}
            </select>
          </label>
          {stitchType === 'custom' && (
            <>
              <label>
                Stitch name
                <input
                  value={customStitchName}
                  onChange={(event) => setCustomStitchName(event.target.value)}
                />
              </label>
              <label>
                How to produce
                <textarea
                  value={customStitchInstructions}
                  onChange={(event) => setCustomStitchInstructions(event.target.value)}
                />
              </label>
            </>
          )}
          <label>
            Stitches per row
            <input
              type="number"
              min="1"
              step="1"
              inputMode="numeric"
              value={stitchesPerRow}
              onChange={(event) => setStitchesPerRow(event.target.value)}
              placeholder="Optional"
            />
          </label>
          <label>
            Row target
            <input
              type="number"
              min="0"
              step="1"
              inputMode="numeric"
              value={target}
              onChange={(event) => setTarget(event.target.value)}
              placeholder="Blank for open-ended"
            />
          </label>
          <button type="button" className="secondary-button" onClick={saveTarget}>
            Save details
          </button>
          <button
            type="button"
            className="text-button"
            onClick={() => {
              setTarget(counter.target?.toString() ?? '');
              setEditingTarget(false);
            }}
          >
            Cancel
          </button>
        </div>
      ) : (
        <div className="counter-actions">
          <button
            type="button"
            className="counter-action-button"
            onClick={() => setEditingTarget(true)}
          >
            Edit details
          </button>
          {counter.target === null && (
            <button
              type="button"
              className="counter-action-button counter-action-button--complete"
              onClick={toggleComplete}
            >
              {complete ? 'Undo complete' : 'Complete'}
            </button>
          )}
          <button
            type="button"
            className="counter-action-button counter-action-button--delete"
            onClick={() => setConfirmingDelete(true)}
          >
            Delete counter
          </button>
        </div>
      )}
      {confirmingDelete && (
        <div className="inline-confirmation">
          <span>Delete this counter?</span>
          <button type="button" className="text-delete-button" onClick={remove}>
            Yes
          </button>
          <button type="button" className="text-button" onClick={() => setConfirmingDelete(false)}>
            Cancel
          </button>
        </div>
      )}
    </article>
  );
}
