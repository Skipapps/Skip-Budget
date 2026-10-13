import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { NOTHING_UPDATED, useStopBill, useStopSubscription } from '@/api/mutations';

/**
 * "Keep past" on a delete: a bill or a loan's bill stops today (`stopBillValues`) in one update
 * that only lands on the row it was worked out from; a subscription is set Cancelled. Neither
 * touches a charge, and neither goes through the bill form's loan guard.
 */

type Call = { table: string; steps: [string, ...unknown[]][] };

let mockCalls: Call[];
let mockAnswer: { data: { id: string }[] | null; error: { code: string; message: string } | null };

function mockChain(call: Call) {
  const step =
    (name: string) =>
    (...args: unknown[]) => {
      call.steps.push([name, ...args]);
      return builder;
    };
  const builder = {
    update: step('update'),
    eq: step('eq'),
    is: step('is'),
    select: (...args: unknown[]) => {
      call.steps.push(['select', ...args]);
      return Promise.resolve(mockAnswer);
    },
  };
  return builder;
}

jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: (table: string) => {
      const call: Call = { table, steps: [] };
      mockCalls.push(call);
      return mockChain(call);
    },
    rpc: jest.fn(),
  },
}));
jest.mock('@/providers/session-provider', () => ({ useUserId: () => 'user-1' }));

let client: QueryClient;
let invalidated: unknown[][];
function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  mockCalls = [];
  mockAnswer = { data: [{ id: 'bill-1' }], error: null };
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

/** Runs a mutation inside act, including the state update TanStack defers to the next tick. */
async function settle<T>(work: () => Promise<T>): Promise<{ value?: T; error?: unknown }> {
  let outcome: { value?: T; error?: unknown } = {};
  await act(async () => {
    try {
      outcome = { value: await work() };
    } catch (error) {
      outcome = { error };
    }
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
  return outcome;
}

async function stopBill(input: Parameters<ReturnType<typeof useStopBill>['mutateAsync']>[0]) {
  const { result } = await renderHook(() => useStopBill(), { wrapper });
  return settle(() => result.current.mutateAsync(input));
}

const TODAY = '2026-10-12';

describe('useStopBill', () => {
  it('ends a running bill today, only while it still starts and ends where it was read', async () => {
    const { value, error } = await stopBill({
      bill: {
        id: 'bill-1',
        starts_on: '2026-01-27',
        ends_on: '2029-12-27',
        next_due_on: '2026-10-27',
      },
      today: TODAY,
    });

    expect(error).toBeUndefined();
    expect(value).toEqual({ id: 'bill-1' });
    expect(mockCalls).toEqual([
      {
        table: 'bills',
        steps: [
          ['update', { ends_on: TODAY }],
          ['eq', 'id', 'bill-1'],
          ['eq', 'starts_on', '2026-01-27'],
          ['eq', 'ends_on', '2029-12-27'],
          ['select', 'id'],
        ],
      },
    ]);
  });

  it('stops one counting from after today with no next date, matching an open end as none', async () => {
    await stopBill({
      bill: { id: 'bill-1', starts_on: '2026-11-01', ends_on: null, next_due_on: '2026-10-28' },
      today: TODAY,
    });

    expect(mockCalls[0].steps).toEqual([
      ['update', { starts_on: TODAY, ends_on: TODAY, next_due_on: null }],
      ['eq', 'id', 'bill-1'],
      ['eq', 'starts_on', '2026-11-01'],
      ['is', 'ends_on', null],
      ['select', 'id'],
    ]);
  });

  it('matches a bill with no start of its own as none', async () => {
    await stopBill({
      bill: { id: 'bill-1', starts_on: null, ends_on: null, next_due_on: '2026-10-28' },
      today: TODAY,
    });

    expect(mockCalls[0].steps).toContainEqual(['is', 'starts_on', null]);
  });

  it('refreshes the bills, the loans and both single-row pages, and never the charges', async () => {
    await stopBill({
      bill: { id: 'bill-1', starts_on: '2026-01-27', ends_on: null, next_due_on: '2026-10-27' },
      today: TODAY,
    });

    expect(invalidated).toContainEqual(['bills']);
    expect(invalidated).toContainEqual(['loans']);
    expect(invalidated).toContainEqual(['dashboard']);
    expect(invalidated).toContainEqual(['bill', 'bill-1']);
    expect(invalidated).toContainEqual(['loan', 'bill-1']);
    expect(invalidated).not.toContainEqual(['charges']);
  });

  it('fails, writing nothing, when the bill changed or went since it was read', async () => {
    mockAnswer = { data: [], error: null };
    const { error } = await stopBill({
      bill: { id: 'bill-1', starts_on: '2026-01-27', ends_on: null, next_due_on: '2026-10-27' },
      today: TODAY,
    });

    expect(error).toEqual(new Error(NOTHING_UPDATED));
    expect(invalidated).toEqual([]);
  });

  it('passes on what the database refuses', async () => {
    mockAnswer = {
      data: null,
      error: { code: '23514', message: 'violates check constraint "bills_period_order"' },
    };
    const { error } = await stopBill({
      bill: { id: 'bill-1', starts_on: '2026-01-27', ends_on: null, next_due_on: '2026-10-27' },
      today: TODAY,
    });

    expect(error).toMatchObject({ code: '23514' });
    expect(invalidated).toEqual([]);
  });

  it('only ever writes the bill: one call, never a charge', async () => {
    await stopBill({
      bill: { id: 'bill-1', starts_on: '2026-01-27', ends_on: null, next_due_on: '2026-10-27' },
      today: TODAY,
    });

    expect(mockCalls.map((call) => call.table)).toEqual(['bills']);
  });
});

describe('useStopSubscription', () => {
  it('sets it Cancelled and nothing else', async () => {
    mockAnswer = { data: [{ id: 'sub-1' }], error: null };
    const { result } = await renderHook(() => useStopSubscription(), { wrapper });
    const { value, error } = await settle(() => result.current.mutateAsync('sub-1'));

    expect(error).toBeUndefined();
    expect(value).toEqual({ id: 'sub-1' });
    expect(mockCalls).toEqual([
      {
        table: 'subscriptions',
        steps: [
          ['update', { active: false }],
          ['eq', 'id', 'sub-1'],
          ['select', 'id'],
        ],
      },
    ]);
    expect(invalidated).toContainEqual(['subscriptions']);
    expect(invalidated).toContainEqual(['dashboard']);
    expect(invalidated).toContainEqual(['subscription', 'sub-1']);
    expect(invalidated).not.toContainEqual(['charges']);
  });

  it('fails when the subscription is gone', async () => {
    mockAnswer = { data: [], error: null };
    const { result } = await renderHook(() => useStopSubscription(), { wrapper });
    const { error } = await settle(() => result.current.mutateAsync('sub-1'));

    expect(error).toEqual(new Error(NOTHING_UPDATED));
    expect(invalidated).toEqual([]);
  });
});
