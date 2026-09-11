'use client';

import { useState, type SyntheticEvent } from 'react';
import { useRouter } from 'next/navigation';
import {
  compactObject,
  type EditableProject,
  type Project,
  type ProjectStatus,
} from '@/lib/domain/project';
import {
  completeProject,
  createProject,
  deleteProject,
  getIncompleteSectionNames,
  reactivateProject,
  startProject,
  updateProject,
} from '@/lib/firebase/project-repository';
import { ProjectYarns } from './project-yarns';
import { ProjectPhotos } from './project-photos';
import { WorkSections } from './work-sections';

const hookSizes = Array.from({ length: 13 }, (_, index) => `${1 + index * 0.5} mm`);

function localDateValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function completedDate(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day, 12);
}

function selectedHookSizes(value: string) {
  return value
    .split(',')
    .map((size) => size.trim())
    .filter(Boolean);
}

export function findPatternUrls(value: string) {
  return value.match(/https?:\/\/[^\s]+/gi) ?? [];
}

export function ProjectEditor({
  userId,
  project,
  initialStatus = 'planned',
}: {
  userId: string;
  project?: Project;
  initialStatus?: ProjectStatus;
}) {
  const router = useRouter();
  const [name, setName] = useState(project?.name ?? '');
  const [description, setDescription] = useState(project?.description ?? '');
  const [dateCompleted, setDateCompleted] = useState(() => localDateValue(new Date()));
  const [patternUrl, setPatternUrl] = useState(project?.patternUrl ?? '');
  const [patternDrafts, setPatternDrafts] = useState(() =>
    findPatternUrls(project?.patternUrl ?? '').length > 0
      ? findPatternUrls(project?.patternUrl ?? '')
      : [''],
  );
  const [editingPatternSources, setEditingPatternSources] = useState(!project);
  const [latestUpdate, setLatestUpdate] = useState(project?.latestUpdate ?? '');
  const [hookSize, setHookSize] = useState(project?.hookSize ?? '');
  const [editingMaterials, setEditingMaterials] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [confirmingComplete, setConfirmingComplete] = useState(false);
  const [incompleteSections, setIncompleteSections] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const status = project?.status ?? initialStatus;
  const patternUrls = findPatternUrls(patternUrl);

  function input(): EditableProject {
    return compactObject({
      name,
      status,
      description: description.trim(),
      patternUrl: patternUrl.trim(),
      materialsRequired: project?.materialsRequired,
      latestUpdate: latestUpdate.trim(),
      hookSize: hookSize.trim(),
      sourceCompletedProjectId: project?.sourceCompletedProjectId,
      completedAt:
        !project && status === 'completed' && dateCompleted
          ? completedDate(dateCompleted)
          : project?.completedAt,
    });
  }

  async function save(event: SyntheticEvent<HTMLFormElement, SubmitEvent>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const destination =
        status === 'planned' ? '/inspiration' : status === 'completed' ? '/made' : '/wips';
      if (project) {
        const write = updateProject(userId, project.id, input());
        if (!navigator.onLine) {
          void write.catch((caughtError) =>
            setError(
              caughtError instanceof Error
                ? caughtError.message
                : 'Hooked could not synchronize this project.',
            ),
          );
          router.push(destination);
          return;
        }
        await write;
      } else {
        await createProject(userId, input());
      }
      router.push(destination);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error ? caughtError.message : 'Hooked could not save this project.',
      );
    } finally {
      setBusy(false);
    }
  }

  async function begin() {
    if (!project) return;
    setBusy(true);
    setError('');
    try {
      await startProject(userId, project.id, input());
      router.push('/wips');
    } catch (caughtError) {
      setError(
        caughtError instanceof Error ? caughtError.message : 'Hooked could not start this project.',
      );
      setBusy(false);
    }
  }

  async function saveMaterials() {
    if (!project) return;
    setBusy(true);
    setError('');
    try {
      await updateProject(userId, project.id, input());
      setEditingMaterials(false);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : 'Hooked could not save these materials.',
      );
    } finally {
      setBusy(false);
    }
  }

  function toggleHookSize(size: string) {
    const selected = selectedHookSizes(hookSize);
    setHookSize(
      selected.includes(size)
        ? selected.filter((item) => item !== size).join(', ')
        : [...selected, size]
            .sort((left, right) => Number.parseFloat(left) - Number.parseFloat(right))
            .join(', '),
    );
  }

  function changePatternSource(index: number, value: string) {
    setPatternDrafts((current) => {
      const next = current.map((source, sourceIndex) => (sourceIndex === index ? value : source));
      if (!project) setPatternUrl(next.filter((source) => source.trim()).join('\n'));
      return next;
    });
  }

  function addPatternSource() {
    setPatternDrafts((current) => [...current, '']);
  }

  function removePatternSource(index: number) {
    setPatternDrafts((current) => {
      const next = current.filter((_, sourceIndex) => sourceIndex !== index);
      const remaining = next.length > 0 ? next : [''];
      if (!project) setPatternUrl(remaining.filter((source) => source.trim()).join('\n'));
      return remaining;
    });
  }

  function cancelPatternEditing() {
    setPatternDrafts(patternUrls.length > 0 ? patternUrls : ['']);
    setEditingPatternSources(false);
    setError('');
  }

  async function savePatternSources() {
    if (!project) return;
    const sources = patternDrafts.map((source) => source.trim()).filter(Boolean);
    if (sources.some((source) => !/^https?:\/\/\S+$/i.test(source))) {
      setError(
        'Each pattern source must be a complete web address beginning with http:// or https://.',
      );
      return;
    }
    const nextPatternUrl = sources.join('\n');
    setBusy(true);
    setError('');
    try {
      await updateProject(userId, project.id, { ...input(), patternUrl: nextPatternUrl });
      setPatternUrl(nextPatternUrl);
      setEditingPatternSources(false);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : 'Hooked could not save these pattern sources.',
      );
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!project) return;
    setDeleting(true);
    setError('');
    try {
      await deleteProject(userId, project.id);
      router.push(
        project.status === 'planned'
          ? '/inspiration'
          : project.status === 'completed'
            ? '/made'
            : '/wips',
      );
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : 'Hooked could not delete this project.',
      );
    } finally {
      setDeleting(false);
    }
  }

  async function prepareCompletion() {
    if (!project) return;
    setBusy(true);
    setError('');
    try {
      setIncompleteSections(await getIncompleteSectionNames(userId, project.id));
      setConfirmingComplete(true);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error ? caughtError.message : 'Hooked could not check this project.',
      );
    } finally {
      setBusy(false);
    }
  }

  async function finishProject() {
    if (!project) return;
    setBusy(true);
    setError('');
    try {
      await completeProject(userId, project.id);
      router.push('/made');
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : 'Hooked could not complete this project. You can safely retry.',
      );
      setBusy(false);
    }
  }

  async function reactivate() {
    if (!project) return;
    setBusy(true);
    setError('');
    try {
      const id = await reactivateProject(userId, project);
      router.push(`/projects/${id}`);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : 'Hooked could not reactivate this project.',
      );
      setBusy(false);
    }
  }

  return (
    <form className="project-form" onSubmit={save}>
      <label>
        Name
        <input required value={name} onChange={(event) => setName(event.target.value)} />
      </label>
      <label>
        Description
        <textarea value={description} onChange={(event) => setDescription(event.target.value)} />
      </label>
      {!project && status === 'completed' && (
        <label>
          Date completed
          <input
            type="date"
            required
            value={dateCompleted}
            max={localDateValue(new Date())}
            onChange={(event) => setDateCompleted(event.target.value)}
          />
        </label>
      )}
      <section
        className={`pattern-sources${editingPatternSources ? ' pattern-sources--editing' : ''}`}
        aria-label="Pattern sources"
      >
        <div className="pattern-sources__heading">
          <h2>Pattern sources</h2>
          {editingPatternSources && <span className="editing-badge">Editing</span>}
        </div>
        {editingPatternSources ? (
          <div className="pattern-source-fields">
            {patternDrafts.map((source, index) => (
              <div className="pattern-source-row" key={index}>
                <label>
                  Pattern {index + 1}
                  <input
                    type="url"
                    inputMode="url"
                    value={source}
                    onChange={(event) => changePatternSource(index, event.target.value)}
                    placeholder="https://"
                  />
                </label>
                {patternDrafts.length > 1 && (
                  <button
                    type="button"
                    className="text-delete-button"
                    onClick={() => removePatternSource(index)}
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              className="secondary-button add-pattern-button"
              onClick={addPatternSource}
            >
              Add pattern source
            </button>
            {project && (
              <div className="pattern-source-actions">
                <button
                  type="button"
                  className="primary-button"
                  onClick={savePatternSources}
                  disabled={busy}
                >
                  {busy ? 'Saving…' : 'Save pattern sources'}
                </button>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={cancelPatternEditing}
                  disabled={busy}
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="pattern-source-display">
            {patternUrls.length > 0 ? (
              <div className="pattern-links">
                {patternUrls.map((url, index) => (
                  <a key={`${url}-${index}`} href={url} target="_blank" rel="noreferrer">
                    Pattern {index + 1} ↗
                  </a>
                ))}
              </div>
            ) : (
              <p>No pattern sources added.</p>
            )}
            <button
              type="button"
              className="secondary-button"
              onClick={() => setEditingPatternSources(true)}
            >
              Edit pattern sources
            </button>
          </div>
        )}
      </section>
      {status === 'active' && (
        <label>
          Latest update
          <textarea
            value={latestUpdate}
            onChange={(event) => setLatestUpdate(event.target.value)}
          />
        </label>
      )}
      {status === 'active' && project && <WorkSections userId={userId} projectId={project.id} />}
      {status !== 'completed' && (
        <details
          className={`collapsible-panel${editingMaterials ? ' collapsible-panel--editing' : ''}`}
        >
          <summary>
            Materials {editingMaterials && <span className="editing-badge">Editing</span>}
          </summary>
          <div className="collapsible-panel__body">
            {editingMaterials ? (
              <fieldset className="hook-size-picker">
                <legend>Hook sizes</legend>
                {hookSizes.map((size) => (
                  <label key={size}>
                    <input
                      type="checkbox"
                      checked={selectedHookSizes(hookSize).includes(size)}
                      onChange={() => toggleHookSize(size)}
                    />
                    <span>{size}</span>
                  </label>
                ))}
              </fieldset>
            ) : (
              <div className="material-display">
                <span>Hooks</span>
                <strong>{hookSize || 'Not set'}</strong>
              </div>
            )}
            {project ? (
              <ProjectYarns userId={userId} projectId={project.id} editing={editingMaterials} />
            ) : (
              <p className="project-state">Save this project before adding yarn.</p>
            )}
            {project &&
              (editingMaterials ? (
                <button
                  type="button"
                  className="primary-button material-save-button"
                  onClick={saveMaterials}
                  disabled={busy}
                >
                  {busy ? 'Saving…' : 'Save materials'}
                </button>
              ) : (
                <button
                  type="button"
                  className="secondary-button material-save-button"
                  onClick={() => setEditingMaterials(true)}
                >
                  Edit materials
                </button>
              ))}
          </div>
        </details>
      )}
      {status === 'completed' && project && (
        <ProjectPhotos userId={userId} projectId={project.id} />
      )}
      <div className="project-form__actions">
        <button type="submit" className="primary-button" disabled={busy || deleting}>
          {busy ? 'Saving…' : 'Save'}
        </button>
        {project?.status === 'planned' && (
          <button
            type="button"
            className="secondary-button"
            onClick={begin}
            disabled={busy || deleting}
          >
            Start project
          </button>
        )}
        {project?.status === 'active' && (
          <button
            type="button"
            className="secondary-button"
            onClick={prepareCompletion}
            disabled={busy || deleting}
          >
            Complete project
          </button>
        )}
        {project?.status === 'completed' && (
          <button
            type="button"
            className="secondary-button"
            onClick={reactivate}
            disabled={busy || deleting}
          >
            Reactivate
          </button>
        )}
        {project && !confirmingDelete && (
          <button
            type="button"
            className="delete-button"
            onClick={() => setConfirmingDelete(true)}
            disabled={busy}
          >
            Delete {project.status === 'active' ? 'WIP' : 'project'}
          </button>
        )}
      </div>
      {project && confirmingComplete && (
        <section
          className="delete-confirmation completion-confirmation"
          aria-label="Confirm completion"
        >
          <p>
            Move “{project.name}” to Made? Working details, materials, sections, and counters will
            be permanently removed.
          </p>
          {incompleteSections.length > 0 && (
            <div>
              <strong>Incomplete sections</strong>
              <ul>
                {incompleteSections.map((section) => (
                  <li key={section}>{section}</li>
                ))}
              </ul>
            </div>
          )}
          <div>
            <button
              type="button"
              className="primary-button"
              onClick={finishProject}
              disabled={busy}
            >
              {busy
                ? 'Completing…'
                : incompleteSections.length > 0
                  ? 'Complete anyway'
                  : 'Complete project'}
            </button>
            <button
              type="button"
              className="secondary-button"
              onClick={() => setConfirmingComplete(false)}
              disabled={busy}
            >
              Cancel
            </button>
          </div>
        </section>
      )}
      {project && confirmingDelete && (
        <section className="delete-confirmation" aria-label="Confirm deletion">
          <p>Delete “{project.name}” permanently? This cannot be undone.</p>
          <div>
            <button
              type="button"
              className="delete-button"
              onClick={remove}
              disabled={deleting || busy}
            >
              {deleting
                ? 'Deleting…'
                : `Yes, delete ${project.status === 'active' ? 'WIP' : 'project'}`}
            </button>
            <button
              type="button"
              className="secondary-button"
              onClick={() => setConfirmingDelete(false)}
              disabled={deleting || busy}
            >
              Cancel
            </button>
          </div>
        </section>
      )}
      {error && (
        <p role="alert" className="project-form__error">
          {error}
        </p>
      )}
    </form>
  );
}
