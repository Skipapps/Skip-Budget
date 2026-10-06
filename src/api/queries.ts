import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { useCharges, type ChargeRow } from '@/api/charges';
import type { CaptureSource } from '@/api/mutations';
import {
  buildLedger,
  chargePlanKey,
  planKey,
  planOccurrences,
  type PlanOccurrence,
  type RecordedCharge,
  type SourceKind,
} from '@/lib/card-ledger';
import { withTimeout } from '@/lib/deadline';
import { paydaysInRange } from '@/lib/date';
import type { AccrualBasis } from '@/lib/loan';
import type { DateRange } from '@/lib/range';
import { supabase } from '@/lib/supabase';
import { usePro } from '@/api/pro';
import { useUserId } from '@/providers/session-provider';

/**
 * Read hooks for the live data. RLS scopes every table but `profiles` to auth.uid(), so only the
 * profile read filters by id. Queries stay disabled until a session exists, or the first render
 * fires a request that can only return nothing.
 */

export type CardRow = {
  id: string;
  holder: string;
  network: string;
  last4: string | null;
  color: string;
  balance: number;
  /** Date the stated balance was true; null means count every charge. */
  balance_as_of?: string | null;
  /** Day of the month the card's own bill falls due. What a reminder needs. */
  bill_due_day?: number | null;
};

export type BankAccountRow = {
  id: string;
  bank_name: string;
  nickname: string | null;
  account_type: 'checking' | 'savings';
  last4: string | null;
  color: string;
  balance: number;
  balance_as_of?: string | null;
};

export type BillRow = {
  id: string;
  created_at?: string | null;
  /** Optional. Who issues it — null for rent, HOA fees and the like. */
  brand_id?: string | null;
  brands?: { domain: string | null } | null;
  name: string;
  amount: number;
  category_id: string;
  icon_id: string | null;
  recurrence: 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'period';
  next_due_on: string | null;
  starts_on?: string | null;
  ends_on?: string | null;
  card_id: string | null;
  bank_account_id: string | null;
  note?: string | null;
};

export type SalarySourceRow = {
  id: string;
  name: string;
  amount: number;
  frequency: 'weekly' | 'biweekly' | 'semimonthly' | 'monthly';
  last_payday: string | null;
};

/**
 * How long a read may take before it counts as failed. A request that never answers leaves the
 * query pending, the skeleton up and nothing to retry.
 */
const QUERY_TIMEOUT_MS = 12_000;

/**
 * Whether any read behind a derived figure (a balance, a running total, a month's spending) failed:
 * if any input is missing the figure is not the truth and the screen must say so. One helper rather
 * than a hand-written chain per hook, because an omitted query (a failed *charges* read) would
 * silently swap a recorded amount for the plan's projected one. A new input goes in one list.
 */
function anyError(queries: readonly { isError: boolean }[]): boolean {
  return queries.some((query) => query.isError);
}

function useOwnerQuery<T>(key: string, run: () => Promise<T>) {
  const userId = useUserId();
  return useQuery({
    // Keyed by user so switching accounts cannot serve the previous one's cache.
    queryKey: [key, userId],
    enabled: Boolean(userId),
    queryFn: () =>
      withTimeout(
        run(),
        QUERY_TIMEOUT_MS,
        `Could not load ${key.replace(/_/g, ' ')}. Check your connection and try again.`,
      ),
  });
}

export type ProfileRow = {
  id: string;
  display_name: string | null;
  currency: string;
  avatar_id: string | null;
  getting_started_dismissed_at: string | null;
  reminders_enabled_at: string | null;
};

export function useProfile() {
  const userId = useUserId();
  return useOwnerQuery<ProfileRow | null>('profile', async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select(
        'id, display_name, currency, avatar_id, getting_started_dismissed_at, reminders_enabled_at',
      )
      // The select policy also returns friends' and groupmates' rows, so name this one.
      .eq('id', userId!)
      .maybeSingle();
    if (error) throw error;
    return data;
  });
}

export type AnnouncementRow = {
  id: string;
  kind: 'update' | 'feature' | 'news';
  title: string;
  body: string;
  published_at: string;
};

