import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { useSaveLoan, type SaveLoanValues } from '@/api/mutations';
import { useLoanForBill } from '@/api/queries';
import { termsFromStored } from '@/lib/loan';
import { paymentOverridesJson } from '@/lib/loan-overrides';
import { refusedLoanSave } from '@/lib/loan-refusal';

/**
 * Saving a loan with the payments the person changed, and reading them back so every schedule
 * follows them. A loan with no changes makes exactly the call the app always made, which a database
 * without the new parameters still accepts.
 */

type Failure = { code: string; message: string; details?: null; hint?: null };

const mockRpc = jest.fn();
const mockSelects: string[] = [];
let mockLoan: Record<string, unknown> | null = null;
let mockHasOverridesColumn = true;
let mockReadFailure: Failure | null = null;

jest.mock('@/lib/supabase', () => {
  const build = () => {
    let columns = '';
    const builder: Record<string, unknown> = {
      select: (asked: string) => {
        columns = asked;
        mockSelects.push(asked);
        return builder;
      },
      eq: () => builder,
      maybeSingle: () => builder,
      then: (resolve: (value: unknown) => unknown) => {
        if (mockReadFailure) return resolve({ data: null, error: mockReadFailure });
        if (!mockHasOverridesColumn && /\bpayment_overrides\b/.test(columns)) {
          return resolve({
            data: null,
            error: { code: '42703', message: 'column loans.payment_overrides does not exist' },
          });
        }
        if (!mockLoan) return resolve({ data: null, error: null });
        const { payment_overrides: overrides, ...rest } = mockLoan;
        return resolve({
          data: /\bpayment_overrides\b/.test(columns)
            ? { ...rest, payment_overrides: overrides }
            : rest,
          error: null,
        });
      },
    };
    return builder;
  };
  return {
    supabase: {
      from: () => build(),
      rpc: (name: string, args: Record<string, unknown>) => mockRpc(name, args),
    },
  };
});

jest.mock('@/providers/session-provider', () => ({ useUserId: () => 'user-1' }));
jest.mock('@/api/pro', () => ({ usePro: () => ({ pro: true, ready: true }) }));

let client: QueryClient;
let invalidated: unknown[][];
function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  mockRpc.mockReset().mockResolvedValue({ data: { id: 'bill-1' }, error: null });
  mockSelects.length = 0;
  mockLoan = null;
  mockHasOverridesColumn = true;
  mockReadFailure = null;
  client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } },
  });
  invalidated = [];
  jest.spyOn(client, 'invalidateQueries').mockImplementation((filters) => {
    invalidated.push((filters?.queryKey ?? []) as unknown[]);
    return Promise.resolve();
  });
});

