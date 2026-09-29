'use client';
import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';

type Page = { id: string; title: string; subtitle?: string; colour?: string };

/** Shared spiral-bound journal with measured index pagination and swipe navigation. */
export function Journal({
  title,
  indexTitle = 'Index',
  indexAction,
  pages,
  children,
}: {
  title: string;
  indexTitle?: string;
  indexAction?: ReactNode;
  pages: Page[];
  children: (id: string) => ReactNode;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const [indexPage, setIndexPage] = useState(0);
  const [capacity, setCapacity] = useState(3);
  const paper = useRef<HTMLElement>(null);
  const indexArea = useRef<HTMLOListElement>(null);
  const gesture = useRef<{ x: number; y: number; pointer: number } | null>(null);
  const suppressClick = useRef(false);
  const current = pages.findIndex((item) => item.id === selected);
  const isIndex = current < 0;
  const indexCount = Math.max(1, Math.ceil(pages.length / capacity));
  const visibleIndex = Math.min(indexPage, indexCount - 1);
  const position = isIndex ? visibleIndex : indexCount + current;
  useLayoutEffect(() => {
    const area = indexArea.current;
    if (!area) return;
    const measure = () => setCapacity(Math.max(1, Math.floor(area.clientHeight / 76)));
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(measure);
    observer.observe(area);
    return () => observer.disconnect();
  }, [isIndex, visibleIndex]);
  function turn(next: number) {
    if (next < 0 || next >= indexCount + pages.length) return;
    if (next < indexCount) {
      setSelected(null);
      setIndexPage(next);
    } else setSelected(pages[next - indexCount].id);
    requestAnimationFrame(() => {
      paper.current?.scrollTo?.(0, 0);
      paper.current?.focus();
    });
  }
  const pageKey = isIndex ? 'index-' + visibleIndex : selected!;
  return (
    <section className="journal book-journal" aria-label={title + ' journal'}>
      <div key={'rings-' + pageKey} className="book-spiral" aria-hidden="true">
        {Array.from({ length: 9 }, (_, i) => (
          <span key={i} />
        ))}
      </div>
      {/* Gesture and arrow keys enhance the region; its links and buttons remain semantic. */}
      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions */}
      <section
        key={pageKey}
        ref={paper}
        tabIndex={-1}
        aria-label={isIndex ? indexTitle + ' page ' + (visibleIndex + 1) : pages[current].title}
        aria-keyshortcuts="ArrowLeft ArrowRight"
        className={'journal-paper book-paper' + (isIndex ? ' book-paper--index' : '')}
        style={{ '--paper-colour': !isIndex ? pages[current].colour : undefined } as CSSProperties}
        onKeyDown={(event) => {
          if (
            (event.target as HTMLElement).closest('input, textarea, select, [data-no-page-swipe]')
          )
            return;
          if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
            event.preventDefault();
            turn(position + (event.key === 'ArrowRight' ? 1 : -1));
          }
        }}
        onPointerDown={(event) => {
          if (!event.isPrimary || event.button !== 0) return;
          if (
            (event.target as HTMLElement).closest('input, textarea, select, [data-no-page-swipe]')
          )
            return;
          suppressClick.current = false;
          gesture.current = { x: event.clientX, y: event.clientY, pointer: event.pointerId };
        }}
        onPointerMove={(event) => {
          const start = gesture.current;
          if (!start || start.pointer !== event.pointerId) return;
          if (
            Math.abs(event.clientX - start.x) > 30 &&
            Math.abs(event.clientX - start.x) > Math.abs(event.clientY - start.y) * 2
          ) {
            event.currentTarget.setPointerCapture(event.pointerId);
          }
        }}
        onPointerCancel={() => {
          gesture.current = null;
        }}
        onPointerUp={(event) => {
          const start = gesture.current;
          gesture.current = null;
          if (!start || start.pointer !== event.pointerId) return;
          const dx = event.clientX - start.x,
            dy = event.clientY - start.y;
          if (Math.abs(dx) > 65 && Math.abs(dx) > Math.abs(dy) * 2) {
            suppressClick.current = true;
            turn(position + (dx < 0 ? 1 : -1));
          }
        }}
        onClickCapture={(event) => {
          if (suppressClick.current) {
            event.preventDefault();
            event.stopPropagation();
            suppressClick.current = false;
          }
        }}
      >
        {isIndex ? (
          <>
            <header className="book-index-heading">
              <h2 className="journal-title">{indexTitle}</h2>
              {indexAction}
              <p className="journal-intro">Choose a page to open.</p>
            </header>
            <ol
              ref={indexArea}
              className="journal-index book-index"
              start={visibleIndex * capacity + 1}
            >
              {pages
                .slice(visibleIndex * capacity, (visibleIndex + 1) * capacity)
                .map((item, i) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => turn(indexCount + visibleIndex * capacity + i)}
                    >
                      <span>
                        <strong>{item.title}</strong>
                        {item.subtitle && <small>{item.subtitle}</small>}
                      </span>
                      <span className="journal-index__number">
                        {String(visibleIndex * capacity + i + 1).padStart(2, '0')}
                      </span>
                    </button>
                  </li>
                ))}
              {pages.length === 0 && <li className="book-empty">Your next page starts here.</li>}
            </ol>
          </>
        ) : (
          children(pages[current].id)
        )}
      </section>
      <nav className="book-navigation" aria-label="Journal pages">
        {!isIndex && (
          <button type="button" onClick={() => turn(0)}>
            Index
          </button>
        )}
        <span className="book-swipe-hint">Swipe to turn · ← → keys</span>
        <output aria-live="polite">
          {isIndex
            ? 'Index ' + (visibleIndex + 1) + ' / ' + indexCount
            : current + 1 + ' / ' + pages.length}
        </output>
      </nav>
    </section>
  );
}
