import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { useBill, useBills, useLedger } from '@/api/queries';

/**
 * A bill still filed under Family & Healthcare (saved before the move, or by an older build) is
 * read as Health & Medical, so every list, total and form shows it there. Loans & Credit stays.
 */

type Row = Record<string, unknown>;
const mockRows: Record<string, Row[]> = {};

jest.mock('@/lib/supabase', () => {
  const build = (table: string) => {
    let single = false;
    const builder: Record<string, unknown> = {
      select: () => builder,
      order: () => builder,
      eq: () => builder,
      in: () => builder,
      maybeSingle: () => {
        single = true;
        return builder;
      },
      then: (resolve: (value: unknown) => unknown) => {
        const rows = (mockRows[table] ?? []).map((row) => ({ ...row }));
        return resolve({ data: single ? (rows[0] ?? null) : rows, error: null });
      },
    };
    return builder;
  };
  return {
    supabase: {
      from: (table: string) => build(table),
      rpc: async () => ({ data: null, error: null }),
    },
  };
});
jest.mock('@/providers/session-provider', () => ({ useUserId: () => 'user-1' }));
jest.mock('@/api/pro', () => ({ usePro: () => ({ pro: true, ready: true }) }));

const bill = (id: string, category_id: string): Row => ({
  id,
  name: `Bill ${id}`,
  amount: 120,
  category_id,
  icon_id: null,
  recurrence: 'monthly',
  next_due_on: '2026-10-20',
  starts_on: '2026-01-20',
  ends_on: null,
  card_id: null,
  bank_account_id: null,
  created_at: '2026-01-01T00:00:00Z',
  brand_id: null,
  brands: null,
  note: null,
});

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  for (const key of Object.keys(mockRows)) delete mockRows[key];
  mockRows.bills = [bill('dentist', 'family'), bill('car', 'loans'), bill('school', 'education')];
});

describe('bills under a retired category', () => {
  it('useBills reads Family & Healthcare as Health & Medical, and leaves the rest', async () => {
    const { result } = await renderHook(() => useBills(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.map((row) => [row.id, row.category_id])).toEqual([
      ['dentist', 'health'],
      ['car', 'loans'],
      ['school', 'education'],
    ]);
  });

  it('useBill does too, so editing one files it under Health & Medical', async () => {
    const { result } = await renderHook(() => useBill('dentist'), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.category_id).toBe('health');
  });

  it('the timeline and every total built on it count it under Health & Medical', async () => {
    const { result } = await renderHook(
      () => useLedger({ from: '2026-10-01', to: '2026-10-31' }, '2026-10-09'),
      { wrapper },
    );
    await waitFor(() => expect(result.current.entries).toHaveLength(3));

    expect(
      Object.fromEntries(result.current.entries.map((entry) => [entry.label, entry.categoryId])),
    ).toEqual({ 'Bill dentist': 'health', 'Bill car': 'loans', 'Bill school': 'education' });
  });
});
