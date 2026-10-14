import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { loanTermsOf, readLoanDetail, useLoanDetail } from '@/api/loans';
import { termsFromStored } from '@/lib/loan';

/**
 * A loan's own page reads the loan with its payoffs, its bill and the bill's card or account in one
 * request, from the bill's side, so "this bill has no loan" and "this bill is gone" read
 * differently. It still loads on a database without the newer columns or without payoffs, and a
 * failed read is never taken for a loan that is gone. The error texts are the ones PostgREST v14.5
 * answered with on copies without migrations A and C.
 */

type Failure = { code: string; message: string; details?: null; hint?: null };

const mockRequests: { table: string; columns: string; filter: [string, unknown] | null }[] = [];
let mockRow: Record<string, unknown> | null = null;
let mockHasFlag = true;
let mockHasPaymentDay = true;
/** Which missing column Postgres names first when both are missing. */
let mockFirstMissing: 'payment_day' | 'in_spending' = 'payment_day';
let mockFailure: Failure | null = null;

let mockHasPayoffs = true;
let mockPayoffs: Record<string, unknown>[] = [];

jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: (table: string) => {
      const request = { table, columns: '', filter: null as [string, unknown] | null };
      const builder: Record<string, unknown> = {
        select: (columns: string) => {
          request.columns = columns;
          mockRequests.push(request);
          return builder;
        },
        eq: (column: string, value: unknown) => {
          request.filter = [column, value];
          return builder;
        },
        maybeSingle: () => builder,
        then: (resolve: (value: unknown) => unknown) => {
          if (mockFailure) return resolve({ data: null, error: mockFailure });
          const asksPayoffs = /\bloan_payoffs\b/.test(request.columns);
          // Found from the schema cache, before any column is looked at.
          if (asksPayoffs && !mockHasPayoffs) {
            return resolve({
              data: null,
              error: {
                code: 'PGRST200',
                message:
                  "Could not find a relationship between 'loans' and 'loan_payoffs' in the schema cache",
                details:
                  "Searched for a foreign key relationship between 'loans' and 'loan_payoffs' in the schema 'public', but no matches were found.",
                hint: null,
              },
            });
          }
          const lacksDay = !mockHasPaymentDay && /\bpayment_day\b/.test(request.columns);
          const lacksFlag = !mockHasFlag && /\bin_spending\b/.test(request.columns);
          const missing =
            lacksDay && lacksFlag
              ? mockFirstMissing
              : lacksDay
                ? 'payment_day'
                : lacksFlag
                  ? 'in_spending'
                  : null;
          if (missing === 'payment_day') {
            return resolve({
              data: null,
              error: {
                code: '42703',
                message: 'column loans_1.payment_day does not exist',
                details: null,
                hint: null,
              },
            });
          }
          if (missing === 'in_spending') {
            return resolve({
              data: null,
              error: {
                code: '42703',
                message: 'column bills.in_spending does not exist',
                details: null,
                hint: null,
              },
            });
          }
          if (!mockRow) return resolve({ data: null, error: null });
          const { in_spending: flag, loan, ...bill } = mockRow;
          const embedded =
            loan && typeof loan === 'object' && !Array.isArray(loan)
              ? (({ payment_day: day, ...rest }: Record<string, unknown>) => ({
                  ...rest,
                  ...(mockHasPaymentDay ? { payment_day: day } : {}),
                  ...(asksPayoffs ? { payoffs: mockPayoffs } : {}),
                }))(loan as Record<string, unknown>)
              : loan;
          return resolve({
            data: { ...bill, ...(mockHasFlag ? { in_spending: flag } : {}), loan: embedded },
            error: null,
          });
        },
      };
      return builder;
    },
  },
}));

jest.mock('@/providers/session-provider', () => ({ useUserId: () => 'user-1' }));
jest.mock('@/api/pro', () => ({ usePro: () => ({ pro: true, ready: true }) }));

