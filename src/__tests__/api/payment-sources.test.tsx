import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { usePaymentSources } from '@/api/queries';

/**
 * The rows every Paid with picker draws: the label as before, and for the tiles' two lines a card's
 * own name (so two cards on one network differ) and the last four.
 */

const mockTables: Record<string, Record<string, unknown>[]> = {
  cards: [
    {
      id: 'c1',
      holder: 'Chase Sapphire',
      network: 'VISA',
      last4: '4821',
      color: '#426EA8',
      balance: 0,
    },
    // A card saved with no name of its own: blank, or only spaces.
    { id: 'c2', holder: '  ', network: 'Amex', last4: null, color: '#1E1A22', balance: 0 },
    { id: 'c3', holder: '', network: 'VISA', last4: '0005', color: '#C9787E', balance: 0 },
  ],
  bank_accounts: [
    {
      id: 'a1',
      bank_name: 'Chase',
      nickname: 'Everyday',
      account_type: 'checking',
      last4: '1111',
      color: '#367672',
      balance: 0,
    },
    {
      id: 'a2',
      // Spaces around a name are not part of it.
      bank_name: '  Ally  ',
      nickname: null,
      account_type: 'savings',
      last4: null,
      color: '#5B6573',
      balance: 0,
    },
  ],
};

jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: (table: string) => {
      const builder: Record<string, unknown> = {
        select: () => builder,
        order: () => builder,
        eq: () => builder,
        then: (resolve: (value: unknown) => unknown) =>
          resolve({ data: mockTables[table] ?? [], error: null }),
      };
      return builder;
    },
  },
}));
jest.mock('@/providers/session-provider', () => ({ useUserId: () => 'user-1' }));
// Pro, so every card and account is offered.
jest.mock('@/api/pro', () => ({ usePro: () => ({ pro: true, ready: true }) }));

let client: QueryClient;
function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
});
afterEach(() => client.clear());

describe('usePaymentSources', () => {
  it('names each card by its own name, else its network, and each account by its nickname or bank, trimmed, with the last four apart', async () => {
    const { result } = await renderHook(() => usePaymentSources(), { wrapper });
    await waitFor(() => expect(result.current.sources).toHaveLength(5));

    expect(
      result.current.sources.map(({ id, label, name, last4, kind }) => ({
        id,
        label,
        name,
        last4,
        kind,
      })),
    ).toEqual([
      { id: 'c1', label: 'VISA ••4821', name: 'Chase Sapphire', last4: '4821', kind: 'card' },
      { id: 'c2', label: 'Amex', name: 'Amex', last4: null, kind: 'card' },
      { id: 'c3', label: 'VISA ••0005', name: 'VISA', last4: '0005', kind: 'card' },
      { id: 'a1', label: 'Everyday ••1111', name: 'Everyday', last4: '1111', kind: 'account' },
      { id: 'a2', label: '  Ally  ', name: 'Ally', last4: null, kind: 'account' },
    ]);
  });
});
