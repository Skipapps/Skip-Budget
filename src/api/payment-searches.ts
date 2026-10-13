import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { storeKey } from '@/api/known-stores';
import { useUserId } from '@/providers/session-provider';

/**
 * Recent payment searches, kept on this phone only, per person, the way remembered stores are:
 * newest first, one entry per spelling (case and spaces aside), capped, cleared on sign-out.
 *
 * - Never throws: storage that refuses, or holds something unreadable, reads as no recent searches.
 * - Storage is loaded on use, not at import, so a build or test without the native module simply
 *   remembers nothing.
 */

export const RECENT_CAP = 10;
export const RECENT_SHOWN = 5;

const keyFor = (userId: string) => `skip.paymentSearches.${userId}`;

/** `list` with `query` first, trimmed, in place of any earlier spelling; blank changes nothing. */
export function rememberQuery(list: readonly string[], query: string): string[] {
  const trimmed = query.trim();
  if (!trimmed) return [...list];
  const key = storeKey(trimmed);
  return [trimmed, ...list.filter((kept) => storeKey(kept) !== key)].slice(0, RECENT_CAP);
}

/** `list` without `query`, in any spelling of it. */
export function forgetQuery(list: readonly string[], query: string): string[] {
  const key = storeKey(query);
  return list.filter((kept) => storeKey(kept) !== key);
}

type Area = typeof import('@react-native-async-storage/async-storage').default;

function storage(): Area | null {
  try {
    // Required here rather than imported at the top: without the native module the import itself
    // throws, which would take down the search page.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return (require('@react-native-async-storage/async-storage') as { default: Area }).default;
  } catch {
    return null;
  }
}

/** The recent searches kept for `userId`, newest first. Anything unreadable is none. */
export async function readRecentSearches(userId: string): Promise<string[]> {
  try {
    const stored = await storage()?.getItem(keyFor(userId));
    if (!stored) return [];
    const parsed: unknown = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [];
    const seen = new Set<string>();
    const list: string[] = [];
    for (const item of parsed) {
      if (typeof item !== 'string' || !item.trim()) continue;
      // A list edited by hand must not show one search twice.
      const key = storeKey(item);
      if (seen.has(key)) continue;
      seen.add(key);
      list.push(item.trim());
    }
    return list.slice(0, RECENT_CAP);
  } catch {
    return [];
  }
}

/** One storage call at a time, so two quick changes land in the order they were made. */
let queue: Promise<void> = Promise.resolve();

function persist(userId: string, list: readonly string[]): void {
  queue = queue
    .then(async () => {
      await storage()?.setItem(keyFor(userId), JSON.stringify(list));
    })
    .catch(() => {
      // Not kept, not fatal: this visit still shows it.
    });
}

type Change = (list: readonly string[]) => string[];

type Held = {
  owner: string;
  list: string[];
  loaded: boolean;
  /** Changes made before storage answered, applied on top of what it held. */
  pending: Change[];
};

/**
 * The signed-in person's recent searches, the newest `RECENT_SHOWN`. Saving and removing show at
 * once and are written in the background; neither ever throws.
 */
export function useRecentSearches(): {
  recent: string[];
  remember: (query: string) => void;
  forget: (query: string) => void;
} {
  const userId = useUserId();
  const [shown, setShown] = useState<{ owner: string | null; list: string[] }>({
    owner: null,
    list: [],
  });
  const held = useRef<Held | null>(null);

  useEffect(() => {
    if (!userId) return;
    const mine: Held = { owner: userId, list: [], loaded: false, pending: [] };
    held.current = mine;
    let live = true;
    void readRecentSearches(userId).then((stored) => {
      if (!live) return;
      const list = mine.pending.reduce<string[]>((acc, change) => change(acc), stored);
      const changed = mine.pending.length > 0;
      mine.list = list;
      mine.loaded = true;
      mine.pending = [];
      setShown({ owner: userId, list });
      if (changed) persist(userId, list);
    });
    return () => {
      live = false;
    };
  }, [userId]);

  const apply = useCallback(
    (change: Change) => {
      const mine = held.current;
      if (!userId || !mine || mine.owner !== userId) return;
      const list = change(mine.list);
      mine.list = list;
      setShown({ owner: userId, list });
      if (mine.loaded) persist(userId, list);
      else mine.pending.push(change);
    },
    [userId],
  );

  const remember = useCallback(
    (query: string) => {
      if (query.trim()) apply((list) => rememberQuery(list, query));
    },
    [apply],
  );

  const forget = useCallback((query: string) => apply((list) => forgetQuery(list, query)), [apply]);

  const recent = useMemo(
    () => (userId && shown.owner === userId ? shown.list.slice(0, RECENT_SHOWN) : []),
    [userId, shown],
  );

  return { recent, remember, forget };
}

/**
 * Forgets every recent search kept for `userId` on this phone, after any write still on its way.
 * Never throws.
 */
export async function forgetRecentSearches(userId: string | null | undefined): Promise<void> {
  if (!userId) return;
  queue = queue.then(async () => {
    try {
      await storage()?.removeItem(keyFor(userId));
    } catch (error) {
      console.warn('Could not clear recent searches', error);
    }
  });
  await queue;
}
