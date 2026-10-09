import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';

import type { AccrualBasis } from '@/lib/loan';
import { supabase } from '@/lib/supabase';
import { useUserId } from '@/providers/session-provider';
import type { PayFrequency } from '@/lib/date';

/**
 * Every write in the app. Inserts send user_id explicitly: the with-check policy compares the row
 * to auth.uid() and the column has no default. Updates and deletes filter on id alone, since RLS
 * already refuses rows owned by anyone else.
 */

/**
 * An edit to a *record* matched no row: almost always deleted on another device, so the message
 * points at re-opening the list.
 */
export const NOTHING_UPDATED =
  'That is no longer there — it may have been deleted on another device. Open the list again.';

/**
 * A *setting* (profile, receipts reminder) matched no row. There is exactly one per account and no
 * list to reopen, so NOTHING_UPDATED's explanation would be a guess.
 */
export const NOTHING_SAVED = 'Skip could not save that. Close this and open it again.';

/** Tables whose totals feed the dashboard, so a write there refreshes it too. */
const AFFECTS_DASHBOARD = new Set([
  'bills',
  'receipts',
  'subscriptions',
  'salary_sources',
  'payments',
]);

/**
 * Tables whose rows point at another table's rows. Deleting a card sets the foreign keys on what
 * was charged to it to null ("on delete set null"), so those caches are stale until re-read.
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
      // No generated Database types, so a generic payload cannot be narrowed; the cast buys one
      // shared helper, and the per-table Values types keep call sites honest.
      const payload = { ...values, user_id: userId } as never;
      const { data, error } = await supabase.from(table).insert(payload).select('id').single();
      if (error) throw error;
      return data as { id: string };
    },
    onSuccess: () => invalidate(table),
  });
}

/**
 * Where a table's single-row read is cached (useReceipt, useSubscription, useBill). The list key
 * does not reach it, so an edit page reopened inside staleTime would show the values from before
 * the save, and could write them back.
 */
const SINGLE_ROW_KEY: Record<string, string> = {
  receipts: 'receipt',
  subscriptions: 'subscription',
  bills: 'bill',
};

/**
 * An update that cannot succeed quietly. PostgREST answers an update whose filter matches nothing
 * (row deleted, or hidden by RLS) with 204 and no error. `select('id')` returns the touched rows,
 * so an empty result becomes an error the user can act on instead of a silent no-op.
 */
function useUpdate<TInput extends Record<string, unknown>>(table: string) {
  const client = useQueryClient();
  const invalidate = useInvalidate();

  return useMutation({
    mutationFn: async ({ id, values }: { id: string; values: TInput }) => {
      const { data, error } = await supabase
        .from(table)
        .update(values as never)
        .eq('id', id)
        .select('id');
      if (error) throw error;
      if (!data || data.length === 0) throw new Error(NOTHING_UPDATED);
      return { id };
    },
    onSuccess: ({ id }) => {
      invalidate(table);
      const single = SINGLE_ROW_KEY[table];
      if (single) client.invalidateQueries({ queryKey: [single, id] });
    },
  });
}

/**
 * A delete that is allowed to match nothing: the row the person wanted gone is already gone (double
 * tap, removed on another device), so raising NOTHING_UPDATED would be noise. This gives up
 * detecting a delete that RLS refuses (also 204); no screen reaches one, since every table the app
 * deletes from shows each person only their own rows. Revisit if a shared table becomes directly
 * deletable.
 */
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

export type ProfileValues = {
  display_name?: string | null;
  /** Which bundled avatar was chosen; null for none. See theme/avatars.ts. */
  avatar_id?: string | null;
  getting_started_dismissed_at?: string | null;
  reminders_enabled_at?: string | null;
};

/**
 * Keyed by the signed-in user rather than a row id, so it bypasses useUpdate. Its query key is
 * 'profile', singular, which no table name would match.
 */
export function useUpdateProfile() {
  const userId = useUserId();
  const invalidate = useInvalidate();

  return useMutation({
    mutationFn: async (values: ProfileValues) => {
      if (!userId) throw new Error('Sign in first.');
      const { data, error } = await supabase
        .from('profiles')
        .update(values as never)
        .eq('id', userId)
        .select('id');
      if (error) throw error;
      // Same 204 trap as useUpdate; the wording differs because the cause does (see NOTHING_SAVED).
      if (!data || data.length === 0) throw new Error(NOTHING_SAVED);
      return values;
    },
    onSuccess: () => invalidate('profile'),
  });
}

export const useCreateCard = () => useCreate<CardValues>('cards');
export const useUpdateCard = () => useUpdate<Partial<CardValues>>('cards');
export const useDeleteCard = () => useRemove('cards');

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

/**
 * The owner's logo choice on a receipt, subscription or bill (see logoDomainOf). Optional, and best
 * left out unless the person chose something: a database without these columns refuses any write
 * that names them.
 */
type LogoValues = {
  /** A bare host name ("netflix.com"); the database refuses anything else. */
  logo_domain?: string | null;
  /** True draws letters instead of any logo. */
  logo_hidden?: boolean;
};

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
} & LogoValues;

export const useCreateBill = () => useCreate<BillValues>('bills');
export const useUpdateBill = () => useUpdate<Partial<BillValues>>('bills');
export const useDeleteBill = () => useRemove('bills');

export type SalaryValues = {
  name: string;
  /** What lands each payday. Worked out from the hourly fields when hourly. */
  amount: number;
  frequency: PayFrequency;
  last_payday: string | null;
  /** Only sent once the database has the hourly columns. */
  pay_type?: 'fixed' | 'hourly';
  hourly_rate?: number | null;
  hours_per_week?: number | null;
  overtime_hours_per_week?: number;
  overtime_multiplier?: number;
  deduction_percent?: number;
};

