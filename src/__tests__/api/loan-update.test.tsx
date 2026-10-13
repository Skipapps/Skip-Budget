import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import {
  useSaveLoan,
  useUpdateLoan,
  type SaveLoanValues,
  type UpdateLoanValues,
} from '@/api/mutations';
import { refusedLoanSave } from '@/lib/loan-refusal';

/**
 * Editing a saved loan is one call to update_loan, which rewrites the loan and its bill together and
 * keeps the bill's id. The edit replaces the contract, so every optional part is sent (null for
 * none), and it is refused with the same words as a save. A database without update_loan refuses
 * the call; nothing falls back to a write that could half-save.
 */

type Failure = { code: string; message: string; details?: null; hint?: null };

const mockRpc = jest.fn();
const mockFrom = jest.fn();

jest.mock('@/lib/supabase', () => ({
  supabase: {
    rpc: (name: string, args: Record<string, unknown>) => mockRpc(name, args),
    from: (table: string) => mockFrom(table),
  },
}));

jest.mock('@/providers/session-provider', () => ({ useUserId: () => 'user-1' }));
jest.mock('@/api/pro', () => ({ usePro: () => ({ pro: true, ready: true }) }));

let client: QueryClient;
let invalidated: unknown[][];
function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  mockRpc.mockReset().mockResolvedValue({ data: { id: 'bill-1' }, error: null });
  mockFrom.mockReset();
  client = new QueryClient({
    // gcTime 0 on mutations too, or the mutation cache's timer holds Jest open after the run.
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false, gcTime: 0 },
    },
  });
  invalidated = [];
  jest.spyOn(client, 'invalidateQueries').mockImplementation((filters) => {
    invalidated.push((filters?.queryKey ?? []) as unknown[]);
    return Promise.resolve();
  });
});

/** Runs a mutation inside act, so the hook's state settles before anything is asserted. */
async function settle<T>(work: () => Promise<T>): Promise<{ value?: T; error?: unknown }> {
  let outcome: { value?: T; error?: unknown } = {};
  await act(async () => {
    try {
      outcome = { value: await work() };
    } catch (error) {
      outcome = { error };
    }
  });
  return outcome;
}

async function update(values: UpdateLoanValues) {
  const { result } = await renderHook(() => useUpdateLoan(), { wrapper });
  return settle(() => result.current.mutateAsync(values));
}

/** The wireframe's car loan, as the edit page sends it back unchanged. */
const EDIT: UpdateLoanValues = {
  billId: 'bill-1',
  name: 'Car loan',
  iconId: 'loan-car',
  principal: 18000,
  annualRate: 6.25,
  termMonths: 48,
  monthlyPayment: 424.8,
  totalInterest: 2390.1,
  firstPaymentOn: '2025-01-27',
  fundedOn: '2024-12-27',
  dayCountBasis: 'actual/365',
  cardId: 'card-1',
  bankAccountId: null,
  paymentOverrides: { '3': 500 },
  lastPaymentOn: null,
  paymentDay: null,
  inSpending: true,
  today: '2026-10-20',
};

