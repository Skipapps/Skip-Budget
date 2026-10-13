import { QueryClient, QueryClientProvider, useQueries } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { useCharges } from '@/api/charges';
import { usePayReceived } from '@/api/pay';
import {
  useBankAccounts,
  useBills,
  useCurrentBalance,
  useLedger,
  useLoanPayoffRows,
  useReceipts,
  useSalaryDetails,
  useSourceBalances,
  useSourceLedger,
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
  expect(view.result.current.ledger.refreshFailed).toBe(false);
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
    // ... and the ledger built in that same render is still the truth, and says it is older.
    expect(view.result.current.ledger.isError).toBe(false);
    expect(view.result.current.ledger.refreshFailed).toBe(true);
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
    expect(view.result.current.ledger.refreshFailed).toBe(true);
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
    expect(result.current.ledger.refreshFailed).toBe(false);
  });

  it('reports an error once the cached answer is dropped and the read fails again', async () => {
    const { client, view } = await loaded();

    mockFailures.add('charges');
    // A reset throws the cached answer away and reads again, which fails: nothing left to show.
    await act(() => client.resetQueries({ queryKey: ['charges'] }));

    await waitFor(() => expect(view.result.current.reads.charges.isLoadingError).toBe(true));
    expect(view.result.current.ledger.isError).toBe(true);
    expect(view.result.current.ledger.refreshFailed).toBe(false);
  });

  it('says the failure, not the note, when one read has nothing and another is only older', async () => {
    const { client, view } = await loaded();

    mockFailures.add('receipts');
    mockFailures.add('charges');
    await act(() => client.refetchQueries({ queryKey: ['receipts'] }));
    await act(() => client.resetQueries({ queryKey: ['charges'] }));

    await waitFor(() => {
      expect(view.result.current.reads.receipts.isRefetchError).toBe(true);
      expect(view.result.current.reads.charges.isLoadingError).toBe(true);
    });
    expect(view.result.current.ledger.isError).toBe(true);
    expect(view.result.current.ledger.refreshFailed).toBe(false);
  });
});

/** Every table the money book reads, by the key its read is cached under. */
const BOOK_KEYS = {
  cards: ['cards', 'user-1'],
  bank_accounts: ['bank_accounts', 'user-1'],
  payments: ['payments', 'user-1'],
  receipts: ['receipts', 'user-1'],
  subscriptions: ['subscriptions', 'user-1'],
  bills: ['bills', 'user-1'],
  salary_sources: ['salary_sources', 'user-1', 'details'],
  charges: ['charges', 'user-1'],
  pay_received: ['pay_received', 'user-1'],
  loan_payoffs: ['loans', 'user-1', 'payoffs'],
} as const;
type BookTable = keyof typeof BOOK_KEYS;
const BOOK_TABLES = Object.keys(BOOK_KEYS) as BookTable[];

/**
 * Home's balance, the Cards tab's balances and one card's page, beside a disabled observer on each
 * read (it brings no queryFn, so every fetch is the hooks' own): the render where a read says it
 * failed is the render whose figures are checked.
 */
function useBookAndReads() {
  const probes = useQueries({
    queries: BOOK_TABLES.map((table) => ({ queryKey: [...BOOK_KEYS[table]], enabled: false })),
  });
  return {
    current: useCurrentBalance(TODAY),
    balances: useSourceBalances(TODAY),
    source: useSourceLedger('card-1', TODAY),
    reads: Object.fromEntries(
      BOOK_TABLES.map((table, i) => [
        table,
        { isRefetchError: probes[i].isRefetchError, isLoadingError: probes[i].isLoadingError },
      ]),
    ) as Record<BookTable, { isRefetchError: boolean; isLoadingError: boolean }>,
  };
}

/** What each hook says about its reads, and the figures it shows. */
const book = (view: ReturnType<typeof useBookAndReads>) => ({
  states: [view.current, view.balances, view.source].map(({ isError, refreshFailed }) => ({
    isError,
    refreshFailed,
  })),
  figures: {
    current: view.current.balance,
    card: view.balances.balances.get('card-1'),
    ledger: view.source.ledger?.balance,
  },
});
const FRESH = { isError: false, refreshFailed: false };
const OLDER = { isError: false, refreshFailed: true };
const FAILED = { isError: true, refreshFailed: false };

describe('the money book hooks after a failed background refetch', () => {
  beforeEach(() => {
    // The card the receipt and the bill were charged to: $500.00 owed on the 1st.
    mockRows.cards = [
      {
        id: 'card-1',
        holder: 'Sam',
        network: 'Visa',
        last4: '4421',
        color: '#111111',
        balance: 500,
        balance_as_of: '2026-09-01',
        bill_due_day: null,
      },
    ];
  });

  async function bookLoaded() {
    const { client, wrapper } = setUp();
    const view = await renderHook(useBookAndReads, { wrapper });
    await waitFor(() => expect(view.result.current.current.isLoading).toBe(false));
    expect(book(view.result.current).states).toEqual([FRESH, FRESH, FRESH]);
    return { client, view };
  }

  it('starts from the hand-worked card', async () => {
    const { view } = await bookLoaded();
    // $500.00 owed, plus the $6.25 receipt and the $61.40 internet charge on it.
    expect(book(view.result.current).figures).toMatchObject({ card: 567.65, ledger: 567.65 });
  });

  it.each(BOOK_TABLES)(
    'keeps every figure and says it is older when a refetch of %s fails',
    async (table) => {
      const { client, view } = await bookLoaded();
      const before = book(view.result.current).figures;

      mockFailures.add(table);
      await act(() => client.refetchQueries());
      await waitFor(() => expect(view.result.current.reads[table].isRefetchError).toBe(true));

      expect(book(view.result.current)).toEqual({ states: [OLDER, OLDER, OLDER], figures: before });
    },
  );

  it.each(['cards', 'payments', 'charges'] as const)(
    'says the failure, not the note, when %s fails with nothing cached',
    async (table) => {
      mockFailures.add(table);
      const { wrapper } = setUp();
      const { result } = await renderHook(useBookAndReads, { wrapper });

      await waitFor(() => expect(result.current.reads[table].isLoadingError).toBe(true));
      expect(book(result.current).states).toEqual([FAILED, FAILED, FAILED]);
    },
  );
});
