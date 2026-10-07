import { useSyncExternalStore } from 'react';

/**
 * The app's one answer to "does this account pay", published by the purchases bridge at the root
 * and read everywhere else. Reading it is a subscription to a plain store, so a list can ask once
 * per row (a logo) without every row opening its own RevenueCat listener and server request, and
 * it needs no provider, so any component can read it.
 */
export type ProStatus = {
  pro: boolean;
  /** Safe to show a gate: someone who paid is never flashed a paywall while this is false. */
  ready: boolean;
};

const UNKNOWN: ProStatus = { pro: false, ready: false };

let current: ProStatus = UNKNOWN;
const listeners = new Set<() => void>();

/** Replaces the answer. The same answer again is a no-op, so readers only re-render on a change. */
export function publishProStatus(next: ProStatus): void {
  if (next.pro === current.pro && next.ready === current.ready) return;
  current = { pro: next.pro, ready: next.ready };
  for (const listener of listeners) listener();
}

export function proStatus(): ProStatus {
  return current;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useProStatus(): ProStatus {
  return useSyncExternalStore(subscribe, proStatus, proStatus);
}

export function resetProStatusForTests(): void {
  current = UNKNOWN;
  listeners.clear();
}
