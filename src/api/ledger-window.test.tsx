import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { useLedger, useSourceBalances, useSourceLedger } from '@/api/queries';
import { hidOlder } from '@/lib/allowance';
import { publishProStatus, resetProStatusForTests } from '@/lib/pro-status';

/**
 * Free lists the last 90 days; Pro seven years. Only the listing is cut: balances walk every row,
 * nothing is deleted, and a payer is never cut while Pro is still being checked.
 */

const mockRows: Record<string, unknown[]> = {};

jest.mock('@/lib/supabase', () => {
  const build = (table: string) => {
    const builder: Record<string, unknown> = {
      select: () => builder,
      order: () => builder,
      eq: () => builder,
      in: () => builder,
      maybeSingle: () => builder,
      then: (resolve: (value: unknown) => unknown) =>
        resolve({ data: mockRows[table] ?? [], error: null }),
    };
    return builder;
  };
  return {
    supabase: {
      from: (table: string) => build(table),
      rpc: async () => ({ data: null, error: null }),
      auth: { getUser: async () => ({ data: { user: null } }) },
    },
  };
});
jest.mock('@/providers/session-provider', () => ({ useUserId: () => 'user-1' }));
jest.mock('@/api/pro', () => ({ usePro: () => ({ pro: true, ready: true }) }));

// 7 October 2026: the free window starts on 9 July.
const TODAY = '2026-10-07';
const THIS_YEAR = { from: '2026-01-01', to: TODAY };

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

const receipt = (id: string, purchased_on: string, amount: number) => ({
  id,
  brand_id: null,
  merchant: `Shop ${id}`,
  amount,
  purchased_on,
  category_id: 'other',
  card_id: 'card-1',
  bank_account_id: null,
  note: null,
  source: 'manual',
  image_path: null,
  created_at: `${purchased_on}T12:00:00Z`,
  brands: null,
});

beforeEach(() => {
  resetProStatusForTests();
  for (const table of Object.keys(mockRows)) delete mockRows[table];
  mockRows.cards = [
    { id: 'card-1', holder: 'Sam', network: 'Visa', last4: '4421', color: '#111111', balance: 0 },
  ];
  mockRows.receipts = [receipt('new', '2026-10-01', 20), receipt('old', '2026-05-15', 300)];
  mockRows.bills = [
    {
      id: 'bill-1',
      name: 'Internet',
      amount: 60,
      category_id: 'utilities',
      icon_id: null,
      recurrence: 'monthly',
      next_due_on: '2026-11-01',
      starts_on: null,
      ends_on: null,
      card_id: 'card-1',
      bank_account_id: null,
      created_at: '2026-01-01T00:00:00Z',
      brand_id: null,
      brands: null,
    },
  ];
  mockRows.charges = [
    {
      id: 'charge-june',
      bill_id: 'bill-1',
      subscription_id: null,
      label: 'Internet',
      amount: 60,
      charged_on: '2026-06-01',
      card_id: 'card-1',
      bank_account_id: null,
    },
    {
      id: 'charge-sept',
      bill_id: 'bill-1',
      subscription_id: null,
      label: 'Internet',
      amount: 60,
      charged_on: '2026-09-01',
      card_id: 'card-1',
      bank_account_id: null,
    },
  ];
});

const plan = (pro: boolean) => act(async () => publishProStatus({ pro, ready: true }));

