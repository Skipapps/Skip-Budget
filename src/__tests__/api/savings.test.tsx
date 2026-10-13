import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import {
  readSendResult,
  savingsRefusal,
  useMarkWrapUpSeen,
  useRemoveSavingsPot,
  useSaveSavingsPot,
  useSavings,
  useSavingsPot,
  useSendToGoals,
  useMonthUpdate,
  useTakeFromGoal,
  useUpdateSavingsMonth,
  useWrapUpDue,
} from '@/api/savings';
import { movesToSavingsOn } from '@/lib/savings';

/**
 * The Savings reads and writes as the screens use them, on the design's figures: July 410, August
 * 520 and September 640 kept; Trip took 300 from August, Emergency 220 from August and 200 from
 * July, so "September $640 · July $210" and 850 ready. October so far earned $3,700 and spent
 * $2,961.29. The fake database answers like PostgREST; the money book's lists are stubbed.
 */

type Row = Record<string, unknown>;
type Failure = { code?: string; message?: string; details?: string; hint?: string } | null;

const mockDb: {
  tables: Record<string, Row[]>;
  readErrors: Record<string, Failure>;
  rpcAnswer: (name: string, args: Row) => { data: unknown; error: Failure };
  rpcs: { name: string; args: Row }[];
  /** PostgREST's max_rows: no answer carries more rows than this, whatever the limit asked. */
  pageCap: number;
  reads: string[];
} = {
  tables: {},
  readErrors: {},
  rpcAnswer: () => ({ data: null, error: null }),
  rpcs: [],
  pageCap: 1000,
  reads: [],
};

const mockFlows = {
  spending: [] as { kind: string; date: string; amount: number; id?: string }[],
  income: [] as { id: string; label: string; date: string; amount: number; accountId: null }[],
  isLoading: false,
  isError: false,
};
let mockToday = '2026-10-11';