/**
 * News from Skip, newest first. Only what is published: the table's policy hides future-dated rows,
 * so staged news needs no filter here.
 */
export function useAnnouncements() {
  return useOwnerQuery<AnnouncementRow[]>('announcements', async () => {
    const { data, error } = await supabase
      .from('announcements')
      .select('id, kind, title, body, published_at')
      .order('published_at', { ascending: false })
      .limit(50);
    if (error) throw error;
    return (data ?? []) as AnnouncementRow[];
  });
}

export function useCards() {
  return useOwnerQuery<CardRow[]>('cards', async () => {
    const { data, error } = await supabase
      .from('cards')
      .select('id, holder, network, last4, color, balance, balance_as_of, bill_due_day')
      .order('created_at', { ascending: true });
    if (error) throw error;
    return data ?? [];
  });
}

export function useBankAccounts() {
  return useOwnerQuery<BankAccountRow[]>('bank_accounts', async () => {
    const { data, error } = await supabase
      .from('bank_accounts')
      .select('id, bank_name, nickname, account_type, last4, color, balance, balance_as_of')
      .order('created_at', { ascending: true });
    if (error) throw error;
    return data ?? [];
  });
}

export function useBills() {
  return useOwnerQuery<BillRow[]>('bills', async () => {
    const { data, error } = await supabase
      .from('bills')
      .select(
        'id, name, amount, category_id, icon_id, recurrence, next_due_on, starts_on, ends_on, card_id, bank_account_id, created_at, brand_id, brands(domain)',
      )
      .order('next_due_on', { ascending: true, nullsFirst: false });
    if (error) throw error;
    // PostgREST types an embedded relation as an array; it is one row here.
    return (data ?? []) as unknown as BillRow[];
  });
}

export function useSalarySources() {
  return useOwnerQuery<SalarySourceRow[]>('salary_sources', async () => {
    const { data, error } = await supabase
      .from('salary_sources')
      .select('id, name, amount, frequency, last_payday')
      .order('created_at', { ascending: true });
    if (error) throw error;
    return data ?? [];
  });
}

export type SalaryDetailRow = SalarySourceRow & {
  pay_type: 'fixed' | 'hourly';
  hourly_rate: number | null;
  hours_per_week: number | null;
  overtime_hours_per_week: number;
  overtime_multiplier: number;
  deduction_percent: number;
  account_ids: string[];
};

const SALARY_BASE = 'id, name, amount, frequency, last_payday';
const SALARY_HOURLY =
  'pay_type, hourly_rate, hours_per_week, overtime_hours_per_week, overtime_multiplier, deduction_percent';
const SALARY_LINKS = 'salary_source_accounts(bank_account_id)';

type SalaryDetailResult = {
  rows: SalaryDetailRow[];
  /** False until the hourly columns exist in the database. */
  hourlyAvailable: boolean;
};

/**
 * Everything the Salary page needs to edit what is saved, including the linked accounts (Save
 * rewrites the links from this, so leaving them out would unlink every account). Keyed under
 * salary_sources, so any save that invalidates the sources refreshes this too.
 *
 * Tolerates a database without the hourly columns (an app build that reaches people before the
 * migration): it reads the fixed fields alone and says so via `hourlyAvailable`.
 */
