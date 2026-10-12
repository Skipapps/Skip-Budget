import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { loanTermsOf, useLoanPayoffs, useLoans } from '@/api/loans';
import { useDeletePayoff, useRecordPayoff } from '@/api/mutations';
import {
  bookFlows,
  ledgerEntries,
  readLoanPayoffs,
  withLoanPayoffs,
  type BillRow,
  type LedgerInput,
  type LedgerPayoff,
} from '@/api/queries';
import { ledgerHref } from '@/lib/ledger-link';

/**
 * Money paid off a loan, in the data layer: listed and counted on its own date from its own card or
 * account (never as one of the loan's monthly charges), only when the loan counted when it was
 * paid; read with the loans that build schedules; written through record_loan_payoff and
 * delete_loan_payoff. A database without payoffs (PGRST205 for the table, PGRST200 for an embed:
 * PostgREST v14.5's answers on a copy without the migration) reads as none.
 */

type Failure = { code: string; message: string; details?: string | null; hint?: null };

const mockRequests: { table: string; columns: string; filters: [string, unknown][] }[] = [];
const mockRpcs: { name: string; args: Record<string, unknown> }[] = [];
let mockRows: Record<string, unknown>[] = [];
let mockFailure: Failure | null = null;
let mockHasPayoffs = true;
let mockRpcError: Failure | null = null;

jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: (table: string) => {
      const request = { table, columns: '', filters: [] as [string, unknown][] };
      const builder: Record<string, unknown> = {
        select: (columns: string) => {
          request.columns = columns;
          mockRequests.push(request);
          return builder;
        },
        eq: (column: string, value: unknown) => {
          request.filters.push([column, value]);
          return builder;
        },
        order: () => builder,
        then: (resolve: (value: unknown) => unknown) => {
          if (mockFailure) return resolve({ data: null, error: mockFailure });
          if (!mockHasPayoffs && table === 'loan_payoffs') {
            return resolve({
              data: null,
              error: {
                code: 'PGRST205',
                message: "Could not find the table 'public.loan_payoffs' in the schema cache",
              },
            });
          }
          if (!mockHasPayoffs && /loan_payoffs/.test(request.columns)) {
            return resolve({
              data: null,
              error: {
                code: 'PGRST200',
                message:
                  "Could not find a relationship between 'loans' and 'loan_payoffs' in the schema cache",
                details:
                  "Searched for a foreign key relationship between 'loans' and 'loan_payoffs' in the schema 'public', but no matches were found.",
              },
            });
          }
          const rows = mockRows.filter((row) =>
            request.filters.every(([column, value]) => row[column] === value),
          );
          return resolve({ data: rows, error: null });
        },
      };
      return builder;
    },
    rpc: async (name: string, args: Record<string, unknown>) => {
      mockRpcs.push({ name, args });
      if (mockRpcError) return { data: null, error: mockRpcError };
      return { data: name === 'record_loan_payoff' ? { id: 'po-new' } : true, error: null };
    },
  },
}));

jest.mock('@/providers/session-provider', () => ({ useUserId: () => 'user-1' }));
jest.mock('@/api/pro', () => ({ usePro: () => ({ pro: true, ready: true }) }));

let client: QueryClient;
const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={client}>{children}</QueryClientProvider>
);

beforeEach(() => {
  mockRequests.length = 0;
  mockRpcs.length = 0;
  mockRows = [];
  mockFailure = null;
  mockHasPayoffs = true;
  mockRpcError = null;
  client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
});

const TODAY = '2026-10-20';

const LOAN: BillRow = {
  id: 'car',
  name: 'Car loan',
  amount: 424.8,
  category_id: 'loans',
  icon_id: 'loan-car',
  recurrence: 'monthly',
  next_due_on: '2026-10-27',
  starts_on: '2026-10-12',
  ends_on: '2028-12-27',
  card_id: 'visa',
  bank_account_id: null,
  created_at: '2026-10-12T12:00:00Z',
};

const payoff = (id: string, over: Partial<LedgerPayoff> = {}): LedgerPayoff => ({
  id,
  bill_id: 'car',
  paid_on: '2026-10-14',
  amount: 1000,
  kind: 'partial',
  card_id: null,
  bank_account_id: 'checking',
  counted: true,
  ...over,
});

