import Link from 'next/link';
import type { ReactNode } from 'react';

export function NotebookPage({
  title,
  action,
  backHref = '/',
  separateSections = false,
  children,
}: {
  title: string;
  action?: ReactNode;
  backHref?: string;
  separateSections?: boolean;
  children: ReactNode;
}) {
  return (
    <main className="notebook-page">
      <header className="notebook-header">
        <Link href={backHref} className="back-link">
          ← Back
        </Link>
        <div className="notebook-heading">
          <h1>{title}</h1>
          {action}
        </div>
      </header>
      <section className={separateSections ? 'notebook-sections' : 'notebook-sheet'}>
        {children}
      </section>
    </main>
  );
}
