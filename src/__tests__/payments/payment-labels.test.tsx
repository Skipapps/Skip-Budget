import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { usePaymentLabels } from '@/api/payment-labels';
import { cardLabel, usePaymentSources } from '@/api/queries';
import { accountLabel } from '@/lib/account-label';

/**
 * Where a payment came from is named from every card and account, so a charge on a free account's
 * locked second card reads "Discover ••6334", not "Card not set". The words are the Paid with
 * tiles' own. A failed read says so rather than turning every payment into "Card not set".
 */

type Table = 'cards' | 'bank_accounts';

const mockReads: Record<Table, number> = { cards: 0, bank_accounts: 0 };
const mockFailing = new Set<Table>();
const mockHeld: (() => void)[] = [];
let mockHold = false;
let mockPro = false;
let mockUserId: string | null = 'user-1';

const mockRows: Record<Table, Record<string, unknown>[]> = {
  cards: [
    {
      id: 'card-1',
      holder: 'Komal',
      network: 'Visa',
      last4: '7010',
      color: '#111111',
      balance: 0,
      balance_as_of: null,
      bill_due_day: null,
      credit_limit: null,
    },
    {
      id: 'card-2',
      holder: '',
      network: 'Discover',
      last4: '6334',
      color: '#222222',
      balance: 0,
      balance_as_of: null,
      bill_due_day: null,
      credit_limit: null,
    },
    {
      id: 'card-3',
      holder: 'Sam',
      network: 'Amex',
      last4: null,
      color: '#333333',
      balance: 0,
      balance_as_of: null,
      bill_due_day: null,
      credit_limit: null,
    },
  ],
  bank_accounts: [
    {
      id: 'acct-1',
      bank_name: 'Chase',
      nickname: 'Komal',
      account_type: 'checking',
      last4: '7010',
      color: '#444444',
      balance: 0,
      balance_as_of: null,
    },
    {
      id: 'acct-2',
      bank_name: 'Ally',
      nickname: null,
      account_type: 'savings',
      last4: null,
      color: '#555555',
      balance: 0,
      balance_as_of: null,
    },
  ],
};

jest.mock('@/lib/supabase', () => {
  const build = (table: Table) => {
    const builder: Record<string, unknown> = {
      select: () => builder,
      order: () => builder,
      then: (resolve: (value: unknown) => unknown) => {
        const answer = () => {
          mockReads[table] += 1;
          return resolve(
            mockFailing.has(table)
              ? { data: null, error: { code: '08006', message: 'offline' } }
              : { data: mockRows[table], error: null },
          );
        };
        if (mockHold) mockHeld.push(answer);
        else answer();
      },
    };
    return builder;
  };
  return { supabase: { from: (table: Table) => build(table) } };
});

jest.mock('@/providers/session-provider', () => ({ useUserId: () => mockUserId }));
jest.mock('@/api/pro', () => ({ usePro: () => ({ pro: mockPro, ready: true }) }));

let client: QueryClient;
function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  mockReads.cards = 0;
  mockReads.bank_accounts = 0;
  mockFailing.clear();
  mockHeld.length = 0;
  mockHold = false;
  mockPro = false;
  mockUserId = 'user-1';
  client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
});

afterEach(() => {
  client.clear();
});

async function renderLabels() {
  const view = await renderHook(
    () => ({ labels: usePaymentLabels(), usable: usePaymentSources() }),
    { wrapper },
  );
  await waitFor(() => expect(view.result.current.labels.isLoading).toBe(false));
  return view;
}

