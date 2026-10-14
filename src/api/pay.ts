import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import type { PastDelete } from '@/components/ui/past-choice';
import { t } from '@/i18n';
import { withTimeout } from '@/lib/deadline';
import { duePay, paydaysInHistory, type RecordedDay, type SalaryToRecord } from '@/lib/pay-record';
import { supabase } from '@/lib/supabase';
import { useDialog } from '@/providers/dialog-provider';
import { useUserId } from '@/providers/session-provider';

/**
 * Writing down the pay that has landed. A row is one payday that actually happened, with the
 * salary's name, amount and account copied that day, so a raise or a new job changes only the pay
 * after it, as a charge does for a bill.
 */

export type PayRow = {
  id: string;
  salary_source_id: string | null;
  label: string;
  amount: number;
  paid_on: string;
  bank_account_id: string | null;
};

const PAY_COLUMNS = 'id, salary_source_id, label, amount, paid_on, bank_account_id';

/** 42P01: the table is not there yet (an app build ahead of its migration); nothing is on record. */
const missingTable = (error: { code?: string } | null) => error?.code === '42P01';

export function usePayReceived() {
  const userId = useUserId();
  return useQuery({
    queryKey: ['pay_received', userId],
    enabled: Boolean(userId),
    queryFn: () =>
      withTimeout(
        (async () => {
          const { data, error } = await supabase
            .from('pay_received')
            .select(PAY_COLUMNS)
            .order('paid_on', { ascending: false });
          if (missingTable(error)) return [] as PayRow[];
          if (error) throw error;
          return ((data ?? []) as PayRow[]).map((row) => ({ ...row, amount: Number(row.amount) }));
        })(),
        12_000,
        'Could not load your pay. Check your connection and try again.',
      ),
  });
}

type NewPay = Omit<PayRow, 'id'> & { user_id: string };

type SalaryRead = Omit<SalaryToRecord, 'account_ids'> & {
  salary_source_accounts?: { bank_account_id: string }[] | null;
};

const SALARY_TO_RECORD =
  'id, name, amount, frequency, last_payday, salary_source_accounts(bank_account_id)';

const toRecord = ({ salary_source_accounts, ...salary }: SalaryRead): SalaryToRecord => ({
  ...salary,
  account_ids: (salary_source_accounts ?? []).map((link) => link.bank_account_id),
});

/** The paydays due and not written down yet, for every salary or for one. Throws on a failed read. */
async function readDuePay(userId: string, today: string, salaryId?: string): Promise<NewPay[]> {
  let salaries = supabase.from('salary_sources').select(SALARY_TO_RECORD);
  let existing = supabase.from('pay_received').select('salary_source_id, paid_on');
  if (salaryId) {
    salaries = salaries.eq('id', salaryId);
    existing = existing.eq('salary_source_id', salaryId);
  }
  const [salaryRows, accounts, recorded] = await Promise.all([
    salaries,
    supabase.from('bank_accounts').select('id').order('created_at', { ascending: true }),
    existing,
  ]);
  const failed = salaryRows.error ?? accounts.error ?? recorded.error;
  if (failed) throw failed;

  return duePay({
    today,
    salaries: ((salaryRows.data ?? []) as unknown as SalaryRead[]).map(toRecord),
    recorded: (recorded.data ?? []) as RecordedDay[],
    accountOrder: (accounts.data ?? []).map((row) => row.id as string),
  }).map((row) => ({ ...row, user_id: userId }));
}

/**
 * Records every payday that has come due and is not written down yet; returns how many rows it
 * added. Safe to repeat: the unique index refuses a payday recorded twice by two launches racing.
 */
export async function recordDuePay(userId: string, today: string): Promise<number> {
  let rows: NewPay[];
  try {
    rows = await readDuePay(userId, today);
  } catch {
    return 0;
  }
  if (rows.length === 0) return 0;

  // Two launches at once see the same gap; the unique index refuses the second, so it is ignored.
  const { error } = await supabase
    .from('pay_received')
    .upsert(rows as never, { ignoreDuplicates: true });
  return error ? 0 : rows.length;
}

/**
 * recordDuePay for one salary, failing out loud: "keep past" removes the salary next, and the
 * paydays it could not write would go with it.
 */
async function recordDuePayOf(userId: string, today: string, salaryId: string): Promise<void> {
  for (let attempt = 0; ; attempt += 1) {
    const rows = await readDuePay(userId, today, salaryId);
    if (rows.length === 0) return;
    const { error } = await supabase
      .from('pay_received')
      .upsert(rows as never, { ignoreDuplicates: true });
    if (!error) return;
    // The upsert's conflict target is the key, not the one-a-day index: a launch's sweep that
    // wrote the same payday a moment earlier refuses the batch, and a fresh read leaves it out.
    if (error.code !== '23505' || attempt > 0) throw error;
  }
}

