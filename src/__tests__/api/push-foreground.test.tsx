import { act, renderHook, waitFor } from '@testing-library/react-native';
import { AppState } from 'react-native';

/**
 * Coming back to Skip from the background: the phone may have crossed a time zone, or notifications
 * may have been allowed in Settings after the ask was refused. Both are picked up then, not only at
 * the next launch, and neither writes anything when nothing changed.
 */

let mockZone = 'America/New_York';
let mockAllowed = false;
let mockUserId = 'user-1';
let mockProfile: { reminders_enabled_at: string | null; timezone: string | null } = {
  reminders_enabled_at: null,
  timezone: 'America/New_York',
};
const mockUpdates: unknown[] = [];
const mockTokens: unknown[] = [];
const mockSelects: string[] = [];

jest.mock('expo-localization', () => ({ getCalendars: () => [{ timeZone: mockZone }] }));
jest.mock('expo-device', () => ({ isDevice: true }));
jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  setBadgeCountAsync: jest.fn(async () => {}),
  setNotificationCategoryAsync: jest.fn(async () => {}),
  useLastNotificationResponse: () => null,
  clearLastNotificationResponseAsync: jest.fn(async () => {}),
  getPermissionsAsync: jest.fn(async () => ({ granted: mockAllowed, ios: {} })),
  requestPermissionsAsync: jest.fn(async () => ({ granted: false, ios: {} })),
  getDevicePushTokenAsync: jest.fn(async () => ({ data: 'apns-token' })),
  IosAuthorizationStatus: { PROVISIONAL: 3 },
  DEFAULT_ACTION_IDENTIFIER: 'default',
}));
jest.mock('expo-router', () => ({
  router: { push: jest.fn() },
  useNavigationContainerRef: () => ({ isReady: () => true }),
}));
jest.mock('@/lib/notification-permission', () => ({
  notificationsAllowed: async () => mockAllowed,
}));
jest.mock('@/providers/session-provider', () => ({ useUserId: () => mockUserId }));
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: (table: string) => ({
      select: (columns: string) => {
        mockSelects.push(columns);
        return { eq: () => ({ maybeSingle: async () => ({ data: mockProfile, error: null }) }) };
      },
      update: (values: unknown) => ({
        eq: async () => {
          mockUpdates.push(values);
          return { error: null };
        },
      }),
      upsert: async (values: unknown) => {
        if (table === 'device_tokens') mockTokens.push(values);
        return { error: null };
      },
    }),
  },
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { enableReminders, useRegisterPush } = require('@/api/push') as typeof import('@/api/push');

/** Every 'change' listener the hook added, so a test can play coming back to the front. */
const listeners: ((state: string) => void)[] = [];

beforeEach(() => {
  mockZone = 'America/New_York';
  mockAllowed = false;
  mockUserId = 'user-1';
  mockProfile = { reminders_enabled_at: null, timezone: 'America/New_York' };
  mockUpdates.length = 0;
  mockTokens.length = 0;
  mockSelects.length = 0;
  listeners.length = 0;
  jest.spyOn(AppState, 'addEventListener').mockImplementation((type, listener) => {
    if (type === 'change') listeners.push(listener as (state: string) => void);
    return { remove: jest.fn() } as never;
  });
});

afterEach(() => jest.restoreAllMocks());

const settle = () => new Promise((resolve) => setTimeout(resolve, 10));

async function launch() {
  const view = await renderHook(() => useRegisterPush());
  await waitFor(() => expect(mockSelects).toHaveLength(1));
  await act(settle);
  return view;
}

async function backToFront() {
  await act(async () => {
    listeners.forEach((listener) => listener('active'));
    await settle();
  });
}

describe('the time zone on returning to the front', () => {
  it('saves the zone the phone moved to, once', async () => {
    const { unmount } = await launch();
    expect(mockUpdates).toEqual([]);

    mockZone = 'Europe/Paris';
    await backToFront();
    expect(mockUpdates).toEqual([{ timezone: 'Europe/Paris' }]);

    await backToFront();
    expect(mockUpdates).toEqual([{ timezone: 'Europe/Paris' }]);
    // Compared with what is known, never read again.
    expect(mockSelects).toHaveLength(1);
    await unmount();
  });

  it('writes nothing when the zone has not changed', async () => {
    const { unmount } = await launch();
    await backToFront();
    expect(mockUpdates).toEqual([]);
    await unmount();
  });
});

describe('notifications allowed in Settings after the ask', () => {
  it('signs the phone up on the return to the front, for an account that chose reminders', async () => {
    mockProfile = { reminders_enabled_at: '2026-10-01T09:00:00Z', timezone: 'America/New_York' };
    const { unmount } = await launch();
    expect(mockTokens).toEqual([]);

    mockAllowed = true;
    await backToFront();
    expect(mockTokens).toEqual([
      expect.objectContaining({ user_id: 'user-1', token: 'apns-token', platform: 'ios' }),
    ]);

    // Signed up once a session.
    await backToFront();
    expect(mockTokens).toHaveLength(1);
    await unmount();
  });

  it('never signs up an account that has not chosen reminders, permission or not', async () => {
    mockUserId = 'user-2';
    mockAllowed = true;
    const { unmount } = await launch();
    await backToFront();
    expect(mockTokens).toEqual([]);
    await unmount();
  });

  it('counts a yes given this session after launch, though the phone refused the ask then', async () => {
    mockUserId = 'user-3';
    const { unmount } = await launch();

    // A reminder switched on; the system prompt refused.
    await act(async () => {
      await expect(enableReminders('user-3')).resolves.toBe(false);
    });
    expect(mockUpdates).toEqual([
      { reminders_enabled_at: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/) },
    ]);
    expect(mockTokens).toEqual([]);

    mockAllowed = true;
    await backToFront();
    expect(mockTokens).toEqual([expect.objectContaining({ user_id: 'user-3' })]);
    await unmount();
  });
});
