import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { proStatus, resetProStatusForTests, type ProStatus } from '@/lib/pro-status';

/**
 * RevenueCat speaks for one account at a time. When a second account signs in on the same phone,
 * nothing may read or buy through the SDK until it has been signed in as that account, and an
 * answer that belongs to anyone else never counts: the database would refuse every Pro write the
 * app then allowed.
 */

let mockUserId: string | null = 'user-1';
/** Who the SDK is signed in as. */
let mockSdkUser: string | null = null;
let mockActive: Record<string, string[]> = {};
let mockLogInGate: Promise<void> | null = null;
let mockServerPro: Record<string, boolean> = {};
// When set, the server's answer waits until the test lets it through.
let mockServerGate: Promise<void> | null = null;
/** Every sign-in and read the SDK did, in order, with the account it was signed in as. */
const mockSdkCalls: string[] = [];
const mockListeners = new Set<(info: unknown) => void>();
/** The account the SDK was signed in as each time restore ran. */
const mockRestoredAs: (string | null)[] = [];

const mockInfoFor = (userId: string | null) => ({
  originalAppUserId: userId,
  entitlements: {
    active: Object.fromEntries((mockActive[userId ?? ''] ?? []).map((id) => [id, { id }])),
  },
});

const mockConfigure = jest.fn((options: { appUserID: string }) => {
  mockSdkUser = options.appUserID;
});
const mockLogIn = jest.fn(async (userId: string) => {
  if (mockLogInGate) await mockLogInGate;
  mockSdkUser = userId;
  mockSdkCalls.push(`logIn:${userId}`);
  return { customerInfo: mockInfoFor(userId), created: false };
});
const mockLogOut = jest.fn(async () => {
  mockSdkUser = '$RCAnonymousID:test';
  return mockInfoFor(mockSdkUser);
});
const mockRpc = jest.fn(async (_name: string, args: { p_user: string }) => {
  if (mockServerGate) await mockServerGate;
  return { data: mockServerPro[args.p_user] ?? false, error: null };
});

jest.mock('react-native-purchases', () => ({
  __esModule: true,
  LOG_LEVEL: { WARN: 'WARN' },
  default: {
    configure: (options: { appUserID: string }) => mockConfigure(options),
    setLogLevel: jest.fn(async () => {}),
    logIn: (userId: string) => mockLogIn(userId),
    logOut: () => mockLogOut(),
    isAnonymous: async () => Boolean(mockSdkUser?.startsWith('$RCAnonymousID:')),
    getCustomerInfo: async () => {
      mockSdkCalls.push(`read:${mockSdkUser}`);
      return mockInfoFor(mockSdkUser);
    },
    restorePurchases: async () => {
      mockRestoredAs.push(mockSdkUser);
      return mockInfoFor(mockSdkUser);
    },
    addCustomerInfoUpdateListener: (listener: (info: unknown) => void) =>
      mockListeners.add(listener),
    removeCustomerInfoUpdateListener: (listener: (info: unknown) => void) =>
      mockListeners.delete(listener),
  },
}));
jest.mock('@/lib/supabase', () => ({
  supabase: { rpc: (name: string, args: { p_user: string }) => mockRpc(name, args) },
}));
jest.mock('@/lib/pro-bypass', () => ({ useProOverride: () => 'off' }));
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
  mockUserId = 'user-1';
  mockActive = {};
  mockServerPro = {};
  mockLogInGate = null;
  mockServerGate = null;
  mockSdkCalls.length = 0;
  mockLogOut.mockClear();
  mockListeners.clear();
  mockRestoredAs.length = 0;
  mockLogIn.mockClear();
  mockRpc.mockClear();
  resetProStatusForTests();
});

describe('a second account on the same phone', () => {
  it('is signed in to RevenueCat as itself, never answered as the first', async () => {
    mockActive = { 'user-1': ['skip_budget_pro'] };
    const { result, rerender } = await renderHook(() => mod.useProSource(), { wrapper });
    await waitFor(() => expect(result.current).toEqual({ pro: true, ready: true }));

    // The first account signs out and a free one signs in, with no relaunch.
    mockUserId = 'user-2';
    await rerender({});

    await waitFor(() => expect(mockLogIn).toHaveBeenCalledWith('user-2'));
    await waitFor(() => expect(result.current).toEqual({ pro: false, ready: true }));
    expect(mockSdkUser).toBe('user-2');
  });

  it("ignores another account's answer that arrives late", async () => {
    mockUserId = 'user-4';
    const { result } = await renderHook(() => mod.useProSource(), { wrapper });
    await waitFor(() => expect(result.current).toEqual({ pro: false, ready: true }));
    await waitFor(() => expect(mockListeners.size).toBe(1));

    await act(async () => {
      for (const listener of mockListeners) {
        listener({ originalAppUserId: 'user-1', entitlements: { active: { pro: { id: 'pro' } } } });
      }
    });
    expect(result.current.pro).toBe(false);

    // The same answer for this account counts.
    await act(async () => {
      for (const listener of mockListeners) {
        listener({ originalAppUserId: 'user-4', entitlements: { active: { pro: { id: 'pro' } } } });
      }
    });
    expect(result.current.pro).toBe(true);
  });

  it('restores as the account that is signed in', async () => {
    mockUserId = 'user-5';
    mockActive = { 'user-5': ['pro'] };
    const { result } = await renderHook(() => mod.usePurchasePro(), { wrapper });
    await expect(result.current.restore()).resolves.toBe(true);
    expect(mockRestoredAs).toEqual(['user-5']);
  });
});

