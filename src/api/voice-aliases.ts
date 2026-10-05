import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';

import { DEFAULT_ALIAS_CAP, learnAlias, type AliasPair } from '@/lib/voice';
import { useUserId } from '@/providers/session-provider';

/**
 * What Skip has learned about how one person says their merchants ("spot a fly" meant Spotify).
 * Kept on this phone only, never sent anywhere.
 *
 * - Per user: the key carries the user id, and `signOut()` and `deleteAccount()` also clear it,
 *   because these are a person's own words.
 * - Ordered pairs, not an object: JS lists integer-like keys ("711", "24") first whatever order
 *   they were added in, which would break oldest-first eviction at the cap (200, kept by
 *   `learnAlias`).
 * - Never throws: storage that refuses, or holds something unreadable, reads as nothing learned. A
 *   correction that cannot be written is lost, and the person corrects it again next time.
 * - Not kept in memory once nobody is using it (`gcTime: 0`): the query cache outlives a sign-out,
 *   and cleared storage must not come back from it.
 */

const keyFor = (userId: string) => `skip.voice.aliases.${userId}`;
const queryKeyFor = (userId: string | null) => ['voice-aliases', userId] as const;

/** The stored pairs, oldest first. Anything unreadable is nothing. */
export async function readVoiceAliasPairs(userId: string): Promise<AliasPair[]> {
  try {
    const stored = await AsyncStorage.getItem(keyFor(userId));
    if (!stored) return [];
    const parsed: unknown = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [];
    const pairs = parsed.filter(
      (pair): pair is AliasPair =>
        Array.isArray(pair) &&
        pair.length === 2 &&
        typeof pair[0] === 'string' &&
        typeof pair[1] === 'string',
    );
    return pairs.slice(Math.max(0, pairs.length - DEFAULT_ALIAS_CAP));
  } catch {
    return [];
  }
}

/** Heard phrase → canonical name, for `parseVoice`'s `aliases`. */
function toMap(pairs: readonly AliasPair[]): Record<string, string> {
  return Object.fromEntries(pairs);
}

/** The learned corrections for the signed-in person. `ready` once there is an answer. */
export function useVoiceAliases(): { aliases: Record<string, string>; ready: boolean } {
  const userId = useUserId();
  const query = useQuery({
    queryKey: queryKeyFor(userId),
    enabled: Boolean(userId),
    staleTime: 0,
    gcTime: 0,
    retry: false,
    queryFn: () => readVoiceAliasPairs(userId!),
  });
  const aliases = useMemo(() => toMap(query.data ?? []), [query.data]);
  return { aliases, ready: !userId || !query.isPending };
}

/** One learn at a time, so two quick corrections cannot overwrite each other. */
let queue: Promise<void> = Promise.resolve();

/**
 * Teaches Skip that `heard` meant `canonical`. Call it after a successful save, only when the
 * person changed the merchant from what was heard. Best-effort: never rejects, and writes nothing
 * when there is nothing new to learn.
 */
export function useLearnVoiceAlias(): (heard: string, canonical: string) => Promise<void> {
  const userId = useUserId();
  const client = useQueryClient();

  return useCallback(
    (heard: string, canonical: string) => {
      if (!userId) return Promise.resolve();
      const learn = async () => {
        const pairs = await readVoiceAliasPairs(userId);
        const next = learnAlias(pairs, heard, canonical, DEFAULT_ALIAS_CAP);
        if (next === pairs) return;
        await AsyncStorage.setItem(keyFor(userId), JSON.stringify(next));
        client.setQueryData(queryKeyFor(userId), next);
      };
      queue = queue.then(learn).catch(() => {
        // Lost, not fatal: the same correction teaches it next time.
      });
      return queue;
    },
    [client, userId],
  );
}

/**
 * Forgets everything learned for `userId` on this phone. For sign-out and
 * account deletion: never throws, so it can never hold either up.
 */
export async function forgetVoiceAliases(userId: string | null | undefined): Promise<void> {
  if (!userId) return;
  try {
    await AsyncStorage.removeItem(keyFor(userId));
  } catch (error) {
    console.warn('Could not clear learned voice corrections', error);
  }
}
