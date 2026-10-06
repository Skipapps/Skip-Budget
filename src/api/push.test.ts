/**
 * What a tapped notification may open. The route comes off the wire, so the cases that matter are
 * the wrong ones (an unknown name, a deep link, a tap before there is a navigator or a session),
 * each of which must end in nothing happening.
 */

import { act, renderHook, waitFor } from '@testing-library/react-native';

// babel-plugin-jest-hoist lifts every jest.mock() below above this import, so the module loads
// against the mocks.
import * as Notifications from 'expo-notifications';

import { enableReminders, forgetDevice, tapTarget, useNotificationRouting } from './push';

const mockPush = jest.fn();
let mockIsDevice = false;
let mockToken: unknown = 'apns-token-A';
const mockIsReady = jest.fn(() => true);
const mockClear = jest.fn(() => Promise.resolve());
let mockResponse: unknown = null;
let mockUserId: string | null = 'user-A';

jest.mock('expo-router', () => ({
  router: { push: (...a: unknown[]) => mockPush(...a) },
  useNavigationContainerRef: () => ({ isReady: () => mockIsReady() }),
}));

jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  useLastNotificationResponse: () => mockResponse,
  clearLastNotificationResponseAsync: () => mockClear(),
  setBadgeCountAsync: jest.fn(() => Promise.resolve(0)),
  setNotificationCategoryAsync: jest.fn(() => Promise.resolve(null)),
  getPermissionsAsync: jest.fn(() => Promise.resolve({ granted: false, ios: {} })),
  requestPermissionsAsync: jest.fn(() => Promise.resolve({ granted: false, ios: {} })),
  getDevicePushTokenAsync: jest.fn(() => Promise.resolve({ data: mockToken })),
  IosAuthorizationStatus: { PROVISIONAL: 3 },
  DEFAULT_ACTION_IDENTIFIER: 'expo.modules.notifications.actions.DEFAULT',
}));

jest.mock('expo-device', () => ({
  // A getter, so a test can be a phone and the next one a simulator.
  get isDevice() {
    return mockIsDevice;
  },
}));
jest.mock('expo-localization', () => ({ getCalendars: () => [{ timeZone: 'America/New_York' }] }));
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: (table: string) => mockFrom(table),
  },
}));

/**
 * Enough of a PostgREST builder to record what was asked for. The real one is a thenable that only
 * runs on await, hence `then` rather than a resolved promise.
 */
const eqCalls: [string, unknown][] = [];
let deleted = false;
let deleteError: { message: string } | null = null;
const updates: [string, unknown][] = [];
const mockFrom = jest.fn((table: string) => ({
  update: (values: unknown) => {
    updates.push([table, values]);
    return { eq: () => Promise.resolve({ error: null }) };
  },
  delete: () => {
    deleted = true;
    const chain = {
      eq(column: string, value: unknown) {
        eqCalls.push([column, value]);
        return chain;
      },
      then(resolve: (r: { error: { message: string } | null }) => unknown) {
        return Promise.resolve(resolve({ error: deleteError }));
      },
    };
    return chain;
  },
}));
jest.mock('@/providers/session-provider', () => ({ useUserId: () => mockUserId }));

const DEFAULT_ACTION = 'expo.modules.notifications.actions.DEFAULT';

function tap(data: Record<string, unknown>, actionIdentifier = DEFAULT_ACTION) {
  return {
    actionIdentifier,
    notification: { request: { identifier: 'n1', content: { data } } },
  };
}

const BILL_ID = '6ba21f34-d139-409a-87ce-5bba6e200646';

describe('tapTarget', () => {
  it.each([
    ['/bill', '/bill/[id]'],
    ['/subscription', '/subscription/[id]'],
    ['/source', '/source/[id]'],
  ])('opens %s for one item', (route, pathname) => {
    expect(tapTarget({ route, id: BILL_ID })).toEqual({ pathname, params: { id: BILL_ID } });
  });

  it('opens the screens that need no id', () => {
    expect(tapTarget({ route: '/add-receipt' })).toBe('/add-receipt');
    expect(tapTarget({ route: '/transactions' })).toBe('/transactions');
  });

  it.each([
    ['no id', { route: '/bill' }],
    ['an id that is not a row id', { route: '/bill', id: '../settings' }],
    ['a route that is not on the list', { route: '/delete-account', id: BILL_ID }],
    ['the retired Splits screen', { route: '/splits' }],
    ['nothing at all', undefined],
  ])('refuses %s', (_label, data) => {
    expect(tapTarget(data as Record<string, unknown> | undefined)).toBeUndefined();
  });
});

