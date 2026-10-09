import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { useCharges, type ChargeRow } from '@/api/charges';
import { usePayReceived } from '@/api/pay';
import type { CaptureSource } from '@/api/mutations';
import {
  chargePlanKey,
  planKey,
  planOccurrences,
  type HabitMark,
  type PlanOccurrence,
  type RecordedCharge,
  type SourceKind,
} from '@/lib/card-ledger';
import { habitColor, type HabitColor } from '@/data/habit-colors';
import { t } from '@/i18n';
import { historyFloor, NOTHING_HIDDEN, type HiddenHistory } from '@/lib/allowance';
import { withTimeout } from '@/lib/deadline';
import { moneyBook, type BookSpend } from '@/lib/money-book';
import { paydaysInRange, type PayFrequency } from '@/lib/date';
import { landingAccount, payProjectionStart } from '@/lib/pay';
import type { AccrualBasis } from '@/lib/loan';
import { logoDomainOf } from '@/lib/logo-domain';
import type { DateRange } from '@/lib/range';
import { useKnownFree } from '@/lib/pro-status';
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
  /** The owner's logo choice; read the logo through logoDomainOf, never these directly. */
  logo_domain?: string | null;
  logo_hidden?: boolean | null;
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
  frequency: PayFrequency;
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

const LOGO_COLUMNS = 'logo_domain, logo_hidden';

/**
 * Runs a receipt, subscription or bill read with the per-row logo columns, and again without them
 * when the database does not have them yet (42703, undefined column). An app build that reaches
 * people before the migration then still loads every list, with catalog logos only, rather than
 * failing every screen that reads one.
 */
async function withLogoColumns<R extends { error: { code?: string } | null }>(
  read: (logoColumns: string) => PromiseLike<R>,
): Promise<R> {
  const result = await read(`, ${LOGO_COLUMNS}`);
  return result.error?.code === '42703' ? read('') : result;
}

/** A receipt's spending habit, embedded so a tapped day draws the habit's icon in every list. */
const HABIT_COLUMNS = ', habit_id, habit:habits(name, icon_id, color)';

type ReadFailure = { code?: string; message?: string; details?: string } | null;

/**
 * A database without spending habits yet: PostgREST finds no relationship to embed (PGRST200), or
 * Postgres no habit_id column (42703). Any other failure, a missing logo column included, is not
 * this one's to answer.
 */
function lacksHabits(error: ReadFailure): boolean {
  if (error?.code !== 'PGRST200' && error?.code !== '42703') return false;
  return /habit/.test(`${error.message ?? ''} ${error.details ?? ''}`);
}

/**
 * Runs a receipt read with its habit, and again without when the database does not have habits
 * yet, so every receipt list still loads (no receipt can belong to a habit there anyway).
 */
async function withHabitColumns<R extends { error: ReadFailure }>(
  read: (habitColumns: string) => PromiseLike<R>,
): Promise<R> {
  const result = await read(HABIT_COLUMNS);
  return lacksHabits(result.error) ? read('') : result;
}

/** The embedded habit as the app draws it; a colour it does not know falls back to the first. */
function readReceipt(row: ReceiptRow): ReceiptRow {
  if (!row.habit) return row;
  return { ...row, habit: { ...row.habit, color: habitColor(row.habit.color).id } };
}

