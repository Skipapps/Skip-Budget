import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { useActiveLoans } from '@/api/loans';

/**
 * The Cards tab's Loans tile: the loans still being paid, read as the ids of the bills they live
 * behind and named from those bills. A failed read of either is a failure, never "no loans".
 */

type Row = Record<string, unknown>;

const mockTables: Record<string, Row[]> = {};
const mockSelects: { table: string; columns: string }[] = [];
const mockFailing = new Set<string>();

jest.mock('@/lib/supabase', () => {
  const build = (table: string) => {
    const builder: Record<string, unknown> = {
      select: (columns: string) => {
        mockSelects.push({ table, columns });
        return builder;
      },
      order: () => builder,
      eq: () => builder,
      then: (resolve: (value: unknown) => unknown) =>
        resolve(
          mockFailing.has(table)
            ? { data: null, error: { code: 'XX000', message: `${table} is unreachable` } }
            : { data: mockTables[table] ?? [], error: null },
        ),
    };
    return builder;
  };
  return { supabase: { from: (table: string) => build(table) } };
});

jest.mock('@/providers/session-provider', () => ({ useUserId: () => 'user-1' }));
// queries.ts imports usePro for the payment-source list; the real one needs react-native-purchases.
jest.mock('@/api/pro', () => ({ usePro: () => ({ pro: true, ready: true }) }));

const TODAY = '2026-10-09';

const bill = (id: string, name: string, extra: Row = {}): Row => ({
  id,
  name,
  amount: 300,
  category_id: 'loans',
  icon_id: null,
  recurrence: 'monthly',
  next_due_on: '2026-11-01',
  starts_on: '2026-01-01',
  ends_on: '2030-01-01',
  card_id: null,
  bank_account_id: null,
  ...extra,
});

let client: QueryClient;
function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  for (const key of Object.keys(mockTables)) delete mockTables[key];
  mockSelects.length = 0;
  mockFailing.clear();
  client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
});

describe('useActiveLoans', () => {
  it('names the running loans from their bills, in the bills’ order, reading only bill ids', async () => {
    mockTables.bills = [
      bill('b1', 'Car loan'),
      bill('b2', 'Rent'),
      bill('b3', 'Old loan', { ends_on: '2026-09-30' }),
      bill('b4', 'Mortgage'),
    ];
    mockTables.loans = [{ bill_id: 'b4' }, { bill_id: 'b3' }, { bill_id: 'b1' }];

    const { result } = await renderHook(() => useActiveLoans(TODAY), { wrapper });
    await waitFor(() => expect(result.current.isPending).toBe(false));

    expect(result.current.isError).toBe(false);
    expect(result.current.loans).toEqual([
      { billId: 'b1', name: 'Car loan' },
      { billId: 'b4', name: 'Mortgage' },
    ]);
    expect(mockSelects.filter((select) => select.table === 'loans')).toEqual([
      { table: 'loans', columns: 'bill_id' },
    ]);
  });

  it('has none when there are no loans', async () => {
    mockTables.bills = [bill('b1', 'Rent')];
    const { result } = await renderHook(() => useActiveLoans(TODAY), { wrapper });
    await waitFor(() => expect(result.current.isPending).toBe(false));

    expect(result.current.loans).toEqual([]);
    expect(result.current.isError).toBe(false);
  });

  it.each(['loans', 'bills'])(
    'fails, rather than say none, when %s cannot be read',
    async (table) => {
      mockTables.bills = [bill('b1', 'Car loan')];
      mockTables.loans = [{ bill_id: 'b1' }];
      mockFailing.add(table);

      const { result } = await renderHook(() => useActiveLoans(TODAY), { wrapper });
      await waitFor(() => expect(result.current.isError).toBe(true));
    },
  );

  it('reads again when a loan is saved, under the key saving a loan invalidates', async () => {
    mockTables.bills = [bill('b1', 'Car loan')];
    const { result } = await renderHook(() => useActiveLoans(TODAY), { wrapper });
    await waitFor(() => expect(result.current.isPending).toBe(false));
    expect(result.current.loans).toEqual([]);

    mockTables.loans = [{ bill_id: 'b1' }];
    await act(async () => {
      await client.invalidateQueries({ queryKey: ['loans'] });
      await client.invalidateQueries({ queryKey: ['bills'] });
    });
    await waitFor(() => expect(result.current.loans).toEqual([{ billId: 'b1', name: 'Car loan' }]));
  });
});
