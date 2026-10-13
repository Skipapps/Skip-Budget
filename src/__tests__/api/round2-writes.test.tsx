import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { useSaveGoal } from '@/api/goals';
import {
  assertFinite,
  NOTHING_UPDATED,
  useCreatePayment,
  useRecordPayoff,
  useSaveLoan,
  useUpdateBill,
  useUpdateLoan,
  type SaveLoanValues,
} from '@/api/mutations';
import { useUpdatePlanAndCharges } from '@/api/past-charges';
import { useSaveSavingsPot } from '@/api/savings';

/**
 * The writes round 2 changed:
 * - a figure that is not a number (NaN, ±Infinity) is refused before anything is sent, since
 *   supabase-js would send it as null;
 * - a loan, a payoff, a goal and new savings carry the visit's own id, so a save repeated after a
 *   lost answer files once (the database matches the id);
 * - a bill or subscription edit and its past charges are one call, never two writes.
 */

type Row = Record<string, unknown>;
type Answer = { data: unknown; error: { code: string; message: string } | null };

const mockLog: string[] = [];
const mockRpcs: { name: string; args: Row }[] = [];
let mockRpcAnswer: Answer = { data: { id: 'row-1' }, error: null };
let mockBill: Row | null = null;
let mockLoan: Row | null = null;
const mockUpdates: { table: string; values: Row }[] = [];
let mockUpdated: Row[] = [{ id: 'row-1' }];

jest.mock('@/lib/supabase', () => {
  const build = (table: string) => {
    let op = 'select';
    const builder: Record<string, unknown> = {
      select: () => builder,
      eq: () => builder,
      insert: () => {
        op = 'insert';
        return builder;
      },
      update: (values: Row) => {
        op = 'update';
        mockUpdates.push({ table, values });
        return builder;
      },
      maybeSingle: () => builder,
      single: () => builder,
      then: (resolve: (value: unknown) => unknown) => {
        mockLog.push(`${op} ${table}`);
        if (op === 'select' && table === 'bills') return resolve({ data: mockBill, error: null });
        if (op === 'select' && table === 'loans') return resolve({ data: mockLoan, error: null });
        if (op === 'insert') return resolve({ data: { id: 'new-row' }, error: null });
        if (op === 'update') return resolve({ data: mockUpdated, error: null });
        return resolve({ data: null, error: null });
      },
    };
    return builder;
  };
  return {
    supabase: {
      from: (table: string) => build(table),
      rpc: async (name: string, args: Row) => {
        mockLog.push(`rpc ${name}`);
        mockRpcs.push({ name, args });
        return mockRpcAnswer;
      },
    },
  };
});

jest.mock('@/providers/session-provider', () => ({ useUserId: () => 'user-1' }));
jest.mock('@/api/pro', () => ({ usePro: () => ({ pro: true, ready: true }) }));

let client: QueryClient;

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  mockLog.length = 0;
  mockRpcs.length = 0;
  mockRpcAnswer = { data: { id: 'row-1' }, error: null };
  mockBill = null;
  mockLoan = null;
  mockUpdates.length = 0;
  mockUpdated = [{ id: 'row-1' }];
  client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
});

const LOAN: SaveLoanValues = {
  name: 'Car',
  iconId: 'loan-car',
  principal: 10000,
  annualRate: 6.5,
  termMonths: 48,
  monthlyPayment: 237.15,
  totalInterest: 1383.2,
  firstPaymentOn: '2026-11-15',
  fundedOn: null,
  dayCountBasis: 'actual/365',
  cardId: null,
  bankAccountId: null,
};

describe('assertFinite', () => {
  it('lets every real figure, text and nothing through, at any depth', () => {
    expect(() =>
      assertFinite({
        amount: 12.34,
        zero: 0,
        minus: -5,
        note: 'NaN',
        none: null,
        list: [1, 2, { a: 3 }],
      }),
    ).not.toThrow();
  });

  it.each([NaN, Infinity, -Infinity])('refuses %p, at the top or nested', (bad) => {
    expect(() => assertFinite(bad)).toThrow('A figure to save is not a number.');
    expect(() => assertFinite({ amount: bad })).toThrow('A figure to save is not a number.');
    expect(() => assertFinite({ overrides: { '3': bad } })).toThrow();
    expect(() => assertFinite([1, bad])).toThrow();
  });
});

