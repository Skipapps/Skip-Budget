import { useQuery } from '@tanstack/react-query';

import { withTimeout } from '@/lib/deadline';
import { unrecordedDates, type ChargeablePlan } from '@/lib/charges';
import { supabase } from '@/lib/supabase';
import { useUserId } from '@/providers/session-provider';

/**
 * Writing down what the plans have charged. A charge is one time a bill actually landed, with its
 * own label, amount and source copied at that moment, so correcting a bill later leaves past
 * charges alone.
 *
 * Runs on the client, so it cannot notice anything while the app is closed; the reminder and "it
 * went out" pushes need a scheduled function, which would write the same rows against the same
 * constraints.
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
};

// One literal, not a concatenation: supabase-js parses this string at the type
// level to work out the row shape, and it cannot follow a joined expression.
const CHARGE_COLUMNS =
  'id, bill_id, subscription_id, label, amount, charged_on, card_id, bank_account_id';

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

type Plan = ChargeablePlan & {
  label: string;
  amount: number;
  cardId: string | null;
  accountId: string | null;
  kind: 'bill' | 'subscription';
};

/**
 * Records every occurrence that has come due and is not written down yet; returns how many rows it
 * added. Safe to repeat: recorded dates are skipped and the unique indexes catch two runs racing.
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

  // Grouped once so each plan is a set lookup, not a scan of the whole history; this runs on every
  // launch.
  const recorded = new Map<string, Set<string>>();
  for (const row of existing.data ?? []) {
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
      // Switching a subscription off sets active = false, not an end date, so nothing bounds it.
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

  // Duplicates are expected (two launches at once see the same gap); the unique index refuses the
  // second, so they are ignored rather than reported.
  const { error } = await supabase
    .from('charges')
    .upsert(rows as never, { ignoreDuplicates: true });

  return error ? 0 : rows.length;
}
