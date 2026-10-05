import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import { useAnnouncements } from '@/api/queries';
import { useUserId } from '@/providers/session-provider';

/**
 * Whether there is news from Skip nobody has looked at yet (the dot on the Home bell). "Seen" is
 * the publish date of the newest item on screen when Notifications was last opened, not the clock,
 * so a wrong phone time can neither hide news nor keep the dot lit. Kept on the device, not the
 * profile: a dot shown again on a second phone costs one tap.
 */

const keyFor = (userId: string) => `skip.news.seenThrough.${userId}`;

function useSeenThrough() {
  const userId = useUserId();
  return useQuery({
    queryKey: ['news-seen', userId],
    enabled: Boolean(userId),
    staleTime: Infinity,
    queryFn: async () => {
      // Storage can refuse; that reads as "never opened", at worst a dot one visit clears.
      try {
        return (await AsyncStorage.getItem(keyFor(userId!))) ?? null;
      } catch {
        return null;
      }
    },
  });
}

/** True once the newest published item is newer than the last one seen. */
export function useHasUnreadNews(): boolean {
  const news = useAnnouncements();
  const seen = useSeenThrough();

  const newest = news.data?.[0]?.published_at;
  if (!newest || seen.isPending) return false;
  return !seen.data || newest > seen.data;
}

/** Records the newest item as seen; the Notifications screen calls it on open. */
export function useMarkNewsSeen() {
  const userId = useUserId();
  const client = useQueryClient();

  return useCallback(
    async (publishedAt: string) => {
      if (!userId) return;
      client.setQueryData(['news-seen', userId], publishedAt);
      try {
        await AsyncStorage.setItem(keyFor(userId), publishedAt);
      } catch {
        // The dot is already out for this session; it may come back next launch.
      }
    },
    [client, userId],
  );
}