export function useSalaryDetails() {
  const userId = useUserId();
  return useQuery({
    queryKey: ['salary_sources', userId, 'details'],
    enabled: Boolean(userId),
    queryFn: () =>
      withTimeout(
        (async (): Promise<SalaryDetailResult> => {
          const full = await supabase
            .from('salary_sources')
            .select(`${SALARY_BASE}, ${SALARY_HOURLY}, ${SALARY_LINKS}`)
            .order('created_at', { ascending: true });

          // 42703: undefined column. Anything else is a real failure.
          const hourlyAvailable = full.error?.code !== '42703';
          const result = hourlyAvailable
            ? full
            : await supabase
                .from('salary_sources')
                .select(`${SALARY_BASE}, ${SALARY_LINKS}`)
                .order('created_at', { ascending: true });
          if (result.error) throw result.error;

          type Raw = Partial<SalaryDetailRow> &
            SalarySourceRow & { salary_source_accounts?: { bank_account_id: string }[] | null };
          const rows = ((result.data ?? []) as unknown as Raw[]).map((row): SalaryDetailRow => ({
            id: row.id,
            name: row.name,
            amount: Number(row.amount),
            frequency: row.frequency,
            last_payday: row.last_payday,
            pay_type: row.pay_type === 'hourly' ? 'hourly' : 'fixed',
            hourly_rate: row.hourly_rate == null ? null : Number(row.hourly_rate),
            hours_per_week: row.hours_per_week == null ? null : Number(row.hours_per_week),
            overtime_hours_per_week: Number(row.overtime_hours_per_week ?? 0),
            overtime_multiplier: Number(row.overtime_multiplier ?? 1.5),
            deduction_percent: Number(row.deduction_percent ?? 0),
            account_ids: (row.salary_source_accounts ?? []).map((link) => link.bank_account_id),
          }));
          return { rows, hourlyAvailable };
        })(),
        QUERY_TIMEOUT_MS,
        'Could not load salary sources. Check your connection and try again.',
      ),
  });
}

export type MonthlySavingRow = {
  /** yyyy-mm-01 — the month is the identity of the row. */
  month: string;
  income: number;
  spent: number;
  /** What the app worked out. Negative on a month that was overspent. */
  saved: number;
  /** What the person says it really left. Null means use the computed figure. */
  adjusted_saved: number | null;
  note: string | null;
  /** Set when the month is kept out of the total. */
  excluded_at: string | null;
};

/** What a month contributes: the correction if there is one, else the maths. */
export function savedFor(month: MonthlySavingRow): number {
  if (month.excluded_at) return 0;
  return Number(month.adjusted_saved ?? month.saved);
}

/**
 * What each finished month left behind. Closes anything outstanding first, so a month that ended
 * while the phone was shut shows up on opening rather than when the monthly job next runs
 * (idempotent, and cheap when there is nothing to close).
 */
export function useMonthlySavings() {
  const userId = useUserId();
  return useQuery({
    queryKey: ['monthly-savings', userId],
    enabled: Boolean(userId),
    queryFn: async (): Promise<MonthlySavingRow[]> => {
      // Failure here is not fatal: the rows already closed are still worth
      // showing, and the job will catch up whatever this missed.
      await supabase.rpc('close_my_savings');

      const { data, error } = await supabase
        .from('monthly_savings')
        .select('month, income, spent, saved, adjusted_saved, note, excluded_at')
        .order('month', { ascending: false });
      if (error) throw error;
      return (data ?? []) as MonthlySavingRow[];
    },
  });
}

/**
 * Accounts that a salary source pays into. An account has no date of its own, so "remind me when
 * pay lands" only means something for one something is paid into; the reminders page uses this to
 * tell.
 */
export function useSalaryAccountIds() {
  const query = useOwnerQuery<{ bank_account_id: string }[]>('salary_source_accounts', async () => {
    const { data, error } = await supabase.from('salary_source_accounts').select('bank_account_id');
    if (error) throw error;
    return (data ?? []) as { bank_account_id: string }[];
  });

  const ids = useMemo(
    () => new Set((query.data ?? []).map((row) => row.bank_account_id)),
    [query.data],
  );

  // `isError` is additive: without it a failed read is indistinguishable from "no salary lands
  // here", and the payday reminder would vanish instead of the screen saying it could not load.
  return {
    ids,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
  };
}

export type PaymentSourceRow = {
  id: string;
  label: string;
  color: string;
  kind: 'card' | 'account';
};

