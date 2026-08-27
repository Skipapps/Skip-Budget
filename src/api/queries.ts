import { useQuery } from '@tanstack/react-query';

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
};

export type BankAccountRow = {
  id: string;
  bank_name: string;
  nickname: string | null;
  account_type: 'checking' | 'savings';
  last4: string | null;
  color: string;
  balance: number;
};

export type BillRow = {
  id: string;
  name: string;
  amount: number;
  category_id: string;
  icon_id: string | null;
  recurrence: 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'period';
  next_due_on: string | null;
  card_id: string | null;
  bank_account_id: string | null;
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
      .select('id, holder, network, last4, color, balance')
      .order('created_at', { ascending: true });
    if (error) throw error;
    return data ?? [];
  });
}

export function useBankAccounts() {
  return useOwnerQuery<BankAccountRow[]>('bank_accounts', async () => {
    const { data, error } = await supabase
      .from('bank_accounts')
      .select('id, bank_name, nickname, account_type, last4, color, balance')
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
