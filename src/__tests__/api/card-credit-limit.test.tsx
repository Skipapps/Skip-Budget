import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { creditLimitValue, useCreateCard, useUpdateCard, type CardValues } from '@/api/mutations';
import { useCard, useCards } from '@/api/queries';

/**
 * A card's optional credit limit: read as a number or null, written as typed or null when cleared,
 * and a database without the column still loads every card (no limits shown).
 */

type Row = Record<string, unknown>;
type Failure = { code: string; message: string };

const mockSelects: string[] = [];
const mockWrites: { op: 'insert' | 'update'; values: Row }[] = [];
const mockRows: Row[] = [];
let mockFailure: Failure | null = null;
let mockHasLimitColumn = true;

jest.mock('@/lib/supabase', () => {
  const build = () => {
    let columns = '';
    let single = false;
    let writing = false;
    const answer = () => {
      if (writing) return { data: single ? { id: 'card-new' } : [{ id: 'card-1' }], error: null };
      if (mockFailure) return { data: null, error: mockFailure };
      if (!mockHasLimitColumn && /\bcredit_limit\b/.test(columns)) {
        return {
          data: null,
          error: { code: '42703', message: 'column cards.credit_limit does not exist' },
        };
      }
      // A database without the column returns none, whatever the fixture says.
      const rows = mockRows.map((row) => {
        if (/\bcredit_limit\b/.test(columns)) return { ...row };
        const { credit_limit: _limit, ...rest } = row;
        return rest;
      });
      return { data: single ? (rows[0] ?? null) : rows, error: null };
    };
    const builder: Record<string, unknown> = {
      select: (asked: string) => {
        if (!writing) {
          columns = asked;
          mockSelects.push(asked);
        }
        return builder;
      },
      insert: (values: Row) => {
        writing = true;
        mockWrites.push({ op: 'insert', values });
        return builder;
      },
      update: (values: Row) => {
        writing = true;
        mockWrites.push({ op: 'update', values });
        return builder;
      },
      order: () => builder,
      eq: () => builder,
      single: () => {
        single = true;
        return builder;
      },
      maybeSingle: () => {
        single = true;
        return builder;
      },
      then: (resolve: (value: unknown) => unknown) => resolve(answer()),
    };
    return builder;
  };
  return { supabase: { from: () => build() } };
});

jest.mock('@/providers/session-provider', () => ({ useUserId: () => 'user-1' }));
// queries.ts imports usePro for the payment-source list; the real one needs react-native-purchases.
jest.mock('@/api/pro', () => ({ usePro: () => ({ pro: true, ready: true }) }));

let client: QueryClient;
function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

const card = (id: string, credit_limit?: unknown): Row => ({
  id,
  holder: `Card ${id}`,
  network: 'VISA',
  last4: '6334',
  color: '#905479',
  balance: 4050,
  balance_as_of: '2026-10-01',
  bill_due_day: 15,
  ...(credit_limit === undefined ? {} : { credit_limit }),
});

beforeEach(() => {
  mockSelects.length = 0;
  mockWrites.length = 0;
  mockRows.length = 0;
  mockFailure = null;
  mockHasLimitColumn = true;
  client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } },
  });
});

describe('creditLimitValue', () => {
  it('saves a typed limit as the number typed, to the cent', () => {
    expect(creditLimitValue('10000')).toBe(10000);
    expect(creditLimitValue('2500.50')).toBe(2500.5);
    expect(creditLimitValue('1234.56')).toBe(1234.56);
    expect(creditLimitValue(' 750 ')).toBe(750);
  });

  it('saves an empty field, or no positive amount, as no limit', () => {
    expect(creditLimitValue('')).toBeNull();
    expect(creditLimitValue('   ')).toBeNull();
    expect(creditLimitValue('0')).toBeNull();
    expect(creditLimitValue('0.00')).toBeNull();
    expect(creditLimitValue('-500')).toBeNull();
    expect(creditLimitValue('abc')).toBeNull();
  });
});