const CARD = { id: 'card-1', holder: 'Chase', network: 'Visa', last4: '4821', color: '#905479' };
const ACCOUNT = {
  id: 'acct-1',
  bank_name: 'Chase',
  nickname: 'Checking',
  last4: '7730',
  color: '#225588',
};

/** The wireframe's car loan as PostgREST answers for it: numerics as strings, the loan embedded. */
function row(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'bill-1',
    name: 'Car loan',
    icon_id: 'loan-car',
    category_id: 'loans',
    amount: '424.80',
    starts_on: '2026-10-12',
    next_due_on: '2026-10-27',
    ends_on: '2028-12-27',
    card_id: 'card-1',
    bank_account_id: null,
    created_at: '2026-10-12T12:00:00+00:00',
    in_spending: true,
    loan: {
      id: 'loan-1',
      bill_id: 'bill-1',
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
      payment_overrides: { '3': 500 },
      payment_day: null,
      created_at: '2026-10-12T12:00:00+00:00',
    },
    card: CARD,
    account: null,
    ...overrides,
  };
}

let client: QueryClient;
function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  mockRequests.length = 0;
  mockHasPayoffs = true;
  mockPayoffs = [];
  mockRow = row();
  mockHasFlag = true;
  mockHasPaymentDay = true;
  mockFirstMissing = 'payment_day';
  mockFailure = null;
  client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
});

async function read(billId: string | undefined) {
  const { result } = await renderHook(() => useLoanDetail(billId), { wrapper });
  if (billId) await waitFor(() => expect(result.current.isPending).toBe(false));
  return result;
}