describe('useNotificationRouting', () => {
  beforeEach(() => {
    mockPush.mockClear();
    mockClear.mockClear();
    mockIsReady.mockReset();
    mockIsReady.mockReturnValue(true);
    mockResponse = null;
    mockUserId = 'user-A';
  });

  it('opens the add-receipt form for the receipts reminder', async () => {
    mockResponse = tap({ route: '/add-receipt' });
    await renderHook(() => useNotificationRouting());
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/add-receipt'));
    expect(mockPush).toHaveBeenCalledTimes(1);
  });

  it('opens the bill a notification is about from its View button', async () => {
    mockResponse = tap({ route: '/bill', id: BILL_ID }, 'view');
    await renderHook(() => useNotificationRouting());
    await waitFor(() =>
      expect(mockPush).toHaveBeenCalledWith({ pathname: '/bill/[id]', params: { id: BILL_ID } }),
    );
  });

  it('leaves Remind me in 1 hour to the phone, opening nothing', async () => {
    mockResponse = tap({ route: '/bill', id: BILL_ID }, 'snooze');
    await renderHook(() => useNotificationRouting());
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('clears the response so a reload cannot replay the tap', async () => {
    mockResponse = tap({ route: '/add-receipt' });
    await renderHook(() => useNotificationRouting());
    await waitFor(() => expect(mockClear).toHaveBeenCalledTimes(1));
  });

  it('does nothing for a notification carrying no route — every existing one', async () => {
    mockResponse = tap({});
    await renderHook(() => useNotificationRouting());
    expect(mockPush).not.toHaveBeenCalled();
  });

  it.each([
    ['a route this build does not have', '/settings'],
    ['an absolute URL', 'https://example.com/pay'],
    ['another app’s scheme', 'skipbudget://add-receipt'],
    ['a traversal at the allowed route', '/add-receipt/../delete-account'],
    ['a non-string', 42],
  ])('refuses %s', async (_label, route) => {
    mockResponse = tap({ route });
    await renderHook(() => useNotificationRouting());
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('opens nothing for an old Splits notice, from a tap or its Open Splits button', async () => {
    // The server still sends these notices, and this build has no screen for them.
    for (const action of [DEFAULT_ACTION, 'view']) {
      mockPush.mockClear();
      mockResponse = tap(
        { route: '/splits', card: { kind: 'group', view: 'Open Splits' } },
        action,
      );
      const { unmount } = await renderHook(() => useNotificationRouting());
      expect(mockPush).not.toHaveBeenCalled();
      await unmount();
    }
  });

  it('ignores anything that is not a plain tap', async () => {
    mockResponse = tap({ route: '/add-receipt' }, 'expo.modules.notifications.actions.DISMISS');
    await renderHook(() => useNotificationRouting());
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('does not route a signed-out phone anywhere', async () => {
    mockUserId = null;
    mockResponse = tap({ route: '/add-receipt' });
    await renderHook(() => useNotificationRouting());
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('honours the tap once the session lands, rather than dropping it', async () => {
    mockUserId = null;
    mockResponse = tap({ route: '/add-receipt' });
    const { rerender } = await renderHook(() => useNotificationRouting());
    expect(mockPush).not.toHaveBeenCalled();

    mockUserId = 'user-A';
    await rerender(undefined);
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/add-receipt'));
  });

  it('waits for the navigator instead of pushing into a queue that is dropped', async () => {
    jest.useFakeTimers();
    mockIsReady.mockReturnValue(false);
    mockResponse = tap({ route: '/add-receipt' });
    await renderHook(() => useNotificationRouting());
    expect(mockPush).not.toHaveBeenCalled();

    // The navigator arrives a few frames later, as on a cold start from a tap.
    mockIsReady.mockReturnValue(true);
    await act(async () => {
      jest.advanceTimersByTime(100);
    });
    expect(mockPush).toHaveBeenCalledWith('/add-receipt');
    jest.useRealTimers();
  });

  it('gives up rather than polling for the rest of the session', async () => {
    jest.useFakeTimers();
    const scheduled: unknown[] = [];
    const realSetTimeout = globalThis.setTimeout;
    jest.spyOn(globalThis, 'setTimeout').mockImplementation(((fn: never, ms: never) => {
      scheduled.push(ms);
      return realSetTimeout(fn, ms);
    }) as typeof globalThis.setTimeout);
    mockIsReady.mockReturnValue(false);
    mockResponse = tap({ route: '/add-receipt' });
    await renderHook(() => useNotificationRouting());

    await act(async () => {
      jest.advanceTimersByTime(60_000);
    });
    expect(mockPush).not.toHaveBeenCalled();

    // 10s at a 50ms poll is 200 retries; counted rather than read off jest.getTimerCount(), which
    // also sees React's own scheduler.
    const polls = scheduled.length;
    expect(polls).toBeLessThanOrEqual(201);

    await act(async () => {
      jest.advanceTimersByTime(60_000);
    });
    expect(scheduled.length).toBe(polls);
    expect(mockPush).not.toHaveBeenCalled();
    jest.mocked(globalThis.setTimeout).mockRestore();
    jest.useRealTimers();
  });
});

/**
 * Sign-out takes this phone off the list, and only this phone: device_tokens is one row per device,
 * so the delete must carry the token filter or it would silence the account's other devices.
 */
describe('forgetDevice', () => {
  beforeEach(() => {
    mockFrom.mockClear();
    eqCalls.length = 0;
    deleted = false;
    deleteError = null;
    mockIsDevice = true;
    mockToken = 'apns-token-A';
  });

  afterEach(() => {
    mockIsDevice = false;
  });

  it("deletes this device's row, identified by its token", async () => {
    await forgetDevice('user-A');

    expect(mockFrom).toHaveBeenCalledWith('device_tokens');
    expect(deleted).toBe(true);
    expect(eqCalls).toEqual([
      ['user_id', 'user-A'],
      ['token', 'apns-token-A'],
    ]);
  });

  it("leaves the account's other devices registered", async () => {
    await forgetDevice('user-A');

    // Without the token filter the same call would match every row this account owns.
    expect(eqCalls.map(([column]) => column)).toContain('token');
  });

  it('does nothing on a simulator, where there is no token to ask for', async () => {
    mockIsDevice = false;

    await forgetDevice('user-A');

    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('does nothing when the token comes back empty', async () => {
    mockToken = '';

    await forgetDevice('user-A');

    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('does nothing when the token is not a string', async () => {
    mockToken = { data: null };

    await forgetDevice('user-A');

    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('throws when the delete is refused, so the caller can say so', async () => {
    deleteError = { message: 'permission denied for table device_tokens' };

    await expect(forgetDevice('user-A')).rejects.toThrow(
      'permission denied for table device_tokens',
    );
  });
});

/**
 * The ask happens on a simulator too (permission is local); only the push token needs a real phone.
 */
describe('enableReminders', () => {
  beforeEach(() => {
    jest.mocked(Notifications.requestPermissionsAsync).mockClear();
    jest.mocked(Notifications.getDevicePushTokenAsync).mockClear();
    updates.length = 0;
    mockIsDevice = false;
  });

  it('asks for permission on a simulator', async () => {
    await enableReminders('user-A');
    expect(Notifications.requestPermissionsAsync).toHaveBeenCalled();
  });

  it('turns reminders on for the account once allowed, without asking a simulator for a token', async () => {
    jest
      .mocked(Notifications.requestPermissionsAsync)
      .mockResolvedValueOnce({ granted: true, ios: {} } as never);

    await expect(enableReminders('user-A')).resolves.toBe(true);

    expect(Notifications.getDevicePushTokenAsync).not.toHaveBeenCalled();
    expect(
      updates.some(
        ([table, values]) => table === 'profiles' && 'reminders_enabled_at' in (values as object),
      ),
    ).toBe(true);
  });

  it('reports a refusal', async () => {
    await expect(enableReminders('user-A')).resolves.toBe(false);
    expect(updates).toHaveLength(0);
  });
});
