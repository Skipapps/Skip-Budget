import { useQueryClient } from '@tanstack/react-query';
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
  habits: ['habits'],
  payments: ['payments', 'dashboard'],
  cards: ['cards', 'dashboard'],
  bank_accounts: ['bank_accounts', 'dashboard'],
  salary_sources: ['salary_sources', 'dashboard'],
  pay_received: ['pay_received', 'dashboard'],
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

  return <>{children}</>;
}
