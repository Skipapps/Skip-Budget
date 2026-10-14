import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';

import { guardLoanBillDates } from '@/api/entry-values';
import type { PastChargesScope } from '@/api/past-charges';
import type { AccrualBasis } from '@/lib/loan';
import { stopBillValues, type StoppableBill } from '@/lib/plan-stop';
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
  // 'loans' too: a loan's own page reads its bill's card or account by name.
  cards: ['bills', 'receipts', 'subscriptions', 'payments', 'habits', 'receipt_books', 'loans'],
  bank_accounts: [
    'bills',
    'receipts',
    'subscriptions',
    'payments',
    'salary_sources',
    'habits',
    'receipt_books',
    'loans',
  ],
  // A loan is read with its bill, and goes with it ("on delete cascade").
  bills: ['loans'],
  // Usage rows point at their receipt; one read by camera or upload writes its row as it is saved.
  receipts: ['capture_usage'],
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

/**
 * The row id a form keeps for its visit (`randomUUID()` from expo-crypto), so saving again after a
 * lost answer finds the first row instead of filing a second. Optional on every create.
 */
export type ClientId = { id?: string };

type Row = Record<string, unknown>;

/**
 * Client ids whose last write got no answer, so the row may or may not exist. Module-wide rather
 * than per hook: it is a fact about the server, and the id outlives any one component holding it.
 */
const unanswered = new Set<string>();

/**
 * True when a failed write may still have been made. PostgREST and Postgres answer every refusal
 * with a code, and that request's transaction is rolled back. A dropped connection (postgrest-js
 * answers code '' with status 0), a gateway's own error page, or a deadline carries none.
 */
export function mayHaveWritten(error: unknown): boolean {
  const code = (error as { code?: unknown } | null | undefined)?.code;
  return typeof code !== 'string' || code === '';
}

/**
 * Postgres leaves the key out of the detail on a table with row level security, so the constraint
 * name is the only sign. Every create table keeps Postgres's default primary key name.
 */
function idTaken(error: { code?: string; message?: string }, table: string): boolean {
  return error.code === '23505' && Boolean(error.message?.includes(`"${table}_pkey"`));
}

async function rewrite(table: string, values: Row, columns: string, id: string): Promise<Row> {
  const { data, error } = await supabase
    .from(table)
    .update(values as never)
    .eq('id', id)
    .select(columns);
  if (error) throw error;
  const rows = data as unknown as Row[] | null;
  if (!rows || rows.length === 0) throw new Error(NOTHING_UPDATED);
  return rows[0];
}

async function insertOrRewrite(
  table: string,
  values: Row,
  userId: string,
  columns: string,
  id: string,
): Promise<Row> {
  // Looked up, not inserted and caught: each table's before-insert walls (free allowance, scan
  // count, Pro) run before the key check, so a re-insert could be refused over the very row it
  // would duplicate.
  if (unanswered.has(id)) {
    const found = await supabase.from(table).select('id').eq('id', id).maybeSingle();
    if (found.error) throw found.error;
    if (found.data) return rewrite(table, values, columns, id);
  }
  const { data, error } = await supabase
    .from(table)
    .insert({ ...values, id, user_id: userId } as never)
    .select(columns)
    .single();
  // The unanswered attempt landed after the look, or a second tap raced the first.
  if (error && idTaken(error, table)) return rewrite(table, values, columns, id);
  if (error) throw error;
  return data as unknown as Row;
}

/**
 * Inserts one row and answers with its `columns`. Given a client id, a save repeated after an
 * attempt that got no answer files nothing new: a row the first attempt left is found and given
 * the values as they are now, since the person may have changed a field before saving again.
 * Without an unanswered attempt before it, it is still one request.
 */
export async function insertOnce(
  table: string,
  values: Row,
  userId: string,
  columns: string,
  id?: string,
): Promise<Row> {
  if (!id) {
    const { data, error } = await supabase
      .from(table)
      .insert({ ...values, user_id: userId } as never)
      .select(columns)
      .single();
    if (error) throw error;
    return data as unknown as Row;
  }
  try {
    const row = await insertOrRewrite(table, values, userId, columns, id);
    unanswered.delete(id);
    return row;
  } catch (error) {
    if (mayHaveWritten(error)) unanswered.add(id);
    throw error;
  }
}