/** Runs a mutation inside act, so the hook's state updates settle before anything is asserted. */
async function settle<T>(work: () => Promise<T>): Promise<T> {
  type Outcome = { ok: true; value: T } | { ok: false; error: unknown };
  let outcome = { ok: false, error: new Error('never ran') } as Outcome;
  await act(async () => {
    try {
      outcome = { ok: true, value: await work() };
    } catch (error) {
      outcome = { ok: false, error };
    }
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
  if (!outcome.ok) throw outcome.error;
  return outcome.value;
}

const LOAN: SaveLoanValues = {
  name: 'Car loan',
  iconId: 'loan-car',
  principal: 32001,
  annualRate: 7.4995,
  termMonths: 60,
  monthlyPayment: 641.23,
  totalInterest: 6472.8,
  firstPaymentOn: '2026-11-01',
  fundedOn: '2026-10-01',
  dayCountBasis: 'actual/365',
  cardId: 'card-1',
  bankAccountId: null,
};

/** The thirteen arguments the app has always sent. */
const TODAY_ARGS = {
  p_name: 'Car loan',
  p_icon_id: 'loan-car',
  p_principal: 32001,
  p_annual_rate: 7.4995,
  p_term_months: 60,
  p_monthly_payment: 641.23,
  p_total_interest: 6472.8,
  p_first_payment_on: '2026-11-01',
  p_recurrence: 'monthly',
  p_card_id: 'card-1',
  p_bank_account_id: null,
  p_funded_on: '2026-10-01',
  p_day_count_basis: 'actual/365',
};

describe('useSaveLoan', () => {
  it('makes exactly the old call when nothing was changed', async () => {
    const { result } = await renderHook(() => useSaveLoan(), { wrapper });
    await settle(() => result.current.mutateAsync(LOAN));

    expect(mockRpc).toHaveBeenCalledTimes(1);
    expect(mockRpc).toHaveBeenCalledWith('save_loan', TODAY_ARGS);
  });

  it('leaves both out when they are null or empty', async () => {
    const { result } = await renderHook(() => useSaveLoan(), { wrapper });
    await settle(() =>
      result.current.mutateAsync({ ...LOAN, paymentOverrides: null, lastPaymentOn: null }),
    );
    await settle(() =>
      result.current.mutateAsync({
        ...LOAN,
        paymentOverrides: paymentOverridesJson({}),
        lastPaymentOn: undefined,
      }),
    );
    await settle(() => result.current.mutateAsync({ ...LOAN, paymentOverrides: {} }));

    for (const [, args] of mockRpc.mock.calls) expect(args).toEqual(TODAY_ARGS);
  });

  it('sends the changed payments, exact to the cent, and the payoff date', async () => {
    const { result } = await renderHook(() => useSaveLoan(), { wrapper });
    await settle(() =>
      result.current.mutateAsync({
        ...LOAN,
        paymentOverrides: paymentOverridesJson({ 1: 612.4, 14: 1000 }),
        lastPaymentOn: '2030-06-01',
      }),
    );

    expect(mockRpc).toHaveBeenCalledWith('save_loan', {
      ...TODAY_ARGS,
      p_payment_overrides: { '1': 612.4, '14': 1000 },
      p_last_payment_on: '2030-06-01',
    });
    expect(invalidated).toEqual(expect.arrayContaining([['bills'], ['loans'], ['dashboard']]));
  });

  it('sends a payoff date alone when only the end moved', async () => {
    const { result } = await renderHook(() => useSaveLoan(), { wrapper });
    await settle(() => result.current.mutateAsync({ ...LOAN, lastPaymentOn: '2031-04-01' }));

    expect(mockRpc).toHaveBeenCalledWith('save_loan', {
      ...TODAY_ARGS,
      p_last_payment_on: '2031-04-01',
    });
  });

  it.each([
    [
      'payments',
      'new row for relation "loans" violates check constraint "loans_payment_overrides_valid"',
      '23514',
    ],
    [
      'rate',
      'new row for relation "loans" violates check constraint "loans_annual_rate_check"',
      '23514',
    ],
    ['lastPayment', 'the last payment must fall within the term', 'P0001'],
  ] as const)(
    'passes a %s refusal on, once, for the form to explain',
    async (kind, message, code) => {
      mockRpc.mockResolvedValue({
        data: null,
        error: { code, message, details: null, hint: null },
      });
      const { result } = await renderHook(() => useSaveLoan(), { wrapper });

      const thrown = await settle(() =>
        result.current.mutateAsync({ ...LOAN, lastPaymentOn: '2032-01-01' }),
      ).catch((error: unknown) => error);

      expect(refusedLoanSave(thrown)).toBe(kind);
      expect(mockRpc).toHaveBeenCalledTimes(1);
      expect(invalidated).toEqual([]);
    },
  );

  it('leaves any other failure to the house failure line', async () => {
    mockRpc.mockResolvedValue({
      data: null,
      error: { code: '08006', message: 'connection failure', details: null, hint: null },
    });
    const { result } = await renderHook(() => useSaveLoan(), { wrapper });

    const thrown = await settle(() => result.current.mutateAsync(LOAN)).catch((e: unknown) => e);
    expect(thrown).toMatchObject({ code: '08006' });
    expect(refusedLoanSave(thrown)).toBeNull();
  });
});

const STORED = {
  id: 'loan-1',
  bill_id: 'bill-1',
  principal: 32001,
  annual_rate: 7.4995,
  term_months: 60,
  monthly_payment: 641.23,
  total_interest: 6472.8,
  first_payment_on: '2026-11-01',
  funded_on: '2026-10-01',
  day_count_basis: 'actual/365',
  statement_on: null,
  statement_principal: null,
  payment_overrides: { '1': 612.4, '14': 1000 },
};

describe('useLoanForBill', () => {
  it('reads the changed payments, and the schedule follows them', async () => {
    mockLoan = STORED;
    const { result } = await renderHook(() => useLoanForBill('bill-1'), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockSelects).toHaveLength(1);
    expect(mockSelects[0]).toMatch(/\bpayment_overrides\b/);
    expect(result.current.data?.payment_overrides).toEqual({ '1': 612.4, '14': 1000 });
    expect(termsFromStored(result.current.data!)?.paymentOverrides).toEqual({ 1: 612.4, 14: 1000 });
  });

  it('reads a loan with no changes as none', async () => {
    mockLoan = { ...STORED, payment_overrides: null };
    const { result } = await renderHook(() => useLoanForBill('bill-1'), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.payment_overrides).toBeNull();
    expect(termsFromStored(result.current.data!)?.paymentOverrides).toBeUndefined();
  });

  it('still reads every loan, with no changes, on a database without the column', async () => {
    mockLoan = STORED;
    mockHasOverridesColumn = false;
    const { result } = await renderHook(() => useLoanForBill('bill-1'), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockSelects).toHaveLength(2);
    expect(mockSelects[1]).toBe(mockSelects[0].replace(', payment_overrides', ''));
    expect(result.current.data).toMatchObject({ principal: 32001, payment_overrides: null });
  });

  it('is null for a bill with no loan behind it', async () => {
    const { result } = await renderHook(() => useLoanForBill('bill-2'), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toBeNull();
  });

  it('does not paper over any other failure', async () => {
    mockReadFailure = { code: '42703', message: 'column loans.statement_on does not exist' };
    const { result } = await renderHook(() => useLoanForBill('bill-1'), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(mockSelects).toHaveLength(1);
  });
});
