import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { useLedger, useSalaryAccountIds, useSourceBalances, useSourceLedger } from '@/api/queries';

/**
 * What the combined hooks say when one of their reads fails.
 *
 * These three hooks each turn several queries into one figure — a running
 * balance, a month's spending, a card's current balance — and every one of
 * them used to report success while an input was missing. The worst of them
 * substituted a bill's *projected* amount for the one actually charged, so a
 * bill taken at $61.40 rendered as its scheduled $59.99 with nothing on screen
 * to say the number was a guess.
 *
 * So each underlying table is failed on its own, one per case: a chain that
 * happens to mention four of seven queries passes a test that only ever fails
 * the first one.
 */

/** Tables the fake client should answer with an error. Reset per test. */
const mockFailures = new Set<string>();
/** Rows each table should answer with. Anything unlisted answers empty. */
const mockRows: Record<string, unknown[]> = {};
/** Every table read, in order, so a refetch can be proven rather than assumed. */
const mockReads: string[] = [];

jest.mock('@/lib/supabase', () => {
  const build = (table: string) => {
    const answer = () =>
      mockFailures.has(table)
        ? { data: null, error: new Error(`${table} is unreachable`) }
        : { data: mockRows[table] ?? [], error: null };

    const builder: Record<string, unknown> = {
      select: () => builder,
      order: () => builder,
      eq: () => builder,
      in: () => builder,
      maybeSingle: () => builder,
      // Awaited directly by every read in queries.ts, which is what makes the
      // builder its own promise here rather than a mock returning one.
      then: (resolve: (value: unknown) => unknown) => resolve(answer()),
    };
    return builder;
  };

  return {
    supabase: {
      from: (table: string) => {
        mockReads.push(table);
        return build(table);
      },
      rpc: async () => ({ data: null, error: null }),
      auth: { getUser: async () => ({ data: { user: null } }) },
    },
  };
});

jest.mock('@/providers/session-provider', () => ({
  useUserId: () => 'user-1',
}));

// queries.ts imports usePro for the payment-source list; the real one reaches
// for react-native-purchases, which has no place in a data test.
jest.mock('@/api/pro', () => ({
  usePro: () => ({ pro: true, ready: true }),
}));

const TODAY = '2026-09-12';

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({
    // No retries: a failed read must reach isError on the first answer, not
    // three delays later.
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  mockFailures.clear();
  mockReads.length = 0;
  for (const table of Object.keys(mockRows)) delete mockRows[table];
});

/** Every table `useLedger` reads, and the hook only named three of them. */
const LEDGER_TABLES = ['receipts', 'subscriptions', 'bills', 'salary_sources', 'charges'];

/** Every table a source's ledger and its balance are walked from. */
const SOURCE_TABLES = [
  'cards',
  'bank_accounts',
  'receipts',
  'bills',
  'subscriptions',
  'payments',
  'charges',
];

