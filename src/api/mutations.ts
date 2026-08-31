import { useMutation, useQueryClient } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';
import { useUserId } from '@/providers/session-provider';

/**
 * Every write in the app.
 *
 * RLS scopes reads by auth.uid(), but inserts still send user_id explicitly:
 * the with-check policy compares the incoming row to auth.uid(), and the
 * column has no default, so a row without it is rejected rather than silently
 * attributed to nobody.
 *
 * Updates and deletes filter on id alone — RLS refuses to touch a row owned by
 * anyone else, so repeating the owner check here would be noise.
 */

/** Tables whose totals feed the dashboard, so a write there refreshes it too. */
const AFFECTS_DASHBOARD = new Set([
  'bills',
  'receipts',
  'subscriptions',
  'salary_sources',
  'payments',
]);

/**
 * Tables whose rows point at another table's rows.
 *
 * Deleting a card does not delete what was charged to it — the foreign keys
 * are "on delete set null", so those rows survive with no source. The database
 * has already changed them by the time the delete returns, so their caches are
 * wrong until they are re-read. Without this a receipt keeps showing the card
 * it was paid with until the app is restarted.
 */
const DEPENDENTS: Record<string, string[]> = {
  cards: ['bills', 'receipts', 'subscriptions', 'payments'],
  bank_accounts: ['bills', 'receipts', 'subscriptions', 'payments', 'salary_sources'],
};

function useInvalidate() {
  const client = useQueryClient();
  return (table: string) => {
    client.invalidateQueries({ queryKey: [table] });
    for (const dependent of DEPENDENTS[table] ?? []) {
      client.invalidateQueries({ queryKey: [dependent] });
    }
    if (AFFECTS_DASHBOARD.has(table) || DEPENDENTS[table]) {
      client.invalidateQueries({ queryKey: ['dashboard'] });
    }
  };
}

function useCreate<TInput extends Record<string, unknown>>(table: string) {
  const userId = useUserId();
  const invalidate = useInvalidate();

  return useMutation({
    mutationFn: async (values: TInput) => {
      if (!userId) throw new Error('Sign in first.');
      // The client has no generated Database types, so supabase-js cannot
      // narrow a generic payload against a known row shape. The cast buys one
      // shared helper instead of a near-identical hook per table; the per-table
      // Values types above are what actually keep call sites honest.
      const payload = { ...values, user_id: userId } as never;
      const { data, error } = await supabase.from(table).insert(payload).select('id').single();
      if (error) throw error;
      return data as { id: string };
    },
    onSuccess: () => invalidate(table),
  });
}

function useUpdate<TInput extends Record<string, unknown>>(table: string) {
  const invalidate = useInvalidate();

  return useMutation({
    mutationFn: async ({ id, values }: { id: string; values: TInput }) => {
      const { error } = await supabase
        .from(table)
        .update(values as never)
        .eq('id', id);
      if (error) throw error;
      return { id };
    },
    onSuccess: () => invalidate(table),
  });
}

function useRemove(table: string) {
  const invalidate = useInvalidate();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from(table).delete().eq('id', id);
      if (error) throw error;
      return { id };
    },
    onSuccess: () => invalidate(table),
  });
}

// --- Cards -----------------------------------------------------------------

export type CardValues = {
  holder: string;
  network: string;
  last4: string | null;
  color: string;
  balance: number;
  /** When the stated balance was true; charges before it are already in it. */
  balance_as_of: string | null;
  bill_due_day: number | null;
};

/** The only editable thing on a profile today; currency is fixed to USD. */
export type ProfileValues = {
  display_name?: string | null;
  /** Which bundled avatar was chosen; null for none. See theme/avatars.ts. */
  avatar_id?: string | null;
  /** Dashboard tile ids, first to last. */
  tile_order?: string[] | null;
  /** When the Getting Started card was waved away. */
  getting_started_dismissed_at?: string | null;
};

/**
 * Profiles are keyed by the signed-in user rather than by a row id, so this
 * does not go through the shared update helper — and its query key is
 * 'profile', singular, which no table name would ever match.
 */
export function useUpdateProfile() {
  const userId = useUserId();
  const invalidate = useInvalidate();

  return useMutation({
    mutationFn: async (values: ProfileValues) => {
      if (!userId) throw new Error('Sign in first.');
      const { error } = await supabase
        .from('profiles')
        .update(values as never)
        .eq('id', userId);
      if (error) throw error;
      return values;
    },
    onSuccess: () => invalidate('profile'),
  });
}

export const useCreateCard = () => useCreate<CardValues>('cards');
export const useUpdateCard = () => useUpdate<Partial<CardValues>>('cards');
export const useDeleteCard = () => useRemove('cards');

// --- Bank accounts ---------------------------------------------------------

export type BankAccountValues = {
  bank_name: string;
  nickname: string | null;
  account_type: 'checking' | 'savings';
  last4: string | null;
  color: string;
  balance: number;
  balance_as_of: string | null;
};

export const useCreateBankAccount = () => useCreate<BankAccountValues>('bank_accounts');
export const useUpdateBankAccount = () => useUpdate<Partial<BankAccountValues>>('bank_accounts');
export const useDeleteBankAccount = () => useRemove('bank_accounts');

// --- Bills -----------------------------------------------------------------

export type BillValues = {
  /** Optional. Who issues the bill, for its logo. */
  brand_id: string | null;
  name: string;
  amount: number;
  category_id: string;
  icon_id: string | null;
  recurrence: 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'period';
  next_due_on: string | null;
  starts_on: string | null;
  ends_on: string | null;
  card_id: string | null;
  bank_account_id: string | null;
  note: string | null;
};

export const useCreateBill = () => useCreate<BillValues>('bills');
export const useUpdateBill = () => useUpdate<Partial<BillValues>>('bills');
export const useDeleteBill = () => useRemove('bills');

