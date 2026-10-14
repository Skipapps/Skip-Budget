import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { useCaptureAllowance } from '@/api/capture-allowance';
import { useCaptureUsage } from '@/api/capture-usage';
import { useCreateReceipt, useDeleteReceipt } from '@/api/mutations';

/**
 * The free scan and upload count reads the database's usage rows, which a deleted receipt leaves
 * behind, and falls back to the receipts kept on a database without them. A receipt saved or
 * deleted reads the count again.
 */

type Failure = { code?: string; message?: string } | null;
type Row = { source: string; created_at: string };

let mockUsage: Row[] = [];
let mockUsageError: Failure = null;
const mockUsageReads: { since: unknown }[] = [];

jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: (table: string) => {
      const builder: Record<string, unknown> = {
        select: () => builder,
        gte: (_column: string, since: unknown) => {
          mockUsageReads.push({ since });
          return Promise.resolve(
            mockUsageError
              ? { data: null, error: mockUsageError }
              : { data: mockUsage, error: null },
          );
        },
        insert: () => builder,
        single: () => Promise.resolve({ data: { id: `${table}-new` }, error: null }),
        delete: () => builder,
        eq: () => Promise.resolve({ error: null }),
      };
      return builder;
    },
  },
}));

let mockPro = { pro: false, ready: true };
jest.mock('@/api/pro', () => ({ usePro: () => mockPro }));
jest.mock('@/providers/session-provider', () => ({ useUserId: () => 'user-1' }));

let mockReceipts: { data: Row[]; isFetched: boolean; isError: boolean } = {
  data: [],
  isFetched: true,
  isError: false,
};
const mockReceiptsRefetch = jest.fn();
jest.mock('@/api/queries', () => ({
  useReceipts: () => ({ ...mockReceipts, refetch: mockReceiptsRefetch }),
}));

// Wednesday, October 7 2026, 9am where the phone is. Real timers keep every render independent.
jest.useFakeTimers({
  doNotFake: [
    'hrtime',
    'nextTick',
    'performance',
    'queueMicrotask',
    'requestAnimationFrame',
    'cancelAnimationFrame',
    'requestIdleCallback',
    'cancelIdleCallback',
    'setImmediate',
    'clearImmediate',
    'setInterval',
    'clearInterval',
    'setTimeout',
    'clearTimeout',
  ],
});
jest.setSystemTime(new Date('2026-10-07T09:00:00'));

const thisMonth = (source: string, count: number): Row[] =>
  Array.from({ length: count }, () => ({ source, created_at: '2026-10-02T15:00:00.000Z' }));

let client: QueryClient;
function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

async function allowance() {
  const { result } = await renderHook(() => useCaptureAllowance(), { wrapper });
  return result;
}

beforeEach(() => {
  mockUsage = [];
  mockUsageError = null;
  mockUsageReads.length = 0;
  mockPro = { pro: false, ready: true };
  mockReceipts = { data: [], isFetched: true, isError: false };
  mockReceiptsRefetch.mockClear();
  client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { gcTime: 0 } },
  });
});

describe('the count', () => {
  it('reads the usage rows from midnight on the 1st where the phone is', async () => {
    await allowance();
    await waitFor(() => expect(mockUsageReads).toHaveLength(1));
    expect(mockUsageReads[0].since).toBe(new Date(2026, 9, 1).toISOString());
  });

  it('counts a scan whose receipt was deleted: 15 read, 14 kept', async () => {
    mockUsage = thisMonth('scan', 15);
    mockReceipts = { data: thisMonth('scan', 14), isFetched: true, isError: false };
    const result = await allowance();

    await waitFor(() => expect(result.current.ready).toBe(true));
    expect(result.current.scan).toEqual({ limit: 15, used: 15, left: 0, allowed: false });
    expect(result.current.upload).toEqual({ limit: 15, used: 0, left: 15, allowed: true });
  });

  it('counts scans and uploads apart', async () => {
    mockUsage = [...thisMonth('scan', 3), ...thisMonth('upload', 15)];
    const result = await allowance();

    await waitFor(() => expect(result.current.ready).toBe(true));
    expect(result.current.scan.left).toBe(12);
    expect(result.current.upload.allowed).toBe(false);
  });

  it.each(['PGRST205', '42P01'])(
    'counts the receipts kept on a database without usage rows yet (%s)',
    async (code) => {
      mockUsageError = { code, message: 'no such table' };
      mockReceipts = { data: thisMonth('scan', 15), isFetched: true, isError: false };
      const result = await allowance();

      await waitFor(() => expect(result.current.ready).toBe(true));
      expect(result.current.scan.allowed).toBe(false);
    },
  );

  it.each(['PGRST205', '42P01'])(
    'reads a database without the table (%s) as no usage rows yet, not as a failed read',
    async (code) => {
      mockUsageError = { code, message: 'no such table' };
      const { result } = await renderHook(() => useCaptureUsage(), { wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toBeNull();
    },
  );

  it('does not block on a usage read that failed: the database still holds the line', async () => {
    mockUsageError = { code: '', message: 'Network request failed' };
    const result = await allowance();

    await waitFor(() => expect(result.current.ready).toBe(true));
    expect(result.current.scan.allowed).toBe(true);
  });

  it('is not ready on free until the usage rows are counted, and at once on Pro', async () => {
    mockUsage = thisMonth('scan', 15);
    const free = await allowance();
    expect(free.current.ready).toBe(false);
    await waitFor(() => expect(free.current.ready).toBe(true));

    mockPro = { pro: true, ready: true };
    client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
    const pro = await allowance();
    expect(pro.current.ready).toBe(true);
    expect(pro.current.scan).toMatchObject({ limit: null, left: null, allowed: true });
  });

  it('recounts both reads after a refusal', async () => {
    const result = await allowance();
    await waitFor(() => expect(mockUsageReads).toHaveLength(1));

    await act(async () => result.current.recount());

    await waitFor(() => expect(mockUsageReads).toHaveLength(2));
    expect(mockReceiptsRefetch).toHaveBeenCalledTimes(1);
  });
});

describe('a receipt saved or deleted counts again', () => {
  const VALUES = {
    brand_id: null,
    merchant: 'Deli',
    amount: 9.5,
    purchased_on: '2026-10-07',
    category_id: 'groceries',
    card_id: null,
    bank_account_id: null,
    note: null,
    source: 'scan' as const,
    image_path: null,
  };

  it.each([
    [
      'saved',
      async () => {
        const { result } = await renderHook(() => useCreateReceipt(), { wrapper });
        await act(async () => {
          await result.current.mutateAsync(VALUES);
        });
      },
    ],
    [
      'deleted',
      async () => {
        const { result } = await renderHook(() => useDeleteReceipt(), { wrapper });
        await act(async () => {
          await result.current.mutateAsync('receipt-1');
        });
      },
    ],
  ])('%s', async (_what, write) => {
    const invalidate = jest.spyOn(client, 'invalidateQueries');

    await write();

    expect(invalidate.mock.calls.map(([filters]) => filters?.queryKey?.[0])).toContain(
      'capture_usage',
    );
  });
});
