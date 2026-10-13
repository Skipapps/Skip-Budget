import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { useGoal } from '@/api/goals';
import { useSavings, useSavingsPot } from '@/api/savings';

/**
 * `refreshFailed` on the Savings page's, a pot page's and a goal page's reads: true only when a
 * reload failed while every last answer is still showing, never while any read has nothing cached
 * (that is the failure page's, so `isError && !refreshFailed` says exactly that).
 */

type Row = Record<string, unknown>;

const mockTables: Record<string, Row[]> = {};
const mockFailing = new Set<string>();
let mockFlows = { isError: false, refreshFailed: false };

jest.mock('@/lib/supabase', () => {
  const build = (table: string) => {
    let single = false;
    const answer = () => {
      if (mockFailing.has(table)) {
        return { data: null, error: { message: `${table} is unreachable` }, count: null };
      }
      const rows = mockTables[table] ?? [];
      return single
        ? { data: rows[0] ?? null, error: null, count: null }
        : { data: rows, error: null, count: rows.length };
    };
    const builder: Record<string, unknown> = {
      select: () => builder,
      eq: () => builder,
      gte: () => builder,
      lt: () => builder,
      gt: () => builder,
      is: () => builder,
      not: () => builder,
      order: () => builder,
      limit: () => builder,
      maybeSingle: () => {
        single = true;
        return builder;
      },
      then: (resolve: (value: unknown) => unknown) => Promise.resolve(resolve(answer())),
    };
    return builder;
  };
  return { supabase: { from: build, rpc: async () => ({ data: null, error: null }) } };
});

jest.mock('@/providers/session-provider', () => ({ useUserId: () => 'user-1' }));
jest.mock('@/lib/use-today', () => ({
  useToday: () => ({ today: '2026-10-11', todayDate: new Date('2026-10-11T00:00:00') }),
}));
jest.mock('@/api/pro', () => ({ usePro: () => ({ pro: true, ready: true }) }));
// The money book is its own combined read with its own flags, decided in queries.ts.
jest.mock('@/api/queries', () => ({
  ...jest.requireActual('@/api/queries'),
  useBookFlows: () => ({
    spending: [],
    income: [],
    isLoading: false,
    ...mockFlows,
    refetch: jest.fn(),
  }),
}));

let client: QueryClient;
function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
  mockFailing.clear();
  mockFlows = { isError: false, refreshFailed: false };
  // September's pot: $1,000.00 in, $640.00 out, so $360.00 kept; $100.00 of it sent to Trip.
  mockTables.savings_pots = [
    {
      id: 'sep',
      kind: 'month',
      month: '2026-09',
      label: null,
      earned: 1000,
      spent: 640,
      amount: 360,
      added_on: '2026-10-01',
      note: null,
      wrap_up_seen_at: '2026-10-01T09:00:00Z',
      removed_at: null,
      created_at: '2026-10-01T09:00:00Z',
    },
  ];
  mockTables.goal_moves = [
    {
      id: 'm1',
      goal_id: 'trip',
      pot_id: 'sep',
      amount: 100,
      batch_id: 'b1',
      created_at: '2026-10-02T10:00:00Z',
    },
  ];
  mockTables.goals = [
    {
      id: 'trip',
      name: 'Trip',
      icon_id: 'trip',
      target: '1200.00',
      target_date: null,
      start_amount: '0.00',
      created_at: '2026-09-01T09:00:00Z',
      closed_at: null,
      receipt_id: null,
    },
  ];
  mockTables.profiles = [{ created_at: '2026-08-01T09:00:00Z' }];
});
afterEach(() => client.clear());