jest.mock('@/lib/supabase', () => {
  const build = (table: string) => {
    const filters: ((row: Row) => boolean)[] = [];
    let counted = false;
    let single = false;
    let limit = Infinity;
    const builder: Record<string, unknown> = {
      select: (_columns: string, options?: { count?: string }) => {
        counted = Boolean(options?.count);
        return builder;
      },
      eq: (column: string, value: unknown) => {
        filters.push((row) => row[column] === value);
        return builder;
      },
      gt: (column: string, value: string) => {
        filters.push((row) => String(row[column]) > value);
        return builder;
      },
      gte: (column: string, value: string) => {
        filters.push((row) => String(row[column]) >= value);
        return builder;
      },
      lt: (column: string, value: string) => {
        filters.push((row) => String(row[column]) < value);
        return builder;
      },
      not: (column: string) => {
        filters.push((row) => row[column] !== null && row[column] !== undefined);
        return builder;
      },
      order: () => builder,
      limit: (count: number) => {
        limit = count;
        return builder;
      },
      maybeSingle: () => {
        single = true;
        return builder;
      },
      then: (resolve: (value: unknown) => unknown) => {
        const failure = mockDb.readErrors[table];
        if (failure) return Promise.resolve(resolve({ data: null, error: failure, count: null }));
        mockDb.reads.push(table);
        const rows = (mockDb.tables[table] ?? [])
          .filter((row) => filters.every((keep) => keep(row)))
          .sort((a, b) => String(a.id).localeCompare(String(b.id)));
        return Promise.resolve(
          resolve({
            data: single ? (rows[0] ?? null) : rows.slice(0, Math.min(limit, mockDb.pageCap)),
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
        return mockDb.rpcAnswer(name, args);
      },
    },
  };
});

jest.mock('@/providers/session-provider', () => ({ useUserId: () => 'user-1' }));
jest.mock('@/lib/use-today', () => ({
  useToday: () => ({ today: mockToday, todayDate: new Date(`${mockToday}T00:00:00`) }),
}));
// The month update reads through the real ledger and money-book builders; only the whole-book
// hook behind "so far" is stubbed.
jest.mock('@/api/pro', () => ({ usePro: () => ({ pro: true, ready: true }) }));
jest.mock('@/api/queries', () => ({
  ...jest.requireActual('@/api/queries'),
  useBookFlows: () => ({ ...mockFlows, refetch: jest.fn() }),
}));

function pot(id: string, month: string, earned: number, spent: number, extra: Row = {}): Row {
  const next = movesToSavingsOn(month);
  return {
    id,
    kind: 'month',
    month,
    label: null,
    earned,
    spent,
    amount: Math.max(0, earned - spent),
    added_on: next,
    note: null,
    wrap_up_seen_at: `${next}T09:00:00Z`,
    removed_at: null,
    created_at: `${next}T09:00:00Z`,
    ...extra,
  };
}

const move = (
  id: string,
  goal: string,
  potId: string,
  amount: number | string,
  at: string,
): Row => ({
  id,
  goal_id: goal,
  pot_id: potId,
  amount,
  batch_id: `batch-${at}`,
  created_at: at,
});

function seed() {
  mockDb.tables = {
    profiles: [{ id: 'user-1', created_at: '2026-07-14T12:00:00+00:00' }],
    savings_pots: [
      pot('jun', '2026-06-01', 3700, 3500, { removed_at: '2026-07-02T09:00:00Z' }),
      // Numeric columns can arrive as text.
      pot('jul', '2026-07-01', 3700, 3290, {
        earned: '3700.00',
        spent: '3290.00',
        amount: '410.00',
      }),
      pot('aug', '2026-08-01', 3700, 3180),
      pot('sep', '2026-09-01', 3700, 3060, { wrap_up_seen_at: null }),
      // A kind a later build might add: left out rather than guessed at.
      { ...pot('zzz', '2026-09-01', 0, 0), kind: 'interest', month: null, amount: 5 },
    ],
    goal_moves: [
      move('m1', 'trip', 'aug', '300.00', '2026-09-02T10:00:00Z'),
      move('m2', 'emergency', 'aug', 220, '2026-09-02T10:00:00Z'),
      move('m3', 'emergency', 'jul', 200, '2026-09-02T10:00:00Z'),
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
  mockDb.rpcs = [];
  mockDb.rpcAnswer = (name, args) => ({
    data: name === 'save_savings_pot' ? (args.p_id ?? 'pot-new') : null,
    error: null,
  });
  mockToday = '2026-10-11';
  mockDb.pageCap = 1000;
  mockDb.reads = [];
  mockFlows.isLoading = false;
  mockFlows.isError = false;
  mockFlows.income = [
    { id: 'pay-1', label: 'Job', date: '2026-10-01', amount: 3700, accountId: null },
  ];
  mockFlows.spending = [
    { kind: 'bill', date: '2026-10-02', amount: -2000 },
    { kind: 'receipt', date: '2026-10-05', amount: -961.29 },
    // Later this month: not "so far".
    { kind: 'receipt', date: '2026-10-20', amount: -50 },
  ];
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

describe('useSavings', () => {
  it('works out Ready to use, each pot from the pots sends name, and October so far', async () => {
    const { result } = await renderHook(() => useSavings(), { wrapper });
    await waitFor(() => expect(result.current.isPending).toBe(false));

    expect(result.current.isError).toBe(false);
    expect(result.current.summary.readyToUse).toBe(850);
    expect(result.current.summary.inGoals).toBe(720);
    expect(result.current.summary.pots.map((view) => [view.id, view.status, view.left])).toEqual([
      ['sep', 'ready', 640],
      ['aug', 'sent', 0],
      ['jul', 'partly', 210],
    ]);
    expect(result.current.summary.withMoneyLeft.map((view) => [view.id, view.left])).toEqual([
      ['sep', 640],
      ['jul', 210],
    ]);
    expect(result.current.soFar).toEqual({
      month: '2026-10',
      earned: 3700,
      spent: 2961.29,
      leftOver: 738.71,
      movesOn: '2026-11-01',
    });
    // Raw rows for the screens: the removed month too, figures as numbers, unknown kinds left out.
    expect(result.current.pots.map((row) => row.id)).toEqual(['aug', 'jul', 'jun', 'sep']);
    expect(result.current.pots.find((row) => row.id === 'jul')).toMatchObject({
      amount: 410,
      earned: 3700,
      spent: 3290,
    });
    expect(result.current.moves.map((row) => [row.pot_id, row.amount])).toEqual([
      ['aug', 300],
      ['aug', 220],
      ['jul', 200],
    ]);
  });

  it('has no "so far" while the money book is loading', async () => {
    mockFlows.isLoading = true;
    const { result } = await renderHook(() => useSavings(), { wrapper });
    await waitFor(() => expect(result.current.summary.readyToUse).toBe(850));
    expect(result.current.isPending).toBe(true);
    expect(result.current.soFar).toBeNull();
  });

  it('has no "so far", and says so, when a read behind the money book failed', async () => {
    mockFlows.isError = true;
    const { result } = await renderHook(() => useSavings(), { wrapper });
    await waitFor(() => expect(result.current.summary.readyToUse).toBe(850));
    expect(result.current.isError).toBe(true);
    expect(result.current.soFar).toBeNull();
  });

  it('reads a database without savings yet as no savings, never an error', async () => {
    mockDb.readErrors.savings_pots = {
      code: '42703',
      message: 'column savings_pots.kind does not exist',
    };
    mockDb.readErrors.goal_moves = {
      code: 'PGRST205',
      message: "Could not find the table 'public.goal_moves' in the schema cache",
    };
    const { result } = await renderHook(() => useSavings(), { wrapper });
    await waitFor(() => expect(result.current.isPending).toBe(false));

    expect(result.current.isError).toBe(false);
    expect(result.current.summary.readyToUse).toBe(0);
    expect(result.current.pots).toEqual([]);
    expect(result.current.soFar?.leftOver).toBe(738.71);
  });

  it('a failed read is an error, not empty savings', async () => {
    mockDb.readErrors.savings_pots = { code: '08006', message: 'connection failure' };
    const { result } = await renderHook(() => useSavings(), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it('counts nothing from before the account in its first month', async () => {
    mockToday = '2026-07-20';
    mockFlows.income = [
      { id: 'pay-0', label: 'Job', date: '2026-07-01', amount: 3700, accountId: null },
    ];
    mockFlows.spending = [{ kind: 'receipt', date: '2026-07-15', amount: -40 }];
    const { result } = await renderHook(() => useSavings(), { wrapper });
    await waitFor(() => expect(result.current.soFar).not.toBeNull());
    expect(result.current.soFar).toMatchObject({ earned: 0, spent: 40, leftOver: -40 });
  });

  describe('a goal spent with its receipt', () => {
    // New TV: 150.00 it started with and 212.47 from September, spent on 8 Oct.
    function withSpentGoal(receiptAmount: number) {
      mockDb.tables.goals = [
        { id: 'tv', start_amount: '150.00', receipt_id: 'r-tv' },
        { id: 'trip', start_amount: '0.00', receipt_id: null },
      ];
      mockDb.tables.goal_moves.push(move('m4', 'tv', 'sep', '212.47', '2026-10-02T10:00:00Z'));
      mockFlows.spending.push({
        id: 'receipt-r-tv',
        kind: 'receipt',
        date: '2026-10-08',
        amount: -receiptAmount,
      });
    }

    it('leaves what the goal paid out of the month so far', async () => {
      withSpentGoal(362.47);
      const { result } = await renderHook(() => useSavings(), { wrapper });
      await waitFor(() => expect(result.current.soFar).not.toBeNull());
      expect(result.current.soFar).toMatchObject({ spent: 2961.29, leftOver: 738.71 });
    });

    it('counts only what the receipt cost beyond the goal', async () => {
      withSpentGoal(400);
      const { result } = await renderHook(() => useSavings(), { wrapper });
      await waitFor(() => expect(result.current.soFar).not.toBeNull());
      // 2,961.29 + (400.00 − 362.47).
      expect(result.current.soFar).toMatchObject({ spent: 2998.82, leftOver: 701.18 });
    });

    it('counts it in full on a database without goals.receipt_id yet', async () => {
      withSpentGoal(362.47);
      mockDb.readErrors.goals = {
        code: '42703',
        message: 'column goals.receipt_id does not exist',
      };
      const { result } = await renderHook(() => useSavings(), { wrapper });
      await waitFor(() => expect(result.current.soFar).not.toBeNull());
      expect(result.current.isError).toBe(false);
      expect(result.current.soFar).toMatchObject({ spent: 3323.76, leftOver: 376.24 });
    });

    it('has no "so far" when the moves never arrived: a failed read is not "no moves"', async () => {
      withSpentGoal(362.47);
      mockDb.readErrors.goal_moves = { code: '08006', message: 'connection failure' };
      const { result } = await renderHook(() => useSavings(), { wrapper });
      await waitFor(() => expect(result.current.isError).toBe(true));
      // Counted without New TV's 212.47 from September, it would read 2,961.29 + 150.00 spent.
      expect(result.current.soFar).toBeNull();
    });

    it('has no "so far", and says so, when the goals cannot be read', async () => {
      withSpentGoal(362.47);
      mockDb.readErrors.goals = { code: '08006', message: 'connection failure' };
      const { result } = await renderHook(() => useSavings(), { wrapper });
      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(result.current.soFar).toBeNull();
    });
  });
});

describe('useSavingsPot', () => {
  it('gives a pot its status; a removed or unknown pot is null', async () => {
    const { result: jul } = await renderHook(() => useSavingsPot('jul'), { wrapper });
    await waitFor(() => expect(jul.current.isPending).toBe(false));
    expect(jul.current.pot).toMatchObject({
      id: 'jul',
      status: 'partly',
      left: 210,
      sentFromIt: 200,
      leftOver: 410,
      movedOn: '2026-08-01',
    });

    const { result: jun } = await renderHook(() => useSavingsPot('jun'), { wrapper });
    await waitFor(() => expect(jun.current.isPending).toBe(false));
    expect(jun.current.pot).toBeNull();

    const { result: none } = await renderHook(() => useSavingsPot('nope'), { wrapper });
    await waitFor(() => expect(none.current.isPending).toBe(false));
    expect(none.current.pot).toBeNull();
  });
});

describe('useWrapUpDue', () => {
  // Rendered with a read of the same pots, so the answer is from a render that had them.
  async function due() {
    const { result } = await renderHook(
      () => ({ due: useWrapUpDue(), pots: useSavingsPot('sep') }),
      { wrapper },
    );
    await waitFor(() => expect(result.current.pots.isPending).toBe(false));
    return result.current.due;
  }

  it("is last month's while it is kept and unseen", async () => {
    expect(await due()).toBe('2026-09');
  });

  it('is nothing once seen', async () => {
    mockDb.tables.savings_pots[3].wrap_up_seen_at = '2026-10-11T09:00:00Z';
    expect(await due()).toBeNull();
  });

  it('is nothing once removed', async () => {
    mockDb.tables.savings_pots[3].removed_at = '2026-10-11T09:00:00Z';
    expect(await due()).toBeNull();
  });

  it('is nothing in November before October has closed: September is stale', async () => {
    mockToday = '2026-11-02';
    expect(await due()).toBeNull();
  });

  it('turns over the year: in January it is December', async () => {
    mockToday = '2027-01-01';
    mockDb.tables.savings_pots.push(
      pot('dec', '2026-12-01', 3700, 3000, {
        added_on: '2027-01-01',
        created_at: '2027-01-01T09:00:00Z',
        wrap_up_seen_at: null,
      }),
    );
    expect(await due()).toBe('2026-12');
  });
});

/** The mutation's own state lands a tick after it resolves; let it land inside act. */
async function settle() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

describe('savings writes', () => {
  it('adds savings through the function, cent-exact, and refreshes savings and goals', async () => {
    const { result } = await renderHook(() => useSaveSavingsPot(), { wrapper });
    let saved: { id: string } | undefined;
    await act(async () => {
      saved = await result.current.mutateAsync({
        label: '  Birthday gift ',
        amount: 0.1 + 0.2,
        addedOn: '2026-10-03',
      });
    });

    expect(saved).toEqual({ id: 'pot-new' });
    expect(mockDb.rpcs).toEqual([
      {
        name: 'save_savings_pot',
        args: {
          p_id: null,
          p_label: 'Birthday gift',
          p_amount: 0.3,
          p_added_on: '2026-10-03',
          p_note: null,
        },
      },
    ]);
    expect(invalidated).toEqual(expect.arrayContaining([['savings'], ['goals']]));
    await settle();
  });

  it('edits a month by id, and refuses a third decimal before asking the server', async () => {
    const { result } = await renderHook(() => useSaveSavingsPot(), { wrapper });
    await act(async () => {
      await result.current.mutateAsync({ id: 'sep', amount: 600, note: 'Fixed' });
    });
    expect(mockDb.rpcs[0].args).toEqual({
      p_id: 'sep',
      p_label: null,
      p_amount: 600,
      p_added_on: null,
      p_note: 'Fixed',
    });

    await act(async () => {
      await expect(result.current.mutateAsync({ id: 'sep', amount: 600.005 })).rejects.toThrow();
    });
    expect(mockDb.rpcs).toHaveLength(1);
    await settle();
  });

  it('removing a pot whose money is in goals is refused with the figure', async () => {
    mockDb.rpcAnswer = () => ({
      data: null,
      error: {
        code: 'SV003',
        message: 'That money is already in your goals.',
        details: '520.00',
        hint: '0f8fad5b-d9cb-469f-a165-70867728950e',
      },
    });
    const { result } = await renderHook(() => useRemoveSavingsPot(), { wrapper });
    let thrown: unknown;
    await act(async () => {
      thrown = await result.current.mutateAsync('aug').catch((error: unknown) => error);
    });

    expect(mockDb.rpcs).toEqual([{ name: 'remove_savings_pot', args: { p_id: 'aug' } }]);
    expect(savingsRefusal(thrown)).toEqual({
      kind: 'inGoals',
      amount: 520,
      id: '0f8fad5b-d9cb-469f-a165-70867728950e',
    });
    expect(invalidated).toEqual([]);
    await settle();
  });

  it('marks a wrap-up seen by its month', async () => {
    const { result } = await renderHook(() => useMarkWrapUpSeen(), { wrapper });
    await act(async () => {
      await result.current.mutateAsync('2026-09');
    });
    expect(mockDb.rpcs).toEqual([{ name: 'mark_wrap_up_seen', args: { p_month: '2026-09-01' } }]);
    expect(invalidated).toEqual(expect.arrayContaining([['savings'], ['goals']]));
    await settle();
  });
});

describe('useSendToGoals', () => {
  beforeEach(() => {
    // The server answers goals in its own order; the hook puts them back in the order asked.
    mockDb.rpcAnswer = (name, args) => {
      if (name !== 'send_to_goals') return { data: null, error: null };
      const totals = new Map<string, number>();
      for (const line of args.p_items as { goal_id: string; amount: number }[]) {
        totals.set(line.goal_id, (totals.get(line.goal_id) ?? 0) + line.amount);
      }
      const before: Record<string, number> = { trip: 300, emergency: 420 };
      return {
        data: {
          batch_id: (args.p_batch as string | null) ?? 'batch-server',
          goals: [...totals].reverse().map(([goal, amount]) => ({
            goal_id: goal,
            amount: String(amount),
            saved_before: before[goal] ?? 0,
            saved_after: (before[goal] ?? 0) + amount,
          })),
        },
        error: null,
      };
    };
  });

  it('draws newest pot first and answers each goal before and after: Trip 300 -> 700, Emergency 420 -> 720', async () => {
    const { result } = await renderHook(() => useSendToGoals(), { wrapper });
    let sent: Awaited<ReturnType<typeof result.current.mutateAsync>> | undefined;
    await act(async () => {
      sent = await result.current.mutateAsync({
        items: [
          { goalId: 'trip', amount: 400 },
          { goalId: 'emergency', amount: 300 },
          { goalId: 'house', amount: 0 },
        ],
        batchId: 'batch-visit',
      });
    });

    expect(mockDb.rpcs).toEqual([
      {
        name: 'send_to_goals',
        args: {
          p_items: [
            { goal_id: 'trip', pot_id: 'sep', amount: 400 },
            { goal_id: 'emergency', pot_id: 'sep', amount: 240 },
            { goal_id: 'emergency', pot_id: 'jul', amount: 60 },
          ],
          p_batch: 'batch-visit',
        },
      },
    ]);
    expect(sent).toEqual({
      batchId: 'batch-visit',
      goals: [
        { goalId: 'trip', amount: 400, before: 300, after: 700 },
        { goalId: 'emergency', amount: 300, before: 420, after: 720 },
      ],
    });
    expect(invalidated).toEqual(expect.arrayContaining([['savings'], ['goals']]));
    await settle();
  });

  it("draws first on the pot it was sent from (a month's page)", async () => {
    const { result } = await renderHook(() => useSendToGoals(), { wrapper });
    await act(async () => {
      await result.current.mutateAsync({
        items: [
          { goalId: 'trip', amount: 400 },
          { goalId: 'emergency', amount: 300 },
        ],
        preferPotId: 'jul',
      });
    });
    expect(mockDb.rpcs[0].args).toEqual({
      p_items: [
        { goal_id: 'trip', pot_id: 'jul', amount: 210 },
        { goal_id: 'trip', pot_id: 'sep', amount: 190 },
        { goal_id: 'emergency', pot_id: 'sep', amount: 300 },
      ],
      p_batch: null,
    });
    await settle();
  });

  it('a send that already landed is resent for the server to answer, not refused as short', async () => {
    const landed = 'batch-2026-09-02T10:00:00Z';
    const { result } = await renderHook(() => useSendToGoals(), { wrapper });
    let sent: Awaited<ReturnType<typeof result.current.mutateAsync>> | undefined;
    await act(async () => {
      sent = await result.current.mutateAsync({
        items: [{ goalId: 'trip', amount: 900 }],
        batchId: landed,
      });
    });
    expect(mockDb.rpcs).toEqual([
      { name: 'send_to_goals', args: { p_items: [], p_batch: landed } },
    ]);
    expect(sent?.batchId).toBe(landed);
    await settle();
  });

  it('more than Ready to use is refused before anything is sent', async () => {
    const { result } = await renderHook(() => useSendToGoals(), { wrapper });
    let thrown: unknown;
    await act(async () => {
      thrown = await result.current
        .mutateAsync({ items: [{ goalId: 'trip', amount: 850.01 }] })
        .catch((error: unknown) => error);
    });
    expect(mockDb.rpcs).toEqual([]);
    expect(savingsRefusal(thrown)).toEqual({ kind: 'short', amount: 850, id: null });
    await settle();
  });

  it('refuses a third decimal, and a send of nothing, before asking the server', async () => {
    const { result } = await renderHook(() => useSendToGoals(), { wrapper });
    await act(async () => {
      await expect(
        result.current.mutateAsync({ items: [{ goalId: 'trip', amount: 1.005 }] }),
      ).rejects.toThrow();
      await expect(
        result.current.mutateAsync({ items: [{ goalId: 'trip', amount: 0 }] }),
      ).rejects.toThrow('Nothing to send.');
    });
    expect(mockDb.rpcs).toEqual([]);
    await settle();
  });

  it('passes on a refusal from the server', async () => {
    mockDb.rpcAnswer = () => ({
      data: null,
      error: { code: 'SV002', message: 'More than it needs.', details: '100.00', hint: 'x' },
    });
    const { result } = await renderHook(() => useSendToGoals(), { wrapper });
    let thrown: unknown;
    await act(async () => {
      thrown = await result.current
        .mutateAsync({ items: [{ goalId: 'trip', amount: 101 }] })
        .catch((error: unknown) => error);
    });
    expect(savingsRefusal(thrown)).toEqual({ kind: 'goalFull', amount: 100, id: null });
    expect(invalidated).toEqual([]);
    await settle();
  });
});

describe('useTakeFromGoal', () => {
  it('puts money back in the pots it came from, the older pot of one send first', async () => {
    mockDb.rpcAnswer = () => ({ data: 'batch-back', error: null });
    const { result } = await renderHook(() => useTakeFromGoal(), { wrapper });
    let taken: { batchId: string } | undefined;
    await act(async () => {
      taken = await result.current.mutateAsync({ goalId: 'emergency', amount: 250 });
    });
    expect(mockDb.rpcs).toEqual([
      {
        name: 'take_from_goal',
        args: {
          p_goal: 'emergency',
          p_items: [
            { pot_id: 'jul', amount: 200 },
            { pot_id: 'aug', amount: 50 },
          ],
          p_batch: null,
        },
      },
    ]);
    expect(taken).toEqual({ batchId: 'batch-back' });
    expect(invalidated).toEqual(expect.arrayContaining([['savings'], ['goals']]));
    await settle();
  });

  it('a take-back that already landed is resent for the server to answer, not refused', async () => {
    const landed = 'batch-2026-09-02T10:00:00Z';
    mockDb.rpcAnswer = (_name, args) => ({ data: args.p_batch, error: null });
    const { result } = await renderHook(() => useTakeFromGoal(), { wrapper });
    let taken: { batchId: string } | undefined;
    await act(async () => {
      // More than Emergency now has from savings: the first try already took it.
      taken = await result.current.mutateAsync({
        goalId: 'emergency',
        amount: 500,
        batchId: landed,
      });
    });
    expect(mockDb.rpcs).toEqual([
      { name: 'take_from_goal', args: { p_goal: 'emergency', p_items: [], p_batch: landed } },
    ]);
    expect(taken).toEqual({ batchId: landed });
    await settle();
  });

  it('more than came from savings is refused before anything is sent', async () => {
    const { result } = await renderHook(() => useTakeFromGoal(), { wrapper });
    let thrown: unknown;
    await act(async () => {
      thrown = await result.current
        .mutateAsync({ goalId: 'emergency', amount: 420.01 })
        .catch((error: unknown) => error);
    });
    expect(mockDb.rpcs).toEqual([]);
    expect(savingsRefusal(thrown)).toEqual({ kind: 'tooMuchBack', amount: 420, id: null });
    await settle();
  });
});

describe('useMonthUpdate', () => {
  /** September as it was closed: $3,700 in, $3,060 out (rent and a receipt), July's account. */
  function september(extraReceipts: Row[] = []) {
    mockDb.tables.pay_received = [
      { id: 'p-sep', salary_source_id: null, label: 'Job', amount: 3700, paid_on: '2026-09-15' },
    ];
    mockDb.tables.receipts = [
      { id: 'r-sep', merchant: 'Shop', amount: 3060, purchased_on: '2026-09-09' },
      ...extraReceipts,
    ];
  }

  async function offer(potId: string) {
    const { result } = await renderHook(() => useMonthUpdate(potId), { wrapper });
    await waitFor(() => expect(result.current.isPending).toBe(false));
    await waitFor(() => expect(client.isFetching()).toBe(0));
    return result.current;
  }

  it('offers a closed month its figures again when a late receipt changed them', async () => {
    september([{ id: 'r-late', merchant: 'Shop', amount: 100, purchased_on: '2026-09-20' }]);
    expect((await offer('sep')).update).toEqual({
      earned: 3700,
      spent: 3160,
      earnedChange: 0,
      spentChange: 100,
      amount: 540,
      inGoals: 0,
      capped: false,
    });
  });

  it('never offers less than the month already has in goals', async () => {
    mockDb.tables.pay_received = [
      { id: 'p-aug', salary_source_id: null, label: 'Job', amount: 3700, paid_on: '2026-08-15' },
    ];
    mockDb.tables.receipts = [
      { id: 'r-aug', merchant: 'Shop', amount: 3300, purchased_on: '2026-08-03' },
    ];
    expect((await offer('aug')).update).toMatchObject({ amount: 520, inGoals: 520, capped: true });
  });

  it('offers nothing when the figures still match, or for a removed month', async () => {
    september();
    expect((await offer('sep')).update).toBeNull();
    expect((await offer('jun')).update).toBeNull();
  });

  /** New TV, 150.00 it started with and 300.00 from September, spent on 20 Sep after it closed. */
  function spentInSeptember(receiptAmount: number) {
    september([
      { id: 'r-tv', merchant: 'Best Buy', amount: receiptAmount, purchased_on: '2026-09-20' },
    ]);
    mockDb.tables.goals = [
      { id: 'tv', start_amount: '150.00', receipt_id: 'r-tv' },
      { id: 'trip', start_amount: '0.00', receipt_id: null },
    ];
    mockDb.tables.goal_moves.push(move('m4', 'tv', 'sep', '300.00', '2026-10-02T10:00:00Z'));
  }

  it('offers nothing for a goal’s receipt filed into a closed month', async () => {
    spentInSeptember(450);
    expect((await offer('sep')).update).toBeNull();
  });

  it('offers only what a goal’s receipt cost beyond the goal', async () => {
    spentInSeptember(500);
    expect((await offer('sep')).update).toEqual({
      earned: 3700,
      spent: 3110,
      earnedChange: 0,
      spentChange: 50,
      amount: 590,
      inGoals: 300,
      capped: false,
    });
  });

  it('reads every page of the month: 1,200 receipts that still add up offer nothing', async () => {
    mockDb.tables.pay_received = [
      { id: 'p-sep', salary_source_id: null, label: 'Job', amount: 3700, paid_on: '2026-09-15' },
    ];
    // 1,200 receipts of $2.55 are September's $3,060 to the cent; the first 1,000 alone are $2,550.
    mockDb.tables.receipts = Array.from({ length: 1200 }, (_, index) => ({
      id: `r${String(index).padStart(4, '0')}`,
      merchant: 'Cafe',
      amount: 2.55,
      purchased_on: `2026-09-${String((index % 30) + 1).padStart(2, '0')}`,
    }));

    const read = await offer('sep');
    expect(read.update).toBeNull();
    expect(mockDb.reads.filter((table) => table === 'receipts')).toHaveLength(2);

    // One more, typed late: the offer counts all 1,201.
    mockDb.tables.receipts.push({
      id: 'r9999',
      merchant: 'Cafe',
      amount: 100,
      purchased_on: '2026-09-30',
    });
    await act(async () => {
      await client.invalidateQueries({ queryKey: ['savings'] });
    });
    expect((await offer('sep')).update).toMatchObject({ spent: 3160, spentChange: 100 });
  });

  const rentBill: Row = {
    id: 'rent',
    name: 'Rent',
    amount: 3000,
    category_id: 'housing',
    icon_id: null,
    recurrence: 'monthly',
    next_due_on: '2026-11-01',
    starts_on: '2026-07-01',
    ends_on: null,
    created_at: '2026-07-14T12:00:00+00:00',
    card_id: null,
    bank_account_id: null,
  };
  const rent = (day: string): Row => ({
    id: `c-${day}`,
    bill_id: 'rent',
    subscription_id: null,
    label: 'Rent',
    amount: 3000,
    charged_on: day,
    card_id: null,
    bank_account_id: null,
  });

  it('holds the offer while a bill on the record has a September date still to write down', async () => {
    mockDb.tables.pay_received = [
      { id: 'p-sep', salary_source_id: null, label: 'Job', amount: 3700, paid_on: '2026-09-15' },
    ];
    mockDb.tables.receipts = [
      { id: 'r-sep', merchant: 'Shop', amount: 160, purchased_on: '2026-09-09' },
    ];
    mockDb.tables.bills = [rentBill];
    mockDb.tables.charges = [rent('2026-07-01'), rent('2026-08-01'), rent('2026-10-01')];
    expect((await offer('sep')).update).toBeNull();
  });

  it('offers it once that date is written down', async () => {
    mockDb.tables.pay_received = [
      { id: 'p-sep', salary_source_id: null, label: 'Job', amount: 3700, paid_on: '2026-09-15' },
    ];
    mockDb.tables.receipts = [
      { id: 'r-sep', merchant: 'Shop', amount: 160, purchased_on: '2026-09-09' },
    ];
    mockDb.tables.bills = [rentBill];
    mockDb.tables.charges = ['2026-07-01', '2026-08-01', '2026-09-01', '2026-10-01'].map(rent);
    expect((await offer('sep')).update).toMatchObject({
      spent: 3160,
      spentChange: 100,
      amount: 540,
    });
  });

  it('a failed read offers nothing, and says so', async () => {
    september([{ id: 'r-late', merchant: 'Shop', amount: 100, purchased_on: '2026-09-20' }]);
    mockDb.readErrors.charges = { code: '08006', message: 'connection failure' };
    const { result } = await renderHook(() => useMonthUpdate('sep'), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.update).toBeNull();
    // Nothing is showing, so it is not a reload that failed behind an offer.
    expect(result.current.refreshFailed).toBe(false);
  });

  it('keeps the offer when a reload behind it fails, and says so', async () => {
    september([{ id: 'r-late', merchant: 'Shop', amount: 100, purchased_on: '2026-09-20' }]);
    const { result } = await renderHook(() => useMonthUpdate('sep'), { wrapper });
    await waitFor(() => expect(result.current.update).not.toBeNull());
    const before = result.current.update;
    expect(result.current.refreshFailed).toBe(false);

    mockDb.readErrors.charges = { code: '08006', message: 'connection failure' };
    await act(() => client.refetchQueries());

    await waitFor(() => expect(result.current.refreshFailed).toBe(true));
    expect(result.current.update).toEqual(before);
  });
});

describe('useUpdateSavingsMonth', () => {
  it('takes the update through the function and answers the new amount', async () => {
    mockDb.rpcAnswer = () => ({ data: '520.00', error: null });
    const { result } = await renderHook(() => useUpdateSavingsMonth(), { wrapper });
    let updated: { amount: number } | undefined;
    await act(async () => {
      updated = await result.current.mutateAsync({ id: 'aug', earned: 3700, spent: 3300 });
    });
    expect(mockDb.rpcs).toEqual([
      { name: 'update_savings_month', args: { p_id: 'aug', p_earned: 3700, p_spent: 3300 } },
    ]);
    expect(updated).toEqual({ amount: 520 });
    expect(invalidated).toEqual(expect.arrayContaining([['savings'], ['goals']]));
    await settle();
  });

  it('a month removed meanwhile is "gone"; an answer it cannot read is a failure', async () => {
    mockDb.rpcAnswer = () => ({
      data: null,
      error: { code: 'P0002', message: 'That month is no longer in your savings.' },
    });
    const { result } = await renderHook(() => useUpdateSavingsMonth(), { wrapper });
    let thrown: unknown;
    await act(async () => {
      thrown = await result.current
        .mutateAsync({ id: 'aug', earned: 3700, spent: 3300 })
        .catch((error: unknown) => error);
    });
    expect(savingsRefusal(thrown)).toEqual({ kind: 'gone', amount: null, id: null });

    mockDb.rpcAnswer = () => ({ data: null, error: null });
    await act(async () => {
      await expect(
        result.current.mutateAsync({ id: 'aug', earned: 3700, spent: 3300 }),
      ).rejects.toThrow();
    });
    await settle();
  });
});

describe('readSendResult', () => {
  it.each([
    [null],
    [{ goals: [] }],
    [{ batch_id: 'b', goals: {} }],
    [
      {
        batch_id: 'b',
        goals: [{ goal_id: 'trip', amount: 'many', saved_before: 0, saved_after: 1 }],
      },
    ],
    [{ batch_id: 'b', goals: [{ amount: 1, saved_before: 0, saved_after: 1 }] }],
  ])('refuses an answer in a shape it does not know (%j)', (raw) => {
    expect(() => readSendResult(raw, [])).toThrow();
  });
});

describe('savingsRefusal', () => {
  const ID = '0f8fad5b-d9cb-469f-a165-70867728950e';

  it.each([
    [
      { code: 'SV001', details: '150.00', hint: ID },
      { kind: 'short', amount: 150, id: ID },
    ],
    [
      { code: 'SV002', details: '100.00', hint: ID },
      { kind: 'goalFull', amount: 100, id: ID },
    ],
    [
      { code: 'SV003', details: '520.00', hint: ID },
      { kind: 'inGoals', amount: 520, id: ID },
    ],
    [
      { code: 'SV004', details: '0.00', hint: ID },
      { kind: 'tooMuchBack', amount: 0, id: ID },
    ],
    [
      { code: 'SV005', details: null },
      { kind: 'notFinished', amount: null, id: null },
    ],
    [
      { code: 'SV006', details: null },
      { kind: 'zero', amount: null, id: null },
    ],
    [
      { code: 'P0002', details: ID },
      { kind: 'gone', amount: null, id: ID },
    ],
    [
      { code: 'P0002', details: null },
      { kind: 'gone', amount: null, id: null },
    ],
  ])('reads %j', (error, expected) => {
    expect(savingsRefusal(error)).toEqual(expected);
  });

  it.each([[{ code: '23514' }], [new Error('offline')], [null], ['SV001']])(
    'is null for any other failure (%j)',
    (thrown) => {
      expect(savingsRefusal(thrown)).toBeNull();
    },
  );
});
