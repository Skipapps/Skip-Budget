import { renderHook, waitFor } from '@testing-library/react-native';

/**
 * The phone's timezone is stored on the account, but only when it differs from what is stored:
 * every profile write echoes back through realtime and re-reads the profile, and a launch that
 * changes nothing should write nothing.
 */

let mockZone: string | undefined = 'America/New_York';
let mockProfile: { reminders_enabled_at: string | null; timezone: string | null } | null = null;
let mockReadError: { message: string } | null = null;
const mockUpdates: unknown[] = [];
const mockSelects: string[] = [];

jest.mock('expo-localization', () => ({ getCalendars: () => [{ timeZone: mockZone }] }));
jest.mock('expo-device', () => ({ isDevice: false }));
jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  setBadgeCountAsync: jest.fn(async () => {}),
  setNotificationCategoryAsync: jest.fn(async () => {}),
  useLastNotificationResponse: () => null,
  clearLastNotificationResponseAsync: jest.fn(async () => {}),
  DEFAULT_ACTION_IDENTIFIER: 'default',
}));
jest.mock('expo-router', () => ({
  router: { push: jest.fn() },
  useNavigationContainerRef: () => ({ isReady: () => true }),
}));
jest.mock('@/lib/notification-permission', () => ({ notificationsAllowed: async () => false }));
jest.mock('@/providers/session-provider', () => ({ useUserId: () => 'user-1' }));
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: () => ({
      select: (columns: string) => {
        mockSelects.push(columns);
        return {
          eq: () => ({
            maybeSingle: async () => ({
              data: mockReadError ? null : mockProfile,
              error: mockReadError,
            }),
          }),
        };
      },
      update: (values: unknown) => ({
        eq: async () => {
          mockUpdates.push(values);
          return { error: null };
        },
      }),
    }),
  },
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { useRegisterPush } = require('@/api/push') as typeof import('@/api/push');

beforeEach(() => {
  mockZone = 'America/New_York';
  mockProfile = { reminders_enabled_at: null, timezone: 'America/New_York' };
  mockReadError = null;
  mockUpdates.length = 0;
  mockSelects.length = 0;
});

async function launch() {
  const view = await renderHook(() => useRegisterPush());
  await waitFor(() => expect(mockSelects).toHaveLength(1));
  // Let the write, if any, go out.
  await new Promise((resolve) => setTimeout(resolve, 10));
  return view;
}

describe('the timezone on launch', () => {
  it('writes nothing when the account already has this zone', async () => {
    const { unmount } = await launch();
    expect(mockSelects).toEqual(['reminders_enabled_at, timezone']);
    expect(mockUpdates).toEqual([]);
    await unmount();
  });

  it('writes the new zone after travel', async () => {
    mockZone = 'Europe/Paris';
    const { unmount } = await launch();
    expect(mockUpdates).toEqual([{ timezone: 'Europe/Paris' }]);
    await unmount();
  });

  it('writes it for an account that has none yet', async () => {
    mockProfile = { reminders_enabled_at: null, timezone: null };
    const { unmount } = await launch();
    expect(mockUpdates).toEqual([{ timezone: 'America/New_York' }]);
    await unmount();
  });

  it('writes it anyway when the stored zone could not be read', async () => {
    mockReadError = { message: 'fetch failed' };
    const { unmount } = await launch();
    expect(mockUpdates).toEqual([{ timezone: 'America/New_York' }]);
    await unmount();
  });

  it('writes nothing when the phone has no zone to give', async () => {
    mockZone = undefined;
    mockProfile = { reminders_enabled_at: null, timezone: null };
    const { unmount } = await launch();
    expect(mockUpdates).toEqual([]);
    await unmount();
  });
});
