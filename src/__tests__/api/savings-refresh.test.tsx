import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { useSavingsCore } from '@/api/savings';

/**
 * `useSavingsCore().refreshFailed`, which puts the RefreshNote under the Savings tile: true only
 * when a reload failed while the last pots and moves are still showing, never for a read with
 * nothing cached (that one is the failure line's).
 */

type Row = Record<string, unknown>;

const mockTables: Record<string, Row[]> = {};
const mockFailing = new Set<string>();

jest.mock('@/lib/supabase', () => {
  const build = (table: string) => {
    const builder: Record<string, unknown> = {
      select: () => builder,
      gte: () => builder,
      lt: () => builder,
      gt: () => builder,
      is: () => builder,
      order: () => builder,
      limit: () => builder,
      then: (resolve: (value: unknown) => unknown) =>
        Promise.resolve(
          resolve(
            mockFailing.has(table)
              ? { data: null, error: { message: `${table} is unreachable` }, count: null }
              : { data: mockTables[table] ?? [], error: null, count: null },
          ),
        ),
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
// The pots and moves never read the money book; savings.ts brings it along.
jest.mock('@/api/queries', () => ({
  ...jest.requireActual('@/api/queries'),
  useBookFlows: jest.fn(),
}));

let client: QueryClient;
function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
  mockFailing.clear();
  // September's pot: $1,000.00 in, $640.00 out, so $360.00 kept; $100.00 of it sent to a goal.
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
});
afterEach(() => client.clear());

async function loaded() {
  const view = await renderHook(() => useSavingsCore(), { wrapper });
  await waitFor(() => expect(view.result.current.isPending).toBe(false));
  expect(view.result.current.pots).toHaveLength(1);
  return view;
}

describe('useSavingsCore().refreshFailed', () => {
  it('is false while every read is fresh', async () => {
    const { result } = await loaded();
    expect(result.current.refreshFailed).toBe(false);
    expect(result.current.isError).toBe(false);
  });

  it.each(['savings_pots', 'goal_moves'])(
    'is true when %s fails to reload behind what is showing',
    async (table) => {
      const { result } = await loaded();
      const before = result.current.summary;

      mockFailing.add(table);
      await act(() => client.refetchQueries());

      await waitFor(() => expect(result.current.refreshFailed).toBe(true));
      expect(result.current.summary).toEqual(before);
    },
  );

  it.each(['savings_pots', 'goal_moves'])(
    'is false when %s fails with nothing cached: that is the failure line’s',
    async (table) => {
      mockFailing.add(table);
      const { result } = await renderHook(() => useSavingsCore(), { wrapper });

      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(result.current.refreshFailed).toBe(false);
    },
  );
});
