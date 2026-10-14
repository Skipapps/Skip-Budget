import { useQueryClient, type Query, type QueryClient } from '@tanstack/react-query';
import { useEffect, type ReactNode } from 'react';

import { supabase } from '@/lib/supabase';
import { useUserId } from '@/providers/session-provider';

/**
 * Postgres writes arrive as cache invalidations, never as state updates: the payload is only a
 * signal that the truth moved, and React Query re-reads through the same queries every screen uses,
 * so a row arriving out of order or partially cannot produce a state no query would.
 */

/** Table to the query keys it invalidates. */
const AFFECTS: Record<string, string[]> = {
  charges: ['charges'],
  // Loans are read with their bills, and deleting a bill deletes its loan.
  bills: ['bills', 'loans'],
  subscriptions: ['subscriptions'],
  // A receipt read by camera or upload is counted by its usage row, which is not published.
  receipts: ['receipts', 'capture_usage'],
  habits: ['habits'],
  receipt_books: ['receipt_books', 'receipts'],
  payments: ['payments'],
  // A loan's own page names its bill's card or account.
  cards: ['cards', 'loans'],
  bank_accounts: ['bank_accounts', 'loans'],
  salary_sources: ['salary_sources'],
  pay_received: ['pay_received'],
  // Long published, so listening to it adds nothing new to the channel. Goals and their moves are
  // not listened to: a table missing on the server would refuse the whole channel. Nor are loan
  // payoffs, for the same reason; recording or removing one always writes its loan's bill, and
  // bills reach 'loans', where payoffs are read.
  savings_pots: ['savings'],
  reminders: ['reminders'],
  loans: ['loans'],
  profiles: ['profile'],
};

/**
 * Changes to one key inside this long are read once: one save can write several rows, and a sweep
 * many, and each re-read started would cancel the one before.
 */
export const ECHO_WAIT_MS = 400;
/** A steady stream of changes is still read at least this often. */
export const ECHO_MAX_WAIT_MS = 1_500;
/** How long after one of this phone's writes landed its echo can still be arriving. */
export const OWN_ECHO_WINDOW_MS = 3_000;

/** Row id to when the server answered the write of ours that named it. */
const ownWrites = new WeakMap<QueryClient, Map<string, number>>();

const ROW_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function rowId(value: unknown): string | undefined {
  return typeof value === 'string' && ROW_ID.test(value) ? value.toLowerCase() : undefined;
}

/**
 * The rows a write named: a bare id (a delete), an `id` field (an update, a create with its own
 * id, a returned row) and the `id` of an object one level in (`{ bill, today }`). Ids a write only
 * points at (`card_id`, `accountIds`) are left out: missing a row costs one extra read, while
 * claiming one this phone did not write could hide another device's change.
 */
export function rowIdsIn(...values: unknown[]): string[] {
  const ids = new Set<string>();
  const take = (value: unknown, depth: number) => {
    const id = rowId(value);
    if (id) {
      ids.add(id);
      return;
    }
    if (Array.isArray(value)) {
      if (depth === 0) for (const item of value) take(item, 1);
      return;
    }
    if (!value || typeof value !== 'object') return;
    const own = rowId((value as { id?: unknown }).id);
    if (own) ids.add(own);
    if (depth === 0) {
      for (const inner of Object.values(value)) {
        if (inner && typeof inner === 'object' && !Array.isArray(inner)) {
          const nested = rowId((inner as { id?: unknown }).id);
          if (nested) ids.add(nested);
        }
      }
    }
  };
  for (const value of values) take(value, 0);
  return [...ids];
}

/**
 * Marks the rows one of this phone's writes touched, once the server has answered it, so the write
 * is in. A read started after that already holds those rows, so their echo need not start another.
 */
export function noteOwnWrite(
  client: QueryClient,
  ids: Iterable<string>,
  at: number = Date.now(),
): void {
  let rows = ownWrites.get(client);
  if (!rows) {
    rows = new Map();
    ownWrites.set(client, rows);
  }
  for (const [id, when] of rows) if (when < at - OWN_ECHO_WINDOW_MS) rows.delete(id);
  for (const id of ids) rows.set(id.toLowerCase(), at);
}

type ChangePayload = { new?: { id?: unknown } | null; old?: { id?: unknown } | null };

export function RealtimeProvider({ children }: { children: ReactNode }) {
  const client = useQueryClient();
  const userId = useUserId();

  useEffect(() => {
    if (!userId) return;

    // When each query last started a read, or was told its data is old (the read follows when
    // anything shows it).
    const touched = new WeakMap<Query, number>();
    const unsubscribe = client.getQueryCache().subscribe((event) => {
      if (
        event.type === 'updated' &&
        (event.action.type === 'fetch' || event.action.type === 'invalidate')
      ) {
        touched.set(event.query, Date.now());
      }
    });

    type Burst = {
      first: number;
      timer: ReturnType<typeof setTimeout>;
      /** The rows the changes name; null once one names none, and then it is re-read as usual. */
      rows: Set<string> | null;
    };
    const bursts = new Map<string, Burst>();

    /**
     * When the last of our writes to these rows landed, if every change in the burst is the echo
     * of one; otherwise infinity, so every read of the key counts as older and is redone.
     */
    const echoOf = (burst: Burst): number => {
      if (!burst.rows || burst.rows.size === 0) return Number.POSITIVE_INFINITY;
      const written = ownWrites.get(client);
      let latest = Number.NEGATIVE_INFINITY;
      for (const id of burst.rows) {
        const when = written?.get(id);
        if (when === undefined || when < burst.first - OWN_ECHO_WINDOW_MS) {
          return Number.POSITIVE_INFINITY;
        }
        latest = Math.max(latest, when);
      }
      return latest;
    };

    const flush = (key: string) => {
      const burst = bursts.get(key);
      bursts.delete(key);
      if (!burst) return;
      // A read that started after our write of every changed row landed already shows them. Any
      // other change, from another device or the server's own jobs, is read again.
      const fresh = echoOf(burst);
      // Chosen once, up front: invalidating marks a query as touched, and invalidateQueries asks
      // its predicate again before re-reading.
      const stale = new Set(
        client
          .getQueryCache()
          .findAll({ queryKey: [key] })
          .filter((query) => (touched.get(query) ?? Number.NEGATIVE_INFINITY) < fresh),
      );
      if (stale.size === 0) return;
      void client.invalidateQueries({ queryKey: [key], predicate: (query) => stale.has(query) });
    };

    const schedule = (key: string, id: string | undefined) => {
      const now = Date.now();
      const burst = bursts.get(key);
      if (burst) clearTimeout(burst.timer);
      const first = burst?.first ?? now;
      const rows = burst ? burst.rows : new Set<string>();
      if (rows && id) rows.add(id);
      const wait = Math.max(0, Math.min(ECHO_WAIT_MS, first + ECHO_MAX_WAIT_MS - now));
      bursts.set(key, {
        first,
        rows: id ? rows : null,
        timer: setTimeout(() => flush(key), wait),
      });
    };

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
        (payload: ChangePayload) => {
          const id = rowId(payload?.new?.id) ?? rowId(payload?.old?.id);
          for (const key of keys) schedule(key, id);
        },
      );
    }

    channel.subscribe();

    return () => {
      unsubscribe();
      for (const burst of bursts.values()) clearTimeout(burst.timer);
      bursts.clear();
      void supabase.removeChannel(channel);
    };
  }, [client, userId]);

  return <>{children}</>;
}
