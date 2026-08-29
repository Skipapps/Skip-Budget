import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { withTimeout } from '@/lib/deadline';
import { unrecordedDates, type ChargeablePlan } from '@/lib/charges';
import { supabase } from '@/lib/supabase';
import { useUserId } from '@/providers/session-provider';

/**
 * Writing down what the plans have charged.
 *
 * A bill describes what repeats. A charge is one time it actually landed, with
 * its own label, amount and source copied at that moment — so correcting a bill
 * next month leaves what already went out alone.
 *
 * This runs on the client rather than on a schedule, and that is a deliberate
 * first step rather than the finished shape: it means recording works today,
 * without a server, and every charge is written by someone holding the phone.
 * What it cannot do is notice anything while the app is closed, which is why
 * the reminder and "it went out" pushes need a scheduled function of their own.
 * When that lands it writes the same rows against the same constraints.
 */

export type ChargeRow = {
  id: string;
  bill_id: string | null;
  subscription_id: string | null;
  label: string;
  amount: number;
  charged_on: string;
  card_id: string | null;
  bank_account_id: string | null;
  /**
   * When the notice about this was cleared. Hides it from the notifications
   * list and nothing else — the charge still counts everywhere it did before.
   */
  notification_dismissed_at: string | null;
};

// One literal, not a concatenation: supabase-js parses this string at the type
// level to work out the row shape, and it cannot follow a joined expression.
const CHARGE_COLUMNS =
  'id, bill_id, subscription_id, label, amount, charged_on, card_id, bank_account_id, notification_dismissed_at';

export function useCharges() {
  const userId = useUserId();
  return useQuery({
    queryKey: ['charges', userId],
    enabled: Boolean(userId),
    queryFn: () =>
      withTimeout(
        (async () => {
          const { data, error } = await supabase
            .from('charges')
            .select(CHARGE_COLUMNS)
            .order('charged_on', { ascending: false });
          if (error) throw error;
          return (data ?? []) as ChargeRow[];
        })(),
        12_000,
        'Could not load your charges. Check your connection and try again.',
      ),
  });
}

type NewCharge = {
  user_id: string;
  bill_id: string | null;
  subscription_id: string | null;
  label: string;
  amount: number;
  charged_on: string;
  card_id: string | null;
  bank_account_id: string | null;
};

/** A plan of either kind, flattened to the fields recording actually needs. */
type Plan = ChargeablePlan & {
  label: string;
  amount: number;
  cardId: string | null;
  accountId: string | null;
  kind: 'bill' | 'subscription';
};

/**
 * Records every occurrence that has come due and is not written down yet.
 *
 * Returns how many rows it added. Safe to call as often as you like: what is
 * already recorded is read first and skipped, and the unique indexes behind it
 * catch anything that slips through two runs racing each other.
 */
export async function recordDueCharges(userId: string, today: string): Promise<number> {
  const [bills, subscriptions, existing] = await Promise.all([
    supabase
      .from('bills')
      .select(
        'id, name, amount, recurrence, next_due_on, starts_on, ends_on, created_at, card_id, bank_account_id',
      ),
    supabase
      .from('subscriptions')
      .select(
        'id, name, amount, cycle, next_renewal_on, started_on, created_at, card_id, bank_account_id',
      )
      .eq('active', true),
    supabase.from('charges').select('bill_id, subscription_id, charged_on'),
  ]);

  if (bills.error || subscriptions.error || existing.error) return 0;

  // Grouped once, so each plan is a set lookup rather than a scan of every
  // charge the user has ever had. Seven years of a busy account is thousands
  // of rows, and this runs on every launch.
  const recorded = new Map<string, Set<string>>();
  for (const row of existing.data ?? []) {
    // Keyed by the raw column here, not by the ledger's name for the plan:
    // this side is matching rows up with the table they came from.
    const planId = (row.bill_id ?? row.subscription_id) as string;
    const dates = recorded.get(planId) ?? new Set<string>();
    dates.add(row.charged_on as string);
    recorded.set(planId, dates);
  }

  const plans: Plan[] = [
    ...(bills.data ?? []).map((row) => ({
      id: row.id as string,
      kind: 'bill' as const,
      label: (row.name as string) || 'Bill',
      amount: row.amount as number,
      recurrence: row.recurrence as never,
      nextDate: row.next_due_on as string | null,
      startsOn: row.starts_on as string | null,
      createdAt: row.created_at as string | null,
      endsOn: row.ends_on as string | null,
      cardId: (row.card_id as string | null) ?? null,
      accountId: (row.bank_account_id as string | null) ?? null,
    })),
    ...(subscriptions.data ?? []).map((row) => ({
      id: row.id as string,
      kind: 'subscription' as const,
      label: (row.name as string) || 'Subscription',
      amount: row.amount as number,
      recurrence: row.cycle as never,
      nextDate: row.next_renewal_on as string | null,
      startsOn: row.started_on as string | null,
      createdAt: row.created_at as string | null,
      // A subscription runs until it is switched off, and switching it off
      // sets active = false rather than an end date. Nothing to bound it with.
      endsOn: null,
      cardId: (row.card_id as string | null) ?? null,
      accountId: (row.bank_account_id as string | null) ?? null,
    })),
  ];

  const rows: NewCharge[] = [];

  for (const plan of plans) {
    for (const date of unrecordedDates(plan, today, recorded.get(plan.id) ?? new Set())) {
      rows.push({
        user_id: userId,
        bill_id: plan.kind === 'bill' ? plan.id : null,
        subscription_id: plan.kind === 'subscription' ? plan.id : null,
        label: plan.label,
        amount: plan.amount,
        charged_on: date,
        card_id: plan.cardId,
        bank_account_id: plan.accountId,
      });
    }
  }

  if (rows.length === 0) return 0;

  // Duplicates are the expected failure here, not an exceptional one: two
  // launches at once both see the same gap. The index refuses the second,
  // which is the outcome we want, so it is ignored rather than reported.
  const { error } = await supabase
    .from('charges')
    .upsert(rows as never, { ignoreDuplicates: true });

  return error ? 0 : rows.length;
}

/**
 * How far back the notifications list reaches.
 *
 * A week, and the window is the whole expiry mechanism: a notice leaves on its
 * own the day it turns eight days old, one day at a time, without a job to run
 * or a row to delete. What ages out is the announcement — the charge behind it
 * is kept for seven years like every other thing that happened.
 */
export const NOTICE_DAYS = 7;

/**
 * Clears notices, without touching the money they announced.
 *
 * Deliberately an update and never a delete. Removing the charge would take
 * the spending out of the dashboard and the ledger to tidy a list, which is
 * the one thing this screen must not be able to do.
 */
export function useDismissNotices() {
  const client = useQueryClient();

  return useMutation({
    mutationFn: async (chargeIds: string[]) => {
      if (chargeIds.length === 0) return;
      const { error } = await supabase
        .from('charges')
        .update({ notification_dismissed_at: new Date().toISOString() } as never)
        .in('id', chargeIds);
      if (error) throw error;
    },
    onSuccess: () => client.invalidateQueries({ queryKey: ['charges'] }),
  });
}