function useCreate<TInput extends Record<string, unknown>>(table: string) {
  const userId = useUserId();
  const invalidate = useInvalidate();

  return useMutation({
    // No generated Database types, so a generic payload cannot be narrowed; the per-table Values
    // types keep call sites honest.
    mutationFn: async ({ id, ...values }: TInput & ClientId) => {
      if (!userId) throw new Error('Sign in first.');
      const row = await insertOnce(table, values, userId, 'id', id);
      return row as { id: string };
    },
    onSuccess: () => invalidate(table),
  });
}

/**
 * Where a table's single-row read is cached (useReceipt, useSubscription, useBill, useCard,
 * useBankAccount). The list key does not reach it, so an edit page reopened inside staleTime would
 * show the values from before the save, and could write them back.
 */
const SINGLE_ROW_KEY: Record<string, string> = {
  receipts: 'receipt',
  subscriptions: 'subscription',
  bills: 'bill',
  cards: 'card',
  bank_accounts: 'bank_account',
};

/**
 * An update that cannot succeed quietly. PostgREST answers an update whose filter matches nothing
 * (row deleted, or hidden by RLS) with 204 and no error. `select('id')` returns the touched rows,
 * so an empty result becomes an error the user can act on instead of a silent no-op.
 */
function useUpdate<TInput extends Record<string, unknown>>(
  table: string,
  /** Settles what is written from what is stored, before the write. */
  prepare?: (id: string, values: TInput) => Promise<TInput>,
) {
  const client = useQueryClient();
  const invalidate = useInvalidate();

  return useMutation({
    mutationFn: async ({ id, values }: { id: string; values: TInput }) => {
      const written = prepare ? await prepare(id, values) : values;
      const { data, error } = await supabase
        .from(table)
        .update(written as never)
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
  /**
   * Optional credit limit, from `creditLimitValue`. Send it on every save from the card form, null
   * when the field is empty, so clearing it removes the limit. A database without the column
   * refuses a save that names it, so the migration goes live first.
   */
  credit_limit?: number | null;
};

/**
 * The credit limit field as typed ("10000", "2500.50") to the value saved: a number above zero, or
 * null for an empty field. Zero means no limit too: the database refuses a limit of zero or less,
 * and a bar against nothing would say nothing. The keypad settles at two decimals, so nothing is
 * rounded here.
 */
export function creditLimitValue(typed: string): number | null {
  const value = Number(typed.trim());
  return typed.trim() !== '' && Number.isFinite(value) && value > 0 ? value : null;
}

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

/**
 * Reads what `guardLoanBillDates` needs before an edit writes a bill's dates. A failed read fails
 * the save: written unguarded, a loan could restart below its count floor and back-fill spending.
 */
async function guardBillDates(id: string, values: Partial<BillValues>) {
  if (!('next_due_on' in values) && !('starts_on' in values)) return values;
  const [bill, loan] = await Promise.all([
    supabase.from('bills').select('icon_id, next_due_on, starts_on').eq('id', id).maybeSingle(),
    supabase.from('loans').select('id').eq('bill_id', id).maybeSingle(),
  ]);
  if (bill.error) throw bill.error;
  if (loan.error) throw loan.error;
  // Gone: the update matches nothing and says so.
  if (!bill.data) return values;
  const stored = bill.data as {
    icon_id: string | null;
    next_due_on: string | null;
    starts_on: string | null;
  };
  return guardLoanBillDates(values, { ...stored, hasLoan: Boolean(loan.data) });
}

export const useCreateBill = () => useCreate<BillValues>('bills');
export const useUpdateBill = () => useUpdate<Partial<BillValues>>('bills', guardBillDates);
export const useDeleteBill = () => useRemove('bills');

export type StopBillInput = {
  /** The bill (or the loan's bill) as last read: its dates decide what the stop writes. */
  bill: { id: string } & StoppableBill;
  /** The person's today (yyyy-mm-dd, `useToday`): the stop day, whose due is still recorded. */
  today: string;
};

/**
 * "Keep past" on a bill or a loan: stops it at the end of today (`stopBillValues`) and leaves every
 * charge, payoff and the reminder as they are. Nothing after today is recorded, projected or
 * reminded; a loan reads as stopped on today. Not through `useUpdateBill`: its loan guard puts a
 * later start back, which `bills_period_order` then refuses.
 *
 * One update, made only while the start and end are still the ones the stop was worked out from:
 * if another phone changed them meanwhile, nothing is written and it fails (NOTHING_UPDATED).
 */
export function useStopBill() {
  const client = useQueryClient();
  const invalidate = useInvalidate();

  return useMutation({
    mutationFn: async ({ bill, today }: StopBillInput) => {
      let query = supabase
        .from('bills')
        .update(stopBillValues(bill, today) as never)
        .eq('id', bill.id);
      query = bill.starts_on ? query.eq('starts_on', bill.starts_on) : query.is('starts_on', null);
      query = bill.ends_on ? query.eq('ends_on', bill.ends_on) : query.is('ends_on', null);
      const { data, error } = await query.select('id');
      if (error) throw error;
      if (!data || data.length === 0) throw new Error(NOTHING_UPDATED);
      return { id: bill.id };
    },
    onSuccess: ({ id }) => {
      invalidate('bills');
      invalidate('loans');
      client.invalidateQueries({ queryKey: ['bill', id] });
      client.invalidateQueries({ queryKey: ['loan', id] });
    },
  });
}

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
 * Deletes pay a Save filed on this visit that the person then dropped, with any pay recorded for it.
 * A saved salary's delete keeps its received pay as history (the key is set to null), but this pay
 * was never seen saved: a payday the sweep or a later Save recorded for it would stay counted as
 * income. Safe on a row that never landed: both deletes may match nothing.
 */
export function useDeleteUnseenPay() {
  const invalidate = useInvalidate();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error: payError } = await supabase
        .from('pay_received')
        .delete()
        .eq('salary_source_id', id);
      if (payError) throw payError;
      const { error } = await supabase.from('salary_sources').delete().eq('id', id);
      if (error) throw error;
      return { id };
    },
    onSuccess: () => {
      invalidate('salary_sources');
      invalidate('pay_received');
    },
  });
}