describe('usePaymentLabels', () => {
  it('names a payment from a free account’s locked second card and account', async () => {
    const { result } = await renderLabels();
    const { labels, usable } = result.current;

    // The Paid with pickers offer only the first card and account on free.
    expect(usable.sources.map((source) => source.id)).toEqual(['card-1', 'acct-1']);

    expect(labels.sources.map((source) => source.id)).toEqual([
      'card-1',
      'card-2',
      'card-3',
      'acct-1',
      'acct-2',
    ]);
    expect(labels.labelOf('card-2')).toBe('Discover ••6334');
    expect(labels.labelOf('card-3')).toBe('Amex');
    expect(labels.labelOf('acct-2')).toBe('Ally');
    expect(labels.isError).toBe(false);
  });

  it('uses the Paid with tiles’ own words', async () => {
    const { result } = await renderLabels();
    const { labels, usable } = result.current;

    for (const source of usable.sources) {
      expect(labels.labelOf(source.id)).toBe(source.label);
    }
    expect(labels.labelOf('card-1')).toBe(cardLabel({ network: 'Visa', last4: '7010' }));
    expect(labels.labelOf('acct-1')).toBe(
      accountLabel({ nickname: 'Komal', bank_name: 'Chase', last4: '7010' }),
    );
    expect(labels.labelOf('acct-1')).toBe('Komal ••7010');
    expect(labels.sources.find((source) => source.id === 'card-2')).toMatchObject({
      kind: 'card',
      name: 'Discover',
      last4: '6334',
      color: '#222222',
    });
  });

  it('lists the same sources on Pro', async () => {
    mockPro = true;
    const { result } = await renderLabels();

    expect(result.current.usable.sources).toHaveLength(5);
    expect(result.current.labels.sources).toEqual(result.current.usable.sources);
  });

  it('has no name for no source, or for one deleted since', async () => {
    const { result } = await renderLabels();

    expect(result.current.labels.labelOf('')).toBeNull();
    expect(result.current.labels.labelOf('card-deleted')).toBeNull();
  });

  it('says a failed cards read failed, and reads both again on refetch', async () => {
    mockFailing.add('cards');
    const { result } = await renderLabels();

    expect(result.current.labels.isError).toBe(true);
    expect(result.current.labels.labelOf('acct-1')).toBe('Komal ••7010');
    expect(result.current.labels.labelOf('card-2')).toBeNull();
    expect(mockReads).toEqual({ cards: 1, bank_accounts: 1 });

    mockFailing.clear();
    await act(async () => {
      result.current.labels.refetch();
    });
    await waitFor(() => expect(result.current.labels.isError).toBe(false));

    expect(mockReads).toEqual({ cards: 2, bank_accounts: 2 });
    expect(result.current.labels.labelOf('card-2')).toBe('Discover ••6334');
  });

  it('says a failed accounts read failed', async () => {
    mockFailing.add('bank_accounts');
    const { result } = await renderLabels();

    expect(result.current.labels.isError).toBe(true);
    expect(result.current.labels.labelOf('card-2')).toBe('Discover ••6334');
    expect(result.current.labels.labelOf('acct-1')).toBeNull();
  });

  it('is loading until both reads answer', async () => {
    mockHold = true;
    const { result } = await renderHook(() => usePaymentLabels(), { wrapper });

    await waitFor(() => expect(mockHeld).toHaveLength(2));
    expect(result.current.isLoading).toBe(true);
    expect(result.current.sources).toEqual([]);
    expect(result.current.labelOf('card-1')).toBeNull();

    await act(async () => {
      mockHeld.shift()?.();
    });
    expect(result.current.isLoading).toBe(true);

    await act(async () => {
      mockHeld.shift()?.();
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.sources).toHaveLength(5);
  });

  it('reads nothing without a session', async () => {
    mockUserId = null;
    const { result } = await renderHook(() => usePaymentLabels(), { wrapper });

    expect(result.current).toMatchObject({ sources: [], isLoading: false, isError: false });
    expect(mockReads).toEqual({ cards: 0, bank_accounts: 0 });
  });

  it('hands back the same sources, labelOf and refetch until the data changes', async () => {
    const { result, rerender } = await renderLabels();
    const first = result.current.labels;

    await rerender({});
    expect(result.current.labels.sources).toBe(first.sources);
    expect(result.current.labels.labelOf).toBe(first.labelOf);
    expect(result.current.labels.refetch).toBe(first.refetch);
  });
});
