'use client';

import { useEffect, useState } from 'react';
import { useSyncState } from '@/lib/firebase/sync-state';

export function useOnlineStatus() {
  const [online, setOnline] = useState(true);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);
  return online;
}

export function PwaStatus() {
  const online = useOnlineStatus();
  const sync = useSyncState();
  const [updateReady, setUpdateReady] = useState(false);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    let registration: ServiceWorkerRegistration | undefined;
    void navigator.serviceWorker.register('/sw.js').then((nextRegistration) => {
      registration = nextRegistration;
      if (nextRegistration.waiting) setUpdateReady(true);
      nextRegistration.addEventListener('updatefound', () => {
        const worker = nextRegistration.installing;
        worker?.addEventListener('statechange', () => {
          if (worker.state === 'installed' && navigator.serviceWorker.controller)
            setUpdateReady(true);
        });
      });
    });
    return () => void registration;
  }, []);

  return (
    <>
      {!online && (
        <output className="pwa-status pwa-status--offline">
          Offline · changes will sync later
        </output>
      )}
      {online && sync.pending && <output className="pwa-status">Synchronizing changes…</output>}
      {online && !sync.pending && sync.cached && (
        <output className="pwa-status">Waiting to reconnect to cloud data…</output>
      )}
      {updateReady && (
        <output className="pwa-status">Update ready · reopen Hooked when convenient</output>
      )}
    </>
  );
}