function input(overrides: Partial<LedgerInput> = {}): LedgerInput {
  return {
    receipts: [],
    subscriptions: [],
    bills: [LOAN],
    salaries: [],
    charges: [],
    pay: [],
    accountOrder: [],
    from: '2026-10-01',
    to: '2026-10-31',
    today: TODAY,
    ...overrides,
  };
}

const payoffEntries = (entries: ReturnType<typeof ledgerEntries>) =>
  entries.filter((entry) => entry.id.startsWith('payoff-'));

describe('ledgerEntries with payoffs', () => {
  it('lists each on its own date, from its own card or account, under its loan', () => {
    const entries = ledgerEntries(
      input({
        payoffs: [
          payoff('a'),
          payoff('b', {
            paid_on: '2026-10-16',
            amount: 250.5,
            card_id: 'amex',
            bank_account_id: null,
          }),
          payoff('c', { paid_on: '2026-10-18', amount: 75.25, bank_account_id: null }),
        ],
      }),
    );

    expect(payoffEntries(entries)).toEqual([
      expect.objectContaining({ id: 'payoff-c', date: '2026-10-18', amount: -75.25, sourceId: '' }),
      expect.objectContaining({
        id: 'payoff-b',
        date: '2026-10-16',
        amount: -250.5,
        sourceId: 'amex',
      }),
      {
        id: 'payoff-a',
        label: 'Car loan',
        amount: -1000,
        date: '2026-10-14',
        kind: 'bill',
        sourceId: 'checking',
        domain: null,
        logoHidden: false,
        categoryId: 'loans',
        iconId: 'loan-car',
        planId: 'car',
        payoff: 'partial',
      },
    ]);
    // The instalment is still there, once, and is not a payoff.
    expect(entries.filter((entry) => entry.date === '2026-10-27')).toHaveLength(1);
  });

  it('leaves out one paid while the loan was kept out, unless asked to show it on a bill’s page', () => {
    const payoffs = [payoff('off', { counted: false }), payoff('on', { paid_on: '2026-10-15' })];
    expect(payoffEntries(ledgerEntries(input({ payoffs }))).map((e) => e.id)).toEqual([
      'payoff-on',
    ]);
    expect(
      payoffEntries(ledgerEntries(input({ payoffs, uncounted: 'show' }))).map((e) => e.id),
    ).toEqual(['payoff-on', 'payoff-off']);
  });

  it('keeps to the window asked for', () => {
    const payoffs = [
      payoff('before', { paid_on: '2026-09-30' }),
      payoff('first', { paid_on: '2026-10-01' }),
      payoff('last', { paid_on: '2026-10-31' }),
      payoff('after', { paid_on: '2026-11-01' }),
    ];
    expect(payoffEntries(ledgerEntries(input({ payoffs }))).map((e) => e.id)).toEqual([
      'payoff-last',
      'payoff-first',
    ]);
  });

  it('counts one on a loan whose bill a full payoff stopped', () => {
    const stopped = { ...LOAN, next_due_on: null, ends_on: '2026-10-12' };
    const entries = ledgerEntries(
      input({ bills: [stopped], payoffs: [payoff('full', { kind: 'full', amount: 18000 })] }),
    );
    expect(entries.map((entry) => entry.id)).toEqual(['payoff-full']);
    expect(entries[0].payoff).toBe('full');
  });

  it('drops one whose loan is gone (deleted with its bill), rather than show it nameless', () => {
    expect(payoffEntries(ledgerEntries(input({ bills: [], payoffs: [payoff('a')] })))).toEqual([]);
  });

  it('reads as before with none', () => {
    expect(ledgerEntries(input({ payoffs: [] }))).toEqual(ledgerEntries(input()));
  });
});