/**
 * How a receipt got into the app. Mirrors the `public.capture_source` enum. 'scan', 'upload' and
 * 'voice' are Pro verbs, limited or refused on a free account by the server's `enforce_scan_is_pro`
 * trigger; 'habit' is a tapped day on a spending habit, which every plan may file.
 */
export type CaptureSource = 'manual' | 'scan' | 'upload' | 'voice' | 'habit';

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
  /**
   * The receipt book; null is General. Left out by anyone with no book, so a database without
   * books still takes the write.
   */
  book_id?: string | null;
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

/**
 * "Keep past" on a subscription: Cancelled (`active: false`), its charges and reminder left as they
 * are. The recorders, the schedule roll, projections and reminders all skip an inactive one.
 * Takes the subscription's id.
 */
export function useStopSubscription() {
  const client = useQueryClient();
  const invalidate = useInvalidate();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('subscriptions')
        .update({ active: false } as never)
        .eq('id', id)
        .select('id');
      if (error) throw error;
      if (!data || data.length === 0) throw new Error(NOTHING_UPDATED);
      return { id };
    },
    onSuccess: ({ id }) => {
      invalidate('subscriptions');
      client.invalidateQueries({ queryKey: ['subscription', id] });
    },
  });
}

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
  /**
   * The account the money came out of; null for money from outside. Sent as null rather than left
   * off, so a save repeated after a lost answer clears an account no longer chosen.
   */
  from_bank_account_id: string | null;
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
  /**
   * Payments changed on the schedule, as `paymentOverridesJson` writes them: payment numbers 1 to
   * term - 1 as string keys, amounts exact to the cent. Null or left out when nothing changed.
   */
  paymentOverrides?: Record<string, number> | null;
  /** The contract's payoff date (yyyy-mm-dd) when the changes end it before the term; else null. */
  lastPaymentOn?: string | null;
  /**
   * "Add to monthly bills". False keeps the loan on the Loans page, its own page and its reminder,
   * but out of spending and the Bills list. Left out means true.
   */
  inSpending?: boolean;
  /** The day of the month payments fall on (1–31), clamped to short months. */
  paymentDay?: number | null;
  /**
   * The person's today (yyyy-mm-dd). Payments before it were made before the loan was added, so
   * they are not spending; the Loans page still shows them.
   */
  countsFrom?: string | null;
};

/**
 * Turns a calculated loan into a monthly bill. One RPC so the bill and its loan detail are created
 * in a single transaction; the function files it under 'loans' and sets the end date from the term.
 */
