import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { useCharges, type ChargeRow } from '@/api/charges';
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
import type { DateRange } from '@/lib/range';
import { supabase } from '@/lib/supabase';
import { useUserId } from '@/providers/session-provider';

/**
 * Read hooks for the live data.
 *
 * Every table is behind RLS scoped to auth.uid(), so no query filters by
 * user_id — the database already does. Queries stay disabled until a session
 * exists, otherwise the first render fires a request that can only return
 * nothing.
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

export type SavingsPotRow = { id: string; name: string; amount: number };

export type DashboardRow = {
  payday: number;
  expenses: number;
  left_this_month: number;
};

/**
 * How long a read may take before it is treated as failed.
 *
 * A request that never answers is worse than one that fails: the query stays
 * pending, the screen keeps its skeleton, and there is nothing to retry
 * because nothing went wrong.
 */
const QUERY_TIMEOUT_MS = 12_000;

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

export type ProfileRow = { id: string; display_name: string | null; currency: string };

export function useProfile() {
  return useOwnerQuery<ProfileRow | null>('profile', async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, display_name, currency')
      .maybeSingle();
    if (error) throw error;
    return data;
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
        'id, name, amount, category_id, icon_id, recurrence, next_due_on, starts_on, ends_on, card_id, bank_account_id, created_at',
      )
      .order('next_due_on', { ascending: true, nullsFirst: false });
    if (error) throw error;
    return data ?? [];
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

export function useSavingsPots() {
  return useOwnerQuery<SavingsPotRow[]>('savings_pots', async () => {
    const { data, error } = await supabase
      .from('savings_pots')
      .select('id, name, amount')
      .order('created_at', { ascending: true });
    if (error) throw error;
    return data ?? [];
  });
}

export function useDashboard() {
  return useOwnerQuery<DashboardRow>('dashboard', async () => {
    const { data, error } = await supabase
      .from('v_dashboard')
      .select('payday, expenses, left_this_month')
      .maybeSingle();
    if (error) throw error;
    return data ?? { payday: 0, expenses: 0, left_this_month: 0 };
  });
}

/**
 * Cards and bank accounts as one "paid with" list.
 *
 * Mirrors PAYMENT_SOURCES in lib/sources.ts, which is built from mock data —
 * this is the live equivalent, so anything asking "which card?" reads the same
 * shape whether it renders samples or the real wallet.
 */
/**
 * Accounts that a salary source pays into.
 *
 * An account has no date of its own, so "remind me when pay lands" only means
 * something for an account something is paid into. This is how the reminders
 * page knows which ones can answer that.
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

  return { ids, isLoading: query.isLoading };
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

  const sources: PaymentSourceRow[] = [
    ...(cards.data ?? []).map((card) => ({
      id: card.id,
      // Digits are optional on a card, so the network alone has to still read
      // as a label rather than leaving a dangling "••".
      label: card.last4 ? `${card.network} ••${card.last4}` : card.network,
      color: card.color,
      kind: 'card' as const,
    })),
    ...(accounts.data ?? []).map((account) => ({
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

/**
 * Receipts and subscriptions, newest first.
 *
 * The brand is embedded rather than looked up per row: PostgREST resolves it
 * in the same request, so a list of fifty receipts is still one round trip and
 * every row already knows which logo to draw.
 */
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
  source: 'manual' | 'scan' | 'upload';
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
      // Renewals with no date sort last rather than jumping the queue.
      .order('next_renewal_on', { ascending: true, nullsFirst: false });
    if (error) throw error;
    return (data ?? []) as unknown as SubscriptionRow[];
  });
}

/**
 * A single receipt or subscription, for the edit screen.
 *
 * Fetched rather than read out of the list cache so a deep link into an edit
 * screen works on a cold start, when no list has ever loaded.
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
          'id, brand_id, name, amount, cycle, next_renewal_on, category_id, card_id, bank_account_id, note, active, brands(domain)',
        )
        .eq('id', id!)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as SubscriptionRow | null;
    },
  });
}

/** One bill, for the edit screen. */
export function useBill(id: string | undefined) {
  const userId = useUserId();
  return useQuery({
    queryKey: ['bill', id, userId],
    enabled: Boolean(userId && id),
    queryFn: async (): Promise<BillRow | null> => {
      const { data, error } = await supabase
        .from('bills')
        .select(
          'id, name, amount, category_id, icon_id, recurrence, next_due_on, starts_on, ends_on, card_id, bank_account_id, note',
        )
        .eq('id', id!)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as BillRow | null;
    },
  });
}