// --- Salary ----------------------------------------------------------------

export type SalaryValues = {
  name: string;
  amount: number;
  frequency: 'weekly' | 'biweekly' | 'semimonthly' | 'monthly';
  last_payday: string | null;
};

export const useCreateSalarySource = () => useCreate<SalaryValues>('salary_sources');
export const useUpdateSalarySource = () => useUpdate<Partial<SalaryValues>>('salary_sources');
export const useDeleteSalarySource = () => useRemove('salary_sources');

// --- Receipts --------------------------------------------------------------

export type ReceiptValues = {
  brand_id: string | null;
  merchant: string;
  amount: number;
  purchased_on: string;
  category_id: string;
  card_id: string | null;
  bank_account_id: string | null;
  note: string | null;
  source: 'manual' | 'scan' | 'upload';
  image_path: string | null;
};

export const useCreateReceipt = () => useCreate<ReceiptValues>('receipts');
export const useUpdateReceipt = () => useUpdate<Partial<ReceiptValues>>('receipts');
export const useDeleteReceipt = () => useRemove('receipts');

// --- Savings ---------------------------------------------------------------

/**
 * Correcting a month.
 *
 * A null amount clears the correction and puts the month back on what the app
 * worked out — which is what somebody wants after adding the bill they had
 * missed, rather than having to remember the original figure.
 */
export function useAdjustSavingsMonth() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (values: { month: string; amount: number | null; note: string | null }) => {
      const { error } = await supabase.rpc('adjust_savings_month', {
        p_month: values.month,
        p_amount: values.amount,
        p_note: values.note,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => invalidate('monthly-savings'),
  });
}

export function useExcludeSavingsMonth() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (values: { month: string; excluded: boolean }) => {
      const { error } = await supabase.rpc('exclude_savings_month', {
        p_month: values.month,
        p_excluded: values.excluded,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => invalidate('monthly-savings'),
  });
}

// --- Subscriptions ---------------------------------------------------------

export type SubscriptionValues = {
  brand_id: string | null;
  name: string;
  amount: number;
  cycle: 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  next_renewal_on: string | null;
  category_id: string;
  card_id: string | null;
  bank_account_id: string | null;
  note: string | null;
  active: boolean;
};

export const useCreateSubscription = () => useCreate<SubscriptionValues>('subscriptions');
export const useUpdateSubscription = () => useUpdate<Partial<SubscriptionValues>>('subscriptions');
export const useDeleteSubscription = () => useRemove('subscriptions');

/**
 * Replaces which accounts a salary source is paid into.
 *
 * The screen offers a multi-select, so this is a set operation rather than an
 * insert: delete what is there, write what was chosen. Without it the account
 * chips would look like they saved and quietly do nothing.
 */
export function useSetSalaryAccounts() {
  const invalidate = useInvalidate();

  return useMutation({
    mutationFn: async ({ salaryId, accountIds }: { salaryId: string; accountIds: string[] }) => {
      const { error: clearError } = await supabase
        .from('salary_source_accounts')
        .delete()
        .eq('salary_source_id', salaryId);
      if (clearError) throw clearError;

      if (accountIds.length === 0) return { salaryId };

      const rows = accountIds.map((bankAccountId) => ({
        salary_source_id: salaryId,
        bank_account_id: bankAccountId,
      }));
      const { error } = await supabase.from('salary_source_accounts').insert(rows as never);
      if (error) throw error;
      return { salaryId };
    },
    onSuccess: () => {
      invalidate('salary_sources');
      // Which accounts pay lands in is read on its own, for the reminders that
      // are about money arriving. Without this it stays stale until a restart.
      invalidate('salary_source_accounts');
    },
  });
}

// --- Payments ---------------------------------------------------------------

export type PaymentValues = {
  card_id: string | null;
  bank_account_id: string | null;
  amount: number;
  paid_on: string;
  note: string | null;
};

export const useCreatePayment = () => useCreate<PaymentValues>('payments');
export const useDeletePayment = () => useRemove('payments');

// --- Loans ------------------------------------------------------------------

export type SaveLoanValues = {
  name: string;
  iconId: string | null;
  principal: number;
  annualRate: number;
  termMonths: number;
  monthlyPayment: number;
  totalInterest: number;
  firstPaymentOn: string;
  /** When interest starts running. Null lets the server assume a month. */
  fundedOn: string | null;
  dayCountBasis: 'actual/365' | 'actual/360' | '30/360';
  cardId: string | null;
  bankAccountId: string | null;
};

/**
 * Turns a calculated loan into a monthly bill.
 *
 * One RPC rather than two inserts: the bill and its loan detail are created in
 * the same transaction, so there is no window where a bill exists with no loan
 * attached to explain it. The function files it under the 'loans' category and
 * sets the end date from the term.
 */
export function useSaveLoan() {
  const invalidate = useInvalidate();

  return useMutation({
    mutationFn: async (values: SaveLoanValues) => {
      const { data, error } = await supabase.rpc('save_loan', {
        p_name: values.name,
        p_icon_id: values.iconId,
        p_principal: values.principal,
        p_annual_rate: values.annualRate,
        p_term_months: values.termMonths,
        p_monthly_payment: values.monthlyPayment,
        p_total_interest: values.totalInterest,
        p_first_payment_on: values.firstPaymentOn,
        p_recurrence: 'monthly',
        p_card_id: values.cardId,
        p_bank_account_id: values.bankAccountId,
        p_funded_on: values.fundedOn,
        p_day_count_basis: values.dayCountBasis,
      });
      if (error) throw error;
      return data as { id: string };
    },
    onSuccess: () => {
      invalidate('bills');
      invalidate('loans');
    },
  });
}