describe('useLedger', () => {
  it('reports no error when every read succeeds', async () => {
    const { result } = await renderHook(() => useLedger(undefined, TODAY), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isError).toBe(false);
  });

  it.each(LEDGER_TABLES)('reports an error when %s fails', async (table) => {
    mockFailures.add(table);
    const { result } = await renderHook(() => useLedger(undefined, TODAY), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe('useLedger, on a month with a recorded charge', () => {
  /**
   * The figure this whole fix is about.
   *
   * The internet bill is scheduled at $59.99 and was actually taken at $61.40 —
   * an overage, a price rise mid-cycle, the kind of difference a bank statement
   * has and a plan does not. September is in the past, so the ledger must read
   * it off the charge. If the charges read fails, the same month falls back to
   * the plan and shows $59.99 instead: the right behaviour for a screen that
   * would otherwise be blank, and unacceptable *silently*, which is what
   * `isError` is now for.
   */
  const SEPTEMBER = { from: '2026-09-01', to: '2026-09-30' };

  beforeEach(() => {
    mockRows.bills = [
      {
        id: 'bill-1',
        name: 'Internet',
        amount: 59.99,
        category_id: 'utilities',
        icon_id: null,
        recurrence: 'monthly',
        next_due_on: '2026-10-01',
        starts_on: null,
        ends_on: null,
        card_id: 'card-1',
        bank_account_id: null,
        created_at: '2026-07-01T00:00:00Z',
        brand_id: null,
        brands: null,
      },
    ];
    mockRows.charges = [
      {
        id: 'charge-1',
        bill_id: 'bill-1',
        subscription_id: null,
        label: 'Internet',
        amount: 61.4,
        charged_on: '2026-09-01',
        card_id: 'card-1',
        bank_account_id: null,
        notification_dismissed_at: null,
      },
    ];
  });

  const september = (entries: { date: string; amount: number }[]) =>
    entries.find((entry) => entry.date === '2026-09-01');

  it('shows what was charged, to the cent, when every read succeeds', async () => {
    const { result } = await renderHook(() => useLedger(SEPTEMBER, TODAY), { wrapper });
    await waitFor(() => expect(result.current.entries.length).toBeGreaterThan(0));

    expect(september(result.current.entries)?.amount).toBe(-61.4);
    expect(result.current.totals.out).toBe(61.4);
    expect(result.current.isError).toBe(false);
  });

  it('falls back to the scheduled amount when charges cannot be read — and says so', async () => {
    mockFailures.add('charges');
    const { result } = await renderHook(() => useLedger(SEPTEMBER, TODAY), { wrapper });
    await waitFor(() => expect(result.current.entries.length).toBeGreaterThan(0));

    // The projection, not the statement: $1.41 short, and before this change
    // nothing on the screen could tell the difference.
    expect(september(result.current.entries)?.amount).toBe(-59.99);
    expect(result.current.isError).toBe(true);
  });
});

describe('useSourceLedger', () => {
  it('reports no error when every read succeeds', async () => {
    const { result } = await renderHook(() => useSourceLedger('card-1', TODAY), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isError).toBe(false);
  });

  it.each(SOURCE_TABLES)('reports an error when %s fails', async (table) => {
    mockFailures.add(table);
    const { result } = await renderHook(() => useSourceLedger('card-1', TODAY), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it('offers a retry that reads every list again', async () => {
    const { result } = await renderHook(() => useSourceLedger('card-1', TODAY), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    mockReads.length = 0;
    result.current.refetch();

    await waitFor(() => expect(new Set(mockReads)).toEqual(new Set(SOURCE_TABLES)));
  });
});

describe('useSourceBalances', () => {
  it('reports no error when every read succeeds', async () => {
    const { result } = await renderHook(() => useSourceBalances(TODAY), { wrapper });
    await waitFor(() => expect(mockReads.length).toBeGreaterThan(0));
    await waitFor(() => expect(result.current.isError).toBe(false));
  });

  it.each(SOURCE_TABLES)('reports an error when %s fails', async (table) => {
    mockFailures.add(table);
    const { result } = await renderHook(() => useSourceBalances(TODAY), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it('no longer exposes the unread isSettled flag', async () => {
    const { result } = await renderHook(() => useSourceBalances(TODAY), { wrapper });
    await waitFor(() => expect(mockReads.length).toBeGreaterThan(0));
    expect('isSettled' in result.current).toBe(false);
  });
});

describe('useSalaryAccountIds', () => {
  it('lists the accounts salary lands in', async () => {
    mockRows.salary_source_accounts = [{ bank_account_id: 'account-1' }];

    const { result } = await renderHook(() => useSalaryAccountIds(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect([...result.current.ids]).toEqual(['account-1']);
    expect(result.current.isError).toBe(false);
  });

  it('says the read failed instead of answering "no salary lands here"', async () => {
    // An empty set is what the screens use to hide the payday reminder, so a
    // failed read that looks like an empty set removes a setting silently.
    mockFailures.add('salary_source_accounts');

    const { result } = await renderHook(() => useSalaryAccountIds(), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.ids.size).toBe(0);
  });

  it('can be retried, and re-reads the table', async () => {
    mockFailures.add('salary_source_accounts');
    const { result } = await renderHook(() => useSalaryAccountIds(), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));

    mockFailures.clear();
    mockRows.salary_source_accounts = [{ bank_account_id: 'account-2' }];
    mockReads.length = 0;
    result.current.refetch();

    await waitFor(() => expect(mockReads).toContain('salary_source_accounts'));
    await waitFor(() => expect([...result.current.ids]).toEqual(['account-2']));
  });

  it('still answers with the fields its callers already destructure', async () => {
    const { result } = await renderHook(() => useSalaryAccountIds(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.ids).toBeInstanceOf(Set);
    expect(typeof result.current.isLoading).toBe('boolean');
  });
});
