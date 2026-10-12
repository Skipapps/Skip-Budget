import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { useBill, useBills } from '@/api/queries';
import { countsInSpending } from '@/lib/bill-spending';

/**
 * The bill reads with the "counts toward spending" flag. A database without the column still loads
 * every bill (each counts), and the flag's fallback keeps the logo columns' own fallback working.
 */

const mockSelects: string[] = [];
const mockMissing = new Set<string>();
let mockFailure: { code: string; message: string } | null = null;

const ROWS = [
  { id: 'rent', name: 'Rent', amount: 1500, category_id: 'housing', in_spending: true },
  { id: 'loan', name: 'Car loan', amount: 424.8, category_id: 'loans', in_spending: false },
];

jest.mock('@/lib/supabase', () => {
  const build = () => {
    let columns = '';
    let one = false;
    const builder: Record<string, unknown> = {
      select: (asked: string) => {
        columns = asked;
        mockSelects.push(asked);
        return builder;
      },
      order: () => builder,
      eq: () => builder,
      maybeSingle: () => {
        one = true;
        return builder;
      },
      then: (resolve: (value: unknown) => unknown) => {
        if (mockFailure) return resolve({ data: null, error: mockFailure });
        // Postgres names the first column it cannot find, in the order they were asked for.
        const asked = columns.split(',').map((part) => part.trim());
        const missing = asked.find((column) => mockMissing.has(column));
        if (missing) {
          return resolve({
            data: null,
            error: { code: '42703', message: `column bills.${missing} does not exist` },
          });
        }
        const rows = ROWS.map(({ in_spending: flag, ...rest }) =>
          asked.includes('in_spending') ? { ...rest, in_spending: flag } : rest,
        );
        return resolve({ data: one ? rows[1] : rows, error: null });
      },
    };
    return builder;
  };
  return { supabase: { from: () => build() } };
});

jest.mock('@/providers/session-provider', () => ({ useUserId: () => 'user-1' }));
jest.mock('@/api/pro', () => ({ usePro: () => ({ pro: true, ready: true }) }));

let client: QueryClient;
function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  mockSelects.length = 0;
  mockMissing.clear();
  mockFailure = null;
  client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
});

async function readBills() {
  const { result } = await renderHook(() => useBills(), { wrapper });
  await waitFor(() => expect(result.current.isPending).toBe(false));
  return result.current;
}

const has = (select: string, column: string) => select.split(',').some((c) => c.trim() === column);

describe('useBills with the spending flag', () => {
  it('reads the flag with everything else, in one request', async () => {
    const bills = await readBills();

    expect(mockSelects).toHaveLength(1);
    expect(has(mockSelects[0], 'in_spending')).toBe(true);
    expect(has(mockSelects[0], 'logo_domain')).toBe(true);
    expect(bills.data?.map((row) => [row.id, countsInSpending(row)])).toEqual([
      ['rent', true],
      ['loan', false],
    ]);
  });

  it('keeps every bill, counted, and its logos, on a database without the flag', async () => {
    mockMissing.add('in_spending');
    const bills = await readBills();

    expect(mockSelects).toHaveLength(2);
    expect(has(mockSelects[1], 'in_spending')).toBe(false);
    expect(has(mockSelects[1], 'logo_domain')).toBe(true);
    expect(bills.data?.map((row) => [row.id, countsInSpending(row)])).toEqual([
      ['rent', true],
      ['loan', true],
    ]);
  });

  it('keeps the flag on a database without the logo columns', async () => {
    mockMissing.add('logo_domain');
    const bills = await readBills();

    expect(mockSelects).toHaveLength(2);
    expect(has(mockSelects[1], 'in_spending')).toBe(true);
    expect(has(mockSelects[1], 'logo_domain')).toBe(false);
    expect(bills.data?.find((row) => row.id === 'loan')?.in_spending).toBe(false);
  });

  it('still loads on a database with neither', async () => {
    mockMissing.add('logo_domain');
    mockMissing.add('in_spending');
    const bills = await readBills();

    expect(bills.isSuccess).toBe(true);
    const last = mockSelects[mockSelects.length - 1];
    expect(has(last, 'in_spending') || has(last, 'logo_domain')).toBe(false);
    expect(bills.data).toHaveLength(2);
  });

  it('does not paper over any other failure', async () => {
    mockFailure = { code: '08006', message: 'connection failure' };
    const bills = await readBills();

    expect(bills.isError).toBe(true);
    expect(mockSelects).toHaveLength(1);
  });
});

describe('useBill with the spending flag', () => {
  it('reads it, and falls back without it', async () => {
    const first = await renderHook(() => useBill('loan'), { wrapper });
    await waitFor(() => expect(first.result.current.isSuccess).toBe(true));
    expect(first.result.current.data?.in_spending).toBe(false);

    mockSelects.length = 0;
    mockMissing.add('in_spending');
    client.clear();
    const second = await renderHook(() => useBill('loan'), { wrapper });
    await waitFor(() => expect(second.result.current.isSuccess).toBe(true));
    expect(mockSelects).toHaveLength(2);
    expect(second.result.current.data?.in_spending).toBeUndefined();
    expect(countsInSpending(second.result.current.data!)).toBe(true);
  });
});
