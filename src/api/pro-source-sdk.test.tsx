import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { resetProStatusForTests } from '@/lib/pro-status';

/** The SDK side of the Pro answer: purchases heard at once, and never handed to the next account. */

let mockUserId: string | null = 'user-1';
let mockOverride: 'off' | 'pro' | 'free' = 'off';
let mockServerRow: { pro: boolean; expires_at: string | null } | null = null;
// When set, the server's answer waits until the test lets it through.
let mockServerGate: Promise<void> | null = null;
let mockSdkActive: Record<string, string[]> = {};
const mockListeners = new Set<(info: unknown) => void>();

const infoFor = (userId: string) => ({
  entitlements: {
    active: Object.fromEntries((mockSdkActive[userId] ?? []).map((id) => [id, { id }])),
  },
});

jest.mock('react-native-purchases', () => ({
  __esModule: true,
  LOG_LEVEL: { WARN: 'WARN' },
  default: {
    configure: jest.fn(),
    setLogLevel: jest.fn(),
    logIn: jest.fn(async () => ({})),
    getCustomerInfo: jest.fn(async () => infoFor(mockUserId ?? '')),
    addCustomerInfoUpdateListener: (listener: (info: unknown) => void) =>
      mockListeners.add(listener),
    removeCustomerInfoUpdateListener: (listener: (info: unknown) => void) =>
      mockListeners.delete(listener),
  },
}));
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        maybeSingle: async () => {
          if (mockServerGate) await mockServerGate;
          return { data: mockServerRow, error: null };
        },
      }),
    }),
  },
}));
jest.mock('@/lib/pro-bypass', () => ({ useProOverride: () => mockOverride }));
jest.mock('@/providers/session-provider', () => ({ useUserId: () => mockUserId }));

// Read when the module loads, so set before it is required.
process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY = 'appl_test';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const mod = require('@/api/pro') as typeof import('@/api/pro');

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  mockServerGate = null;
  mockUserId = 'user-1';
  mockOverride = 'off';
  mockServerRow = null;
  mockSdkActive = {};
  mockListeners.clear();
  resetProStatusForTests();
});

describe('with a store key', () => {
  it('takes the SDK answer and does not carry it over to the next account', async () => {
    mockSdkActive = { 'user-1': ['skip_budget_pro'] };
    const { result, rerender } = await renderHook(() => mod.useProSource(), { wrapper });
    await waitFor(() => expect(result.current).toEqual({ pro: true, ready: true }));

    // Somebody else signs in on the same phone; their own answer is free.
    mockUserId = 'user-2';
    await rerender({});
    expect(result.current.pro).toBe(false);
    await waitFor(() => expect(result.current).toEqual({ pro: false, ready: true }));
  });

  it('hears a purchase through the listener', async () => {
    const { result } = await renderHook(() => mod.useProSource(), { wrapper });
    await waitFor(() => expect(result.current.ready).toBe(true));
    expect(result.current.pro).toBe(false);

    await waitFor(() => expect(mockListeners.size).toBe(1));
    await act(async () => {
      for (const listener of mockListeners) {
        listener({ entitlements: { active: { pro: { id: 'pro' } } } });
      }
    });
    expect(result.current.pro).toBe(true);
  });

  it('does not take a lone no from the SDK as known: the server row may hold a grant', async () => {
    let open: () => void = () => {};
    mockServerGate = new Promise<void>((resolve) => (open = resolve));
    mockServerRow = { pro: true, expires_at: null };
    const { result } = await renderHook(() => mod.useProSource(), { wrapper });

    // The SDK has said no; the row has not answered.
    await waitFor(() => expect(mockListeners.size).toBe(1));
    expect(result.current).toEqual({ pro: false, ready: false });

    await act(async () => open());
    await waitFor(() => expect(result.current).toEqual({ pro: true, ready: true }));
  });

  it('takes a yes from the SDK at once, before the row', async () => {
    mockServerGate = new Promise<void>(() => {});
    mockSdkActive = { 'user-1': ['pro'] };
    const { result } = await renderHook(() => mod.useProSource(), { wrapper });
    await waitFor(() => expect(result.current).toEqual({ pro: true, ready: true }));
  });
});