describe('a sign-in that is still under way', () => {
  it('makes the next account wait for it, then signs that account in before anything runs', async () => {
    // Somebody is signed in already, so the next ones go through logIn.
    mockUserId = 'user-6';
    const first = await renderHook(() => mod.usePurchasePro(), { wrapper });
    await first.result.current.restore();
    mockRestoredAs.length = 0;
    mockLogIn.mockClear();

    let open: () => void = () => {};
    mockLogInGate = new Promise<void>((resolve) => (open = resolve));

    mockUserId = 'user-7';
    const second = await renderHook(() => mod.usePurchasePro(), { wrapper });
    const secondRestore = second.result.current.restore();

    // Asked while user-7's sign-in is still waiting on the network.
    mockUserId = 'user-8';
    const third = await renderHook(() => mod.usePurchasePro(), { wrapper });
    const thirdRestore = third.result.current.restore();

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    // Nobody has restored as the wrong account while the sign-in waits.
    expect(mockRestoredAs).toEqual([]);

    await act(async () => open());
    await Promise.all([secondRestore, thirdRestore]);

    expect(mockLogIn.mock.calls.map(([id]) => id)).toEqual(['user-7', 'user-8']);
    expect(mockRestoredAs).toEqual(['user-7', 'user-8']);
  });
});

describe('switching back while a sign-in is under way', () => {
  it('ends signed in as the account asked for last (A, then B, then A within one logIn)', async () => {
    mockUserId = 'user-10';
    const settled = await renderHook(() => mod.usePurchasePro(), { wrapper });
    await settled.result.current.restore();
    mockRestoredAs.length = 0;
    mockLogIn.mockClear();

    let open: () => void = () => {};
    mockLogInGate = new Promise<void>((resolve) => (open = resolve));

    // A's sign-in starts and waits on the network.
    mockUserId = 'user-11';
    const a = await renderHook(() => mod.usePurchasePro(), { wrapper });
    const aRestore = a.result.current.restore();

    // B is asked for meanwhile, and then A again.
    mockUserId = 'user-12';
    const b = await renderHook(() => mod.usePurchasePro(), { wrapper });
    const bRestore = b.result.current.restore().then(
      () => 'signed in',
      () => 'gave way',
    );
    mockUserId = 'user-11';
    const again = await renderHook(() => mod.usePurchasePro(), { wrapper });
    const againRestore = again.result.current.restore();

    await act(async () => open());
    await expect(aRestore).resolves.toBe(false);
    await expect(againRestore).resolves.toBe(false);
    // B gave way: it is no longer the account on the phone, so it is not signed in at all.
    await expect(bRestore).resolves.toBe('gave way');

    expect(mockLogIn.mock.calls.map(([id]) => id)).toEqual(['user-11']);
    expect(mockSdkUser).toBe('user-11');
    expect(mockRestoredAs).toEqual(['user-11', 'user-11']);
  });
});

describe("the server's copy", () => {
  it('is the answer is_pro() gives, which the database walls also ask', async () => {
    mockUserId = 'user-9';
    mockServerPro = { 'user-9': true };
    const { result } = await renderHook(() => mod.useProSource(), { wrapper });
    await waitFor(() => expect(result.current).toEqual({ pro: true, ready: true }));
    expect(mockRpc).toHaveBeenCalledWith('is_pro', { p_user: 'user-9' });
  });
});