export function usePaymentSources() {
  const cards = useCards();
  const accounts = useBankAccounts();
  const { pro } = usePro();

  // Locked sources take no new spending: beyond the free allowance, only the oldest card and
  // account appear in "Paid with" pickers. Their history keeps counting everywhere. Queries order
  // oldest-first, so slice(0,1) is the allowance.
  const usableCards = pro ? (cards.data ?? []) : (cards.data ?? []).slice(0, 1);
  const usableAccounts = pro ? (accounts.data ?? []) : (accounts.data ?? []).slice(0, 1);

  const sources: PaymentSourceRow[] = [
    ...usableCards.map((card) => ({
      id: card.id,
      // Digits are optional, so the network alone must still read as a label, not a dangling "••".
      label: card.last4 ? `${card.network} ••${card.last4}` : card.network,
      color: card.color,
      kind: 'card' as const,
    })),
    ...usableAccounts.map((account) => ({
      id: account.id,
      label: account.last4
        ? `${account.nickname || account.bank_name} ••${account.last4}`
        : account.nickname || account.bank_name,
      color: account.color,
      kind: 'account' as const,
    })),
  ];

  return {
    sources,
    isLoading: cards.isLoading || accounts.isLoading,
  };
}

/** A receipt with its brand embedded, so a list is one round trip and each row knows its logo. */
export type ReceiptRow = {
  id: string;
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
  brands: { domain: string | null } | null;
};

export function useReceipts() {
  return useOwnerQuery<ReceiptRow[]>('receipts', async () => {
    const { data, error } = await supabase
      .from('receipts')
      .select(
        'id, brand_id, merchant, amount, purchased_on, category_id, card_id, bank_account_id, note, source, image_path, brands(domain)',
      )
      .order('purchased_on', { ascending: false })
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []) as unknown as ReceiptRow[];
  });
}

export type SubscriptionRow = {
  id: string;
  started_on?: string | null;
  created_at?: string | null;
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
  brands: { domain: string | null } | null;
};

export function useSubscriptions() {
  return useOwnerQuery<SubscriptionRow[]>('subscriptions', async () => {
    const { data, error } = await supabase
      .from('subscriptions')
      .select(
        'id, brand_id, name, amount, cycle, next_renewal_on, started_on, created_at, category_id, card_id, bank_account_id, note, active, brands(domain)',
      )
      .order('next_renewal_on', { ascending: true, nullsFirst: false });
    if (error) throw error;
    return (data ?? []) as unknown as SubscriptionRow[];
  });
}

/**
 * A single receipt or subscription for the edit screen. Fetched rather than read from the list
 * cache so a deep link into an edit screen works on a cold start.
 */
export function useReceipt(id: string | undefined) {
  const userId = useUserId();
  return useQuery({
    queryKey: ['receipt', id, userId],
    enabled: Boolean(userId && id),
    queryFn: async (): Promise<ReceiptRow | null> => {
      const { data, error } = await supabase
        .from('receipts')
        .select(
          'id, brand_id, merchant, amount, purchased_on, category_id, card_id, bank_account_id, note, source, image_path, brands(domain)',
        )
        .eq('id', id!)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as ReceiptRow | null;
    },
  });
}

export function useSubscription(id: string | undefined) {
  const userId = useUserId();
  return useQuery({
    queryKey: ['subscription', id, userId],
    enabled: Boolean(userId && id),
    queryFn: async (): Promise<SubscriptionRow | null> => {
      const { data, error } = await supabase
        .from('subscriptions')
        .select(
          'id, brand_id, name, amount, cycle, next_renewal_on, started_on, created_at, category_id, card_id, bank_account_id, note, active, brands(domain)',
        )
        .eq('id', id!)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as SubscriptionRow | null;
    },
  });
}

export function useBill(id: string | undefined) {
  const userId = useUserId();
  return useQuery({
    queryKey: ['bill', id, userId],
    enabled: Boolean(userId && id),
    queryFn: async (): Promise<BillRow | null> => {
      const { data, error } = await supabase
        .from('bills')
        .select(
          'id, name, amount, category_id, icon_id, recurrence, next_due_on, starts_on, ends_on, card_id, bank_account_id, note, brand_id, brands(domain)',
        )
        .eq('id', id!)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as BillRow | null;
    },
  });
}

