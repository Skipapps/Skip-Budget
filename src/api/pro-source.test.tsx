import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { proStatus, resetProStatusForTests } from '@/lib/pro-status';

/** The Pro answer is worked out once at the root and every reader shares it. */

let mockUserId: string | null = 'user-1';
let mockOverride: 'off' | 'pro' | 'free' = 'off';
let mockServerRow: { pro: boolean; expires_at: string | null } | null = null;
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
        maybeSingle: async () => ({ data: mockServerRow, error: null }),
      }),
    }),
  },
}));
jest.mock('@/lib/pro-bypass', () => ({ useProOverride: () => mockOverride }));
jest.mock('@/providers/session-provider', () => ({ useUserId: () => mockUserId }));

// Read when the module loads, so set before it is required. The SDK path has its own file.
process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY = '';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const mod = require('@/api/pro') as typeof import('@/api/pro');

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  mockUserId = 'user-1';
  mockOverride = 'off';
  mockServerRow = null;
  mockSdkActive = {};
  mockListeners.clear();
  resetProStatusForTests();
});

describe('without a store key (the server row alone)', () => {
  it('reads the server row', async () => {
    mockServerRow = { pro: true, expires_at: null };
    const { result } = await renderHook(() => mod.useProSource(), { wrapper });
    await waitFor(() => expect(result.current).toEqual({ pro: true, ready: true }));
  });

  it('honours the expiry on the server row', async () => {
    mockServerRow = { pro: true, expires_at: '2000-01-01T00:00:00Z' };
    const { result } = await renderHook(() => mod.useProSource(), { wrapper });
    await waitFor(() => expect(result.current).toEqual({ pro: false, ready: true }));
  });

  it('is not ready while signed out, so no gate can flash', async () => {
    mockUserId = null;
    const { result } = await renderHook(() => mod.useProSource(), { wrapper });
    expect(result.current).toEqual({ pro: false, ready: false });
  });
});

describe('the development override', () => {
  it("'free' outranks a paying server row and is ready at once", async () => {
    mockServerRow = { pro: true, expires_at: null };
    mockOverride = 'free';
    const { result } = await renderHook(() => mod.useProSource(), { wrapper });
    expect(result.current).toEqual({ pro: false, ready: true });
  });

  it("'pro' needs no purchase", async () => {
    mockOverride = 'pro';
    const { result } = await renderHook(() => mod.useProSource(), { wrapper });
    expect(result.current).toEqual({ pro: true, ready: true });
  });
});

describe('the bridge', () => {
  it('publishes to the shared store that usePro reads', async () => {
    mockServerRow = { pro: true, expires_at: null };
    const reader = await renderHook(() => mod.usePro(), { wrapper });
    expect(reader.result.current).toEqual({ pro: false, ready: false });

    await renderHook(() => mod.useConfigurePurchases(), { wrapper });
    await waitFor(() => expect(proStatus()).toEqual({ pro: true, ready: true }));
    expect(reader.result.current).toEqual({ pro: true, ready: true });
  });
});