describe('the ledger’s window', () => {
  it('lists the whole year on Pro, with nothing hidden', async () => {
    await plan(true);
    const { result } = await renderHook(() => useLedger(THIS_YEAR, TODAY), { wrapper });
    await waitFor(() => expect(result.current.entries.length).toBeGreaterThan(0));

    const dates = result.current.entries.map((entry) => entry.date);
    expect(dates).toContain('2026-05-15');
    expect(dates).toContain('2026-06-01');
    expect(hidOlder(result.current.hidden)).toBe(false);
  });

  it('lists only the last 90 days on free, and says what it left out', async () => {
    await plan(false);
    const { result } = await renderHook(() => useLedger(THIS_YEAR, TODAY), { wrapper });
    await waitFor(() => expect(result.current.entries.length).toBeGreaterThan(0));

    expect(result.current.entries.every((entry) => entry.date >= '2026-07-09')).toBe(true);
    expect(result.current.entries.map((entry) => entry.id)).toContain('receipt-new');
    // The totals are what is listed: October's receipt and September's recorded charge, not May's
    // $300 or June's charge.
    expect(result.current.totals.out).toBe(20 + 60);

    const { hidden } = result.current;
    expect(hidOlder(hidden)).toBe(true);
    expect(hidOlder(hidden, 'receipt')).toBe(true);
    expect(hidOlder(hidden, 'bill')).toBe(true);
    expect(hidOlder(hidden, 'bill', 'bill-1')).toBe(true);
    expect(hidOlder(hidden, 'bill', 'bill-2')).toBe(false);
    expect(hidOlder(hidden, 'subscription')).toBe(false);
  });

  it('cuts nothing while the plan is unknown, so a payer never sees history flash shorter', async () => {
    const { result } = await renderHook(() => useLedger(THIS_YEAR, TODAY), { wrapper });
    await waitFor(() => expect(result.current.entries.length).toBeGreaterThan(0));
    expect(result.current.entries.map((entry) => entry.date)).toContain('2026-05-15');
  });

  it('shows nothing for a window wholly before the 90 days, and says it is kept', async () => {
    await plan(false);
    const { result } = await renderHook(
      () => useLedger({ from: '2026-05-01', to: '2026-05-31' }, TODAY),
      { wrapper },
    );
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.entries).toEqual([]);
    expect(hidOlder(result.current.hidden, 'receipt')).toBe(true);
  });

  it('hides nothing for a window inside the 90 days', async () => {
    await plan(false);
    const { result } = await renderHook(
      () => useLedger({ from: '2026-09-01', to: '2026-09-30' }, TODAY),
      { wrapper },
    );
    await waitFor(() => expect(result.current.entries.length).toBeGreaterThan(0));
    expect(hidOlder(result.current.hidden)).toBe(false);
  });

  it('follows a lapse and a return at once', async () => {
    await plan(true);
    const { result } = await renderHook(() => useLedger(THIS_YEAR, TODAY), { wrapper });
    await waitFor(() => expect(result.current.entries.length).toBeGreaterThan(0));
    const before = result.current.entries.length;

    await plan(false);
    expect(result.current.entries.length).toBeLessThan(before);

    await plan(true);
    expect(result.current.entries.length).toBe(before);
  });
});

describe('balances ignore the window', () => {
  it('counts May’s receipt and June’s charge in the card balance on free, exactly as on Pro', async () => {
    await plan(true);
    const pro = await renderHook(() => useSourceBalances(TODAY), { wrapper });
    await waitFor(() => expect(pro.result.current.balances.get('card-1')).toBeDefined());
    const paid = pro.result.current.balances.get('card-1');

    await plan(false);
    const free = await renderHook(() => useSourceBalances(TODAY), { wrapper });
    await waitFor(() => expect(free.result.current.balances.get('card-1')).toBeDefined());

    expect(free.result.current.balances.get('card-1')).toBe(paid);
    // Every row counted: $20 + $300 + the bill's charges, not the window's share of them.
    expect(Math.abs(paid ?? 0)).toBeGreaterThanOrEqual(20 + 300 + 60 * 2);
  });

  it('keeps every row in the card’s own ledger, so the card page can say what it hides', async () => {
    await plan(false);
    const { result } = await renderHook(() => useSourceLedger('card-1', TODAY), { wrapper });
    await waitFor(() => expect(result.current.ledger?.entries.length).toBeGreaterThan(0));
    expect(result.current.ledger?.entries.map((entry) => entry.date)).toContain('2026-05-15');
  });
});