/** One card or bank account, for the edit screens. */
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
 * Everything that has hit one card or account, plus what it is at now.
 *
 * Filtering happens here rather than in five scoped queries: the lists are
 * already fetched for their own screens, so opening a card costs nothing new
 * and the numbers cannot disagree with the pages they came from.
 */
/**
 * Charges in the shape the ledger reads them, and which plans are on record.
 *
 * The set is built from every charge rather than from the ones being shown,
 * because it answers a different question: not "what did this card pay" but
 * "has this plan ever been written down". A bill moved from one card to
 * another has no charges on the new card and a full history on the old one,
 * and only the unfiltered set knows that its past is already accounted for.
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

/** Rows that can be charged to a source, as buildLedger wants them. */
type LedgerSources = {
  receipts: ReceiptRow[];
  bills: BillRow[];
  subscriptions: SubscriptionRow[];
  payments: PaymentRow[];
  charges: ReturnType<typeof readCharges>;
};

/**
 * One source's ledger, built from lists that were already fetched.
 *
 * Split out so the cards list and the card detail screen run the very same
 * arithmetic. They used to disagree — the list rendered the stored figure and
 * the detail screen rendered the derived one, so a receipt moved the balance on
 * one screen and not the other.
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
    // Filtered on the charge's own source, not the plan's. A bill moved to a
    // different card keeps last March on the card that actually paid it.
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

  // Walking a source's whole history is not scroll-cheap work, and this screen
  // re-renders as it scrolls. Held to once per change of the lists behind it.
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
    isError: cards.isError || accounts.isError || payments.isError,
  };
}

/**
 * Live balances for every card and account, keyed by id.
 *
 * The cards screen shows a wallet at a glance, so it needs what each source is
 * at now — not the figure typed when it was added. Everything here is already
 * in the cache for other screens, so this costs no extra round trip.
 */
export function useSourceBalances(today: string) {
  const cards = useCards();
  const accounts = useBankAccounts();
  const receipts = useReceipts();
  const bills = useBills();
  const subscriptions = useSubscriptions();
  const payments = usePayments();
  const charges = useCharges();

  // Every source's whole history is walked to work these out, so it is done
  // once per change of the underlying lists rather than once per render — the
  // cards screen re-renders on scroll, and this is not scroll-cheap work.
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
    /** Charges land as their dates arrive, so a stale list shows stale money. */
    isSettled:
      !receipts.isLoading &&
      !bills.isLoading &&
      !subscriptions.isLoading &&
      !payments.isLoading &&
      !charges.isLoading,
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
 * Everything that moved money inside a window, as one timeline.
 *
 * Receipts are history — they happened on their date. Bills and subscriptions
 * store only their NEXT date, so they are projected across the window in both
 * directions; that is what makes "upcoming" possible without a job writing rows
 * ahead of time. Salary is projected the same way and lands as money in.
 *
 * Card payments are deliberately absent. Paying a card moves money between two
 * things you already own, so counting it here beside the charge it settles
 * would double the same spending. It belongs on the card, and it is there.
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
  // Projecting every bill and payday across the window is real work — a year
  // range walks each schedule dozens of times. Held to once per change of the
  // data or the window, rather than repeating on every render of a screen that
  // re-renders as it scrolls.
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

    // Bills and subscriptions run through the same split: what already went
    // out is read off the record, what has not happened yet is projected. The
    // lifetime floor is applied in there, so a plan added today cannot fill
    // the months behind it with charges nobody was billed for.
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
          categoryId: row.category_id,
          iconId: row.icon_id,
        }),
      );
    }

    for (const row of salary.data ?? []) {
      if (!row.last_payday) continue;
      // The floor bills get, in the only form income has. One payday is a
      // thing the user told us happened; everything before it is the walker
      // running backwards over years nobody was paid for as far as we know.
      // Without this a seven-year window invents a career.
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
    isError: receipts.isError || subscriptions.isError || bills.isError,
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
};

/**
 * The loan behind a bill, when there is one.
 *
 * Most bills are not loans, so this returns null rather than erroring — the
 * edit screen uses its presence to decide whether a payment schedule exists to
 * show.
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
          'id, bill_id, principal, annual_rate, term_months, monthly_payment, total_interest, first_payment_on',
        )
        .eq('bill_id', billId!)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as LoanRow | null;
    },
  });
}