function habitMark(habit: ReceiptRow['habit']): HabitMark | undefined {
  return habit ? { iconId: habit.icon_id, color: habitColor(habit.color).id } : undefined;
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
    const { data, error } = await withLogoColumns((logo) =>
      supabase
        .from('bills')
        .select(
          `id, name, amount, category_id, icon_id, recurrence, next_due_on, starts_on, ends_on, card_id, bank_account_id, created_at, brand_id${logo}, brands(domain)`,
        )
        .order('next_due_on', { ascending: true, nullsFirst: false }),
    );
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

/** "Visa ••4821": the network alone when no digits were given, never a dangling "••". */
export function cardLabel(card: Pick<CardRow, 'network' | 'last4'>): string {
  return card.last4 ? `${card.network} ••${card.last4}` : card.network;
}

export function accountLabel(
  account: Pick<BankAccountRow, 'nickname' | 'bank_name' | 'last4'>,
): string {
  const name = account.nickname || account.bank_name;
  return account.last4 ? `${name} ••${account.last4}` : name;
}

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
      label: cardLabel(card),
      color: card.color,
      kind: 'card' as const,
    })),
    ...usableAccounts.map((account) => ({
      id: account.id,
      label: accountLabel(account),
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
  /** When it was saved, which is what the free scan and upload allowances count by. */
  created_at?: string | null;
  brands: { domain: string | null } | null;
  /** The owner's logo choice; read the logo through logoDomainOf, never these directly. */
  logo_domain?: string | null;
  logo_hidden?: boolean | null;
  /**
   * The spending habit whose day this receipt fills. Absent, like `habit`, on a database without
   * habits. An archived habit still answers, so its receipts keep its icon and name.
   */
  habit_id?: string | null;
  habit?: { name: string; icon_id: string; color: HabitColor } | null;
};

export function useReceipts() {
  return useOwnerQuery<ReceiptRow[]>('receipts', async () => {
    const { data, error } = await withLogoColumns((logo) =>
      withHabitColumns((habit) =>
        supabase
          .from('receipts')
          .select(
            `id, brand_id, merchant, amount, purchased_on, category_id, card_id, bank_account_id, note, source, image_path, created_at${logo}${habit}, brands(domain)`,
          )
          .order('purchased_on', { ascending: false })
          .order('created_at', { ascending: false }),
      ),
    );
    if (error) throw error;
    return ((data ?? []) as unknown as ReceiptRow[]).map(readReceipt);
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
  /** The owner's logo choice; read the logo through logoDomainOf, never these directly. */
  logo_domain?: string | null;
  logo_hidden?: boolean | null;
};

export function useSubscriptions() {
  return useOwnerQuery<SubscriptionRow[]>('subscriptions', async () => {
    const { data, error } = await withLogoColumns((logo) =>
      supabase
        .from('subscriptions')
        .select(
          `id, brand_id, name, amount, cycle, next_renewal_on, started_on, created_at, category_id, card_id, bank_account_id, note, active${logo}, brands(domain)`,
        )
        .order('next_renewal_on', { ascending: true, nullsFirst: false }),
    );
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
      const { data, error } = await withLogoColumns((logo) =>
        withHabitColumns((habit) =>
          supabase
            .from('receipts')
            .select(
              `id, brand_id, merchant, amount, purchased_on, category_id, card_id, bank_account_id, note, source, image_path${logo}${habit}, brands(domain)`,
            )
            .eq('id', id!)
            .maybeSingle(),
        ),
      );
      if (error) throw error;
      return data ? readReceipt(data as unknown as ReceiptRow) : null;
    },
  });
}

export function useSubscription(id: string | undefined) {
  const userId = useUserId();
  return useQuery({
    queryKey: ['subscription', id, userId],
    enabled: Boolean(userId && id),
    queryFn: async (): Promise<SubscriptionRow | null> => {
      const { data, error } = await withLogoColumns((logo) =>
        supabase
          .from('subscriptions')
          .select(
            `id, brand_id, name, amount, cycle, next_renewal_on, started_on, created_at, category_id, card_id, bank_account_id, note, active${logo}, brands(domain)`,
          )
          .eq('id', id!)
          .maybeSingle(),
      );
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
      const { data, error } = await withLogoColumns((logo) =>
        supabase
          .from('bills')
          .select(
            `id, name, amount, category_id, icon_id, recurrence, next_due_on, starts_on, ends_on, card_id, bank_account_id, note, brand_id${logo}, brands(domain)`,
          )
          .eq('id', id!)
          .maybeSingle(),
      );
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

type PaymentRow = {
  id: string;
  card_id: string | null;
  bank_account_id: string | null;
  /** The account the money came out of; null for money from outside. */
  from_bank_account_id?: string | null;
  amount: number;
  paid_on: string;
  note: string | null;
};

const PAYMENT_COLUMNS = 'id, card_id, bank_account_id, amount, paid_on, note';

function usePayments() {
  return useOwnerQuery<PaymentRow[]>('payments', async () => {
    const read = (columns: string) =>
      supabase.from('payments').select(columns).order('paid_on', { ascending: false });
    const full = await read(`${PAYMENT_COLUMNS}, from_bank_account_id`);
    // 42703: a database not yet given the column. Every payment then reads as money from outside.
    const result = full.error?.code === '42703' ? await read(PAYMENT_COLUMNS) : full;
    if (result.error) throw result.error;
    return (result.data ?? []) as unknown as PaymentRow[];
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

/**
 * Everything that moved money inside a window, as one timeline. Receipts are history. Bills and
 * subscriptions store only their NEXT date, so they are projected across the window in both
 * directions, which is what makes "upcoming" possible without a job writing rows ahead of time;
 * pay is read off the record where it landed, and worked out from the schedule after the last
 * recorded payday, in the account it is paid into.
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
  /** The owner chose letters: no logo, not even one found by name. */
  logoHidden?: boolean;
  /** Bills draw their category icon where a brand logo would go. */
  categoryId?: string | null;
  iconId?: string | null;
  /** The bill or subscription a charge came from, so tapping it can edit that. */
  planId?: string;
  /** Set only on a receipt filed from a spending habit: drawn with the habit's icon and colour. */
  habit?: HabitMark;
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
  const salary = useSalaryDetails();
  const charges = useCharges();
  const pay = usePayReceived();
  const accounts = useBankAccounts();
  const free = useKnownFree();

  // The window is walked as far back as the app keeps anything (seven years), on every plan, so a
  // figure that sums it is the same on free and Pro. Only what is listed stops at the plan's
  // window: 90 days back on free. No range means the whole window.
  const kept = useMemo(() => historyFloor(true, new Date(`${today}T00:00:00`)), [today]);
  const floor = useMemo(() => historyFloor(!free, new Date(`${today}T00:00:00`)), [free, today]);
  const asked = range?.from ?? null;
  const from = asked && asked > kept ? asked : kept;
  const to = range?.to ?? '9999-12-31';
  // Projecting every bill and payday across the window is real work (a year range walks each
  // schedule dozens of times), so it is held to once per change of the data or the window.
  const allEntries = useMemo<LedgerEntry[]>(() => {
    // A window wholly before the floor shows nothing; no schedule is walked backwards for it.
    if (from > to) return [];
    const inRange = (date: string) => date <= to && date >= from;

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
      const habit = habitMark(row.habit);
      entries.push({
        id: `receipt-${row.id}`,
        label: row.merchant,
        amount: -Math.abs(row.amount),
        date: row.purchased_on,
        kind: 'receipt',
        sourceId: row.card_id ?? row.bank_account_id ?? '',
        domain: logoDomainOf(row),
        logoHidden: Boolean(row.logo_hidden),
        ...(habit ? { habit } : {}),
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
          domain: logoDomainOf(row),
          logoHidden: Boolean(row.logo_hidden),
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
          domain: logoDomainOf(row),
          logoHidden: Boolean(row.logo_hidden),
          categoryId: row.category_id,
          iconId: row.icon_id,
          planId: row.id,
        }),
      );
    }

    // Pay on the record, as it landed: its own amount and the account it went into.
    const lastRecorded = new Map<string, string>();
    for (const row of pay.data ?? []) {
      const id = row.salary_source_id;
      if (id && (!lastRecorded.has(id) || row.paid_on > lastRecorded.get(id)!)) {
        lastRecorded.set(id, row.paid_on);
      }
      if (!inRange(row.paid_on)) continue;
      entries.push({
        id: `pay-${row.id}`,
        label: row.label || t('api.ledger.income'),
        amount: Math.abs(row.amount),
        date: row.paid_on,
        kind: 'income',
        sourceId: row.bank_account_id ?? '',
      });
    }

    // What the record does not hold yet is worked out from the schedule, from the day after its
    // last recorded pay: a payday not written down yet, and every one still to come.
    const accountOrder = (accounts.data ?? []).map((account) => account.id);
    for (const row of salary.data?.rows ?? []) {
      const projected = payProjectionStart(row.last_payday, lastRecorded.get(row.id) ?? null);
      if (!projected || !row.last_payday) continue;
      const into = landingAccount(row.account_ids, accountOrder) ?? '';
      for (const date of paydaysInRange(
        new Date(`${row.last_payday}T00:00:00`),
        row.frequency,
        from > projected ? from : projected,
        to,
      )) {
        entries.push({
          id: `income-${row.id}@${date}`,
          label: row.name || t('api.ledger.income'),
          amount: Math.abs(row.amount),
          date,
          kind: 'income',
          sourceId: into,
        });
      }
    }

    entries.sort((a, b) =>
      a.date === b.date ? a.id.localeCompare(b.id) : b.date.localeCompare(a.date),
    );

    return entries;
  }, [
    receipts.data,
    subscriptions.data,
    bills.data,
    salary.data,
    charges.data,
    pay.data,
    accounts.data,
    from,
    to,
    today,
  ]);

  const entries = useMemo(
    () => (free ? allEntries.filter((entry) => entry.date >= floor) : allEntries),
    [free, allEntries, floor],
  );

  // What the list left out, so a free account is told it is kept, not gone.
  const hidden = useMemo<HiddenHistory>(() => {
    if (!free) return NOTHING_HIDDEN;
    let receiptsHidden = false;
    let incomeHidden = false;
    const plans = new Set<string>();
    for (const entry of allEntries) {
      if (entry.date >= floor) continue;
      if (entry.kind === 'receipt') receiptsHidden = true;
      else if (entry.kind === 'income') incomeHidden = true;
      else if (entry.planId) plans.add(planKey(entry.kind, entry.planId));
    }
    return { receipts: receiptsHidden, plans, income: incomeHidden };
  }, [free, allEntries, floor]);

  // A figure for the whole window asked for, as Pro sees it: "charged this year" is the year's.
  const totals = useMemo<LedgerTotals>(
    () => ({
      out: allEntries.filter((e) => e.amount < 0).reduce((sum, e) => sum + Math.abs(e.amount), 0),
      in: allEntries.filter((e) => e.amount > 0).reduce((sum, e) => sum + e.amount, 0),
      net: allEntries.reduce((sum, e) => sum + e.amount, 0),
      count: allEntries.length,
    }),
    [allEntries],
  );

  return {
    /** What is listed: from the plan's window on. */
    entries,
    /** The whole window asked for, for figures that sum it. Never list these. */
    allEntries,
    totals,
    hidden,
    isLoading:
      receipts.isLoading ||
      subscriptions.isLoading ||
      bills.isLoading ||
      salary.isLoading ||
      charges.isLoading ||
      pay.isLoading ||
      accounts.isLoading,
    // Salary and charges count: missing income makes a net figure wrong, and a failed charges read
    // substitutes the projected plan amount for the recorded one with nothing to say it is a guess.
    // Recorded pay and the accounts it lands in count for the same reason.
    isError: anyError([receipts, subscriptions, bills, salary, charges, pay, accounts]),
    refetch: () => {
      receipts.refetch();
      subscriptions.refetch();
      bills.refetch();
      salary.refetch();
      charges.refetch();
      pay.refetch();
      accounts.refetch();
    },
  };
}

/**
 * Every card's and account's running balance and Home's Current balance, from one book (see
 * `moneyBook`). Everything that has happened is in it: receipts and bill and subscription charges,
 * pay on its paydays, and payments, which move money between the person's own accounts and cards.
 */
function useMoneyBook(today: string) {
  const range = useMemo(() => ({ from: '0000-01-01', to: today }), [today]);
  const ledger = useLedger(range, today);
  const cards = useCards();
  const accounts = useBankAccounts();
  const payments = usePayments();
  const subscriptions = useSubscriptions();
  const bills = useBills();
  const charges = useCharges();

  const book = useMemo(() => {
    const spending: BookSpend[] = [];
    for (const entry of ledger.allEntries) {
      if (entry.amount >= 0 || entry.kind === 'income') continue;
      spending.push({
        id: entry.id,
        label: entry.label,
        date: entry.date,
        amount: entry.amount,
        kind: entry.kind,
        sourceId: entry.sourceId,
        domain: entry.domain,
        logoHidden: entry.logoHidden,
        categoryId: entry.categoryId,
        iconId: entry.iconId,
        ...(entry.habit ? { habit: entry.habit } : {}),
      });
    }

    // The ledger walks only plans that are still running. What a cancelled subscription or a
    // finished bill was charged still went out, so it stays spent.
    const running = new Set<string>();
    const plans = new Map<
      string,
      { domain: string | null; logoHidden: boolean } & Partial<BillRow>
    >();
    for (const row of subscriptions.data ?? []) {
      const key = planKey('subscription', row.id);
      if (row.active && row.next_renewal_on) running.add(key);
      plans.set(key, { domain: logoDomainOf(row), logoHidden: Boolean(row.logo_hidden) });
    }
    for (const row of bills.data ?? []) {
      const key = planKey('bill', row.id);
      if (row.next_due_on) running.add(key);
      plans.set(key, { ...row, domain: logoDomainOf(row), logoHidden: Boolean(row.logo_hidden) });
    }
    for (const charge of readCharges(charges.data ?? []).rows) {
      if (running.has(charge.planId)) continue;
      const plan = plans.get(charge.planId);
      spending.push({
        id: charge.id,
        label: charge.label,
        date: charge.date,
        amount: charge.amount,
        kind: charge.planId.startsWith('bill') ? 'bill' : 'subscription',
        sourceId: charge.cardId ?? charge.accountId ?? '',
        domain: plan?.domain ?? null,
        logoHidden: plan?.logoHidden ?? false,
        categoryId: plan?.category_id ?? null,
        iconId: plan?.icon_id ?? null,
      });
    }

    return moneyBook({
      today,
      sources: [
        ...(accounts.data ?? []).map((row) => ({
          id: row.id,
          kind: 'account' as const,
          name: accountLabel(row),
          balance: Number(row.balance),
          asOf: row.balance_as_of ?? null,
        })),
        ...(cards.data ?? []).map((row) => ({
          id: row.id,
          kind: 'card' as const,
          name: cardLabel(row),
          balance: Number(row.balance),
          asOf: row.balance_as_of ?? null,
        })),
      ],
      spending,
      payments: (payments.data ?? []).map((row) => ({
        id: row.id,
        amount: Number(row.amount),
        date: row.paid_on,
        note: row.note,
        toId: row.card_id ?? row.bank_account_id ?? '',
        fromAccountId: row.from_bank_account_id ?? null,
      })),
      income: ledger.allEntries
        .filter((entry) => entry.kind === 'income' && entry.amount > 0)
        .map((entry) => ({
          id: entry.id,
          label: entry.label,
          date: entry.date,
          amount: entry.amount,
          accountId: entry.sourceId || null,
        })),
    });
  }, [
    ledger.allEntries,
    subscriptions.data,
    bills.data,
    charges.data,
    accounts.data,
    cards.data,
    payments.data,
    today,
  ]);

  const parts = [ledger, cards, accounts, payments, subscriptions, bills, charges];
  return {
    book,
    cards,
    accounts,
    isLoading: parts.some((part) => part.isLoading),
    // Every part is a term in some balance, so a missing one would show a wrong figure as a real one.
    isError: parts.some((part) => part.isError),
    refetch: () => {
      for (const part of parts) void part.refetch();
    },
  };
}

/** One card's or account's running balance and the entries behind it. */
export function useSourceLedger(sourceId: string | undefined, today: string) {
  const { book, cards, accounts, isLoading, isError, refetch } = useMoneyBook(today);

  const card = (cards.data ?? []).find((row) => row.id === sourceId);
  const account = (accounts.data ?? []).find((row) => row.id === sourceId);
  const source = card ?? account;
  const kind: SourceKind = card ? 'card' : 'account';

  return {
    source,
    kind,
    card,
    account,
    ledger: source ? (book.sources.get(source.id) ?? null) : null,
    isLoading,
    isError,
    refetch,
  };
}

/** Live balances for every card and account, keyed by id. */
export function useSourceBalances(today: string) {
  const { book, isError, refetch } = useMoneyBook(today);
  const balances = useMemo(() => {
    const next = new Map<string, number>();
    for (const [id, ledger] of book.sources) next.set(id, ledger.balance);
    return next;
  }, [book]);

  return {
    balances,
    /**
     * Consumers read `balances.get(id) ?? card.balance`, so a failed read would present the typed
     * opening figure as the live balance.
     */
    isError,
    refetch,
  };
}

/** Home's "Current balance": the person's accounts less what their cards owe, rolled on to today. */
export function useCurrentBalance(today: string) {
  const { book, isLoading, isError, refetch } = useMoneyBook(today);
  return { ...book.current, isLoading, isError, refetch };
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