describe('bookFlows with payoffs', () => {
  it('spends each once, with its loan named, so a card page row opens the loan', () => {
    const entries = ledgerEntries(
      input({ to: TODAY, payoffs: [payoff('a', { card_id: 'visa', bank_account_id: null })] }),
    );
    const { spending } = bookFlows({ entries, subscriptions: [], bills: [LOAN], charges: [] });

    expect(spending).toEqual([
      expect.objectContaining({
        id: 'payoff-a',
        amount: -1000,
        sourceId: 'visa',
        kind: 'bill',
        planId: 'car',
        payoff: 'partial',
      }),
    ]);
    expect(ledgerHref({ ...spending[0], kind: spending[0].kind })).toEqual({
      pathname: '/loan/[id]',
      params: { id: 'car' },
    });
  });

  it('never counts a stopped loan’s payoff a second time among its leftover charges', () => {
    const stopped = { ...LOAN, next_due_on: null, ends_on: '2026-10-14' };
    const entries = ledgerEntries(
      input({ bills: [stopped], to: TODAY, payoffs: [payoff('full', { kind: 'full' })] }),
    );
    const { spending } = bookFlows({ entries, subscriptions: [], bills: [stopped], charges: [] });
    expect(spending.map((row) => row.id)).toEqual(['payoff-full']);
  });
});

/** As PostgREST answers: numerics as text, the card or account embedded. */
const RAW = [
  {
    id: 'p2',
    bill_id: 'car',
    paid_on: '2026-10-14',
    amount: '250.50',
    kind: 'full',
    card_id: 'visa',
    bank_account_id: null,
    counted: true,
    created_at: '2026-10-14T10:00:00+00:00',
    card: { id: 'visa', holder: 'Chase', network: 'Visa', last4: '4821', color: '#905479' },
    account: null,
  },
  {
    id: 'p1',
    bill_id: 'car',
    paid_on: '2026-10-14',
    amount: '1000.00',
    kind: 'partial',
    card_id: null,
    bank_account_id: null,
    counted: false,
    created_at: '2026-10-14T09:00:00+00:00',
    card: null,
    account: null,
  },
  {
    id: 'other',
    bill_id: 'van',
    paid_on: '2026-09-01',
    amount: '5.00',
    kind: 'partial',
    card_id: null,
    bank_account_id: null,
    counted: true,
    created_at: '2026-09-01T09:00:00+00:00',
    card: null,
    account: null,
  },
];

describe('reading payoffs', () => {
  it('reads every one, oldest first (by day, then as recorded), as numbers with their source', async () => {
    mockRows = RAW;
    const rows = await readLoanPayoffs();

    expect(mockRequests).toEqual([
      {
        table: 'loan_payoffs',
        columns:
          'id, bill_id, paid_on, amount, kind, card_id, bank_account_id, counted, created_at, card:cards(id, holder, network, last4, color), account:bank_accounts(id, bank_name, nickname, last4, color)',
        filters: [],
      },
    ]);
    expect(rows.map((row) => [row.id, row.amount, row.kind, row.counted])).toEqual([
      ['other', 5, 'partial', true],
      ['p1', 1000, 'partial', false],
      ['p2', 250.5, 'full', true],
    ]);
    expect(rows[2].source).toMatchObject({ id: 'visa', kind: 'card', last4: '4821' });
    expect(rows[1].source).toBeNull();
  });

  it.each([
    ['PostgREST', 'PGRST205'],
    ['Postgres', '42P01'],
  ])('reads none on a database without them (%s)', async (_, code) => {
    mockFailure = { code, message: 'no loan_payoffs' };
    await expect(readLoanPayoffs()).resolves.toEqual([]);
  });

  it('throws any other failure, never "none"', async () => {
    mockFailure = { code: 'PGRST301', message: 'JWT expired' };
    await expect(readLoanPayoffs()).rejects.toMatchObject({ code: 'PGRST301' });
  });

  it('useLoanPayoffs keeps to one loan, and says when the read failed', async () => {
    mockRows = RAW;
    const mine = await renderHook(() => useLoanPayoffs('car'), { wrapper });
    await waitFor(() => expect(mine.result.current.isPending).toBe(false));
    expect(mine.result.current.payoffs.map((row) => row.id)).toEqual(['p1', 'p2']);
    expect(mine.result.current.isError).toBe(false);

    mockFailure = { code: 'PGRST301', message: 'JWT expired' };
    client.clear();
    const failed = await renderHook(() => useLoanPayoffs('car'), { wrapper });
    await waitFor(() => expect(failed.result.current.isError).toBe(true));
    expect(failed.result.current.payoffs).toEqual([]);
  });

  it('is read again when loans are invalidated, as a payoff and a bill write both do', async () => {
    const mine = await renderHook(() => useLoanPayoffs('car'), { wrapper });
    await waitFor(() => expect(mine.result.current.isPending).toBe(false));
    expect(mockRequests).toHaveLength(1);
    await act(async () => {
      await client.invalidateQueries({ queryKey: ['loans'] });
    });
    expect(mockRequests).toHaveLength(2);
  });
});