export function useCard(id: string | undefined) {
  const userId = useUserId();
  return useQuery({
    queryKey: ['card', id, userId],
    enabled: Boolean(userId && id),
    queryFn: async (): Promise<(CardRow & { bill_due_day: number | null }) | null> => {
      const { data, error } = await supabase
        .from('cards')
        .select('id, holder, network, last4, color, balance, balance_as_of, bill_due_day')
        .eq('id', id!)
        .maybeSingle();
      if (error) throw error;
      return data as never;
    },
  });
}

export function useBankAccount(id: string | undefined) {
  const userId = useUserId();
  return useQuery({
    queryKey: ['bank_account', id, userId],
    enabled: Boolean(userId && id),
    queryFn: async (): Promise<BankAccountRow | null> => {
      const { data, error } = await supabase
        .from('bank_accounts')
        .select('id, bank_name, nickname, account_type, last4, color, balance, balance_as_of')
        .eq('id', id!)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as BankAccountRow | null;
    },
  });
}

export type PaymentRow = {
  id: string;
  card_id: string | null;
  bank_account_id: string | null;
  amount: number;
  paid_on: string;
  note: string | null;
};

export function usePayments() {
  return useOwnerQuery<PaymentRow[]>('payments', async () => {
    const { data, error } = await supabase
      .from('payments')
      .select('id, card_id, bank_account_id, amount, paid_on, note')
      .order('paid_on', { ascending: false });
    if (error) throw error;
    return data ?? [];
  });
}

/**
 * Charges in the shape the ledger reads them, plus the set of plans that are on record. The set is
 * built from every charge, not the ones being shown: it answers "has this plan ever been written
 * down", and a bill moved to another card has no charges on the new card but a full history on the
 * old.
 */
function readCharges(rows: ChargeRow[]): { rows: RecordedCharge[]; plans: Set<string> } {
  return {
    rows: rows.map((row) => ({
      id: `charge-${row.id}`,
      planId: chargePlanKey(row),
      label: row.label,
      amount: row.amount,
      date: row.charged_on,
      cardId: row.card_id,
      accountId: row.bank_account_id,
    })),
    plans: new Set(rows.map(chargePlanKey)),
  };
}

type LedgerSources = {
  receipts: ReceiptRow[];
  bills: BillRow[];
  subscriptions: SubscriptionRow[];
  payments: PaymentRow[];
  charges: ReturnType<typeof readCharges>;
};

/**
 * One source's ledger, built from lists that were already fetched. Shared so the cards list and the
 * card detail screen run the same arithmetic and a receipt moves the balance on both.
 */
function ledgerForSource(
  source: CardRow | BankAccountRow,
  kind: SourceKind,
  data: LedgerSources,
  today: string,
) {
  const mine = <T extends { card_id: string | null; bank_account_id: string | null }>(rows: T[]) =>
    rows.filter((row) => (row.card_id ?? row.bank_account_id) === source.id);

  return buildLedger({
    kind,
    statedBalance: source.balance,
    balanceAsOf: source.balance_as_of ?? null,
    today,
    charges: mine(data.receipts).map((row) => ({
      id: `receipt-${row.id}`,
      label: row.merchant,
      amount: row.amount,
      date: row.purchased_on,
      kind: 'receipt' as const,
      domain: row.brands?.domain,
    })),
    // Filtered on the charge's own source, not the plan's: a bill moved to another card keeps last
    // March on the card that actually paid it.
    recorded: data.charges.rows.filter((row) => (row.cardId ?? row.accountId) === source.id),
    recordedPlans: data.charges.plans,
    recurring: [
      ...mine(data.bills)
        .filter((row) => row.next_due_on)
        .map((row) => ({
          id: planKey('bill', row.id),
          label: row.name,
          amount: row.amount,
          nextDate: row.next_due_on!,
          recurrence: row.recurrence,
          kind: 'bill' as const,
          startsOn: row.starts_on,
          createdAt: row.created_at,
          endsOn: row.ends_on,
          cardId: row.card_id,
          accountId: row.bank_account_id,
          domain: row.brands?.domain,
          categoryId: row.category_id,
          iconId: row.icon_id,
        })),
      ...mine(data.subscriptions)
        .filter((row) => row.active && row.next_renewal_on)
        .map((row) => ({
          id: planKey('subscription', row.id),
          label: row.name,
          amount: row.amount,
          nextDate: row.next_renewal_on!,
          recurrence: row.cycle,
          kind: 'subscription' as const,
          startsOn: row.started_on,
          createdAt: row.created_at,
          cardId: row.card_id,
          accountId: row.bank_account_id,
          domain: row.brands?.domain,
        })),
    ],
    payments: mine(data.payments).map((row) => ({
      id: `payment-${row.id}`,
      amount: row.amount,
      date: row.paid_on,
      note: row.note,
    })),
  });
}

