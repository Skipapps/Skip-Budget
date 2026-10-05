import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import {
  NOTHING_SAVED,
  NOTHING_UPDATED,
  useUpdateBill,
  useUpdateProfile,
  useUpdateReceipt,
} from '@/api/mutations';

/**
 * PostgREST answers an update whose filter matches nothing with 204 and no error, so the shared
 * `useUpdate` must turn that into an error. An ordinary edit must still resolve in one round trip
 * asking for one column.
 */

type SeenUpdate = {
  table: string;
  values: Record<string, unknown>;
  column: string;
  id: unknown;
  /** What `.select()` asked for, or null when it was never called. */
  selected: string | null;
};

const mockUpdates: SeenUpdate[] = [];
/** Rows the update should answer with. An empty array is the silent no-op. */
let mockReturnedRows: { id: string }[] = [];
/** Set to make the update fail outright rather than match nothing. */
let mockError: Error | null = null;

jest.mock('@/lib/supabase', () => {
  const build = (table: string) => ({
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
          // Awaiting without a select is the old shape, kept reachable so a revert fails here
          // instead of silently succeeding.
          then: (resolve: (value: unknown) => unknown) => resolve(answer()),
        };
      },
    }),
  });

  return {
    supabase: {
      from: (table: string) => build(table),
      auth: { getUser: async () => ({ data: { user: { id: 'user-1' } } }) },
    },
  };
});

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
  mockReturnedRows = [{ id: 'row-1' }];
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

describe('useUpdate', () => {
  it('writes the values it was given to the row it names', async () => {
    const { result } = await renderHook(() => useUpdateReceipt(), { wrapper });

    await result.current.mutateAsync({ id: 'row-1', values: { amount: 77 } });

    expect(mockUpdates).toEqual([
      {
        table: 'receipts',
        values: { amount: 77 },
        column: 'id',
        id: 'row-1',
        selected: 'id',
      },
    ]);
  });

  it('asks for the id back and nothing wider', async () => {
    const { result } = await renderHook(() => useUpdateBill(), { wrapper });

    await result.current.mutateAsync({ id: 'row-1', values: { name: 'Rent' } });

    // A bare `select()` would return every column on every edit; only the row count matters.
    expect(mockUpdates[0].selected).toBe('id');
  });

  it('fails instead of reporting success when the row is not there', async () => {
    mockReturnedRows = [];
    const { result } = await renderHook(() => useUpdateReceipt(), { wrapper });

    await expect(
      result.current.mutateAsync({ id: 'gone', values: { amount: 77 } }),
    ).rejects.toThrow(NOTHING_UPDATED);
  });

  it('does not refresh any list when nothing was written', async () => {
    mockReturnedRows = [];
    const { result } = await renderHook(() => useUpdateReceipt(), { wrapper });

    await expect(
      result.current.mutateAsync({ id: 'gone', values: { amount: 77 } }),
    ).rejects.toThrow();

    // A failed write that still invalidated would redraw the list as though something changed.
    expect(invalidated).toEqual([]);
  });

  it('still refreshes the table and the dashboard on a real edit', async () => {
    const { result } = await renderHook(() => useUpdateReceipt(), { wrapper });

    await result.current.mutateAsync({ id: 'row-1', values: { amount: 77 } });

    expect(invalidated).toContainEqual(['receipts']);
    expect(invalidated).toContainEqual(['dashboard']);
  });

  it('still throws the database error when the update itself fails', async () => {
    mockError = new Error('receipts is unreachable');
    const { result } = await renderHook(() => useUpdateReceipt(), { wrapper });

    await expect(
      result.current.mutateAsync({ id: 'row-1', values: { amount: 77 } }),
    ).rejects.toThrow('receipts is unreachable');
  });
});

describe('useUpdateProfile', () => {
  it('updates the signed-in row and asks for it back', async () => {
    const { result } = await renderHook(() => useUpdateProfile(), { wrapper });

    await result.current.mutateAsync({ display_name: 'Sam' });

    expect(mockUpdates).toEqual([
      {
        table: 'profiles',
        values: { display_name: 'Sam' },
        column: 'id',
        id: 'user-1',
        selected: 'id',
      },
    ]);
  });

  it('fails when there is no profile row to update', async () => {
    mockReturnedRows = [];
    const { result } = await renderHook(() => useUpdateProfile(), { wrapper });

    await expect(result.current.mutateAsync({ display_name: 'Sam' })).rejects.toThrow(
      NOTHING_SAVED,
    );
  });

  it('does not borrow the record copy that blames another device', async () => {
    // A profile is one row per account (no other device deleted it, no list to reopen), so
    // NOTHING_UPDATED would be wrong; a record still gets its own wording in the same run.
    mockReturnedRows = [];
    const profile = await renderHook(() => useUpdateProfile(), { wrapper });
    const record = await renderHook(() => useUpdateReceipt(), { wrapper });

    const fromProfile = await profile.result.current
      .mutateAsync({ display_name: 'Sam' })
      .then(() => null)
      .catch((error: unknown) => error as Error);
    const fromRecord = await record.result.current
      .mutateAsync({ id: 'gone', values: { amount: 77 } })
      .then(() => null)
      .catch((error: unknown) => error as Error);

    expect(fromProfile?.message).toBe(NOTHING_SAVED);
    expect(fromRecord?.message).toBe(NOTHING_UPDATED);
  });
});

describe('the two failure messages', () => {
  it('say different things, because they have different causes', () => {
    expect(NOTHING_SAVED).not.toBe(NOTHING_UPDATED);
    // Records point at the list they came from; settings have no list.
    expect(NOTHING_UPDATED).toMatch(/open the list again/i);
    expect(NOTHING_SAVED).not.toMatch(/list/i);
  });

  it('are both a whole sentence the person at the screen can act on', () => {
    for (const message of [NOTHING_UPDATED, NOTHING_SAVED]) {
      expect(message).toMatch(/\.$/);
      expect(message).not.toMatch(/error|failed|null|undefined|row|PGRST/i);
    }
  });
});
