import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { useDeleteGoal, useGoal, useGoals, useSaveGoal } from '@/api/goals';

/**
 * The Goals reads and writes as the screens use them, on the design's figures: Trip $300 of $1,200
 * by Mar 2027, Emergency fund $420 of $1,000 by Dec 2026, New phone $600 reached Aug 2026, so
 * "Saved toward goals $720.00 of $2,200 · 2 active · 1 done". A goal closed with "I spent it" is in
 * no list, though its moves still count against savings.
 */

type Row = Record<string, unknown>;
type Failure = { code?: string; message?: string } | null;

const mockDb: {
  tables: Record<string, Row[]>;
  readErrors: Record<string, Failure>;
  pageCap: number;
  reads: string[];
  rpcs: { name: string; args: Row }[];
} = { tables: {}, readErrors: {}, pageCap: 1000, reads: [], rpcs: [] };

jest.mock('@/lib/supabase', () => {
  const build = (table: string) => {
    const filters: ((row: Row) => boolean)[] = [];
    let counted = false;
    let limit = Infinity;
    const builder: Record<string, unknown> = {
      select: (_columns: string, options?: { count?: string }) => {
        mockDb.reads.push(table);
        counted = Boolean(options?.count);
        return builder;
      },
      is: (column: string, value: unknown) => {
        filters.push((row) => (row[column] ?? null) === value);
        return builder;
      },
      gt: (column: string, value: string) => {
        filters.push((row) => String(row[column]) > value);
        return builder;
      },
      order: () => builder,
      limit: (count: number) => {
        limit = count;
        return builder;
      },
      then: (resolve: (value: unknown) => unknown) => {
        const failure = mockDb.readErrors[table];
        if (failure) return Promise.resolve(resolve({ data: null, error: failure, count: null }));
        const rows = (mockDb.tables[table] ?? [])
          .filter((row) => filters.every((keep) => keep(row)))
          .sort((a, b) => String(a.id).localeCompare(String(b.id)));
        return Promise.resolve(
          resolve({
            data: rows.slice(
              0,
              Math.min(limit, table === 'goal_moves' ? mockDb.pageCap : Infinity),
            ),
            error: null,
            count: counted ? rows.length : null,
          }),
        );
      },
    };
    return builder;
  };
  return {
    supabase: {
      from: build,
      rpc: async (name: string, args: Row) => {
        mockDb.rpcs.push({ name, args });
        return { data: name === 'save_goal' ? (args.p_id ?? 'goal-new') : null, error: null };
      },
    },
  };
});

jest.mock('@/providers/session-provider', () => ({ useUserId: () => 'user-1' }));
jest.mock('@/lib/use-today', () => ({
  useToday: () => ({ today: '2026-10-11', todayDate: new Date('2026-10-11T00:00:00') }),
}));
// Goals never read the money book; savings.ts brings it along.
jest.mock('@/api/queries', () => ({
  useBookFlows: jest.fn(),
  bookFlows: jest.fn(),
  ledgerEntries: jest.fn(),
}));

const goal = (id: string, name: string, target: number | string, extra: Row = {}): Row => ({
  id,
  name,
  icon_id: id,
  target,
  target_date: null,
  start_amount: '0.00',
  created_at: `2026-09-0${['trip', 'emergency', 'phone', 'vacation'].indexOf(id) + 1}T09:00:00Z`,
  closed_at: null,
  ...extra,
});

const move = (id: string, goalId: string, potId: string, amount: number, at: string): Row => ({
  id,
  goal_id: goalId,
  pot_id: potId,
  amount,
  batch_id: `batch-${at}`,
  created_at: at,
});

function seed() {
  mockDb.tables = {
    goals: [
      goal('trip', 'Trip', '1200.00', { target_date: '2027-03-31' }),
      goal('emergency', 'Emergency fund', 1000, { target_date: '2026-12-31' }),
      goal('phone', 'New phone', 600),
      goal('vacation', 'Vacation', 500, { closed_at: '2026-10-01T09:00:00Z' }),
    ],
    goal_moves: [
      move('m1', 'trip', 'aug', 300, '2026-09-02T10:00:00Z'),
      move('m2', 'emergency', 'aug', 220, '2026-09-02T10:00:00Z'),
      move('m3', 'emergency', 'jul', 200, '2026-09-02T10:00:00Z'),
      move('m4', 'phone', 'jun', 600, '2026-08-20T15:00:00Z'),
      move('m5', 'vacation', 'jun', 100, '2026-09-10T15:00:00Z'),
    ],
  };
}

let client: QueryClient;
let invalidated: unknown[][];

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  seed();
  mockDb.readErrors = {};
  mockDb.pageCap = 1000;
  mockDb.reads = [];
  mockDb.rpcs = [];
  // gcTime 0 on both, or the caches' timers hold Jest open after the run.
  client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { gcTime: 0 } },
  });
  invalidated = [];
  const original = client.invalidateQueries.bind(client);
  client.invalidateQueries = ((filters?: { queryKey?: unknown[] }) => {
    invalidated.push(filters?.queryKey ?? []);
    return original(filters);
  }) as typeof client.invalidateQueries;
});

// Reads still landing after a test's last check render inside act, not after it. No clear():
// gcTime 0 empties the cache once the hooks unmount, and clearing under mounted hooks re-renders.
afterEach(async () => {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
});