describe('withLoanPayoffs', () => {
  it('reads again without the embed only when the server has no payoffs to embed', async () => {
    const asked: string[] = [];
    const missing = {
      code: 'PGRST200',
      message:
        "Could not find a relationship between 'loans' and 'loan_payoffs' in the schema cache",
    };
    const result = await withLoanPayoffs(async (embed) => {
      asked.push(embed);
      return { error: embed ? missing : null };
    });
    expect(result.error).toBeNull();
    expect(asked).toEqual([
      ', payoffs:loan_payoffs(id, bill_id, paid_on, amount, kind, card_id, bank_account_id, counted, created_at, card:cards(id, holder, network, last4, color), account:bank_accounts(id, bank_name, nickname, last4, color))',
      '',
    ]);
  });

  it.each([
    { code: 'PGRST200', message: "Could not find a relationship between 'bills' and 'cards'" },
    { code: '42703', message: 'column loans.payment_day does not exist' },
    { code: 'PGRST301', message: 'JWT expired' },
  ])('hands back any other failure as it came ($code)', async (failure) => {
    const asked: string[] = [];
    const result = await withLoanPayoffs(async (embed) => {
      asked.push(embed);
      return { error: failure };
    });
    expect(result.error).toBe(failure);
    expect(asked).toHaveLength(1);
  });
});

describe('useLoans with payoffs', () => {
  const LOAN_ROW = {
    id: 'loan-1',
    bill_id: 'car',
    principal: '18000.00',
    annual_rate: '6.250000000',
    term_months: 48,
    monthly_payment: '424.80',
    total_interest: '2390.10',
    first_payment_on: '2025-01-27',
    funded_on: '2024-12-27',
    day_count_basis: 'actual/365',
    statement_on: null,
    statement_principal: null,
    payment_overrides: null,
    payment_day: null,
    created_at: '2026-10-12T12:00:00+00:00',
    bill: {
      id: 'car',
      name: 'Car loan',
      icon_id: 'loan-car',
      starts_on: '2026-10-12',
      next_due_on: '2026-10-27',
      ends_on: '2028-12-27',
    },
  };

  it('embeds each loan’s payoffs in the one read, oldest first', async () => {
    mockRows = [{ ...LOAN_ROW, payoffs: RAW.slice(0, 2) }];
    const list = await renderHook(() => useLoans(TODAY), { wrapper });
    await waitFor(() => expect(list.result.current.isPending).toBe(false));

    expect(mockRequests).toHaveLength(1);
    expect(mockRequests[0].columns).toContain('created_at, payoffs:loan_payoffs(');
    expect(list.result.current.loans[0].payoffs.map((row) => row.id)).toEqual(['p1', 'p2']);
  });

  it('gives the schedule a payoff from before the loan was added, which spending leaves out (F1)', async () => {
    // p1 is stored counted: false, as record_loan_payoff stores one dated before the add day.
    mockRows = [{ ...LOAN_ROW, payoffs: RAW.slice(0, 2) }];
    const list = await renderHook(() => useLoans(TODAY), { wrapper });
    await waitFor(() => expect(list.result.current.isPending).toBe(false));

    const loan = list.result.current.loans[0];
    expect(loanTermsOf(loan)?.payoffs?.map((payoff) => [payoff.id, payoff.amount])).toEqual([
      ['p1', 1000],
      ['p2', 250.5],
    ]);
    const entries = ledgerEntries(input({ payoffs: loan.payoffs }));
    expect(payoffEntries(entries).map((entry) => entry.id)).toEqual(['payoff-p2']);
  });

  it('loads every loan with none on a database without payoffs', async () => {
    mockHasPayoffs = false;
    mockRows = [LOAN_ROW];
    const list = await renderHook(() => useLoans(TODAY), { wrapper });
    await waitFor(() => expect(list.result.current.isPending).toBe(false));

    expect(list.result.current.isError).toBe(false);
    expect(mockRequests).toHaveLength(2);
    expect(mockRequests[1].columns).not.toMatch(/loan_payoffs/);
    expect(list.result.current.loans[0].payoffs).toEqual([]);
  });
});

