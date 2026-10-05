import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, type ReactNode } from 'react';

import { supabase } from '@/lib/supabase';
import { useUserId } from '@/providers/session-provider';

/**
 * Postgres writes arrive as cache invalidations, never as state updates: the payload is only a
 * signal that the truth moved, and React Query re-reads through the same queries every screen uses,
 * so a row arriving out of order or partially cannot produce a state no query would.
 */

/**
 * Table to the query keys it invalidates. Anything the dashboard is built from also invalidates
 * 'dashboard'.
 */
const AFFECTS: Record<string, string[]> = {
  charges: ['charges', 'dashboard'],
  bills: ['bills', 'dashboard'],
  subscriptions: ['subscriptions', 'dashboard'],
  receipts: ['receipts', 'dashboard'],
  payments: ['payments', 'dashboard'],
  cards: ['cards', 'dashboard'],
  bank_accounts: ['bank_accounts', 'dashboard'],
  salary_sources: ['salary_sources', 'dashboard'],
  savings_pots: ['savings_pots', 'dashboard'],
  reminders: ['reminders'],
  loans: ['loans'],
  profiles: ['profile'],
};

export function RealtimeProvider({ children }: { children: ReactNode }) {
  const client = useQueryClient();
  const userId = useUserId();

  useEffect(() => {
    if (!userId) return;

    const channel = supabase.channel(`skip:${userId}`);

    for (const [table, keys] of Object.entries(AFFECTS)) {
      channel.on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table,
          // Filtered here rather than leaning on the row policies, so the socket only carries
          // this user's rows.
          filter: `${table === 'profiles' ? 'id' : 'user_id'}=eq.${userId}`,
        },
        () => {
          for (const key of keys) client.invalidateQueries({ queryKey: [key] });
        },
      );
    }

    channel.subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [client, userId]);

  return (
    <>
      <SharedRealtime />
      {children}
    </>
  );
}

const GROUP_KEYS = [
  'groups',
  'group-members',
  'group-expenses',
  'group-settlements',
  'group-balances',
];

/**
 * The shared side. A group expense someone else adds carries THEIR user_id, so the `user_id = me`
 * filter above would never match it. These are broadcast topics instead: the database publishes to
 * `group:<id>` and this listens to the account's groups. Fan-out is one message per change rather
 * than a policy check per subscriber.
 */
function SharedRealtime() {
  const client = useQueryClient();
  const userId = useUserId();

  // Read straight through rather than reusing useGroups: only the ids are needed, and a query
  // shared with the screens would re-run this effect on every refetch.
  const { data: groupIds = [] } = useQuery({
    queryKey: ['realtime-groups', userId],
    enabled: Boolean(userId),
    queryFn: async (): Promise<string[]> => {
      const { data, error } = await supabase.from('group_members').select('group_id');
      if (error) throw error;
      return [...new Set((data ?? []).map((row) => row.group_id as string))].sort();
    },
  });

  // Joined so the effect re-runs when the set of groups changes, not on every new array identity.
  const key = groupIds.join(',');

  useEffect(() => {
    if (!userId || key.length === 0) return;

    const channels = key.split(',').map((groupId) => {
      const channel = supabase
        .channel(`group:${groupId}`, { config: { private: true } })
        .on('broadcast', { event: '*' }, () => {
          for (const cacheKey of GROUP_KEYS) {
            client.invalidateQueries({ queryKey: [cacheKey] });
          }
        });
      channel.subscribe();
      return channel;
    });

    return () => {
      for (const channel of channels) void supabase.removeChannel(channel);
    };
  }, [client, userId, key]);

  return <FriendRealtime />;
}

/**
 * Friend requests belong to no group, so they ride a topic per account. Both sides are told: the
 * receiver sees a request live, the sender sees an accept land.
 */
function FriendRealtime() {
  const client = useQueryClient();
  const userId = useUserId();

  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`user:${userId}`, { config: { private: true } })
      .on('broadcast', { event: '*' }, () => {
        client.invalidateQueries({ queryKey: ['friends'] });
        client.invalidateQueries({ queryKey: ['friend-requests'] });
        // A new friendship changes who can be added to a group.
        client.invalidateQueries({ queryKey: ['group-members'] });
      });

    channel.subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [client, userId]);

  return null;
}
