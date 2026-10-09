import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { useUpdateBankAccount, useUpdateCard } from '@/api/mutations';
import { useBankAccount, useCard } from '@/api/queries';

/**
 * Edit pages open on the single-row read (`['card', id]`, `['bank_account', id]`), which the list
 * key does not reach. After a save, reopening Edit must show what was saved, not the cached row
 * from before, or the next Save writes the old values back (limit, balance and its date included).
 * The cache here keeps rows fresh for 30 seconds, as the app's does.
 */

type Row = Record<string, unknown>;
const mockTables: Record<string, Row[]> = {};

jest.mock('@/lib/supabase', () => {
  const build = (table: string) => {
    const filters: [string, unknown][] = [];
    let changes: Row | null = null;
    let single = false;
    const matching = () =>
      (mockTables[table] ?? []).filter((row) =>
        filters.every(([column, value]) => row[column] === value),
      );
    const builder: Record<string, unknown> = {
      select: () => builder,
      update: (values: Row) => {
        changes = values;
        return builder;
      },
      eq: (column: string, value: unknown) => {
        filters.push([column, value]);
        return builder;
      },
      order: () => builder,
      maybeSingle: () => {
        single = true;
        return builder;
      },
      then: (resolve: (value: unknown) => unknown) => {
        const rows = matching();
        if (changes) {
          for (const row of rows) Object.assign(row, changes);
          return resolve({ data: rows.map((row) => ({ id: row.id })), error: null });
        }
        const copies = rows.map((row) => ({ ...row }));
        return resolve({ data: single ? (copies[0] ?? null) : copies, error: null });
      },
    };
    return builder;
  };
  return { supabase: { from: (table: string) => build(table) } };
});

jest.mock('@/providers/session-provider', () => ({ useUserId: () => 'user-1' }));
jest.mock('@/api/pro', () => ({ usePro: () => ({ pro: true, ready: true }) }));

let client: QueryClient;
function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  client = new QueryClient({
    defaultOptions: { queries: { staleTime: 30_000, retry: false }, mutations: { retry: false } },
  });
  mockTables.cards = [
    {
      id: 'card-1',
      holder: 'Amex Gold',
      network: 'AMEX',
      last4: '6334',
      color: '#905479',
      balance: 4050,
      balance_as_of: '2026-10-01',
      bill_due_day: 15,
      credit_limit: 10000,
    },
  ];
  mockTables.bank_accounts = [
    {
      id: 'acct-1',
      bank_name: 'Chase',
      nickname: null,
      account_type: 'checking',
      last4: '7010',
      color: '#7BC4F5',
      balance: 1200,
      balance_as_of: '2026-10-01',
    },
  ];
});

async function save(work: () => Promise<unknown>) {
  await act(async () => {
    await work();
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

describe('reopening Edit after a save', () => {
  it('shows the card limit just saved', async () => {
    const first = await renderHook(() => useCard('card-1'), { wrapper });
    await waitFor(() => expect(first.result.current.data?.credit_limit).toBe(10000));
    await first.unmount();

    const update = await renderHook(() => useUpdateCard(), { wrapper });
    await save(() =>
      update.result.current.mutateAsync({ id: 'card-1', values: { credit_limit: 12500 } }),
    );

    const reopened = await renderHook(() => useCard('card-1'), { wrapper });
    await waitFor(() => expect(reopened.result.current.data?.credit_limit).toBe(12500));
  });

  it('shows the account balance and its date just saved', async () => {
    const first = await renderHook(() => useBankAccount('acct-1'), { wrapper });
    await waitFor(() => expect(first.result.current.data?.balance).toBe(1200));
    await first.unmount();

    const update = await renderHook(() => useUpdateBankAccount(), { wrapper });
    await save(() =>
      update.result.current.mutateAsync({
        id: 'acct-1',
        values: { balance: 2345.67, balance_as_of: '2026-10-09' },
      }),
    );

    const reopened = await renderHook(() => useBankAccount('acct-1'), { wrapper });
    await waitFor(() =>
      expect(reopened.result.current.data).toMatchObject({
        balance: 2345.67,
        balance_as_of: '2026-10-09',
      }),
    );
  });
});