describe('recording and removing payoffs', () => {
  /** The query keys invalidated from here on. */
  function watchInvalidations() {
    const spy = jest.spyOn(client, 'invalidateQueries');
    return () => spy.mock.calls.map(([filters]) => filters?.queryKey);
  }

  it('records a partial payoff with its new last payment and the person’s day', async () => {
    const keys = watchInvalidations();
    const record = await renderHook(() => useRecordPayoff(), { wrapper });
    const saved = await act(() =>
      record.result.current.mutateAsync({
        billId: 'car',
        paidOn: '2026-10-12',
        amount: 2000,
        kind: 'partial',
        cardId: null,
        bankAccountId: 'checking',
        lastPaymentOn: '2028-07-27',
        today: '2026-10-12',
      }),
    );

    expect(saved).toEqual({ id: 'po-new', billId: 'car' });
    expect(mockRpcs).toEqual([
      {
        name: 'record_loan_payoff',
        args: {
          p_bill_id: 'car',
          p_paid_on: '2026-10-12',
          p_amount: 2000,
          p_kind: 'partial',
          p_card_id: null,
          p_bank_account_id: 'checking',
          p_last_payment_on: '2028-07-27',
          p_today: '2026-10-12',
        },
      },
    ]);
    expect(keys()).toEqual(
      expect.arrayContaining([
        ['bills'],
        ['loans'],
        ['dashboard'],
        ['bill', 'car'],
        ['loan', 'car'],
      ]),
    );
  });

  it('sends no last payment for a full payoff, and the profile’s day when none is given', async () => {
    const record = await renderHook(() => useRecordPayoff(), { wrapper });
    await act(() =>
      record.result.current.mutateAsync({
        billId: 'car',
        paidOn: '2026-10-12',
        amount: 10701.09,
        kind: 'full',
        cardId: 'visa',
        bankAccountId: null,
        lastPaymentOn: '2026-10-12',
      }),
    );
    expect(mockRpcs[0].args).toMatchObject({
      p_kind: 'full',
      p_last_payment_on: null,
      p_today: null,
    });
  });

  it('throws a refusal as it came, for the page to show the one failure line', async () => {
    mockRpcError = { code: 'P0001', message: 'the loan is already paid off' };
    const record = await renderHook(() => useRecordPayoff(), { wrapper });
    await expect(
      record.result.current.mutateAsync({
        billId: 'car',
        paidOn: '2026-10-12',
        amount: 1,
        kind: 'partial',
        cardId: null,
        bankAccountId: null,
        lastPaymentOn: null,
      }),
    ).rejects.toMatchObject({ code: 'P0001' });
  });

  it('removes one with the last payment the loan has without it', async () => {
    const keys = watchInvalidations();
    const remove = await renderHook(() => useDeletePayoff(), { wrapper });
    await act(() =>
      remove.result.current.mutateAsync({
        billId: 'car',
        payoffId: 'po-1',
        lastPaymentOn: '2028-12-27',
      }),
    );

    expect(mockRpcs).toEqual([
      { name: 'delete_loan_payoff', args: { p_id: 'po-1', p_last_payment_on: '2028-12-27' } },
    ]);
    expect(keys()).toEqual(
      expect.arrayContaining([['bills'], ['loans'], ['bill', 'car'], ['loan', 'car']]),
    );
  });

  it.each([
    ['an earlier one while a later one stands', 'P0001', 'only the latest payoff can be removed'],
    ['any call before the migration is live', 'PGRST202', 'Could not find the function'],
  ])('throws for %s', async (_, code, message) => {
    mockRpcError = { code, message };
    const remove = await renderHook(() => useDeletePayoff(), { wrapper });
    await expect(
      remove.result.current.mutateAsync({ billId: 'car', payoffId: 'po-1', lastPaymentOn: null }),
    ).rejects.toMatchObject({ code });
  });
});
