'use client';

import { BadgeCheck, BookOpenText, PackageOpen, Sparkles } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { AuthGate } from '@/components/auth/auth-gate';
import { useInventory } from '@/components/inventory/stash';
import { useProjects } from '@/components/projects/use-projects';
import { signOutCurrentUser } from '@/lib/firebase/client';
import { useOnlineStatus } from '@/components/pwa/pwa-status';
import { useSyncState } from '@/lib/firebase/sync-state';
import { useState } from 'react';

const spaces = [
  { title: 'On the Hook', status: 'active', href: '/wips', icon: BookOpenText, tone: 'sage' },
  { title: 'Someday', status: 'planned', href: '/inspiration', icon: Sparkles, tone: 'ochre' },
  { title: 'Made', status: 'completed', href: '/made', icon: BadgeCheck, tone: 'rose' },
] as const;

export function HomeCollection({ userId }: { userId: string }) {
  const online = useOnlineStatus();
  const sync = useSyncState();
  const [confirmingSignOut, setConfirmingSignOut] = useState(false);
  const active = useProjects(userId, 'active');
  const planned = useProjects(userId, 'planned');
  const completed = useProjects(userId, 'completed');
  const inventory = useInventory(userId);
  const counts = {
    active: active.projects.length,
    planned: planned.projects.length,
    completed: completed.projects.length,
  };

  return (
    <main className="home-page">
      <header className="app-header">
        <div className="app-brand">
          <Image
            src="/hooked-icon-left-sketch.png"
            alt=""
            width={48}
            height={48}
            priority
            className="app-logo"
          />
          <h1 className="app-name">Hooked</h1>
        </div>
        <button
          className="sign-out-button"
          type="button"
          onClick={() => {
            if (!online || sync.pending) setConfirmingSignOut(true);
            else void signOutCurrentUser();
          }}
        >
          Sign out
        </button>
      </header>

      {confirmingSignOut && (
        <section className="sign-out-warning" aria-label="Confirm sign out">
          <strong>Changes may still be waiting to sync.</strong>
          <span>
            Stay signed in until Hooked reconnects to avoid losing changes stored only on this
            device.
          </span>
          <div>
            <button
              type="button"
              className="delete-button"
              onClick={() => void signOutCurrentUser()}
            >
              Sign out anyway
            </button>
            <button
              type="button"
              className="secondary-button"
              onClick={() => setConfirmingSignOut(false)}
            >
              Stay signed in
            </button>
          </div>
        </section>
      )}

      <section aria-label="Crochet collection" className="collection-grid">
        {spaces.map(({ title, status, href, icon: Icon, tone }) => (
          <Link key={title} href={href} className={`collection-card collection-card--${tone}`}>
            <span className="collection-card__icon">
              <Icon width={20} height={20} strokeWidth={1.7} aria-hidden="true" />
            </span>
            <div>
              <h2 className="collection-card__title">{title}</h2>
              <p className="collection-card__count">
                {counts[status]} {counts[status] === 1 ? 'project' : 'projects'}
              </p>
            </div>
          </Link>
        ))}
        <Link href="/stash" className="collection-card collection-card--ink">
          <span className="collection-card__icon">
            <PackageOpen width={20} height={20} strokeWidth={1.7} aria-hidden="true" />
          </span>
          <div>
            <h2 className="collection-card__title">Stash</h2>
            <p className="collection-card__count">
              {inventory.items.length} {inventory.items.length === 1 ? 'yarn' : 'yarns'}
            </p>
          </div>
        </Link>
      </section>
    </main>
  );
}

export default function Home() {
  return <AuthGate>{(user) => <HomeCollection userId={user.uid} />}</AuthGate>;
}