describe('useSavingsPot().refreshFailed', () => {
  async function loaded() {
    const view = await renderHook(() => useSavingsPot('sep'), { wrapper });
    await waitFor(() => expect(view.result.current.isPending).toBe(false));
    expect(view.result.current.pot?.left).toBe(260);
    return view;
  }

  it('is false while both reads are fresh', async () => {
    const { result } = await loaded();
    expect(result.current).toMatchObject({ isError: false, refreshFailed: false });
  });

  it.each(['savings_pots', 'goal_moves'])(
    'is true when %s fails to reload, and the pot keeps its last figures',
    async (table) => {
      const { result } = await loaded();
      const before = result.current.pot;

      mockFailing.add(table);
      await act(() => client.refetchQueries());

      await waitFor(() => expect(result.current.refreshFailed).toBe(true));
      expect(result.current.pot).toEqual(before);
    },
  );

  it.each(['savings_pots', 'goal_moves'])(
    'is false when %s fails with nothing cached: that is the failure page’s',
    async (table) => {
      mockFailing.add(table);
      const { result } = await renderHook(() => useSavingsPot('sep'), { wrapper });

      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(result.current.refreshFailed).toBe(false);
    },
  );
});

describe('useSavings().refreshFailed', () => {
  async function loaded() {
    const view = await renderHook(() => useSavings(), { wrapper });
    await waitFor(() => expect(view.result.current.isPending).toBe(false));
    await waitFor(() => expect(view.result.current.soFar).not.toBeNull());
    return view;
  }

  it('is false while every read is fresh', async () => {
    const { result } = await loaded();
    expect(result.current).toMatchObject({ isError: false, refreshFailed: false });
    expect(result.current.summary.readyToUse).toBe(260);
  });

  // savings_pots and goal_moves are the core's; profiles is the account's first day; goals is what
  // spent goals paid.
  it.each(['savings_pots', 'goal_moves', 'profiles', 'goals'])(
    'is true when %s fails to reload behind what is showing',
    async (table) => {
      const { result } = await loaded();
      const before = { summary: result.current.summary, soFar: result.current.soFar };

      mockFailing.add(table);
      await act(() => client.refetchQueries());

      await waitFor(() => expect(result.current.refreshFailed).toBe(true));
      expect(result.current.isError).toBe(true);
      expect({ summary: result.current.summary, soFar: result.current.soFar }).toEqual(before);
    },
  );

  it('is true when the money book says its own reload failed', async () => {
    mockFlows = { isError: false, refreshFailed: true };
    const { result } = await loaded();
    expect(result.current.refreshFailed).toBe(true);
  });

  it.each(['savings_pots', 'goal_moves', 'profiles', 'goals'])(
    'is false when %s fails with nothing cached: that is the failure page’s',
    async (table) => {
      mockFailing.add(table);
      const { result } = await renderHook(() => useSavings(), { wrapper });

      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(result.current.refreshFailed).toBe(false);
    },
  );

  it('is false when the money book has nothing to show', async () => {
    mockFlows = { isError: true, refreshFailed: false };
    const { result } = await renderHook(() => useSavings(), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.refreshFailed).toBe(false);
  });

  it('is false when one read has nothing cached and another failed behind its figures', async () => {
    mockFailing.add('goal_moves');
    const { result } = await renderHook(() => useSavings(), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));

    mockFailing.add('savings_pots');
    await act(() => client.refetchQueries());
    await waitFor(() => expect(result.current.isPending).toBe(false));
    expect(result.current.refreshFailed).toBe(false);
  });
});

describe('useGoal().refreshFailed', () => {
  async function loaded() {
    const view = await renderHook(() => useGoal('trip'), { wrapper });
    await waitFor(() => expect(view.result.current.isPending).toBe(false));
    expect(view.result.current.goal?.saved).toBe(100);
    return view;
  }

  it('is false while both reads are fresh', async () => {
    const { result } = await loaded();
    expect(result.current).toMatchObject({ isError: false, refreshFailed: false });
  });

  it.each(['goals', 'goal_moves'])(
    'is true when %s fails to reload, and the goal keeps its last figures',
    async (table) => {
      const { result } = await loaded();
      const before = result.current.goal;

      mockFailing.add(table);
      await act(() => client.refetchQueries());

      await waitFor(() => expect(result.current.refreshFailed).toBe(true));
      expect(result.current.goal).toEqual(before);
    },
  );

  it.each(['goals', 'goal_moves'])(
    'is false when %s fails with nothing cached: that is the failure page’s',
    async (table) => {
      mockFailing.add(table);
      const { result } = await renderHook(() => useGoal('trip'), { wrapper });

      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(result.current.refreshFailed).toBe(false);
    },
  );
});
