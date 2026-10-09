import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import { t } from '@/i18n';
import { historyFloor } from '@/lib/allowance';
import { withTimeout } from '@/lib/deadline';
import type { PayFrequency } from '@/lib/date';
import { landingAccount, unrecordedPaydays } from '@/lib/pay';
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

/**
 * Records every payday that has come due and is not written down yet; returns how many rows it
 * added. Safe to repeat: the unique index refuses a payday recorded twice by two launches racing.
 */
export async function recordDuePay(userId: string, today: string): Promise<number> {
  const [salaries, accounts, existing] = await Promise.all([
    supabase
      .from('salary_sources')
      .select('id, name, amount, frequency, last_payday, salary_source_accounts(bank_account_id)'),
    supabase.from('bank_accounts').select('id').order('created_at', { ascending: true }),
    supabase.from('pay_received').select('salary_source_id, paid_on'),
  ]);
  if (salaries.error || accounts.error || existing.error) return 0;

  const lastRecorded = new Map<string, string>();
  for (const row of existing.data ?? []) {
    const id = row.salary_source_id as string | null;
    const day = row.paid_on as string;
    if (id && (!lastRecorded.has(id) || day > lastRecorded.get(id)!)) lastRecorded.set(id, day);
  }

  const accountOrder = (accounts.data ?? []).map((row) => row.id as string);
  // The same floor the ledger walks from, so what is written down is what the screens show.
  const floor = historyFloor(true, new Date(`${today}T00:00:00`));

  type SalaryRead = {
    id: string;
    name: string | null;
    amount: number;
    frequency: PayFrequency;
    last_payday: string | null;
    salary_source_accounts?: { bank_account_id: string }[] | null;
  };

  const rows: NewPay[] = [];
  for (const salary of (salaries.data ?? []) as unknown as SalaryRead[]) {
    const amount = Number(salary.amount);
    if (!(amount > 0)) continue;
    const into = landingAccount(
      (salary.salary_source_accounts ?? []).map((link) => link.bank_account_id),
      accountOrder,
    );
    for (const day of unrecordedPaydays(
      { frequency: salary.frequency, lastPayday: salary.last_payday },
      lastRecorded.get(salary.id) ?? null,
      floor,
      today,
    )) {
      rows.push({
        user_id: userId,
        salary_source_id: salary.id,
        label: salary.name ?? '',
        amount,
        paid_on: day,
        bank_account_id: into,
      });
    }
  }

  if (rows.length === 0) return 0;

  // Two launches at once see the same gap; the unique index refuses the second, so it is ignored.
  const { error } = await supabase
    .from('pay_received')
    .upsert(rows as never, { ignoreDuplicates: true });
  return error ? 0 : rows.length;
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
