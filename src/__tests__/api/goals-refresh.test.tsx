import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { useGoals } from '@/api/goals';

/**
 * `useGoals().refreshFailed`, which puts the RefreshNote under the Goals tile: true only when a
 * reload failed while the last goals and moves are still showing, never for a read with nothing
 * cached (that one is the failure line's).
 */

type Row = Record<string, unknown>;

const mockTables: Record<string, Row[]> = {};
const mockFailing = new Set<string>();

jest.mock('@/lib/supabase', () => {
  const build = (table: string) => {
    const builder: Record<string, unknown> = {
      select: () => builder,
      is: () => builder,
      gt: () => builder,
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
// Goals never read the money book; savings.ts brings it along.
jest.mock('@/api/queries', () => ({
  useBookFlows: jest.fn(),
  bookFlows: jest.fn(),
  ledgerEntries: jest.fn(),
}));

let client: QueryClient;
function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
  mockFailing.clear();
  // Trip, $300 of $1,200.
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
    },
  ];
  mockTables.goal_moves = [
    {
      id: 'm1',
      goal_id: 'trip',
      pot_id: 'aug',
      amount: 300,
      batch_id: 'b1',
      created_at: '2026-09-02T10:00:00Z',
    },
  ];
});
afterEach(() => client.clear());

async function loaded() {
  const view = await renderHook(() => useGoals(), { wrapper });
  await waitFor(() => expect(view.result.current.isPending).toBe(false));
  expect(view.result.current.summary.active).toHaveLength(1);
  return view;
}

describe('useGoals().refreshFailed', () => {
  it('is false while every read is fresh', async () => {
    const { result } = await loaded();
    expect(result.current.refreshFailed).toBe(false);
    expect(result.current.isError).toBe(false);
  });

  it.each(['goals', 'goal_moves'])(
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

  it.each(['goals', 'goal_moves'])(
    'is false when %s fails with nothing cached: that is the failure line’s',
    async (table) => {
      mockFailing.add(table);
      const { result } = await renderHook(() => useGoals(), { wrapper });

      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(result.current.refreshFailed).toBe(false);
    },
  );
});
