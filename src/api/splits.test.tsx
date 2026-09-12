import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { NOTHING_UPDATED } from '@/api/mutations';
import { useArchiveGroup, useUpdateGroup } from '@/api/splits';

/**
 * The two writes to `groups` that do not go through an RPC.
 *
 * Everything else on the shared side is a database function, which answers
 * with a row or an error. These two are table updates, and the groups policy
 * is the reason they need watching: it shows a group to every member and lets
 * only the owner write it. A member's rename is therefore a filter that
 * matches nothing, which PostgREST answers with 204 and no error — the write
 * looks like it worked, the sheet closes, and the name is unchanged on the
 * next read.
 *
 * These tests pin both halves: an update that touched a row still resolves and
 * still refreshes the group, and one that touched nothing is an error carrying
 * the copy the screen shows.
 */

/** One update as the fake client saw it. */
type SeenUpdate = {
  table: string;
  values: Record<string, unknown>;
  column: string;
  id: unknown;
  /** What `.select()` asked for, or null when it was never called. */
  selected: string | null;
};

const mockUpdates: SeenUpdate[] = [];
/** Rows the update answers with. Empty is the silent no-op. */
let mockReturnedRows: { id: string }[] = [];
/** Set to make the update fail outright rather than match nothing. */
let mockError: { message: string } | null = null;

jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: (table: string) => ({
      update: (values: Record<string, unknown>) => ({
        eq: (column: string, id: unknown) => {
          const seen: SeenUpdate = { table, values, column, id, selected: null };
          mockUpdates.push(seen);
          const answer = () =>
            mockError ? { data: null, error: mockError } : { data: mockReturnedRows, error: null };
          return {
            select: (columns: string) => {
              seen.selected = columns;
              return Promise.resolve(answer());
            },
            // Awaiting with no select is the shape this fix removed. Left
            // reachable so a revert fails here rather than passing quietly.
            then: (resolve: (value: unknown) => unknown) => resolve(answer()),
          };
        },
      }),
    }),
    rpc: async () => ({ data: null, error: null }),
  },
}));

jest.mock('@/providers/session-provider', () => ({
  useUserId: () => 'user-1',
}));

let client: QueryClient;
let invalidated: unknown[][];

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  mockUpdates.length = 0;
  mockReturnedRows = [{ id: 'group-1' }];
  mockError = null;
  client = new QueryClient({
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

describe('useUpdateGroup', () => {
  it('sends only the fields it was given, and asks for the id back', async () => {
    const { result } = await renderHook(() => useUpdateGroup(), { wrapper });

    await result.current.mutateAsync({ id: 'group-1', name: 'Lisbon' });

    expect(mockUpdates).toEqual([
      {
        table: 'groups',
        values: { name: 'Lisbon' },
        column: 'id',
        id: 'group-1',
        selected: 'id',
      },
    ]);
  });

  it('writes a false and a null rather than dropping them', async () => {
    // `if (values.x !== undefined)` is doing real work here: turning simplify
    // off and clearing an icon are both edits, and a truthiness check would
    // silently discard them.
    const { result } = await renderHook(() => useUpdateGroup(), { wrapper });

    await result.current.mutateAsync({ id: 'group-1', simplifyDebts: false, iconId: null });

    expect(mockUpdates[0].values).toEqual({ simplify_debts: false, icon_id: null });
  });

  it('fails instead of reporting success when the update matched no row', async () => {
    // What a member's rename does: the policy shows them the group and
    // refuses the write, so the filter matches nothing.
    mockReturnedRows = [];
    const { result } = await renderHook(() => useUpdateGroup(), { wrapper });

    await expect(result.current.mutateAsync({ id: 'group-1', name: 'Lisbon' })).rejects.toThrow(
      NOTHING_UPDATED,
    );
  });

  it('does not refresh the group when nothing was written', async () => {
    mockReturnedRows = [];
    const { result } = await renderHook(() => useUpdateGroup(), { wrapper });

    await expect(result.current.mutateAsync({ id: 'group-1', name: 'Lisbon' })).rejects.toThrow();

    expect(invalidated).toEqual([]);
  });

  it('refreshes the list and the group it changed', async () => {
    const { result } = await renderHook(() => useUpdateGroup(), { wrapper });

    await result.current.mutateAsync({ id: 'group-1', name: 'Lisbon' });

    expect(invalidated).toContainEqual(['groups']);
    expect(invalidated).toContainEqual(['group']);
  });

  it('still surfaces the database error when the update itself fails', async () => {
    mockError = { message: 'groups is unreachable' };
    const { result } = await renderHook(() => useUpdateGroup(), { wrapper });

    await expect(result.current.mutateAsync({ id: 'group-1', name: 'Lisbon' })).rejects.toThrow(
      'groups is unreachable',
    );
  });
});

describe('useArchiveGroup', () => {
  it('stamps archived_at on the group it names and asks for the id back', async () => {
    const { result } = await renderHook(() => useArchiveGroup(), { wrapper });

    await result.current.mutateAsync('group-1');

    expect(mockUpdates).toHaveLength(1);
    expect(mockUpdates[0].table).toBe('groups');
    expect(mockUpdates[0].column).toBe('id');
    expect(mockUpdates[0].id).toBe('group-1');
    expect(mockUpdates[0].selected).toBe('id');
    // An ISO instant, not a date: archiving happens at a moment.
    expect(String(mockUpdates[0].values.archived_at)).toMatch(/^\d{4}-\d{2}-\d{2}T[\d:.]+Z$/);
  });

  it('fails instead of reporting success when the update matched no row', async () => {
    mockReturnedRows = [];
    const { result } = await renderHook(() => useArchiveGroup(), { wrapper });

    await expect(result.current.mutateAsync('group-1')).rejects.toThrow(NOTHING_UPDATED);
  });

  it('does not take the group off the list when nothing was written', async () => {
    mockReturnedRows = [];
    const { result } = await renderHook(() => useArchiveGroup(), { wrapper });

    await expect(result.current.mutateAsync('group-1')).rejects.toThrow();

    expect(invalidated).toEqual([]);
  });
});
