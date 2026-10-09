import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { recordDueCharges } from '@/api/charges';
import { recordDuePay } from '@/api/pay';
import { nextOccurrenceFrom } from '@/lib/card-ledger';
import { settleWithin } from '@/lib/deadline';
import { toIsoDate } from '@/lib/date';
import { supabase } from '@/lib/supabase';
import { useUserId } from '@/providers/session-provider';

/**
 * Bills and subscriptions store one date, the next time they land, and past occurrences are derived
 * by walking back from it. Once that date passes it would call last month's due date "next", so it
 * is rolled forward; the walk-back still reaches every earlier occurrence, so no charge is lost and
 * no balance moves.
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
 * Advances every schedule that has fallen behind; returns how many rows moved. Failures are
 * swallowed: this runs in the background behind a pull-to-refresh, and a bill that could not be
 * advanced is a cosmetic problem.
 */
async function rollSchedulesForward(today: string): Promise<number> {
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
 * How long the spinner may stay up: shorter than the read deadline, since it only has to say "I
 * looked". Reads still running land in the cache when they land.
 */
const SPINNER_TIMEOUT_MS = 6_000;

/**
 * Brings the books up to date, then re-reads whatever moved. Recording must come before rolling:
 * charges are worked out from the stored anchor, and rolling it forward would step over the very
 * date being recorded.
 */
async function sweep(client: ReturnType<typeof useQueryClient>, userId: string): Promise<void> {
  const today = toIsoDate(new Date());

  const recorded = await recordDueCharges(userId, today);
  if (recorded > 0) client.invalidateQueries({ queryKey: ['charges'] });

  const paid = await recordDuePay(userId, today);
  if (paid > 0) client.invalidateQueries({ queryKey: ['pay_received'] });

  const moved = await rollSchedulesForward(today);
  if (moved === 0) return;

  client.invalidateQueries({ queryKey: ['bills'] });
  client.invalidateQueries({ queryKey: ['subscriptions'] });
  client.invalidateQueries({ queryKey: ['dashboard'] });
}

/**
 * Pull-to-refresh for any screen that shows money. Returns nothing for the figures to react to, so
 * a refresh that finds the same numbers leaves the screen still.
 */
export function useRefreshAll() {
  const client = useQueryClient();
  const userId = useUserId();
  const [refreshing, setRefreshing] = useState(false);

  const refresh = useCallback(async () => {
    if (!userId) return;
    setRefreshing(true);
    try {
      // Housekeeping runs alongside rather than in front, so the pull does not wait on its round
      // trips. It re-reads what it moved itself.
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
 * Keeps schedules current on launch and on every return to the app, so a rent bill dated two weeks
 * ago never greets someone after a long absence. Only invalidates when something actually moved.
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
