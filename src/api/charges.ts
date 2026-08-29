import { useQuery } from '@tanstack/react-query';

import { withTimeout } from '@/lib/deadline';
import { chargeKey, unrecordedDates } from '@/lib/charges';
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
};

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
        'id, name, amount, recurrence, next_due_on, starts_on, ends_on, card_id, bank_account_id',
      ),
    supabase
      .from('subscriptions')
      .select('id, name, amount, cycle, next_renewal_on, card_id, bank_account_id')
      .eq('active', true),
    supabase.from('charges').select('bill_id, subscription_id, charged_on'),
  ]);

  if (bills.error || subscriptions.error || existing.error) return 0;

  // One lookup for everything already written, so each plan is a set check
  // rather than a round trip.
  const recorded = new Set(
    (existing.data ?? []).map((row) =>
      chargeKey((row.bill_id ?? row.subscription_id) as string, row.charged_on as string),
    ),
  );

  const rows: NewCharge[] = [];

  for (const bill of bills.data ?? []) {
    const dates = unrecordedDates(
      {
        id: bill.id as string,
        recurrence: bill.recurrence as never,
        nextDate: bill.next_due_on as string | null,
        startsOn: bill.starts_on as string | null,
        endsOn: bill.ends_on as string | null,
      },
      today,
      new Set(
        [...recorded]
          .filter((key) => key.startsWith(`${bill.id}@`))
          .map((key) => key.split('@')[1]),
      ),
    );

    for (const date of dates) {
      rows.push({
        user_id: userId,
        bill_id: bill.id as string,
        subscription_id: null,
        label: (bill.name as string) || 'Bill',
        amount: bill.amount as number,
        charged_on: date,
        card_id: (bill.card_id as string | null) ?? null,
        bank_account_id: (bill.bank_account_id as string | null) ?? null,
      });
    }
  }

  for (const plan of subscriptions.data ?? []) {
    const dates = unrecordedDates(
      {
        id: plan.id as string,
        recurrence: plan.cycle as never,
        nextDate: plan.next_renewal_on as string | null,
        // Subscriptions carry no start date, so they record from today on
        // rather than inventing renewals nobody was charged for.
        startsOn: null,
        endsOn: null,
      },
      today,
      new Set(
        [...recorded]
          .filter((key) => key.startsWith(`${plan.id}@`))
          .map((key) => key.split('@')[1]),
      ),
    );

    for (const date of dates) {
      rows.push({
        user_id: userId,
        bill_id: null,
        subscription_id: plan.id as string,
        label: (plan.name as string) || 'Subscription',
        amount: plan.amount as number,
        charged_on: date,
        card_id: (plan.card_id as string | null) ?? null,
        bank_account_id: (plan.bank_account_id as string | null) ?? null,
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