describe('useGoals', () => {
  it('sums the active goals, lists completed apart, and leaves a closed goal out', async () => {
    const { result } = await renderHook(() => useGoals(), { wrapper });
    await waitFor(() => expect(result.current.isPending).toBe(false));

    expect(result.current.isError).toBe(false);
    expect(result.current.summary.saved).toBe(720);
    expect(result.current.summary.target).toBe(2200);
    expect(
      result.current.summary.active.map((view) => [view.name, view.saved, view.percent]),
    ).toEqual([
      ['Trip', 300, 25],
      ['Emergency fund', 420, 42],
    ]);
    expect(result.current.summary.done.map((view) => [view.name, view.saved])).toEqual([
      ['New phone', 600],
    ]);
    expect(result.current.summary.done[0].reachedOn?.slice(0, 7)).toBe('2026-08');
    expect(result.current.goals.map((row) => row.id)).toEqual(['emergency', 'phone', 'trip']);
    // Its money stays spent: the closed goal's move is still read.
    expect(result.current.moves.map((row) => row.id)).toEqual(['m1', 'm2', 'm3', 'm4', 'm5']);
  });

  it('reads every move when they pass the row cap', async () => {
    mockDb.pageCap = 2;
    const { result } = await renderHook(() => useGoals(), { wrapper });
    await waitFor(() => expect(result.current.isPending).toBe(false));
    expect(result.current.moves).toHaveLength(5);
    expect(mockDb.reads.filter((table) => table === 'goal_moves')).toHaveLength(3);
    expect(result.current.summary.saved).toBe(720);
  });

  it('reads a database without goals yet as none, never an error', async () => {
    mockDb.readErrors.goals = {
      code: 'PGRST205',
      message: "Could not find the table 'public.goals'",
    };
    mockDb.readErrors.goal_moves = { code: '42P01', message: 'relation does not exist' };
    const { result } = await renderHook(() => useGoals(), { wrapper });
    await waitFor(() => expect(result.current.isPending).toBe(false));
    expect(result.current.isError).toBe(false);
    expect(result.current.summary).toEqual({ saved: 0, target: 0, active: [], done: [] });
  });

  it('a failed read is an error, not "no goals"', async () => {
    mockDb.readErrors.goals = { code: '08006', message: 'connection failure' };
    const { result } = await renderHook(() => useGoals(), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe('useGoal', () => {
  it('gives one goal its progress and its moves, newest first', async () => {
    const { result } = await renderHook(() => useGoal('emergency'), { wrapper });
    await waitFor(() => expect(result.current.isPending).toBe(false));
    expect(result.current.goal).toMatchObject({
      name: 'Emergency fund',
      saved: 420,
      need: 580,
      fromSavings: 420,
      done: false,
    });
    expect(result.current.moves.map((row) => row.id)).toEqual(['m3', 'm2']);
  });

  it('a closed goal, or one not there, is null', async () => {
    const { result: closed } = await renderHook(() => useGoal('vacation'), { wrapper });
    await waitFor(() => expect(closed.current.isPending).toBe(false));
    expect(closed.current.goal).toBeNull();

    const { result: none } = await renderHook(() => useGoal('nope'), { wrapper });
    await waitFor(() => expect(none.current.isPending).toBe(false));
    expect(none.current.goal).toBeNull();
  });
});

/** The mutation's own state lands a tick after it resolves; let it land inside act. */
async function settle() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

describe('goal writes', () => {
  it('saves a goal through the function, trimmed and cent-exact, and refreshes savings and goals', async () => {
    const { result } = await renderHook(() => useSaveGoal(), { wrapper });
    let saved: { id: string } | undefined;
    await act(async () => {
      saved = await result.current.mutateAsync({
        values: {
          name: '  Trip ',
          icon_id: 'trip',
          target: 1200,
          target_date: '2027-03-31',
          start_amount: 0.1 + 0.2,
        },
      });
    });
    expect(saved).toEqual({ id: 'goal-new' });
    expect(mockDb.rpcs).toEqual([
      {
        name: 'save_goal',
        args: {
          p_id: null,
          p_name: 'Trip',
          p_icon_id: 'trip',
          p_target: 1200,
          p_target_date: '2027-03-31',
          p_start_amount: 0.3,
        },
      },
    ]);
    expect(invalidated).toEqual(expect.arrayContaining([['savings'], ['goals']]));
    await settle();
  });

  it('refuses a target past the cent before asking the server', async () => {
    const { result } = await renderHook(() => useSaveGoal(), { wrapper });
    await act(async () => {
      await expect(
        result.current.mutateAsync({
          id: 'trip',
          values: {
            name: 'Trip',
            icon_id: 'trip',
            target: 1200.005,
            target_date: null,
            start_amount: 0,
          },
        }),
      ).rejects.toThrow();
    });
    expect(mockDb.rpcs).toEqual([]);
    await settle();
  });

  it.each([
    [true, 'money back to savings'],
    [false, 'I spent it'],
  ])('ends a goal with the choice made (%s: %s)', async (returnMoney) => {
    const { result } = await renderHook(() => useDeleteGoal(), { wrapper });
    await act(async () => {
      await result.current.mutateAsync({ id: 'trip', returnMoney });
    });
    expect(mockDb.rpcs).toEqual([
      { name: 'delete_goal', args: { p_id: 'trip', p_return: returnMoney } },
    ]);
    expect(invalidated).toEqual(expect.arrayContaining([['savings'], ['goals']]));
    await settle();
  });
});