describe('a figure that is not a number sends nothing', () => {
  it('on a create', async () => {
    const { result } = await renderHook(() => useCreatePayment(), { wrapper });
    await act(async () => {
      await expect(
        result.current.mutateAsync({
          card_id: 'card-1',
          bank_account_id: null,
          from_bank_account_id: null,
          amount: NaN,
          paid_on: '2026-10-13',
          note: null,
        }),
      ).rejects.toMatchObject({ name: 'NotFinite' });
    });
    expect(mockLog).toEqual([]);
  });

  it('on an edit', async () => {
    const { result } = await renderHook(() => useUpdateBill(), { wrapper });
    await act(async () => {
      await expect(
        result.current.mutateAsync({ id: 'bill-1', values: { amount: Infinity } }),
      ).rejects.toMatchObject({ name: 'NotFinite' });
    });
    expect(mockLog).toEqual([]);
  });

  it('on a loan, its payments changed included', async () => {
    const { result } = await renderHook(() => useSaveLoan(), { wrapper });
    await act(async () => {
      await expect(
        result.current.mutateAsync({ ...LOAN, paymentOverrides: { '2': -Infinity } }),
      ).rejects.toMatchObject({ name: 'NotFinite' });
    });
    expect(mockRpcs).toEqual([]);
  });

  it('on a loan edit', async () => {
    const { result } = await renderHook(() => useUpdateLoan(), { wrapper });
    await act(async () => {
      await expect(
        result.current.mutateAsync({
          ...LOAN,
          monthlyPayment: NaN,
          billId: 'bill-1',
          inSpending: true,
          today: '2026-10-13',
          past: 'upcoming',
        }),
      ).rejects.toMatchObject({ name: 'NotFinite' });
    });
    expect(mockRpcs).toEqual([]);
  });

  it('on a payoff', async () => {
    const { result } = await renderHook(() => useRecordPayoff(), { wrapper });
    await act(async () => {
      await expect(
        result.current.mutateAsync({
          billId: 'bill-1',
          paidOn: '2026-10-13',
          amount: Infinity,
          kind: 'full',
          cardId: null,
          bankAccountId: null,
          lastPaymentOn: null,
          today: '2026-10-13',
        }),
      ).rejects.toMatchObject({ name: 'NotFinite' });
    });
    expect(mockRpcs).toEqual([]);
  });
});

describe('the visit id', () => {
  it('goes with a loan as p_id, and only when there is one', async () => {
    const { result } = await renderHook(() => useSaveLoan(), { wrapper });
    await act(async () => {
      await result.current.mutateAsync({ ...LOAN, id: 'visit-1' });
      await result.current.mutateAsync(LOAN);
    });
    expect(mockRpcs.map((call) => [call.name, call.args.p_id])).toEqual([
      ['save_loan', 'visit-1'],
      ['save_loan', undefined],
    ]);
    expect('p_id' in mockRpcs[1].args).toBe(false);
  });

  it('goes with a payoff as p_id', async () => {
    const { result } = await renderHook(() => useRecordPayoff(), { wrapper });
    await act(async () => {
      await result.current.mutateAsync({
        id: 'visit-2',
        billId: 'bill-1',
        paidOn: '2026-10-13',
        amount: 500,
        kind: 'partial',
        cardId: 'card-1',
        bankAccountId: null,
        lastPaymentOn: '2029-01-15',
        today: '2026-10-13',
      });
    });
    expect(mockRpcs[0]).toMatchObject({
      name: 'record_loan_payoff',
      args: { p_id: 'visit-2', p_amount: 500, p_today: '2026-10-13' },
    });
  });

  it('goes with a new goal as p_new_id, never with an edit', async () => {
    mockRpcAnswer = { data: 'goal-1', error: null };
    const values = {
      name: 'Trip',
      icon_id: 'trip',
      target: 1000,
      target_date: null,
      start_amount: 0,
    };
    const { result } = await renderHook(() => useSaveGoal(), { wrapper });
    await act(async () => {
      await result.current.mutateAsync({ newId: 'visit-3', values });
      await result.current.mutateAsync({ id: 'goal-1', newId: 'visit-3', values });
    });
    expect(mockRpcs.map((call) => [call.args.p_id, call.args.p_new_id])).toEqual([
      [null, 'visit-3'],
      ['goal-1', undefined],
    ]);
  });

  it('goes with new savings as p_new_id, never with an edit', async () => {
    mockRpcAnswer = { data: 'pot-1', error: null };
    const { result } = await renderHook(() => useSaveSavingsPot(), { wrapper });
    await act(async () => {
      await result.current.mutateAsync({
        newId: 'visit-4',
        label: 'Gift',
        amount: 50,
        addedOn: '2026-10-13',
      });
      await result.current.mutateAsync({ id: 'pot-1', newId: 'visit-4', amount: 60 });
    });
    expect(mockRpcs.map((call) => [call.args.p_id, call.args.p_new_id])).toEqual([
      [null, 'visit-4'],
      ['pot-1', undefined],
    ]);
  });
});

