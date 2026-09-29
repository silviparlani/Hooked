'use client';
import Link from 'next/link';
import { useState } from 'react';
import {
  Baby,
  Cat,
  Fish,
  Flower2,
  Handbag,
  Heart,
  House,
  PawPrint,
  Ribbon,
  Shirt,
  Sprout,
  Turtle,
  type LucideIcon,
} from 'lucide-react';

import {
  compactObject,
  compareProjects,
  type Project,
  type ProjectStatus,
} from '@/lib/domain/project';
import { startProject, deleteProject } from '@/lib/firebase/project-repository';
import { Journal } from '@/components/journal/journal';
import { JournalPhotos } from './journal-photos';
import { MaterialsUsed } from './materials-used';
import { useProjects } from './use-projects';
const doodles: { words: string[]; icon: LucideIcon; name: string }[] = [
  { words: ['turtle', 'sea turtle'], icon: Turtle, name: 'turtle' },
  {
    words: ['octopus', 'squid', 'jellyfish', 'fish', 'whale'],
    icon: Fish,
    name: 'sea creature',
  },
  {
    words: ['skirt', 'dress', 'cardigan', 'sweater', 'jumper', 'top', 'shirt', 'vest'],
    icon: Shirt,
    name: 'clothing',
  },
  { words: ['bag', 'tote', 'purse', 'handbag', 'pouch'], icon: Handbag, name: 'bag' },
  {
    words: [
      'leg warmer',
      'headscarf',
      'head scarf',
      'belt',
      'scarf',
      'shawl',
      'cowl',
      'glove',
      'mitten',
      'sock',
      'stocking',
      'scrunchie',
      'headband',
      'bandana',
    ],
    icon: Ribbon,
    name: 'wearable accessory',
  },
  { words: ['baby', 'newborn', 'bootie', 'bonnet'], icon: Baby, name: 'baby item' },
  { words: ['cat', 'kitten', 'pet'], icon: Cat, name: 'animal' },
  {
    words: [
      'animal',
      'amigurumi',
      'dog',
      'puppy',
      'bunny',
      'rabbit',
      'bear',
      'fox',
      'frog',
      'bee',
      'duck',
      'bird',
      'dinosaur',
      'dragon',
      'cow',
      'pig',
      'elephant',
    ],
    icon: PawPrint,
    name: 'animal',
  },
  {
    words: ['plant', 'potted', 'succulent', 'cactus', 'leaf', 'leaves', 'vine', 'fern', 'tree'],
    icon: Sprout,
    name: 'plant',
  },
  { words: ['flower', 'floral', 'rose', 'daisy'], icon: Flower2, name: 'flower' },
  { words: ['blanket', 'throw', 'pillow', 'cushion', 'home'], icon: House, name: 'home item' },
  { words: ['heart', 'love', 'valentine'], icon: Heart, name: 'heart' },
];

export function projectDoodle(project: Pick<Project, 'name' | 'description'>) {
  const text = `${project.name} ${project.description ?? ''}`.toLocaleLowerCase();
  return (
    doodles.find((entry) => entry.words.some((word) => text.includes(word))) ?? {
      icon: Heart,
      name: 'crochet project',
    }
  );
}

export function ProjectList({ userId, status }: { userId: string; status: ProjectStatus }) {
  const { projects, loading, pending, cached, error } = useProjects(userId, status);
  const ordered = [...projects].sort(compareProjects);
  const title = status === 'planned' ? 'Someday' : status === 'active' ? 'On The Hook' : 'Made';
  if (loading) return <output className="project-state">Opening the notebook…</output>;
  if (error) return <p role="alert">{error}</p>;
  return (
    <>
      {(pending || cached) && (
        <output className="sync-state">{pending ? 'Saving…' : 'Showing saved offline data'}</output>
      )}
      <Journal
        title={title}
        indexTitle={status === 'active' ? 'Work Index' : 'Index'}
        indexAction={
          <Link
            className="primary-button"
            href={
              status === 'active'
                ? '/wips/new'
                : status === 'planned'
                  ? '/projects/new'
                  : '/made/new'
            }
          >
            {status === 'active' ? 'New WIP' : status === 'planned' ? 'New idea' : 'Add project'}
          </Link>
        }
        pages={ordered.map((project) => ({
          id: project.id,
          title: project.name,
          subtitle:
            status === 'completed'
              ? project.completedAt?.toLocaleDateString()
              : project.updatedAt.toLocaleDateString(),
        }))}
      >
        {(id) => (
          <ProjectJournalPage
            key={id}
            userId={userId}
            project={ordered.find((project) => project.id === id)!}
          />
        )}
      </Journal>
    </>
  );
}

