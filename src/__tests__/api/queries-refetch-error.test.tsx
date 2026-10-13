import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { useCharges } from '@/api/charges';
import { usePayReceived } from '@/api/pay';
import {
  useBankAccounts,
  useBills,
  useLedger,
  useLoanPayoffRows,
  useReceipts,
  useSalaryDetails,
  useSubscriptions,
} from '@/api/queries';

/**
 * A read that fails while its last good answer is still cached has not lost that answer. TanStack
 * v5 keeps `isError` true after a failed background refetch (every mounted read refetches on a
 * resume after 30 s), so a combined figure that trusted it would trade a month of good figures for
 * the failure line on any weak network. Only a read with nothing to show is a failure.
 *
 * Each table is failed on its own, since a helper that checks four of eight reads passes a test
 * that only fails the first.
 */

const mockFailures = new Set<string>();
const mockRows: Record<string, unknown[]> = {};

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
      // Awaited directly by every read in queries.ts, so the builder is its own promise.
      then: (resolve: (value: unknown) => unknown) => resolve(answer()),
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

// queries.ts imports usePro for the payment-source list; the real one needs react-native-purchases.
jest.mock('@/api/pro', () => ({ usePro: () => ({ pro: true, ready: true }) }));

const TODAY = '2026-09-12';
const SEPTEMBER = { from: '2026-09-01', to: '2026-09-30' };

const LEDGER_TABLES = [
  'receipts',
  'subscriptions',
  'bills',
  'salary_sources',
  'charges',
  'pay_received',
  'loan_payoffs',
  'bank_accounts',
] as const;
type Table = (typeof LEDGER_TABLES)[number];

/**
 * The ledger beside the raw reads it is built from, under the same query keys (so nothing is read
 * twice). A render where a raw read says it failed is the render whose ledger is checked, so a
 * test cannot pass by looking before the failed refetch has reached the hook.
 */
function useLedgerAndReads() {
  const reads: Record<
    Table,
    { isError: boolean; isRefetchError: boolean; isLoadingError: boolean }
  > = {
    receipts: useReceipts(),
    subscriptions: useSubscriptions(),
    bills: useBills(),
    salary_sources: useSalaryDetails(),
    charges: useCharges(),
    pay_received: usePayReceived(),
    loan_payoffs: useLoanPayoffRows(),
    bank_accounts: useBankAccounts(),
  };
  return { ledger: useLedger(SEPTEMBER, TODAY), reads };
}

function setUp() {
  const client = new QueryClient({
    // No retries: a failed read must reach isError on the first answer.
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });
  function wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  }
  return { client, wrapper };
}

beforeEach(() => {
  mockFailures.clear();
  for (const table of Object.keys(mockRows)) delete mockRows[table];

  // A receipt on a card, the internet bill taken at $61.40 against a $59.99 plan, and pay that
  // landed at $2,314.82: one row from each kind of read, worked to the cent.
  mockRows.receipts = [
    {
      id: 'r1',
      brand_id: null,
      merchant: 'Bakery',
      amount: 6.25,
      purchased_on: '2026-09-10',
      category_id: 'other',
      card_id: 'card-1',
      bank_account_id: null,
      note: null,
      source: 'manual',
      image_path: null,
      created_at: '2026-09-10T12:00:00Z',
      brands: null,
    },
  ];
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
  mockRows.salary_sources = [
    {
      id: 'salary-1',
      name: 'Paycheck',
      amount: 2500,
      frequency: 'monthly',
      last_payday: '2026-09-05',
      salary_source_accounts: [],
    },
  ];
  mockRows.pay_received = [
    {
      id: 'p-sep',
      salary_source_id: 'salary-1',
      label: 'Paycheck',
      amount: 2314.82,
      paid_on: '2026-09-05',
      bank_account_id: null,
    },
  ];
});

/** September's ledger, read once with every table answering. */
async function loaded() {
  const { client, wrapper } = setUp();
  const view = await renderHook(useLedgerAndReads, { wrapper });
  await waitFor(() => expect(view.result.current.ledger.isLoading).toBe(false));
  expect(view.result.current.ledger.isError).toBe(false);
  return { client, view };
}

const figures = (ledger: ReturnType<typeof useLedger>) => ({
  entries: ledger.entries.map((entry) => [entry.id, entry.amount]),
  totals: ledger.totals,
});

describe('useLedger after a failed background refetch', () => {
  it('starts from the hand-worked September', async () => {
    const { view } = await loaded();

    expect(figures(view.result.current.ledger)).toEqual({
      entries: [
        ['receipt-r1', -6.25],
        ['pay-p-sep', 2314.82],
        ['charge-charge-1', -61.4],
      ],
      totals: { out: 67.65, in: 2314.82, net: 2247.17, count: 3 },
    });
  });

  it.each(LEDGER_TABLES)('keeps the cached figures when a refetch of %s fails', async (table) => {
    const { client, view } = await loaded();
    const before = figures(view.result.current.ledger);

    mockFailures.add(table);
    await act(() => client.refetchQueries());

    // TanStack says the read failed, with its last answer still cached ...
    await waitFor(() =>
      expect(view.result.current.reads[table]).toMatchObject({
        isError: true,
        isRefetchError: true,
      }),
    );
    // ... and the ledger built in that same render is still the truth.
    expect(view.result.current.ledger.isError).toBe(false);
    expect(figures(view.result.current.ledger)).toEqual(before);
  });

  it('keeps the cached figures when every read fails on a refetch', async () => {
    const { client, view } = await loaded();
    const before = figures(view.result.current.ledger);

    for (const table of LEDGER_TABLES) mockFailures.add(table);
    await act(() => client.refetchQueries());

    await waitFor(() =>
      expect(
        LEDGER_TABLES.filter((table) => view.result.current.reads[table].isRefetchError),
      ).toEqual([...LEDGER_TABLES]),
    );
    expect(view.result.current.ledger.isError).toBe(false);
    expect(figures(view.result.current.ledger)).toEqual(before);
  });
});

describe('useLedger when a read fails with nothing cached', () => {
  it.each(LEDGER_TABLES)('reports an error when %s fails on its first read', async (table) => {
    mockFailures.add(table);
    const { wrapper } = setUp();
    const { result } = await renderHook(useLedgerAndReads, { wrapper });

    await waitFor(() => expect(result.current.ledger.isError).toBe(true));
    expect(result.current.reads[table]).toMatchObject({ isError: true, isLoadingError: true });
  });

  it('reports an error once the cached answer is dropped and the read fails again', async () => {
    const { client, view } = await loaded();

    mockFailures.add('charges');
    // A reset throws the cached answer away and reads again, which fails: nothing left to show.
    await act(() => client.resetQueries({ queryKey: ['charges'] }));

    await waitFor(() => expect(view.result.current.reads.charges.isLoadingError).toBe(true));
    expect(view.result.current.ledger.isError).toBe(true);
  });
});