/** Deleting a pay: 'keep' stops it today with its paydays left in history; 'everything' takes them too. */
export type PayDeleteInput = {
  /** The salary_sources row. */
  id: string;
  choice: PastDelete;
  /** The person's today (yyyy-mm-dd, `useToday`). */
  today: string;
};

/**
 * Deleting a pay that may have paid. `countPast` is the count for `usePastChoice().askDelete`;
 * `remove` does what the answer said.
 *
 * - 'keep': every payday due by today is written down first, so the history and every balance stay
 *   exactly as shown, then the pay goes. Its paydays outlive it (salary_source_id becomes null), so
 *   nothing after today is recorded or projected.
 * - 'everything': the pay and every payday on its record, in one database step. The paydays not
 *   written down yet were only ever worked out from it, so they go with it.
 */
export function useDeletePay() {
  const userId = useUserId();
  const client = useQueryClient();

  /**
   * How many paydays it has in history today: on the record, plus any due that the sweep has not
   * written down yet. Rejects when a read fails; an unread count is not "none".
   */
  const countPast = useCallback(async (id: string, today: string): Promise<number> => {
    const [salary, recorded] = await Promise.all([
      supabase.from('salary_sources').select(SALARY_TO_RECORD).eq('id', id).maybeSingle(),
      supabase.from('pay_received').select('salary_source_id, paid_on').eq('salary_source_id', id),
    ]);
    const unrecorded = missingTable(recorded.error);
    const failed = salary.error ?? (unrecorded ? null : recorded.error);
    if (failed) throw failed;
    return paydaysInHistory({
      today,
      salary: salary.data ? toRecord(salary.data as unknown as SalaryRead) : null,
      recorded: unrecorded ? [] : ((recorded.data ?? []) as RecordedDay[]),
    });
  }, []);

  const removal = useMutation({
    mutationFn: async ({ id, choice, today }: PayDeleteInput) => {
      if (choice === 'everything') {
        const { error } = await supabase.rpc('delete_salary_and_pay', { p_salary: id });
        // P0002: removed on another phone already, which is what was asked for.
        if (error && error.code !== 'P0002') throw error;
        return { id, choice };
      }
      if (!userId) throw new Error('Sign in first.');
      await recordDuePayOf(userId, today, id);
      const { error } = await supabase.from('salary_sources').delete().eq('id', id);
      if (error) throw error;
      return { id, choice };
    },
    onSuccess: ({ choice }) => {
      for (const key of ['salary_sources', 'salary_source_accounts', 'pay_received', 'dashboard']) {
        client.invalidateQueries({ queryKey: [key] });
      }
      // A finished month whose pay went offers its update on the month's page.
      if (choice === 'everything') client.invalidateQueries({ queryKey: ['savings'] });
    },
  });

  return { countPast, remove: removal.mutateAsync, removing: removal.isPending };
}

export type PastPayScope = 'all' | 'upcoming';

/** The fields a pay copies from its salary, so the only ones an edit can carry back. */
export type CarriedPay = { label: string; amount: number; bank_account_id: string | null };

/**
 * Editing a salary that has already paid. A pay keeps the name, amount and account it landed with,
 * which is right for a raise and wrong for a typo; only the person knows which, so they are asked,
 * and only when the salary has pay on record and a copied field changed.
 */
export function usePastPay() {
  const ask = useDialog();
  const client = useQueryClient();

  const rewrite = useMutation({
    mutationFn: async ({ salaryId, values }: { salaryId: string; values: CarriedPay }) => {
      const { error } = await supabase
        .from('pay_received')
        .update(values as never)
        .eq('salary_source_id', salaryId);
      if (error) throw error;
    },
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ['pay_received'] });
      client.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });

  /** Resolves to the scope to save with, or null when the person backed out. */
  const choose = useCallback(
    async (salaryId: string, name: string): Promise<PastPayScope | null> => {
      const { count, error } = await supabase
        .from('pay_received')
        .select('id', { count: 'exact', head: true })
        .eq('salary_source_id', salaryId);
      if (missingTable(error) || (!error && !count)) return 'upcoming';

      // A count that could not be read is not "none": asking costs one tap, guessing wrong
      // reprices months of pay.
      const message = error
        ? t('api.pastPay.maybe', { name })
        : t('api.pastPay.paid', { name, count: count ?? 0 });
      const choice = await ask({
        title: t('api.pastPay.title'),
        message,
        actions: [
          { id: 'all', label: t('api.pastPay.all') },
          { id: 'upcoming', label: t('api.pastPay.upcoming') },
        ],
        cancelLabel: t('common.cancel'),
      });
      return choice === 'all' || choice === 'upcoming' ? choice : null;
    },
    [ask],
  );

  const apply = useCallback(
    async (salaryId: string, values: CarriedPay) => {
      await rewrite.mutateAsync({ salaryId, values });
    },
    [rewrite],
  );

  return { choose, apply, saving: rewrite.isPending };
}