export function useSaveLoan() {
  const invalidate = useInvalidate();

  return useMutation({
    mutationFn: async (values: SaveLoanValues) => {
      const overrides =
        values.paymentOverrides && Object.keys(values.paymentOverrides).length > 0
          ? values.paymentOverrides
          : null;
      const firstDay = Number(values.firstPaymentOn.slice(8, 10));
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
        // Named only when set: a loan with no changes is the call a database without these
        // parameters still accepts, and one with changes is refused there rather than saved without.
        ...(overrides ? { p_payment_overrides: overrides } : {}),
        ...(values.lastPaymentOn ? { p_last_payment_on: values.lastPaymentOn } : {}),
        // The same for these three: each is named only when it changes what is saved. The payment
        // day matters only when the first payment was clamped (day 31, paid 28 Feb), and the count
        // floor only when the first payment came before it.
        ...(values.inSpending === false ? { p_in_spending: false } : {}),
        ...(values.paymentDay != null && values.paymentDay !== firstDay
          ? { p_payment_day: values.paymentDay }
          : {}),
        ...(values.countsFrom && values.countsFrom > values.firstPaymentOn
          ? { p_counts_from: values.countsFrom }
          : {}),
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

export type UpdateLoanValues = Omit<SaveLoanValues, 'inSpending' | 'countsFrom'> & {
  /** The loan's bill, which keeps its id, charges and reminder through the edit. */
  billId: string;
  /**
   * "Add to monthly bills" as the page shows it. Off keeps what was recorded and records nothing
   * new; back on counts from `today`, never filling in the time it was off.
   */
  inSpending: boolean;
  /** The person's today (yyyy-mm-dd, `useToday`): where a switch back on counts from. */
  today: string;
  /**
   * The answer to "Change past payments too?". 'all' also gives every payment already recorded the
   * new name, monthly payment and paid from, in the same transaction as the edit; 'upcoming', or
   * left out, keeps them as they landed.
   */
  past?: PastChargesScope;
};

/**
 * Saves an edited loan over the one it was: the loan and its bill in one transaction, the bill id
 * kept. What it counts as spending never reaches before the day the loan was added or into a month
 * already charged (the rules are update_loan's). Refused as save_loan is, with the same words for
 * `refusedLoanSave`; a loan deleted meanwhile is refused with P0002.
 *
 * With `past: 'all'` it is `update_loan_and_charges`: the same edit, then the recorded payments,
 * all or nothing. A database without that function refuses it (PGRST202) and nothing is written;
 * there is no fallback to the plain edit, which would save the loan without its past.
 */
export function useUpdateLoan() {
  const client = useQueryClient();
  const invalidate = useInvalidate();

  return useMutation({
    mutationFn: async (values: UpdateLoanValues) => {
      const overrides =
        values.paymentOverrides && Object.keys(values.paymentOverrides).length > 0
          ? values.paymentOverrides
          : null;
      const firstDay = Number(values.firstPaymentOn.slice(8, 10));
      const { error } = await supabase.rpc(
        values.past === 'all' ? 'update_loan_and_charges' : 'update_loan',
        {
          p_bill_id: values.billId,
          p_name: values.name,
          p_icon_id: values.iconId,
          p_principal: values.principal,
          p_annual_rate: values.annualRate,
          p_term_months: values.termMonths,
          p_monthly_payment: values.monthlyPayment,
          p_total_interest: values.totalInterest,
          p_first_payment_on: values.firstPaymentOn,
          p_funded_on: values.fundedOn,
          p_day_count_basis: values.dayCountBasis,
          p_card_id: values.cardId,
          p_bank_account_id: values.bankAccountId,
          p_in_spending: values.inSpending,
          // Every optional part is sent, null for none: the edit replaces the contract, so a change,
          // a last payment or a payment day left out is one taken away. The day is kept only when it
          // is not the first payment's own, as save_loan keeps it, so an unchanged loan saves as it was.
          p_payment_day:
            values.paymentDay != null && values.paymentDay !== firstDay ? values.paymentDay : null,
          p_payment_overrides: overrides,
          p_last_payment_on: values.lastPaymentOn ?? null,
          p_today: values.today,
        },
      );
      if (error) throw error;
      return { id: values.billId };
    },
    onSuccess: ({ id }, { past }) => {
      invalidate('bills');
      invalidate('loans');
      // The bill page and its edit form read these single-row keys, which the lists' keys miss.
      client.invalidateQueries({ queryKey: ['bill', id] });
      client.invalidateQueries({ queryKey: ['loan', id] });
      if (past === 'all') client.invalidateQueries({ queryKey: ['charges'] });
    },
  });
}

export type RecordPayoffValues = {
  /** The loan's bill. */
  billId: string;
  /** yyyy-mm-dd: not after today, not before the loan started. */
  paidOn: string;
  /** Above zero, in whole cents; the database refuses anything else rather than round it. */
  amount: number;
  /**
   * 'full' pays the loan off on `paidOn`: its bill ends that day, so nothing after it is charged,
   * shown as coming up or reminded. It must come after the last payment made.
   */
  kind: 'full' | 'partial';
  cardId: string | null;
  bankAccountId: string | null;
  /**
   * A partial payoff's new last payment (yyyy-mm-dd): the schedule's last row with this payoff in
   * it. The bill ends there, so instalments the loan no longer has are not charged. Null keeps the
   * bill's end. Not read for a full payoff.
   */
  lastPaymentOn: string | null;
  /** The person's today (yyyy-mm-dd, `useToday`); left out, the server reads the profile's day. */
  today?: string;
};

/**
 * Records money paid on a loan beyond its instalments, and ends or shortens its bill to match, in
 * one transaction (`record_loan_payoff`). It counts as spending on its own date from its own card or
 * account when the loan's "Add to monthly bills" is on. Refused (P0001) for: a date after today or
 * before the loan started; an amount not above zero in whole cents; a loan already paid off or
 * already finished by that date; a full payoff on or before a payment made; a last payment outside
 * the term. P0002 when the loan is gone. Until the payoffs migration is live, every call is refused
 * with PGRST202 and nothing is written.
 */
export function useRecordPayoff() {
  const client = useQueryClient();
  const invalidate = useInvalidate();

  return useMutation({
    mutationFn: async (values: RecordPayoffValues) => {
      const { data, error } = await supabase.rpc('record_loan_payoff', {
        p_bill_id: values.billId,
        p_paid_on: values.paidOn,
        p_amount: values.amount,
        p_kind: values.kind,
        p_card_id: values.cardId,
        p_bank_account_id: values.bankAccountId,
        p_last_payment_on: values.kind === 'partial' ? values.lastPaymentOn : null,
        p_today: values.today ?? null,
      });
      if (error) throw error;
      return { id: (data as { id: string }).id, billId: values.billId };
    },
    onSuccess: ({ billId }) => invalidatePayoff(client, invalidate, billId),
  });
}

export type DeletePayoffValues = {
  /** The loan's bill. */
  billId: string;
  payoffId: string;
  /**
   * The loan's last payment (yyyy-mm-dd) with this payoff taken out: the schedule's last row on the
   * payoffs that stay. The bill ends there again, so the instalments the payoff stood in for are
   * charged. Null puts back the end a full payoff replaced, and leaves a partial's where it is.
   */
  lastPaymentOn: string | null;
};

/**
 * Removes a payoff typed wrong and puts its loan's bill back (`delete_loan_payoff`). One already
 * gone (a second tap, another phone) is not an error. Until the payoffs migration is live, every
 * call is refused with PGRST202.
 */
export function useDeletePayoff() {
  const client = useQueryClient();
  const invalidate = useInvalidate();

  return useMutation({
    mutationFn: async (values: DeletePayoffValues) => {
      const { error } = await supabase.rpc('delete_loan_payoff', {
        p_id: values.payoffId,
        p_last_payment_on: values.lastPaymentOn,
      });
      if (error) throw error;
      return { billId: values.billId };
    },
    onSuccess: ({ billId }) => invalidatePayoff(client, invalidate, billId),
  });
}

/**
 * Everything a payoff moves: its bill's dates (bills, and 'loans' with them, where payoffs are
 * read), the ledger built from both, and the bill and loan's single-row keys.
 */
function invalidatePayoff(
  client: ReturnType<typeof useQueryClient>,
  invalidate: ReturnType<typeof useInvalidate>,
  billId: string,
) {
  invalidate('bills');
  invalidate('loans');
  client.invalidateQueries({ queryKey: ['bill', billId] });
  client.invalidateQueries({ queryKey: ['loan', billId] });
}