export function useSourceLedger(sourceId: string | undefined, today: string) {
  const cards = useCards();
  const accounts = useBankAccounts();
  const receipts = useReceipts();
  const bills = useBills();
  const subscriptions = useSubscriptions();
  const payments = usePayments();
  const charges = useCharges();

  const card = (cards.data ?? []).find((row) => row.id === sourceId);
  const account = (accounts.data ?? []).find((row) => row.id === sourceId);
  const source = card ?? account;
  const kind: SourceKind = card ? 'card' : 'account';

  // Walking a source's whole history is not scroll-cheap and this screen re-renders as it scrolls,
  // so it is held to once per change of the lists behind it.
  const ledger = useMemo(
    () =>
      source
        ? ledgerForSource(
            source,
            kind,
            {
              receipts: receipts.data ?? [],
              bills: bills.data ?? [],
              subscriptions: subscriptions.data ?? [],
              payments: payments.data ?? [],
              charges: readCharges(charges.data ?? []),
            },
            today,
          )
        : null,
    [
      source,
      kind,
      receipts.data,
      bills.data,
      subscriptions.data,
      payments.data,
      charges.data,
      today,
    ],
  );

  return {
    source,
    kind,
    card,
    account,
    ledger,
    isLoading:
      cards.isLoading ||
      accounts.isLoading ||
      receipts.isLoading ||
      bills.isLoading ||
      subscriptions.isLoading ||
      payments.isLoading ||
      charges.isLoading,
    // Every list the ledger is built from, not just the three that name the source: a failed read
    // leaves rows out of a running balance that still renders as complete.
    isError: anyError([cards, accounts, receipts, bills, subscriptions, payments, charges]),
    // Retries the whole set rather than the one query that failed.
    refetch: () => {
      cards.refetch();
      accounts.refetch();
      receipts.refetch();
      bills.refetch();
      subscriptions.refetch();
      payments.refetch();
      charges.refetch();
    },
  };
}

/** Live balances for every card and account, keyed by id, from lists already in the cache. */
export function useSourceBalances(today: string) {
  const cards = useCards();
  const accounts = useBankAccounts();
  const receipts = useReceipts();
  const bills = useBills();
  const subscriptions = useSubscriptions();
  const payments = usePayments();
  const charges = useCharges();

  // Walks every source's whole history, so it is done once per change of the lists, not per render
  // (the cards screen re-renders on scroll).
  const balances = useMemo(() => {
    const data: LedgerSources = {
      receipts: receipts.data ?? [],
      bills: bills.data ?? [],
      subscriptions: subscriptions.data ?? [],
      payments: payments.data ?? [],
      charges: readCharges(charges.data ?? []),
    };

    const next = new Map<string, number>();
    for (const card of cards.data ?? []) {
      next.set(card.id, ledgerForSource(card, 'card', data, today).balance);
    }
    for (const account of accounts.data ?? []) {
      next.set(account.id, ledgerForSource(account, 'account', data, today).balance);
    }
    return next;
  }, [
    cards.data,
    accounts.data,
    receipts.data,
    bills.data,
    subscriptions.data,
    payments.data,
    charges.data,
    today,
  ]);

  return {
    balances,
    /**
     * A balance is only as good as the lists it was walked from. Consumers read `balances.get(id)
     * ?? card.balance`, so a failed read would present the typed opening figure as the live
     * balance.
     */
    isError: anyError([cards, accounts, receipts, bills, subscriptions, payments, charges]),
    refetch: () => {
      cards.refetch();
      accounts.refetch();
      receipts.refetch();
      bills.refetch();
      subscriptions.refetch();
      payments.refetch();
      charges.refetch();
    },
  };
}