describe('useLoanDetail', () => {
  it('reads the loan, its bill and its card in one request, by the bill', async () => {
    const result = await read('bill-1');

    expect(mockRequests).toHaveLength(1);
    expect(mockRequests[0].table).toBe('bills');
    expect(mockRequests[0].filter).toEqual(['id', 'bill-1']);
    expect(mockRequests[0].columns).toMatch(
      /^id, name, icon_id, category_id, amount, starts_on, next_due_on, ends_on, card_id, bank_account_id, created_at, in_spending, loan:loans\(/,
    );
    expect(mockRequests[0].columns).toContain(
      'payment_overrides, payment_day, created_at, payoffs:loan_payoffs(',
    );
    expect(mockRequests[0].columns).toContain('card:cards(id, holder, network, last4, color)');
    expect(mockRequests[0].columns).toContain(
      'account:bank_accounts(id, bank_name, nickname, last4, color)',
    );

    const data = result.current.data;
    expect(data?.kind).toBe('loan');
    if (data?.kind !== 'loan') return;
    expect(data.loan).toMatchObject({
      id: 'loan-1',
      bill_id: 'bill-1',
      principal: 18000,
      annual_rate: 6.25,
      monthly_payment: 424.8,
      total_interest: 2390.1,
      first_payment_on: '2025-01-27',
      payment_overrides: { '3': 500 },
      payment_day: null,
      created_at: '2026-10-12T12:00:00+00:00',
    });
    expect(data.loan.bill).toEqual({
      id: 'bill-1',
      name: 'Car loan',
      icon_id: 'loan-car',
      category_id: 'loans',
      amount: 424.8,
      starts_on: '2026-10-12',
      next_due_on: '2026-10-27',
      ends_on: '2028-12-27',
      card_id: 'card-1',
      bank_account_id: null,
      created_at: '2026-10-12T12:00:00+00:00',
      in_spending: true,
    });
    // Drawn as the Paid from tiles draw a card.
    expect(data.loan.source).toEqual({
      id: 'card-1',
      label: 'Visa ••4821',
      name: 'Chase',
      last4: '4821',
      color: '#905479',
      kind: 'card',
    });
  });

  it('names an account by its nickname, and has no source for Skip', async () => {
    mockRow = row({ card_id: null, bank_account_id: 'acct-1', card: null, account: ACCOUNT });
    const account = await read('bill-1');
    expect(account.current.data).toMatchObject({
      kind: 'loan',
      loan: {
        source: {
          id: 'acct-1',
          label: 'Checking ••7730',
          name: 'Checking',
          last4: '7730',
          kind: 'account',
        },
      },
    });

    mockRow = row({ card_id: null, card: null, account: null });
    client.clear();
    const skip = await read('bill-1');
    expect(skip.current.data).toMatchObject({ kind: 'loan', loan: { source: null } });
  });

  it('keeps a loan kept out of monthly bills kept out', async () => {
    mockRow = row({ in_spending: false });
    const result = await read('bill-1');
    expect(result.current.data).toMatchObject({
      kind: 'loan',
      loan: { bill: { in_spending: false } },
    });
  });

  it('tells a bill with no loan behind it from a bill that is gone', async () => {
    mockRow = row({ loan: null });
    expect((await read('bill-1')).current.data).toEqual({ kind: 'bill' });

    mockRow = null;
    client.clear();
    expect((await read('bill-1')).current.data).toEqual({ kind: 'gone' });
  });

  it('reads the loan from a list too, as a server that does not see one-to-one answers', () => {
    const { loan } = row() as { loan: Record<string, unknown> };
    expect(readLoanDetail({ ...row(), loan: [loan] } as never)).toMatchObject({
      kind: 'loan',
      loan: { id: 'loan-1', principal: 18000 },
    });
    expect(readLoanDetail({ ...row(), loan: [] } as never)).toEqual({ kind: 'bill' });
    expect(readLoanDetail(null)).toEqual({ kind: 'gone' });
  });

  it.each([
    ['payment day', { flag: true, day: false }, 2],
    ['spending flag', { flag: false, day: true }, 2],
    ['payment day and the flag, the day named first', { flag: false, day: false }, 3],
  ] as const)('still loads on a database without the %s', async (_, has, requests) => {
    mockHasFlag = has.flag;
    mockHasPaymentDay = has.day;
    const result = await read('bill-1');

    expect(mockRequests).toHaveLength(requests);
    expect(result.current.isError).toBe(false);
    expect(result.current.data).toMatchObject({
      kind: 'loan',
      loan: { payment_day: null, payment_overrides: { '3': 500 }, bill: { in_spending: true } },
    });
  });

  it('still loads when the flag is the missing column named first', async () => {
    mockHasFlag = false;
    mockHasPaymentDay = false;
    mockFirstMissing = 'in_spending';
    const result = await read('bill-1');

    // One more round trip than the other way round; it ends on neither column all the same.
    const last = mockRequests[mockRequests.length - 1].columns;
    expect(last).not.toMatch(/\bin_spending\b|\bpayment_day\b/);
    expect(result.current.data).toMatchObject({
      kind: 'loan',
      loan: { bill: { in_spending: true } },
    });
  });

  it('is an error, never "gone", when the read fails', async () => {
    mockFailure = { code: 'PGRST301', message: 'JWT expired' };
    const result = await read('bill-1');

    expect(result.current.isError).toBe(true);
    expect(result.current.data).toBeUndefined();
    expect(mockRequests).toHaveLength(1);
  });

  it('says a first read that failed is not a reload that failed', async () => {
    mockFailure = { code: 'PGRST301', message: 'JWT expired' };
    const result = await read('bill-1');

    expect(result.current.refreshFailed).toBe(false);
  });

  it('keeps the loan it read when a reload fails, keeping TanStack’s own isError', async () => {
    const result = await read('bill-1');
    expect(result.current.refreshFailed).toBe(false);

    mockFailure = { code: 'PGRST301', message: 'JWT expired' };
    await act(async () => {
      await client.refetchQueries({ queryKey: ['loans'] });
    });

    await waitFor(() => expect(result.current.refreshFailed).toBe(true));
    // The Pay off page reads this to refuse pricing on a failed opening read.
    expect(result.current.isError).toBe(true);
    expect(result.current.data).toMatchObject({ kind: 'loan' });
  });

  it('re-renders its screens for the fields they read, not for every change to the read', async () => {
    // Stale after 30 ms: going stale changes the read, and no screen reads whether it is stale.
    client = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0, staleTime: 30 } },
    });
    let renders = 0;
    const { result } = await renderHook(
      () => {
        renders += 1;
        return useLoanDetail('bill-1');
      },
      { wrapper },
    );
    await waitFor(() => expect(result.current.data).toMatchObject({ kind: 'loan' }));
    const drawn = renders;

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 80));
    });
    expect(renders).toBe(drawn);
    expect(Object.keys(result.current).sort()).toEqual([
      'data',
      'isError',
      'isFetchedAfterMount',
      'isFetching',
      'isPending',
      'refetch',
      'refreshFailed',
    ]);
  });

  it('asks nothing without a bill id', async () => {
    await read(undefined);
    expect(mockRequests).toHaveLength(0);
  });

  it('is read again whenever loans are invalidated', async () => {
    await read('bill-1');
    expect(mockRequests).toHaveLength(1);

    await act(async () => {
      await client.invalidateQueries({ queryKey: ['loans'] });
    });
    expect(mockRequests).toHaveLength(2);
  });

  it('gives the schedule the Loans page builds for the same loan', async () => {
    mockRow = row({
      loan: { ...(row().loan as object), first_payment_on: '2025-02-28', payment_day: 31 },
    });
    const result = await read('bill-1');
    const data = result.current.data;
    if (data?.kind !== 'loan') throw new Error('no loan');

    const terms = loanTermsOf(data.loan);
    expect(terms).toEqual(termsFromStored(data.loan, data.loan.bill.starts_on ?? undefined));
    expect(terms?.paymentDay).toBe(31);
    expect(terms?.payment).toBe(424.8);
  });

  describe('its payoffs', () => {
    /** As PostgREST answers: numerics as text, the card or account embedded. */
    const PAYOFFS = [
      {
        id: 'po-1',
        bill_id: 'bill-1',
        paid_on: '2026-03-14',
        amount: '1000.00',
        kind: 'partial',
        card_id: null,
        bank_account_id: 'acct-1',
        counted: true,
        created_at: '2026-03-14T09:00:00+00:00',
        card: null,
        account: ACCOUNT,
      },
      {
        id: 'po-2',
        bill_id: 'bill-1',
        paid_on: '2026-10-05',
        amount: '250.50',
        kind: 'partial',
        card_id: 'card-1',
        bank_account_id: null,
        counted: false,
        created_at: '2026-10-05T09:00:00+00:00',
        card: CARD,
        account: null,
      },
      {
        id: 'po-3',
        bill_id: 'bill-1',
        paid_on: '2026-10-06',
        amount: '75.25',
        kind: 'partial',
        card_id: null,
        bank_account_id: null,
        counted: true,
        created_at: '2026-10-06T09:00:00+00:00',
        card: null,
        account: null,
      },
    ];

    it('reads this loan’s in the same request, oldest first, as numbers with their sources', async () => {
      mockPayoffs = [PAYOFFS[2], PAYOFFS[0], PAYOFFS[1]];
      const result = await read('bill-1');

      expect(mockRequests).toHaveLength(1);
      expect(mockRequests[0].columns).toContain(
        'created_at, payoffs:loan_payoffs(id, bill_id, paid_on, amount, kind, card_id, bank_account_id, counted, created_at, card:cards(id, holder, network, last4, color), account:bank_accounts(id, bank_name, nickname, last4, color)))',
      );
      const data = result.current.data;
      if (data?.kind !== 'loan') throw new Error('no loan');
      expect(data.loan.payoffs).toEqual([
        {
          id: 'po-1',
          bill_id: 'bill-1',
          paid_on: '2026-03-14',
          amount: 1000,
          kind: 'partial',
          card_id: null,
          bank_account_id: 'acct-1',
          counted: true,
          created_at: '2026-03-14T09:00:00+00:00',
          source: {
            id: 'acct-1',
            label: 'Checking ••7730',
            name: 'Checking',
            last4: '7730',
            color: '#225588',
            kind: 'account',
          },
        },
        expect.objectContaining({
          id: 'po-2',
          amount: 250.5,
          counted: false,
          source: expect.objectContaining({ id: 'card-1', kind: 'card', name: 'Chase' }),
        }),
        // Skip: no card and no account.
        expect.objectContaining({ id: 'po-3', amount: 75.25, source: null }),
      ]);
    });

    it('orders two paid the same day as they were recorded', async () => {
      mockPayoffs = [
        { ...PAYOFFS[1], id: 'later', created_at: '2026-10-05T10:00:00+00:00' },
        { ...PAYOFFS[1], id: 'earlier', created_at: '2026-10-05T09:00:00+00:00' },
      ];
      const data = (await read('bill-1')).current.data;
      if (data?.kind !== 'loan') throw new Error('no loan');
      expect(data.loan.payoffs.map((payoff) => payoff.id)).toEqual(['earlier', 'later']);
    });

    it('gives them to the schedule, as the Loans page does', async () => {
      mockPayoffs = PAYOFFS;
      const result = await read('bill-1');
      const data = result.current.data;
      if (data?.kind !== 'loan') throw new Error('no loan');

      const terms = loanTermsOf(data.loan);
      expect(terms?.payoffs?.map((payoff) => [payoff.id, payoff.amount])).toEqual([
        ['po-1', 1000],
        ['po-2', 250.5],
        ['po-3', 75.25],
      ]);
      expect(terms).toEqual(termsFromStored(data.loan, data.loan.bill.starts_on ?? undefined));
    });

    it('has none, but no other change, on a loan never paid down', async () => {
      const result = await read('bill-1');
      expect(result.current.data).toMatchObject({ kind: 'loan', loan: { payoffs: [] } });
      const data = result.current.data;
      if (data?.kind !== 'loan') throw new Error('no loan');
      expect(loanTermsOf(data.loan)?.payoffs).toBeUndefined();
    });

    it('reads none on a database without them, never an error, one request more', async () => {
      mockHasPayoffs = false;
      mockPayoffs = PAYOFFS;
      const result = await read('bill-1');

      expect(result.current.isError).toBe(false);
      expect(mockRequests).toHaveLength(2);
      expect(mockRequests[1].columns).not.toMatch(/loan_payoffs/);
      expect(result.current.data).toMatchObject({ kind: 'loan', loan: { payoffs: [] } });
    });

    it('still loads on a database without payoffs, the payment day or the flag', async () => {
      mockHasPayoffs = false;
      mockHasPaymentDay = false;
      mockHasFlag = false;
      const result = await read('bill-1');

      expect(result.current.isError).toBe(false);
      expect(mockRequests[mockRequests.length - 1].columns).not.toMatch(
        /loan_payoffs|\bin_spending\b|\bpayment_day\b/,
      );
      expect(result.current.data).toMatchObject({
        kind: 'loan',
        loan: { payoffs: [], payment_day: null, bill: { in_spending: true } },
      });
    });

    it('is an error when the read fails another way, never a loan with none', async () => {
      mockFailure = { code: 'PGRST301', message: 'JWT expired' };
      const result = await read('bill-1');

      expect(result.current.isError).toBe(true);
      expect(result.current.data).toBeUndefined();
      expect(mockRequests).toHaveLength(1);
    });

    it('reads a bill with no loan, and a bill that is gone, as before', async () => {
      mockPayoffs = [];
      mockRow = row({ loan: null });
      expect((await read('bill-1')).current.data).toEqual({ kind: 'bill' });
      mockRow = null;
      client.clear();
      expect((await read('bill-1')).current.data).toEqual({ kind: 'gone' });
    });
  });
});
