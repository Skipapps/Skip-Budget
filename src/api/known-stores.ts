import { useCallback, useEffect, useState } from 'react';

import { teachLogo } from '@/api/logos';
import { useUserId } from '@/providers/session-provider';

/**
 * The stores this person added themselves and settled the logo for, so the second time they type
 * one it is offered with its logo instead of being asked about again. Kept on this phone only, the
 * way learned voice corrections are, and cleared with them on sign-out and account deletion.
 *
 * - Newest first, one entry per name (the latest answer wins), capped.
 * - Never throws: storage that refuses, or holds something unreadable, reads as nothing remembered.
 * - Storage is loaded on use, not at import, so a build or test without the native module is simply
 *   a build that remembers nothing.
 */

export type KnownStore = {
  name: string;
  categoryId: string;
  /** The logo chosen for it, or null with `logoHidden` when the answer was letters. */
  logoDomain: string | null;
  logoHidden: boolean;
};

const CAP = 100;

const keyFor = (userId: string) => `skip.stores.${userId}`;

/** The one spelling two typings of a name share: "  Vercel " and "vercel" are the same store. */
export function storeKey(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

type Area = typeof import('@react-native-async-storage/async-storage').default;

function storage(): Area | null {
  try {
    // Required here rather than imported at the top: without the native module the import itself
    // throws, which would take down every screen that merely lists stores.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return (require('@react-native-async-storage/async-storage') as { default: Area }).default;
  } catch {
    return null;
  }
}

function readStore(value: unknown): KnownStore | null {
  if (typeof value !== 'object' || value === null) return null;
  const { name, categoryId, logoDomain, logoHidden } = value as Record<string, unknown>;
  if (typeof name !== 'string' || !name.trim() || typeof categoryId !== 'string') return null;
  if (logoDomain !== null && typeof logoDomain !== 'string') return null;
  if (typeof logoHidden !== 'boolean') return null;
  // An entry with no logo answer still lists the store first.
  return { name, categoryId, logoDomain: logoDomain || null, logoHidden };
}

/** Everything remembered for `userId`, newest first. Anything unreadable is nothing. */
export async function readKnownStores(userId: string): Promise<KnownStore[]> {
  try {
    const stored = await storage()?.getItem(keyFor(userId));
    if (!stored) return [];
    const parsed: unknown = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [];
    const seen = new Set<string>();
    return parsed
      .map(readStore)
      .filter((store): store is KnownStore => {
        // One entry per name: a list edited by hand must not give two rows the same key.
        if (!store || seen.has(storeKey(store.name))) return false;
        seen.add(storeKey(store.name));
        return true;
      })
      .slice(0, CAP);
  } catch {
    return [];
  }
}

/**
 * `stores` with `next` first, replacing any earlier entry for the same name. An entry without a logo
 * answer keeps the answer given before, so adding a store again never loses its logo.
 */
export function rememberIn(stores: readonly KnownStore[], next: KnownStore): KnownStore[] {
  const key = storeKey(next.name);
  const earlier = stores.find((store) => storeKey(store.name) === key);
  const answered = next.logoDomain !== null || next.logoHidden;
  const kept =
    !answered && earlier
      ? { ...next, logoDomain: earlier.logoDomain, logoHidden: earlier.logoHidden }
      : next;
  return [kept, ...stores.filter((store) => storeKey(store.name) !== key)].slice(0, CAP);
}

/** Remembered stores that a typed name could be, best first: starts with it, then contains it. */
export function matchKnownStores(
  stores: readonly KnownStore[],
  typed: string,
  limit = 3,
): KnownStore[] {
  const needle = storeKey(typed);
  if (needle.length < 2) return [];
  const starts: KnownStore[] = [];
  const contains: KnownStore[] = [];
  for (const store of stores) {
    const key = storeKey(store.name);
    if (key.startsWith(needle)) starts.push(store);
    else if (key.includes(needle)) contains.push(store);
  }
  return [...starts, ...contains].slice(0, limit);
}

/** The stores remembered for the signed-in person; empty until they are read. */
export function useKnownStores(): KnownStore[] {
  const userId = useUserId();
  const [stores, setStores] = useState<KnownStore[]>([]);

  useEffect(() => {
    if (!userId) return;
    let live = true;
    void readKnownStores(userId).then((read) => {
      // Nothing read changes nothing on screen, so there is nothing to render.
      if (live && read.length > 0) setStores(read);
    });
    return () => {
      live = false;
    };
  }, [userId]);

  return userId ? stores : [];
}

/** One write at a time, so two quick answers cannot overwrite each other. */
let queue: Promise<void> = Promise.resolve();

/**
 * Remembers a store and its logo answer. With `teach`, a website the person chose for it is also
 * sent to the logo service, so the next person who adds the same store is offered it (and three
 * people agreeing makes it certain for everyone). Best-effort: never rejects.
 */
export function useRememberStore(): (
  store: KnownStore,
  options?: { teach?: boolean },
) => Promise<void> {
  const userId = useUserId();

  return useCallback(
    (store: KnownStore, options?: { teach?: boolean }) => {
      if (!userId || !readStore(store)) return Promise.resolve();
      if (options?.teach && store.logoDomain && !store.logoHidden) {
        void teachLogo({ query: store.name, domain: store.logoDomain, userId });
      }
      const write = async () => {
        const area = storage();
        if (!area) return;
        const next = rememberIn(await readKnownStores(userId), store);
        await area.setItem(keyFor(userId), JSON.stringify(next));
      };
      queue = queue.then(write).catch(() => {
        // Lost, not fatal: the same answer is remembered next time it is given.
      });
      return queue;
    },
    [userId],
  );
}

/** Forgets everything remembered for `userId` on this phone. Never throws. */
export async function forgetKnownStores(userId: string | null | undefined): Promise<void> {
  if (!userId) return;
  try {
    await storage()?.removeItem(keyFor(userId));
  } catch (error) {
    console.warn('Could not clear remembered stores', error);
  }
}