/**
 * Everything that moved money inside a window, as one timeline. Receipts are history. Bills and
 * subscriptions store only their NEXT date, so they are projected across the window in both
 * directions, which is what makes "upcoming" possible without a job writing rows ahead of time;
 * salary is projected from its last payday and lands as money in.
 *
 * Card payments are deliberately absent: paying a card moves money between two things you own, so
 * counting it beside the charge it settles would double the spending. It belongs on the card.
 */
export type LedgerEntry = {
  id: string;
  label: string;
  /** Negative is money out, positive is money in. */
  amount: number;
  date: string;
  kind: 'bill' | 'receipt' | 'subscription' | 'income';
  sourceId: string;
  domain?: string | null;
  /** Bills draw their category icon where a brand logo would go. */
  categoryId?: string | null;
  iconId?: string | null;
  /** The bill or subscription a charge came from, so tapping it can edit that. */
  planId?: string;
};

export type LedgerTotals = {
  /** Positive magnitude of everything going out. */
  out: number;
  /** Positive magnitude of everything coming in. */
  in: number;
  /** in - out. Negative means the window costs more than it brings. */
  net: number;
  count: number;
};

export function useLedger(range: DateRange | undefined, today: string) {
  const receipts = useReceipts();
  const subscriptions = useSubscriptions();
  const bills = useBills();
  const salary = useSalarySources();
  const charges = useCharges();

  // No range means everything, which is what a card screen wants.
  const from = range?.from ?? null;
  const to = range?.to ?? '9999-12-31';
  // Projecting every bill and payday across the window is real work (a year range walks each
  // schedule dozens of times), so it is held to once per change of the data or the window.
  const entries = useMemo<LedgerEntry[]>(() => {
    const inRange = (date: string) => date <= to && (!from || date >= from);

    const recorded = readCharges(charges.data ?? []);
    const byPlan = new Map<string, RecordedCharge[]>();
    for (const charge of recorded.rows) {
      const rows = byPlan.get(charge.planId);
      if (rows) rows.push(charge);
      else byPlan.set(charge.planId, [charge]);
    }

    const entries: LedgerEntry[] = [];

    for (const row of receipts.data ?? []) {
      if (!inRange(row.purchased_on)) continue;
      entries.push({
        id: `receipt-${row.id}`,
        label: row.merchant,
        amount: -Math.abs(row.amount),
        date: row.purchased_on,
        kind: 'receipt',
        sourceId: row.card_id ?? row.bank_account_id ?? '',
        domain: row.brands?.domain,
      });
    }

    // Bills and subscriptions run through the same split: what already went out is read off the
    // record, what has not happened yet is projected. The lifetime floor is applied inside, so a
    // plan added today cannot fill earlier months with charges nobody was billed for.
    const expand = (
      plan: Parameters<typeof planOccurrences>[0]['plan'],
      draw: (occurrence: PlanOccurrence) => Omit<LedgerEntry, 'id' | 'date' | 'amount'>,
    ) => {
      for (const occurrence of planOccurrences({
        plan,
        charges: byPlan.get(plan.id) ?? [],
        isRecorded: recorded.plans.has(plan.id),
        from,
        to,
        today,
      })) {
        entries.push({
          ...draw(occurrence),
          id: occurrence.id,
          date: occurrence.date,
          amount: -Math.abs(occurrence.amount),
        });
      }
    };

    for (const row of subscriptions.data ?? []) {
      if (!row.active || !row.next_renewal_on) continue;
      expand(
        {
          id: planKey('subscription', row.id),
          label: row.name,
          amount: row.amount,
          nextDate: row.next_renewal_on,
          recurrence: row.cycle,
          kind: 'subscription',
          startsOn: row.started_on,
          createdAt: row.created_at,
          cardId: row.card_id,
          accountId: row.bank_account_id,
        },
        (occurrence) => ({
          label: occurrence.label,
          kind: 'subscription',
          sourceId: occurrence.cardId ?? occurrence.accountId ?? '',
          domain: row.brands?.domain,
          planId: row.id,
        }),
      );
    }

    for (const row of bills.data ?? []) {
      if (!row.next_due_on) continue;
      expand(
        {
          id: planKey('bill', row.id),
          label: row.name,
          amount: row.amount,
          nextDate: row.next_due_on,
          recurrence: row.recurrence,
          kind: 'bill',
          startsOn: row.starts_on,
          createdAt: row.created_at,
          endsOn: row.ends_on,
          cardId: row.card_id,
          accountId: row.bank_account_id,
        },
        (occurrence) => ({
          label: occurrence.label,
          kind: 'bill',
          sourceId: occurrence.cardId ?? occurrence.accountId ?? '',
          domain: row.brands?.domain,
          categoryId: row.category_id,
          iconId: row.icon_id,
          planId: row.id,
        }),
      );
    }

    for (const row of salary.data ?? []) {
      if (!row.last_payday) continue;
      // The floor bills get, in the only form income has: one payday is what the user told us
      // happened, and walking backwards over years would invent a career in a long window.
      const floor = from && from > row.last_payday ? from : row.last_payday;
      const dates = paydaysInRange(
        new Date(`${row.last_payday}T00:00:00`),
        row.frequency,
        floor,
        to,
      );
      for (const date of dates) {
        entries.push({
          id: `income-${row.id}@${date}`,
          label: row.name || 'Income',
          amount: Math.abs(row.amount),
          date,
          kind: 'income',
          sourceId: '',
        });
      }
    }

    entries.sort((a, b) =>
      a.date === b.date ? a.id.localeCompare(b.id) : b.date.localeCompare(a.date),
    );

    return entries;
  }, [receipts.data, subscriptions.data, bills.data, salary.data, charges.data, from, to, today]);

  const totals = useMemo<LedgerTotals>(
    () => ({
      out: entries.filter((e) => e.amount < 0).reduce((sum, e) => sum + Math.abs(e.amount), 0),
      in: entries.filter((e) => e.amount > 0).reduce((sum, e) => sum + e.amount, 0),
      net: entries.reduce((sum, e) => sum + e.amount, 0),
      count: entries.length,
    }),
    [entries],
  );

  return {
    entries,
    totals,
    isLoading:
      receipts.isLoading ||
      subscriptions.isLoading ||
      bills.isLoading ||
      salary.isLoading ||
      charges.isLoading,
    // Salary and charges count: missing income makes a net figure wrong, and a failed charges read
    // substitutes the projected plan amount for the recorded one with nothing to say it is a guess.
    isError: anyError([receipts, subscriptions, bills, salary, charges]),
    refetch: () => {
      receipts.refetch();
      subscriptions.refetch();
      bills.refetch();
      salary.refetch();
      charges.refetch();
    },
  };
}

