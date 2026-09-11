import { useSyncExternalStore } from 'react';

type SourceState = { pending: boolean; cached: boolean };
const sources = new Map<string, SourceState>();
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

export function reportSyncSource(source: string, state: SourceState) {
  const previous = sources.get(source);
  if (previous?.pending === state.pending && previous.cached === state.cached) return;
  sources.set(source, state);
  emit();
}

export function clearSyncSource(source: string) {
  if (sources.delete(source)) emit();
}

export function getSyncState() {
  return {
    pending: [...sources.values()].some((state) => state.pending),
    cached: [...sources.values()].some((state) => state.cached),
  };
}

let snapshot = getSyncState();
function stableSnapshot() {
  const next = getSyncState();
  if (next.pending !== snapshot.pending || next.cached !== snapshot.cached) snapshot = next;
  return snapshot;
}

export function useSyncState() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    stableSnapshot,
    stableSnapshot,
  );
}