describe('useUpdateLoan', () => {
  it('sends the whole contract, by name, for the bill it edits', async () => {
    const { error, value } = await update(EDIT);

    expect(error).toBeUndefined();
    expect(value).toEqual({ id: 'bill-1' });
    expect(mockRpc).toHaveBeenCalledTimes(1);
    expect(mockRpc).toHaveBeenCalledWith('update_loan', {
      p_bill_id: 'bill-1',
      p_name: 'Car loan',
      p_icon_id: 'loan-car',
      p_principal: 18000,
      p_annual_rate: 6.25,
      p_term_months: 48,
      p_monthly_payment: 424.8,
      p_total_interest: 2390.1,
      p_first_payment_on: '2025-01-27',
      p_funded_on: '2024-12-27',
      p_day_count_basis: 'actual/365',
      p_card_id: 'card-1',
      p_bank_account_id: null,
      p_in_spending: true,
      p_payment_day: null,
      p_payment_overrides: { '3': 500 },
      p_last_payment_on: null,
      p_today: '2026-10-20',
    });
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('sends what an edit leaves out as none, so it is taken away rather than kept', async () => {
    const { paymentOverrides: _o, lastPaymentOn: _l, paymentDay: _d, ...bare } = EDIT;
    await update(bare);
    await update({ ...EDIT, paymentOverrides: {} });

    for (const [, args] of mockRpc.mock.calls) {
      expect(args).toMatchObject({
        p_payment_overrides: null,
        p_last_payment_on: null,
        p_payment_day: null,
      });
    }
  });

  it('sends the last payment when the loan ends before its term', async () => {
    await update({ ...EDIT, lastPaymentOn: '2026-07-27' });
    expect(mockRpc.mock.calls[0][1]).toMatchObject({ p_last_payment_on: '2026-07-27' });
  });

  it('keeps a payment day only when it is not the first payment’s own, as a save stores it', async () => {
    await update({ ...EDIT, firstPaymentOn: '2025-02-28', paymentDay: 31 });
    await update({ ...EDIT, firstPaymentOn: '2025-01-27', paymentDay: 27 });

    expect(mockRpc.mock.calls[0][1]).toMatchObject({ p_payment_day: 31 });
    expect(mockRpc.mock.calls[1][1]).toMatchObject({ p_payment_day: null });
  });

  it('sends the switch as the page shows it, and the person’s today', async () => {
    await update({ ...EDIT, inSpending: false, today: '2026-11-10' });
    expect(mockRpc.mock.calls[0][1]).toMatchObject({ p_in_spending: false, p_today: '2026-11-10' });
  });

  it('sends the same figures a save sends for the same loan', async () => {
    const saved: SaveLoanValues = {
      ...EDIT,
      firstPaymentOn: '2025-02-28',
      paymentDay: 31,
      lastPaymentOn: '2028-12-31',
      inSpending: false,
    };
    const { result } = await renderHook(() => useSaveLoan(), { wrapper });
    await settle(() => result.current.mutateAsync(saved));
    await update({ ...saved, billId: 'bill-1', inSpending: false, today: '2026-10-20' });

    const [[, saveArgs], [, updateArgs]] = mockRpc.mock.calls as [
      string,
      Record<string, unknown>,
    ][];
    const { p_recurrence: _r, ...shared } = saveArgs;
    expect(updateArgs).toMatchObject(shared);
  });

  it('refreshes the lists, the bill page and the loan’s pages', async () => {
    await update(EDIT);

    expect(invalidated).toContainEqual(['bills']);
    expect(invalidated).toContainEqual(['loans']);
    expect(invalidated).toContainEqual(['dashboard']);
    expect(invalidated).toContainEqual(['bill', 'bill-1']);
    expect(invalidated).toContainEqual(['loan', 'bill-1']);
  });

  it.each([
    [
      'payments',
      {
        code: '23514',
        message:
          'new row for relation "loans" violates check constraint "loans_payment_overrides_valid"',
      },
    ],
    [
      'rate',
      {
        code: '23514',
        message: 'new row for relation "loans" violates check constraint "loans_annual_rate_check"',
      },
    ],
    ['lastPayment', { code: 'P0001', message: 'the last payment must fall within the term' }],
  ] as const)('is refused as a save is, so the page says why (%s)', async (reason, failure) => {
    mockRpc.mockResolvedValue({ data: null, error: failure });
    const { error } = await update(EDIT);

    expect(error).toMatchObject(failure);
    expect(refusedLoanSave(error)).toBe(reason);
    expect(invalidated).toEqual([]);
  });

  it('is refused when the loan is gone or not this person’s', async () => {
    const gone: Failure = { code: 'P0002', message: 'there is no such loan' };
    mockRpc.mockResolvedValue({ data: null, error: gone });
    const { error } = await update(EDIT);

    expect(error).toMatchObject(gone);
    expect(refusedLoanSave(error)).toBeNull();
    expect(invalidated).toEqual([]);
  });

  it('is refused, and writes nothing else, on a database without update_loan', async () => {
    const missing: Failure = {
      code: 'PGRST202',
      message: 'Could not find the function public.update_loan(...) in the schema cache',
    };
    mockRpc.mockResolvedValue({ data: null, error: missing });
    const { error } = await update(EDIT);

    expect(error).toMatchObject(missing);
    expect(mockRpc).toHaveBeenCalledTimes(1);
    expect(mockFrom).not.toHaveBeenCalled();
  });
});

describe('useUpdateLoan, past and upcoming', () => {
  const argsOf = (call: number) => mockRpc.mock.calls[call] as [string, Record<string, unknown>];

  it('sends the same edit to update_loan_and_charges, so the payments change with the loan', async () => {
    await update(EDIT);
    const { error, value } = await update({ ...EDIT, past: 'all' });

    expect(error).toBeUndefined();
    expect(value).toEqual({ id: 'bill-1' });
    expect(argsOf(0)[0]).toBe('update_loan');
    expect(argsOf(1)[0]).toBe('update_loan_and_charges');
    expect(argsOf(1)[1]).toEqual(argsOf(0)[1]);
  });

  it('keeps upcoming only, or no answer, on plain update_loan', async () => {
    await update({ ...EDIT, past: 'upcoming' });
    await update(EDIT);

    expect(mockRpc.mock.calls.map(([name]) => name)).toEqual(['update_loan', 'update_loan']);
  });

  it('refreshes the recorded payments as well', async () => {
    await update({ ...EDIT, past: 'all' });

    expect(invalidated).toContainEqual(['charges']);
    expect(invalidated).toContainEqual(['dashboard']);
    expect(invalidated).toContainEqual(['bills']);
    expect(invalidated).toContainEqual(['loan', 'bill-1']);
  });

  it('leaves the payments’ cache alone for upcoming only', async () => {
    await update({ ...EDIT, past: 'upcoming' });

    expect(invalidated).not.toContainEqual(['charges']);
  });

  it('is refused in update_loan’s own words', async () => {
    const failure = { code: 'P0001', message: 'the last payment must fall within the term' };
    mockRpc.mockResolvedValue({ data: null, error: failure });
    const { error } = await update({ ...EDIT, past: 'all' });

    expect(refusedLoanSave(error)).toBe('lastPayment');
    expect(invalidated).toEqual([]);
  });

  it('fails, and writes nothing at all, on a database without update_loan_and_charges', async () => {
    const missing: Failure = {
      code: 'PGRST202',
      message:
        'Could not find the function public.update_loan_and_charges(...) in the schema cache',
    };
    mockRpc.mockResolvedValue({ data: null, error: missing });
    const { error } = await update({ ...EDIT, past: 'all' });

    expect(error).toMatchObject(missing);
    expect(refusedLoanSave(error)).toBeNull();
    // Not the plain edit instead, which would save the loan and leave its past as it was.
    expect(mockRpc).toHaveBeenCalledTimes(1);
    expect(mockRpc).toHaveBeenCalledWith('update_loan_and_charges', expect.anything());
    expect(mockFrom).not.toHaveBeenCalled();
    expect(invalidated).toEqual([]);
  });
});
