import { useQueryClient } from '@tanstack/react-query';
import { useEffect, type ReactNode } from 'react';

import { supabase } from '@/lib/supabase';
import { useUserId } from '@/providers/session-provider';

/**
 * Keeping every open screen level with the database.
 *
 * Until now a screen learned about a change by asking again — on mount, on a
 * pull, or when the app returned to the foreground. Fine for one phone, wrong
 * the moment there are two: a bill added on an iPad left this one showing
 * yesterday's dashboard until something happened to make it re-ask.
 *
 * Postgres announces its own writes now, and each announcement is turned into
 * a cache invalidation rather than a state update. That distinction is the
 * whole design: the payload is not trusted to be the new truth, it is only a
 * signal that the truth moved, and React Query re-reads through the same
 * queries every screen already uses. So a row arriving out of order, or
 * partially, cannot put the app into a state no query would ever produce.
 */

/**
 * Which tables feed which caches.
 *
 * A charge changes the dashboard, the ledger and the notifications list, and
 * they are all read through the 'charges' key — but bills and subscriptions
 * feed the projected side of the same screens, so they invalidate the
 * dashboard too.
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
          // Filtered here rather than relying on the row policies: a
          // subscription that asked for everything would be refused most of it
          // anyway, and this keeps the socket carrying only this user's rows.
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

  return <>{children}</>;
}