describe('signing out', () => {
  const clients: QueryClient[] = [];

  /**
   * One cache for the whole test, as the app has one, so what a sign-out leaves behind shows. Kept
   * for good (the app's lasts five minutes), so no collection timer outlives the test.
   */
  function appWrapper() {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: Infinity } },
    });
    clients.push(client);
    const Wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
    return { client, wrapper: Wrapper };
  }

  afterEach(() => {
    for (const client of clients) client.clear();
    clients.length = 0;
  });

  it('leaves nothing saying Pro once the account has gone', async () => {
    mockUserId = 'user-20';
    mockActive = { 'user-20': ['pro'] };
    mockServerPro = { 'user-20': true };
    const { client, wrapper } = appWrapper();
    const reader = await renderHook(() => mod.usePro(), { wrapper });
    const bridge = await renderHook(() => mod.useConfigurePurchases(), { wrapper });
    await waitFor(() => expect(proStatus()).toEqual({ pro: true, ready: true }));

    mockUserId = null;
    await bridge.rerender({});

    await waitFor(() => expect(proStatus()).toEqual({ pro: false, ready: false }));
    expect(reader.result.current).toEqual({ pro: false, ready: false });
    expect(client.getQueryData(['entitlement', 'user-20'])).toBeUndefined();
    expect(mockListeners.size).toBe(0);
  });

  it('makes the same account, signing back in, wait for its answer afresh instead of the old one', async () => {
    mockUserId = 'user-21';
    mockActive = { 'user-21': ['pro'] };
    mockServerPro = { 'user-21': true };
    const { wrapper } = appWrapper();
    const seen: ProStatus[] = [];
    const { result, rerender } = await renderHook(
      () => {
        const status = mod.useProSource();
        seen.push(status);
        return status;
      },
      { wrapper },
    );
    await waitFor(() => expect(result.current).toEqual({ pro: true, ready: true }));

    mockUserId = null;
    await rerender({});
    // Their Pro ends while they are signed out, and the server is slow to say so.
    mockActive = {};
    mockServerPro = {};
    let open: () => void = () => {};
    mockServerGate = new Promise<void>((resolve) => (open = resolve));
    seen.length = 0;

    mockUserId = 'user-21';
    await rerender({});
    await waitFor(() => expect(mockSdkCalls.at(-1)).toBe('read:user-21'));
    expect(result.current).toEqual({ pro: false, ready: false });

    await act(async () => open());
    await waitFor(() => expect(result.current).toEqual({ pro: false, ready: true }));
    expect(seen.filter((status) => status.pro)).toEqual([]);
  });

  it("signs the next account in to RevenueCat before anything is read for it, and never shows it the last one's Pro", async () => {
    mockUserId = 'user-22';
    mockActive = { 'user-22': ['skip_budget_pro'] };
    const { wrapper } = appWrapper();
    const seen: { userId: string | null; pro: boolean }[] = [];
    const { result, rerender } = await renderHook(
      () => {
        const status = mod.useProSource();
        seen.push({ userId: mockUserId, pro: status.pro });
        return status;
      },
      { wrapper },
    );
    await waitFor(() => expect(result.current).toEqual({ pro: true, ready: true }));

    mockUserId = null;
    await rerender({});
    mockSdkCalls.length = 0;

    mockUserId = 'user-23';
    await rerender({});
    await waitFor(() => expect(result.current).toEqual({ pro: false, ready: true }));

    expect(mockSdkCalls).toEqual(['logIn:user-23', 'read:user-23']);
    expect(mockSdkUser).toBe('user-23');
    expect(seen.filter((entry) => entry.userId === 'user-23' && entry.pro)).toEqual([]);
  });

  it("keeps a signed-in account's server answer where a purchase's refresh finds it", async () => {
    mockUserId = 'user-25';
    mockServerPro = {};
    const { client, wrapper } = appWrapper();
    const { result } = await renderHook(() => mod.useProSource(), { wrapper });
    await waitFor(() => expect(result.current).toEqual({ pro: false, ready: true }));
    expect(client.getQueryData(['entitlement', 'user-25'])).toBe(false);

    // The webhook has written the row; a purchase asks every entitlement read again.
    mockServerPro = { 'user-25': true };
    await act(async () => {
      await client.invalidateQueries({ queryKey: ['entitlement'] });
    });
    await waitFor(() => expect(result.current).toEqual({ pro: true, ready: true }));
  });

  it('leaves RevenueCat on the account until the next sign-in, never on an anonymous id', async () => {
    // RevenueCat's rule for apps that use only their own ids: never call logOut. The anonymous id
    // it makes would become the original id of the next new account to sign in here, which isFor
    // then refuses, and a renewal seen meanwhile could move the subscription onto it.
    mockUserId = 'user-24';
    const { wrapper } = appWrapper();
    const bridge = await renderHook(() => mod.useConfigurePurchases(), { wrapper });
    await waitFor(() => expect(mockSdkUser).toBe('user-24'));

    mockUserId = null;
    await bridge.rerender({});
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(mockLogOut).not.toHaveBeenCalled();
    expect(mockSdkUser).toBe('user-24');
    expect(mockListeners.size).toBe(0);
  });
});
