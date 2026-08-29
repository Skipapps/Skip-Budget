import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { recordDueCharges } from '@/api/charges';
import { nextOccurrenceFrom } from '@/lib/card-ledger';
import { settleWithin } from '@/lib/deadline';
import { toIsoDate } from '@/lib/date';
import { supabase } from '@/lib/supabase';
import { useUserId } from '@/providers/session-provider';

/**
 * Keeping the app's idea of "next" honest, and re-reading everything.
 *
 * Bills and subscriptions store one date each — the next time they land — and
 * every past occurrence is derived by walking back from it. That makes history
 * self-maintaining, but it also means the stored date silently becomes a date
 * in the past once it passes, and the app starts calling last month's due date
 * the next one.
 *
 * Rolling it forward fixes the label without touching the arithmetic: the
 * walk-back still reaches every occurrence that already happened, so no charge
 * is lost and no balance moves.
 */

type Rollable = {
  id: string;
  date: string | null;
  recurrence: 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'period';
};

/** Rows whose stored date has slipped into the past, with their new one. */
function overdue(rows: Rollable[], today: string) {
  return (
    rows
      .filter((row) => row.date && row.recurrence !== 'period' && row.date < today)
      .map((row) => ({ id: row.id, next: nextOccurrenceFrom(row.date!, row.recurrence, today) }))
      // A walk that hit its guard returns the date it started from; writing that
      // back would be a no-op round trip.
      .filter((row) => Boolean(row.next) && row.next >= today)
  );
}

/**
 * Advances every schedule that has fallen behind.
 *
 * Returns how many rows moved, so a caller can decide whether the lists are
 * worth invalidating. Failures are swallowed on purpose: this runs in the
 * background behind a pull-to-refresh, and a bill that could not be advanced
 * is a cosmetic problem, not a reason to show the user an error.
 */
export async function rollSchedulesForward(today: string): Promise<number> {
  let moved = 0;

  try {
    const { data: bills } = await supabase
      .from('bills')
      .select('id, next_due_on, recurrence')
      .not('next_due_on', 'is', null)
      .lt('next_due_on', today);

    for (const bill of overdue(
      (bills ?? []).map((row) => ({
        id: row.id as string,
        date: row.next_due_on as string | null,
        recurrence: row.recurrence as Rollable['recurrence'],
      })),
      today,
    )) {
      const { error } = await supabase
        .from('bills')
        .update({ next_due_on: bill.next } as never)
        .eq('id', bill.id);
      if (!error) moved += 1;
    }

    const { data: subscriptions } = await supabase
      .from('subscriptions')
      .select('id, next_renewal_on, cycle')
      .eq('active', true)
      .not('next_renewal_on', 'is', null)
      .lt('next_renewal_on', today);

    for (const subscription of overdue(
      (subscriptions ?? []).map((row) => ({
        id: row.id as string,
        date: row.next_renewal_on as string | null,
        recurrence: row.cycle as Rollable['recurrence'],
      })),
      today,
    )) {
      const { error } = await supabase
        .from('subscriptions')
        .update({ next_renewal_on: subscription.next } as never)
        .eq('id', subscription.id);
      if (!error) moved += 1;
    }
  } catch {
    // Nothing to do but leave the dates as they were.
  }

  return moved;
}

/**
 * How long the spinner may stay up.
 *
 * Shorter than the read deadline behind it, because the two are answering
 * different questions. A query gets time to succeed; the spinner only has to
 * say "I looked". If the reads are still going after this, they will land in
 * the cache when they land, and the screen will update then — leaving the
 * control spinning adds nothing except the impression of a stuck app.
 */
const SPINNER_TIMEOUT_MS = 6_000;

/**
 * Brings the books up to date, then re-reads whatever moved.
 *
 * Recording comes first and rolling second. Charges are worked out from the
 * stored anchor, and rolling it forward is what marks an occurrence as dealt
 * with — doing that before writing the charge would step over the very date
 * being recorded.
 */
async function sweep(client: ReturnType<typeof useQueryClient>, userId: string): Promise<void> {
  const today = toIsoDate(new Date());

  const recorded = await recordDueCharges(userId, today);
  if (recorded > 0) client.invalidateQueries({ queryKey: ['charges'] });

  const moved = await rollSchedulesForward(today);
  if (moved === 0) return;

  client.invalidateQueries({ queryKey: ['bills'] });
  client.invalidateQueries({ queryKey: ['subscriptions'] });
  client.invalidateQueries({ queryKey: ['dashboard'] });
}

/**
 * Pull-to-refresh for any screen that shows money.
 *
 * Deliberately returns nothing for the figures to react to. A refresh that
 * finds the same numbers should leave the screen still: the roll means "this
 * changed", and spinning it on every pull would say that when it was not true.
 */
export function useRefreshAll() {
  const client = useQueryClient();
  const userId = useUserId();
  const [refreshing, setRefreshing] = useState(false);

  const refresh = useCallback(async () => {
    if (!userId) return;
    setRefreshing(true);
    try {
      // Housekeeping runs alongside rather than in front: rolling dates forward
      // needs its own round trips, and making the pull wait on them is the
      // difference between a refresh that feels instant and one that does not.
      // It re-reads what it moved on its own.
      void sweep(client, userId);
      await settleWithin(client.invalidateQueries(), SPINNER_TIMEOUT_MS);
    } finally {
      setRefreshing(false);
    }
  }, [client, userId]);

  return { refresh, refreshing };
}

/** Long enough that flicking between apps does not re-run the sweep. */
const SWEEP_INTERVAL_MS = 60_000;

/**
 * Keeps schedules current on launch and on every return to the app.
 *
 * An app reopened from the recents list after a fortnight away should not
 * greet someone with a rent bill dated two weeks ago, and should not need a
 * pull to sort itself out. React Query re-reads the data on the same signal;
 * this is the part that moves dates the data cannot move on its own.
 *
 * Only invalidates when something actually moved, so a return to a
 * fully-current app costs one query and changes nothing on screen.
 */
export function useKeepSchedulesCurrent() {
  const client = useQueryClient();
  const userId = useUserId();
  // Epoch millis of the last sweep. Zero means it has never run.
  const lastSweep = useRef(0);

  useEffect(() => {
    if (!userId) return;

    const maybeSweep = () => {
      const now = Date.now();
      if (now - lastSweep.current < SWEEP_INTERVAL_MS) return;
      lastSweep.current = now;
      void sweep(client, userId);
    };

    maybeSweep();

    const subscription = AppState.addEventListener('change', (status: AppStateStatus) => {
      if (status === 'active') maybeSweep();
    });
    return () => subscription.remove();
  }, [client, userId]);
}
