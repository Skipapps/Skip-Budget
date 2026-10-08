import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { useExitOffer } from '@/api/pro-offer';

/**
 * The offer is armed only for a known-free account that has not seen it, when the store has it;
 * anything unknown keeps it unarmed. Claiming is the server's once-only answer.
 */

let mockRow: { pro_offer_seen_at: string | null } | null = { pro_offer_seen_at: null };
let mockReadError: Error | null = null;
let mockClaim: { data: boolean | null; error: Error | null } = { data: true, error: null };
const mockEq = jest.fn();

jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: (column: string, value: string) => {
          mockEq(column, value);
          return {
            maybeSingle: async () => ({
              data: mockReadError ? null : mockRow,
              error: mockReadError,
            }),
          };
        },
      }),
    }),
    // The server marks the row as it says yes, as claim_pro_offer() does.
    rpc: async () => {
      if (mockClaim.data === true) mockRow = { pro_offer_seen_at: '2026-10-07T09:00:00Z' };
      return mockClaim;
    },
  },
}));
jest.mock('@/providers/session-provider', () => ({ useUserId: () => 'user-1' }));

let mockPro = { pro: false, ready: true };
let mockOffer: object | null = { product: { priceString: '$9.99' } };
jest.mock('@/api/pro', () => ({
  usePro: () => mockPro,
  useOfferPrices: () => ({ data: { offer: mockOffer, regular: null } }),
}));

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockRow = { pro_offer_seen_at: null };
  mockReadError = null;
  mockClaim = { data: true, error: null };
  mockPro = { pro: false, ready: true };
  mockOffer = { product: { priceString: '$9.99' } };
});

const settle = async () => {
  const hook = await renderHook(() => useExitOffer(), { wrapper });
  // Give the seen read its answer.
  await act(async () => {});
  await waitFor(() => expect(mockEq).toHaveBeenCalled());
  return hook;
};

it('is armed for a free account that has not seen it, reading its own row', async () => {
  const { result } = await settle();
  await waitFor(() => expect(result.current.armed).toBe(true));
  expect(mockEq).toHaveBeenCalledWith('id', 'user-1');
});

it('is not armed once seen', async () => {
  mockRow = { pro_offer_seen_at: '2026-10-07T09:00:00Z' };
  const { result } = await settle();
  expect(result.current.armed).toBe(false);
});

it('is not armed when the row cannot be read (say, before the column exists)', async () => {
  mockReadError = new Error('column profiles.pro_offer_seen_at does not exist');
  const { result } = await settle();
  expect(result.current.armed).toBe(false);
});

it('is not armed when the store has no offer', async () => {
  mockOffer = null;
  const { result } = await settle();
  expect(result.current.armed).toBe(false);
});

it.each([
  ['for Pro', { pro: true, ready: true }],
  ['while the plan is unknown', { pro: false, ready: false }],
])('is not armed %s, and does not even ask', async (_, pro) => {
  mockPro = pro;
  const { result } = await renderHook(() => useExitOffer(), { wrapper });
  await act(async () => {});
  expect(result.current.armed).toBe(false);
  expect(mockEq).not.toHaveBeenCalled();
});

it('claims once: the winner shows it, and it is disarmed after', async () => {
  const { result } = await settle();
  await waitFor(() => expect(result.current.armed).toBe(true));

  let won = false;
  await act(async () => {
    won = await result.current.claim();
  });
  expect(won).toBe(true);
  await waitFor(() => expect(result.current.armed).toBe(false));
});

it('answers no when another phone won the claim, or it fails', async () => {
  const { result } = await settle();
  mockClaim = { data: false, error: null };
  await expect(result.current.claim()).resolves.toBe(false);

  mockClaim = { data: null, error: new Error('offline') };
  await expect(result.current.claim()).resolves.toBe(false);
});
