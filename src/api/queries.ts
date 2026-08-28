import { useQuery } from '@tanstack/react-query';

import { buildLedger, type SourceKind } from '@/lib/card-ledger';
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

function useOwnerQuery<T>(key: string, run: () => Promise<T>) {
  const userId = useUserId();
  return useQuery({
    // Keyed by user so switching accounts cannot serve the previous one's cache.
    queryKey: [key, userId],
    enabled: Boolean(userId),
    queryFn: run,
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
      .select('id, holder, network, last4, color, balance, balance_as_of')
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
        'id, name, amount, category_id, icon_id, recurrence, next_due_on, card_id, bank_account_id',
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
        'id, brand_id, name, amount, cycle, next_renewal_on, category_id, card_id, bank_account_id, note, active, brands(domain)',
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
    queryFn: async (): Promise<
      (CardRow & { bill_due_day: number | null; reminder_days: number | null }) | null
    > => {
      const { data, error } = await supabase
        .from('cards')
        .select(
          'id, holder, network, last4, color, balance, balance_as_of, bill_due_day, reminder_days',
        )
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

/**
 * Everything that moved money, as one timeline.
 *
 * Receipts, subscriptions and bills live in separate tables because they are
 * different things with different fields — but a person thinks of them as one
 * history. This merges them client-side rather than in a view: all three sets
 * are already fetched for their own screens, so the rows are usually in cache
 * and the merge costs nothing.
 *
 * Bills and subscriptions contribute their NEXT date, not a payment history —
 * neither table records individual charges yet. That makes this a forward
 * ledger for those two and a real history for receipts.
 */
export type LedgerEntry = {
  id: string;
  label: string;
  /** Negative is money out; everything here is an outgoing. */
  amount: number;
  date: string;
  kind: 'bill' | 'receipt' | 'subscription';
  sourceId: string;
  domain?: string | null;
};

export function useLedger() {
  const receipts = useReceipts();
  const subscriptions = useSubscriptions();
  const bills = useBills();

  const entries: LedgerEntry[] = [
    ...(receipts.data ?? []).map((row) => ({
      id: `receipt-${row.id}`,
      label: row.merchant,
      amount: -Math.abs(row.amount),
      date: row.purchased_on,
      kind: 'receipt' as const,
      sourceId: row.card_id ?? row.bank_account_id ?? '',
      domain: row.brands?.domain,
    })),
    ...(subscriptions.data ?? [])
      .filter((row) => row.active && row.next_renewal_on)
      .map((row) => ({
        id: `subscription-${row.id}`,
        label: row.name,
        amount: -Math.abs(row.amount),
        date: row.next_renewal_on!,
        kind: 'subscription' as const,
        sourceId: row.card_id ?? row.bank_account_id ?? '',
        domain: row.brands?.domain,
      })),
    ...(bills.data ?? [])
      .filter((row) => row.next_due_on)
      .map((row) => ({
        id: `bill-${row.id}`,
        label: row.name,
        amount: -Math.abs(row.amount),
        date: row.next_due_on!,
        kind: 'bill' as const,
        sourceId: row.card_id ?? row.bank_account_id ?? '',
      })),
  ].sort((a, b) => b.date.localeCompare(a.date));

  return {
    entries,
    isLoading: receipts.isLoading || subscriptions.isLoading || bills.isLoading,
    isError: receipts.isError || subscriptions.isError || bills.isError,
    refetch: () => {
      receipts.refetch();
      subscriptions.refetch();
      bills.refetch();
    },
  };
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
export function useSourceLedger(sourceId: string | undefined, today: string) {
  const cards = useCards();
  const accounts = useBankAccounts();
  const receipts = useReceipts();
  const bills = useBills();
  const subscriptions = useSubscriptions();
  const payments = usePayments();

  const card = (cards.data ?? []).find((row) => row.id === sourceId);
  const account = (accounts.data ?? []).find((row) => row.id === sourceId);
  const source = card ?? account;
  const kind: SourceKind = card ? 'card' : 'account';

  const mine = <T extends { card_id: string | null; bank_account_id: string | null }>(rows: T[]) =>
    rows.filter((row) => (row.card_id ?? row.bank_account_id) === sourceId);

  const ledger = source
    ? buildLedger({
        kind,
        statedBalance: source.balance,
        balanceAsOf: source.balance_as_of ?? null,
        today,
        charges: mine(receipts.data ?? []).map((row) => ({
          id: `receipt-${row.id}`,
          label: row.merchant,
          amount: row.amount,
          date: row.purchased_on,
          kind: 'receipt' as const,
          domain: row.brands?.domain,
        })),
        recurring: [
          ...mine(bills.data ?? [])
            .filter((row) => row.next_due_on)
            .map((row) => ({
              id: `bill-${row.id}`,
              label: row.name,
              amount: row.amount,
              nextDate: row.next_due_on!,
              recurrence: row.recurrence,
              kind: 'bill' as const,
            })),
          ...mine(subscriptions.data ?? [])
            .filter((row) => row.active && row.next_renewal_on)
            .map((row) => ({
              id: `subscription-${row.id}`,
              label: row.name,
              amount: row.amount,
              nextDate: row.next_renewal_on!,
              recurrence: row.cycle,
              kind: 'subscription' as const,
              domain: row.brands?.domain,
            })),
        ],
        payments: mine(payments.data ?? []).map((row) => ({
          id: `payment-${row.id}`,
          amount: row.amount,
          date: row.paid_on,
          note: row.note,
        })),
      })
    : null;

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
      payments.isLoading,
    isError: cards.isError || accounts.isError || payments.isError,
  };
}