export type LoanRow = {
  id: string;
  bill_id: string;
  principal: number;
  annual_rate: number;
  term_months: number;
  monthly_payment: number;
  total_interest: number;
  first_payment_on: string | null;
  /** When interest started running — sets the length of the opening period. */
  funded_on: string | null;
  /**
   * The convention the lender charges under, including 'monthly' rests (see `AccrualBasis` in
   * lib/loan.ts).
   */
  day_count_basis: AccrualBasis;
  /** A balance read off a statement, and the date it was true. */
  statement_on: string | null;
  statement_principal: number | null;
};

/**
 * The loan behind a bill, when there is one. Most bills are not loans, so this returns null rather
 * than erroring; the edit screen uses its presence to decide whether a payment schedule exists.
 */
export function useLoanForBill(billId: string | undefined) {
  const userId = useUserId();
  return useQuery({
    queryKey: ['loan', billId, userId],
    enabled: Boolean(userId && billId),
    queryFn: async (): Promise<LoanRow | null> => {
      const { data, error } = await supabase
        .from('loans')
        .select(
          'id, bill_id, principal, annual_rate, term_months, monthly_payment, total_interest, first_payment_on, funded_on, day_count_basis, statement_on, statement_principal',
        )
        .eq('bill_id', billId!)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as LoanRow | null;
    },
  });
}