export const useCreateSalarySource = () => useCreate<SalaryValues>('salary_sources');
export const useUpdateSalarySource = () => useUpdate<Partial<SalaryValues>>('salary_sources');
export const useDeleteSalarySource = () => useRemove('salary_sources');

/**
 * How a receipt got into the app. Mirrors the `public.capture_source` enum; everything but 'manual'
 * is a Pro verb, refused on a free account by the server's `enforce_scan_is_pro` trigger.
 */
export type CaptureSource = 'manual' | 'scan' | 'upload' | 'voice';

export type ReceiptValues = {
  brand_id: string | null;
  merchant: string;
  amount: number;
  purchased_on: string;
  category_id: string;
  card_id: string | null;
  bank_account_id: string | null;
  note: string | null;
  source: CaptureSource;
  image_path: string | null;
} & LogoValues;

export const useCreateReceipt = () => useCreate<ReceiptValues>('receipts');
export const useUpdateReceipt = () => useUpdate<Partial<ReceiptValues>>('receipts');
export const useDeleteReceipt = () => useRemove('receipts');

export type SubscriptionValues = {
  brand_id: string | null;
  name: string;
  amount: number;
  cycle: 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  next_renewal_on: string | null;
  /**
   * The first renewal the app counts: renewals are walked back from `next_renewal_on` no further
   * than this. Without it the floor is the row's creation day, so an earlier renewal that month is
   * missed.
   */
  started_on: string | null;
  category_id: string;
  card_id: string | null;
  bank_account_id: string | null;
  note: string | null;
  active: boolean;
} & LogoValues;

export const useCreateSubscription = () => useCreate<SubscriptionValues>('subscriptions');
export const useUpdateSubscription = () => useUpdate<Partial<SubscriptionValues>>('subscriptions');
export const useDeleteSubscription = () => useRemove('subscriptions');

const LOGO_TABLES = {
  receipt: 'receipts',
  subscription: 'subscriptions',
  bill: 'bills',
} as const;

export type RowLogoInput = {
  kind: keyof typeof LOGO_TABLES;
  id: string;
  logo_domain: string | null;
  logo_hidden: boolean;
};

/**
 * Saves the logo choice on one receipt, subscription or bill: those two columns and nothing else,
 * so a Change logo page cannot write back a stale copy of the rest of the row.
 */
export function useSetRowLogo(): UseMutationResult<void, Error, RowLogoInput> {
  const userId = useUserId();
  const client = useQueryClient();
  const invalidate = useInvalidate();

  return useMutation({
    mutationFn: async ({ kind, id, logo_domain, logo_hidden }: RowLogoInput) => {
      if (!userId) throw new Error('Sign in first.');
      const { data, error } = await supabase
        .from(LOGO_TABLES[kind])
        .update({ logo_domain: logo_domain?.trim().toLowerCase() || null, logo_hidden } as never)
        .eq('id', id)
        // A choice must never reach anyone else's row, even if a policy is one day widened to
        // share these tables, so the owner is named rather than left to RLS alone.
        .eq('user_id', userId)
        .select('id');
      if (error) throw error;
      if (!data || data.length === 0) throw new Error(NOTHING_UPDATED);
    },
    onSuccess: (_, { kind, id }) => {
      invalidate(LOGO_TABLES[kind]);
      // The edit and detail pages read a single row under its own key, which the list key misses.
      client.invalidateQueries({ queryKey: [kind, id] });
    },
  });
}

/**
 * Replaces which accounts a salary source is paid into: delete, then insert, because the screen is
 * a multi-select.
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
      // Read on their own (for the money-arriving reminders), so they need their own invalidation.
      invalidate('salary_source_accounts');
    },
  });
}

/**
 * Points every existing salary source at one more account. Additive, unlike useSetSalaryAccounts:
 * the account form does not know the links each source already carries, and the composite key makes
 * re-adding a link a no-op.
 */
export function useLinkAccountToSalaries() {
  const invalidate = useInvalidate();

  return useMutation({
    mutationFn: async (bankAccountId: string) => {
      // The pay schedules the switch named: a one-off pay has landed somewhere already.
      const { data: sources, error } = await supabase
        .from('salary_sources')
        .select('id')
        .neq('frequency', 'once');
      if (error) throw error;

      const rows = (sources ?? []).map((source: { id: string }) => ({
        salary_source_id: source.id,
        bank_account_id: bankAccountId,
      }));
      if (rows.length === 0) return;

      const { error: linkError } = await supabase
        .from('salary_source_accounts')
        .upsert(rows as never, {
          onConflict: 'salary_source_id,bank_account_id',
          ignoreDuplicates: true,
        });
      if (linkError) throw linkError;
    },
    onSuccess: () => {
      invalidate('salary_source_accounts');
    },
  });
}

export type PaymentValues = {
  card_id: string | null;
  bank_account_id: string | null;
  /** The account the money came out of. Left off for money from outside. */
  from_bank_account_id?: string;
  amount: number;
  paid_on: string;
  note: string | null;
};

export const useCreatePayment = () => useCreate<PaymentValues>('payments');
export const useDeletePayment = () => useRemove('payments');

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
  /**
   * The convention the lender charges under ('monthly' rests included). An older database's check
   * constraint rejects it: a loud failure, not a loan filed under the wrong convention.
   */
  dayCountBasis: AccrualBasis;
  cardId: string | null;
  bankAccountId: string | null;
};

/**
 * Turns a calculated loan into a monthly bill. One RPC so the bill and its loan detail are created
 * in a single transaction; the function files it under 'loans' and sets the end date from the term.
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