describe('useUpdatePlanAndCharges', () => {
  it('saves a bill and rewrites its charges in one call when asked for all', async () => {
    mockRpcAnswer = { data: { id: 'bill-1' }, error: null };
    const { result } = await renderHook(() => useUpdatePlanAndCharges('bill'), { wrapper });
    await act(async () => {
      await result.current.mutateAsync({
        id: 'bill-1',
        values: { name: 'Rent', amount: 1250 },
        past: 'all',
      });
      await result.current.mutateAsync({
        id: 'bill-1',
        values: { name: 'Rent', amount: 1250 },
        past: 'upcoming',
      });
    });
    expect(mockRpcs).toEqual([
      {
        name: 'update_bill_and_charges',
        args: { p_id: 'bill-1', p_values: { name: 'Rent', amount: 1250 }, p_rewrite: true },
      },
      {
        name: 'update_bill_and_charges',
        args: { p_id: 'bill-1', p_values: { name: 'Rent', amount: 1250 }, p_rewrite: false },
      },
    ]);
    // Nothing else written: no charges update of its own, no plain bills update.
    expect(mockLog).toEqual(['rpc update_bill_and_charges', 'rpc update_bill_and_charges']);
  });

  it('keeps a stopped loan bill stopped, as the plain edit does, before it saves', async () => {
    mockBill = { icon_id: 'loan-car', next_due_on: null, starts_on: '2026-01-15' };
    mockLoan = { id: 'loan-1' };
    mockRpcAnswer = { data: { id: 'bill-1' }, error: null };
    const { result } = await renderHook(() => useUpdatePlanAndCharges('bill'), { wrapper });
    await act(async () => {
      await result.current.mutateAsync({
        id: 'bill-1',
        values: { next_due_on: '2026-11-15', starts_on: '2026-11-15' },
        past: 'upcoming',
      });
    });
    expect(mockLog).toEqual(['select bills', 'select loans', 'rpc update_bill_and_charges']);
    expect(mockRpcs[0].args.p_values).toEqual({ next_due_on: null, starts_on: '2026-01-15' });
  });

  it('saves a subscription through its own call, with no bill read', async () => {
    mockRpcAnswer = { data: { id: 'sub-1' }, error: null };
    const { result } = await renderHook(() => useUpdatePlanAndCharges('subscription'), { wrapper });
    await act(async () => {
      await result.current.mutateAsync({
        id: 'sub-1',
        values: { next_renewal_on: '2026-11-05' },
        past: 'all',
      });
    });
    expect(mockLog).toEqual(['rpc update_subscription_and_charges']);
    expect(mockRpcs[0].args).toEqual({
      p_id: 'sub-1',
      p_values: { next_renewal_on: '2026-11-05' },
      p_rewrite: true,
    });
  });

  it('reads a plan that is gone as gone', async () => {
    mockRpcAnswer = { data: null, error: { code: 'P0002', message: 'there is no such bill' } };
    const { result } = await renderHook(() => useUpdatePlanAndCharges('bill'), { wrapper });
    await act(async () => {
      await expect(
        result.current.mutateAsync({ id: 'bill-1', values: { name: 'Rent' }, past: 'all' }),
      ).rejects.toThrow(NOTHING_UPDATED);
    });
  });

  it('reads no answer as nothing saved', async () => {
    mockRpcAnswer = { data: null, error: null };
    const { result } = await renderHook(() => useUpdatePlanAndCharges('bill'), { wrapper });
    await act(async () => {
      await expect(
        result.current.mutateAsync({ id: 'bill-1', values: { name: 'Rent' }, past: 'upcoming' }),
      ).rejects.toThrow(NOTHING_UPDATED);
    });
  });

  it('refreshes what each edit changed: the charges only when they were rewritten', async () => {
    const refreshed: unknown[] = [];
    client.invalidateQueries = ((filters: { queryKey: unknown }) => {
      refreshed.push(filters.queryKey);
      return Promise.resolve();
    }) as typeof client.invalidateQueries;
    const bill = await renderHook(() => useUpdatePlanAndCharges('bill'), { wrapper });
    await act(async () => {
      await bill.result.current.mutateAsync({ id: 'bill-1', values: { amount: 5 }, past: 'all' });
    });
    expect(refreshed).toEqual([
      ['bills'],
      ['bill', 'bill-1'],
      ['dashboard'],
      ['loans'],
      ['charges'],
    ]);

    refreshed.length = 0;
    const subscription = await renderHook(() => useUpdatePlanAndCharges('subscription'), {
      wrapper,
    });
    await act(async () => {
      await subscription.result.current.mutateAsync({
        id: 'sub-1',
        values: { amount: 5 },
        past: 'upcoming',
      });
    });
    expect(refreshed).toEqual([['subscriptions'], ['subscription', 'sub-1'], ['dashboard']]);
  });

  it.each([
    ['PGRST202', 'Could not find the function'],
    ['42883', 'function does not exist'],
  ])(
    'on a database without the call (%s), past and upcoming fails whole and writes nothing',
    async (code, message) => {
      const missing = { code, message };
      mockRpcAnswer = { data: null, error: missing };
      const { result } = await renderHook(() => useUpdatePlanAndCharges('bill'), { wrapper });
      await act(async () => {
        await expect(
          result.current.mutateAsync({ id: 'bill-1', values: { name: 'Rent' }, past: 'all' }),
        ).rejects.toEqual(missing);
      });
      expect(mockLog).toEqual(['rpc update_bill_and_charges']);
    },
  );

  it('on a database without the call, upcoming only saves the bill alone, its loan dates guarded first', async () => {
    mockBill = { icon_id: 'loan-car', next_due_on: null, starts_on: '2026-01-15' };
    mockLoan = { id: 'loan-1' };
    mockRpcAnswer = {
      data: null,
      error: { code: 'PGRST202', message: 'Could not find the function' },
    };
    const { result } = await renderHook(() => useUpdatePlanAndCharges('bill'), { wrapper });
    let saved: unknown;
    await act(async () => {
      saved = await result.current.mutateAsync({
        id: 'bill-1',
        values: { name: 'Car loan', next_due_on: '2026-11-15', starts_on: '2026-11-15' },
        past: 'upcoming',
      });
    });
    expect(saved).toEqual({ id: 'bill-1' });
    expect(mockLog).toEqual([
      'select bills',
      'select loans',
      'rpc update_bill_and_charges',
      'update bills',
    ]);
    expect(mockUpdates).toEqual([
      { table: 'bills', values: { name: 'Car loan', next_due_on: null, starts_on: '2026-01-15' } },
    ]);
  });

  it('on a database without the call, upcoming only saves the subscription alone', async () => {
    mockRpcAnswer = { data: null, error: { code: '42883', message: 'function does not exist' } };
    const { result } = await renderHook(() => useUpdatePlanAndCharges('subscription'), { wrapper });
    await act(async () => {
      await result.current.mutateAsync({ id: 'sub-1', values: { amount: 12 }, past: 'upcoming' });
    });
    expect(mockLog).toEqual(['rpc update_subscription_and_charges', 'update subscriptions']);
    expect(mockUpdates).toEqual([{ table: 'subscriptions', values: { amount: 12 } }]);
  });

  it('falls back only for a missing call: a plan gone there reads as gone, any other refusal as itself', async () => {
    mockRpcAnswer = {
      data: null,
      error: { code: 'PGRST202', message: 'Could not find the function' },
    };
    mockUpdated = [];
    const { result } = await renderHook(() => useUpdatePlanAndCharges('bill'), { wrapper });
    await act(async () => {
      await expect(
        result.current.mutateAsync({ id: 'bill-1', values: { name: 'Rent' }, past: 'upcoming' }),
      ).rejects.toThrow(NOTHING_UPDATED);
    });

    mockLog.length = 0;
    const refused = {
      code: '23514',
      message: 'A bill can only be paid with one of your own cards.',
    };
    mockRpcAnswer = { data: null, error: refused };
    await act(async () => {
      await expect(
        result.current.mutateAsync({
          id: 'bill-1',
          values: { card_id: 'card-9' },
          past: 'upcoming',
        }),
      ).rejects.toEqual(refused);
    });
    expect(mockLog).toEqual(['rpc update_bill_and_charges']);
  });

  it('refuses a figure that is not a number before anything is sent', async () => {
    const { result } = await renderHook(() => useUpdatePlanAndCharges('subscription'), { wrapper });
    await act(async () => {
      await expect(
        result.current.mutateAsync({ id: 'sub-1', values: { amount: NaN }, past: 'upcoming' }),
      ).rejects.toMatchObject({ name: 'NotFinite' });
    });
    expect(mockLog).toEqual([]);
  });
});
