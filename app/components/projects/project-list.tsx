'use client';

import Link from 'next/link';
import { useEffect, useMemo, useId, useState, type KeyboardEvent } from 'react';
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
import type { Project, ProjectStatus } from '@/lib/domain/project';
import { observeWorkSections } from '@/lib/firebase/project-parts-repository';
import { reorderProjects } from '@/lib/firebase/project-repository';
import { useProjects } from './use-projects';
import { SortableProjectCards } from './sortable-project-cards';

const stitchPatterns = ['sc · dc · ch', 'dc · inc · dc', 'ch · hdc · sk', 'sc · ch · sk · sc'];

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

function stablePattern(projectId: string) {
  let hash = 0;
  for (let index = 0; index < projectId.length; index += 1) hash += projectId.charCodeAt(index);
  const index = hash % stitchPatterns.length;
  return stitchPatterns[index];
}

function firstHookSize(hookSizes?: string) {
  return hookSizes?.split(',')[0]?.trim() || 'Hook not set';
}

function handleProjectKey(event: KeyboardEvent<HTMLAnchorElement>, move: (change: -1 | 1) => void) {
  if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
    event.preventDefault();
    move(event.key === 'ArrowUp' ? -1 : 1);
  }
}
function ActiveProjectCard({
  userId,
  project,
  instructionsId,
  onMove,
}: {
  userId: string;
  project: Project;
  instructionsId: string;
  onMove: (change: -1 | 1) => void;
}) {
  const [sectionCount, setSectionCount] = useState(0);

  useEffect(
    () =>
      observeWorkSections(
        userId,
        project.id,
        (sections) =>
          setSectionCount(sections.filter((section) => section.parentSectionId === null).length),
        () => setSectionCount(0),
      ),
    [project.id, userId],
  );

  return (
    <Link
      href={`/projects/${project.id}`}
      className="project-list-card"
      aria-describedby={instructionsId}
      onKeyDown={(event) => handleProjectKey(event, onMove)}
    >
      <span className="project-card-pattern" aria-hidden="true">
        {stablePattern(project.id)}
      </span>
      <h2>{project.name}</h2>
      <span className="project-card-meta">
        {firstHookSize(project.hookSize)} · {sectionCount}{' '}
        {sectionCount === 1 ? 'section' : 'sections'}
      </span>
    </Link>
  );
}

function PlannedProjectCard({
  project,
  instructionsId,
  onMove,
}: {
  project: Project;
  instructionsId: string;
  onMove: (change: -1 | 1) => void;
}) {
  return (
    <Link
      href={`/projects/${project.id}`}
      className="project-list-card"
      aria-describedby={instructionsId}
      onKeyDown={(event) => handleProjectKey(event, onMove)}
    >
      <span className="planned-card-stitches" aria-hidden="true">
        × × × × × × × ×
      </span>
      <h2>{project.name}</h2>
      <p className={!project.description ? 'planned-card-description--empty' : undefined}>
        {project.description || 'No description added'}
      </p>
    </Link>
  );
}

function CompletedProjectCard({ project }: { project: Project }) {
  const doodle = projectDoodle(project);
  const Doodle = doodle.icon;
  return (
    <Link href={`/projects/${project.id}`} className="project-list-card completed-project-card">
      <span className="completed-project-card__doodle" aria-hidden="true">
        <Doodle strokeWidth={1.35} />
      </span>
      <div className="completed-project-card__label">
        <h2>{project.name}</h2>
        {project.completedAt && <span>Completed {project.completedAt.toLocaleDateString()}</span>}
      </div>
    </Link>
  );
}

export function ProjectList({ userId, status }: { userId: string; status: ProjectStatus }) {
  const { projects, loading, pending, cached, error } = useProjects(userId, status);
  const [orderIds, setOrderIds] = useState<string[]>([]);
  const [reorderError, setReorderError] = useState('');
  const instructionsId = useId();

  const orderedProjects = useMemo(() => {
    if (orderIds.length === 0) return projects;
    const byId = new Map(projects.map((project) => [project.id, project]));
    return [
      ...orderIds.flatMap((id) => {
        const project = byId.get(id);
        if (!project) return [];
        byId.delete(id);
        return [project];
      }),
      ...byId.values(),
    ];
  }, [orderIds, projects]);
  const reorderable = status === 'active' || status === 'planned';

  async function saveOrder(next: string[]) {
    setOrderIds(next);
    setReorderError('');
    try {
      await reorderProjects(userId, next);
    } catch (caughtError) {
      // Do not roll back a newer gesture if an earlier save fails.
      setOrderIds((current) => (current === next ? [] : current));
      setReorderError(
        caughtError instanceof Error ? caughtError.message : 'Hooked could not save this order.',
      );
    }
  }

  function moveWithKeyboard(projectId: string, change: -1 | 1) {
    const next = orderedProjects.map((project) => project.id);
    const currentIndex = next.indexOf(projectId);
    const nextIndex = currentIndex + change;
    if (currentIndex < 0 || nextIndex < 0 || nextIndex >= next.length) return;
    next.splice(nextIndex, 0, next.splice(currentIndex, 1)[0]);
    void saveOrder(next);
  }
  if (loading) return <output className="project-state">Opening the notebook…</output>;
  if (error)
    return (
      <p className="project-state project-state--error" role="alert">
        {error}
      </p>
    );
  if (projects.length === 0) return <p className="project-state">No projects here yet.</p>;

  return (
    <>
      {(pending || cached) && (
        <output className="sync-state">{pending ? 'Saving…' : 'Showing saved offline data'}</output>
      )}
      {reorderError && (
        <p className="project-state project-state--error" role="alert">
          {reorderError}
        </p>
      )}
      {reorderable && (
        <p className="project-reorder-hint" id={instructionsId}>
          Hold a project, then drag to reorder.
          <span className="visually-hidden">
            {' '}
            Or focus a project and use the up and down arrow keys.
          </span>
        </p>
      )}
      <SortableProjectCards status={status} onReorder={(next) => void saveOrder(next)}>
        {orderedProjects.map((project, index) => (
          <div className="project-list-item" data-project-id={project.id} key={project.id}>
            {' '}
            {status === 'active' ? (
              <ActiveProjectCard
                userId={userId}
                project={project}
                instructionsId={instructionsId}
                onMove={(change) => moveWithKeyboard(project.id, change)}
              />
            ) : status === 'planned' ? (
              <PlannedProjectCard
                project={project}
                instructionsId={instructionsId}
                onMove={(change) => moveWithKeyboard(project.id, change)}
              />
            ) : (
              <CompletedProjectCard project={project} />
            )}
            <span className="visually-hidden" aria-live="polite">
              Position {index + 1} of {orderedProjects.length}
            </span>
          </div>
        ))}
      </SortableProjectCards>
    </>
  );
}