function ProjectJournalPage({ userId, project }: { userId: string; project: Project }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  async function action(kind: 'start' | 'delete') {
    setBusy(true);
    setError('');
    try {
      if (kind === 'delete') await deleteProject(userId, project.id);
      else
        await startProject(
          userId,
          project.id,
          compactObject({
            name: project.name,
            status: 'active',
            description: project.description,
            patternUrl: project.patternUrl,
            materialsRequired: project.materialsRequired,
            hookSize: project.hookSize,
          }),
        );
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not update project.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <article className="journal-project">
      <p className="journal-eyebrow">
        {project.status === 'planned'
          ? 'An idea for another day'
          : project.status === 'active'
            ? 'Stitch by stitch'
            : 'Made by hand'}
      </p>
      <h2 className="journal-title">{project.name}</h2>
      {project.description && <p className="journal-description">{project.description}</p>}
      {project.status === 'completed' && project.completedAt && (
        <p className="journal-date">Completed {project.completedAt.toLocaleDateString()}</p>
      )}
      {project.status === 'active' ? (
        <>
          <div className="journal-update">
            <h3>Latest update</h3>
            <p>{project.latestUpdate || 'No update written yet.'}</p>
            {project.latestUpdateAt && (
              <time dateTime={project.latestUpdateAt.toISOString()}>
                {project.latestUpdateAt.toLocaleDateString()}
              </time>
            )}
          </div>
          <Link className="primary-button" href={`/projects/${project.id}`}>
            Open work sections ↗
          </Link>
        </>
      ) : (
        <>
          {project.status === 'planned' && (
            <div className="journal-patterns">
              {(project.patternUrl?.match(/https?:\/\/[^\s]+/gi) ?? []).map((url, index) => (
                <a key={index} href={url} target="_blank" rel="noreferrer">
                  {url}
                </a>
              ))}
            </div>
          )}
          <JournalPhotos
            userId={userId}
            projectId={project.id}
            reference={project.status === 'planned'}
          />
          {project.status === 'completed' && (
            <MaterialsUsed userId={userId} projectId={project.id} />
          )}
          <div className="journal-actions">
            <Link className="secondary-button" href={`/projects/${project.id}`}>
              Edit {project.status === 'planned' ? 'idea / photo' : 'project / photos'}
            </Link>
            {project.status === 'planned' && (
              <button
                className="primary-button"
                type="button"
                disabled={busy || project.deleting}
                title="Starting this project permanently removes its reference image"
                onClick={() => action('start')}
              >
                Start project
              </button>
            )}
          </div>
        </>
      )}
      <button
        className="text-delete-button"
        type="button"
        disabled={busy}
        onClick={() => setConfirmDelete(true)}
      >
        {project.deleting ? 'Resume deletion' : 'Delete project'}
      </button>
      {confirmDelete && (
        <div className="delete-confirmation">
          <p>
            Delete “{project.name}”? Consumed yarn will return to your stash. Historical entries
            leave stock unchanged.
          </p>
          <button type="button" disabled={busy} onClick={() => action('delete')}>
            {busy ? 'Deleting…' : 'Confirm deletion'}
          </button>
          <button type="button" disabled={busy} onClick={() => setConfirmDelete(false)}>
            Cancel
          </button>
        </div>
      )}
      {error && <p role="alert">{error}</p>}
    </article>
  );
}