describe('card reads', () => {
  it('useCards reads each limit as a number, or null when none was given', async () => {
    mockRows.push(card('a', 10000), card('b', '2500.50'), card('c', null), card('d'));
    const { result } = await renderHook(() => useCards(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockSelects).toEqual([
      'id, holder, network, last4, color, balance, balance_as_of, bill_due_day, credit_limit',
    ]);
    expect(result.current.data?.map((row) => [row.id, row.credit_limit])).toEqual([
      ['a', 10000],
      ['b', 2500.5],
      ['c', null],
      ['d', null],
    ]);
    // Nothing else about the card changes.
    expect(result.current.data?.[0]).toMatchObject({ balance: 4050, bill_due_day: 15 });
  });

  it('useCard reads the limit too', async () => {
    mockRows.push(card('a', 10000));
    const { result } = await renderHook(() => useCard('a'), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.credit_limit).toBe(10000);
    expect(mockSelects[0]).toMatch(/\bcredit_limit\b/);
  });

  it('useCard is null for a card that is not there', async () => {
    const { result } = await renderHook(() => useCard('gone'), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toBeNull();
  });

  it.each([
    ['useCards', () => useCards()],
    ['useCard', () => useCard('a')],
  ] as [string, () => { isSuccess: boolean; data: unknown }][])(
    '%s still loads, without limits, on a database that lacks the column',
    async (_, hook) => {
      mockHasLimitColumn = false;
      mockRows.push(card('a', 10000));
      const { result } = await renderHook(hook, { wrapper });
      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockSelects).toHaveLength(2);
      expect(mockSelects[1]).toBe(mockSelects[0].replace(', credit_limit', ''));
      const data = result.current.data;
      const row = (Array.isArray(data) ? data[0] : data) as { id: string; credit_limit: unknown };
      expect(row).toMatchObject({ id: 'a', credit_limit: null });
    },
  );

  it('does not paper over any other failure', async () => {
    mockFailure = { code: '42703', message: 'column cards.holder does not exist' };
    const { result } = await renderHook(() => useCards(), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(mockSelects).toHaveLength(1);
  });
});

const VALUES: CardValues = {
  holder: 'Amex Gold',
  network: 'AMEX',
  last4: '6334',
  color: '#905479',
  balance: 4050,
  balance_as_of: '2026-10-09',
  bill_due_day: 15,
  credit_limit: 10000,
};

async function settle<T>(work: () => Promise<T>): Promise<T> {
  let value: T | undefined;
  await act(async () => {
    value = await work();
    // React Query reports the mutation's settled state on the next tick; let it land in here.
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
  return value as T;
}

describe('card writes', () => {
  it('a new card saves its limit', async () => {
    const { result } = await renderHook(() => useCreateCard(), { wrapper });
    await settle(() => result.current.mutateAsync(VALUES));

    expect(mockWrites).toEqual([{ op: 'insert', values: { ...VALUES, user_id: 'user-1' } }]);
  });

  it('a new card with the field left empty saves no limit', async () => {
    const { result } = await renderHook(() => useCreateCard(), { wrapper });
    await settle(() =>
      result.current.mutateAsync({ ...VALUES, credit_limit: creditLimitValue('') }),
    );

    expect(mockWrites[0].values.credit_limit).toBeNull();
  });

  it('clearing the field on an edit removes the limit', async () => {
    const { result } = await renderHook(() => useUpdateCard(), { wrapper });
    await settle(() =>
      result.current.mutateAsync({ id: 'card-1', values: { credit_limit: creditLimitValue('') } }),
    );

    expect(mockWrites).toEqual([{ op: 'update', values: { credit_limit: null } }]);
  });

  it('an edit can change the limit alone', async () => {
    const { result } = await renderHook(() => useUpdateCard(), { wrapper });
    await settle(() =>
      result.current.mutateAsync({
        id: 'card-1',
        values: { credit_limit: creditLimitValue('12500.75') },
      }),
    );

    expect(mockWrites[0].values).toEqual({ credit_limit: 12500.75 });
  });
});
