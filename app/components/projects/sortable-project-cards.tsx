'use client';

import { useEffect, useEffectEvent, useRef, type ReactNode } from 'react';
import Sortable from 'sortablejs';
import type { ProjectStatus } from '@/lib/domain/project';

export function SortableProjectCards({
  status,
  onReorder,
  children,
}: {
  status: ProjectStatus;
  onReorder: (ids: string[]) => void;
  children: ReactNode;
}) {
  const list = useRef<HTMLDivElement>(null);
  const save = useEffectEvent(onReorder);

  useEffect(() => {
    if (!list.current || status === 'completed') return;
    let originalOrder: string[] = [];
    const sortable = Sortable.create(list.current, {
      draggable: '.project-list-item',
      dataIdAttr: 'data-project-id',
      animation: 160,
      forceFallback: true,
      delay: 250,
      delayOnTouchOnly: true,
      touchStartThreshold: 5,
      fallbackTolerance: 5,
      ghostClass: 'project-list-item--placeholder',
      chosenClass: 'project-list-item--chosen',
      fallbackClass: 'project-list-item--floating',
      scrollSensitivity: 70,
      scrollSpeed: 12,
      onChoose() {
        originalOrder = sortable.toArray();
      },
      onEnd(event: Sortable.SortableEvent & { originalEvent?: Event }) {
        const next = sortable.toArray();
        // Restore the DOM before React commits the new keyed order.
        sortable.sort(originalOrder);
        if (
          event.originalEvent?.type !== 'touchcancel' &&
          event.originalEvent?.type !== 'pointercancel' &&
          next.some((id, index) => id !== originalOrder[index])
        ) {
          save(next);
        }
      },
    });
    return () => sortable.destroy();
  }, [status]);

  return (
    <div ref={list} className={'project-list project-list--' + status}>
      {children}
    </div>
  );
}
