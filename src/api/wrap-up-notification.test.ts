/**
 * The monthly wrap-up notice: one pending at a time under a fixed identifier, for 9:00 on the 1st of
 * next month in the phone's own time, about the month that is ending, in the language on screen. It
 * never asks for permission, it goes away when turned off or signed out, and a cancel asked for
 * after a schedule always lands after it.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { AppState, type AppStateStatus } from 'react-native';

import {
  cancelWrapUpNotification,
  readWrapUpOn,
  refreshWrapUpNotification,
  useWrapUpNotification,
  useWrapUpSwitch,
  WRAP_UP_NOTIFICATION_ID,
  wrapUpContent,
  wrapUpSchedule,
} from './wrap-up-notification';
import { resetLocaleForTests, setLanguage } from '@/i18n/store';

const order: string[] = [];
const mockSchedule = jest.fn(async (_request: unknown) => {
  order.push('schedule');
  return WRAP_UP_NOTIFICATION_ID;
});
const mockCancel = jest.fn(async (_id: string) => {
  order.push('cancel');
});
const mockRequest = jest.fn();

jest.mock('expo-notifications', () => ({
  scheduleNotificationAsync: (request: unknown) => mockSchedule(request),
  cancelScheduledNotificationAsync: (id: string) => mockCancel(id),
  requestPermissionsAsync: () => mockRequest(),
  SchedulableTriggerInputTypes: { CALENDAR: 'calendar' },
}));

let mockAccess: 'allowed' | 'ask' | 'refused' = 'allowed';
jest.mock('@/lib/notification-permission', () => ({
  notificationAccess: async () => mockAccess,
  notificationsAllowed: async () => mockAccess === 'allowed',
}));

/** The Reminders page's own enable path: asks while iOS still can, and says whether it may send. */
let mockAnswer: 'allowed' | 'refused' = 'allowed';
const mockEnable = jest.fn(async (_userId: string) => {
  if (mockAccess === 'ask') mockAccess = mockAnswer;
  return mockAccess === 'allowed';
});
jest.mock('@/api/push', () => ({ enableReminders: (userId: string) => mockEnable(userId) }));

jest.mock('@react-native-async-storage/async-storage', () => {
  const storage = jest.requireActual(
    '@react-native-async-storage/async-storage/jest/async-storage-mock',
  );
  // However it is loaded (import or require), `default` is the same storage.
  storage.default = storage;
  return storage;
});

let mockSession: { ready: boolean; session: { user: { id: string } } | null } = {
  ready: true,
  session: { user: { id: 'user-A' } },
};
jest.mock('@/providers/session-provider', () => ({
  useSession: () => mockSession,
  useUserId: () => mockSession.session?.user.id ?? null,
}));

const appStateListeners: ((state: AppStateStatus) => void)[] = [];
const removeListener = jest.fn();

beforeEach(async () => {
  order.length = 0;
  mockSchedule.mockClear();
  mockCancel.mockClear();
  mockRequest.mockClear();
  mockAccess = 'allowed';
  mockAnswer = 'allowed';
  mockEnable.mockClear();
  mockSession = { ready: true, session: { user: { id: 'user-A' } } };
  appStateListeners.length = 0;
  removeListener.mockClear();
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, listener) => {
    appStateListeners.push(listener as (state: AppStateStatus) => void);
    return { remove: removeListener };
  });
  await AsyncStorage.clear();
  resetLocaleForTests([{ languageCode: 'en', currencyCode: 'USD', regionCode: 'US' }]);
});

afterEach(() => {
  jest.restoreAllMocks();
});

/** What the last schedule call asked iOS for. */
const lastRequest = () =>
  mockSchedule.mock.calls.at(-1)?.[0] as {
    identifier: string;
    content: { title: string; body: string; data: Record<string, unknown>; sound: unknown };
    trigger: Record<string, unknown>;
  };

describe('wrapUpSchedule', () => {
  it('is 9:00 on the 1st of next month, about this month', () => {
    expect(wrapUpSchedule(new Date(2026, 9, 11, 20, 10))).toEqual({
      month: '2026-10',
      monthIndex: 9,
      at: { year: 2026, month: 11, day: 1, hour: 9, minute: 0 },
    });
  });

  it('crosses into January of the next year from December', () => {
    expect(wrapUpSchedule(new Date(2026, 11, 31, 23, 59))).toEqual({
      month: '2026-12',
      monthIndex: 11,
      at: { year: 2027, month: 1, day: 1, hour: 9, minute: 0 },
    });
  });

  it('counts January as month 2 for iOS when it schedules February', () => {
    expect(wrapUpSchedule(new Date(2027, 0, 1, 0, 0)).at).toEqual({
      year: 2027,
      month: 2,
      day: 1,
      hour: 9,
      minute: 0,
    });
    expect(wrapUpSchedule(new Date(2027, 0, 1, 0, 0)).month).toBe('2027-01');
  });

  it('opened early on the 1st, looks to the next 1st: the month just ended shows in the app', () => {
    // 1 Nov, 8:00: October has ended and its wrap-up page is what the open shows.
    const schedule = wrapUpSchedule(new Date(2026, 10, 1, 8, 0));
    expect(schedule.month).toBe('2026-11');
    expect(schedule.at).toMatchObject({ year: 2026, month: 12, day: 1 });
  });
});

describe('wrapUpContent', () => {
  const october = wrapUpSchedule(new Date(2026, 9, 11));

  it('names the month in English and routes to its wrap-up', () => {
    expect(wrapUpContent(october)).toEqual({
      title: 'Your October wrap-up is ready',
      body: 'See how October went.',
      data: { route: '/wrap-up', month: '2026-10' },
      sound: 'default',
    });
  });

  it('speaks Spanish', () => {
    setLanguage('es');
    expect(wrapUpContent(october)).toMatchObject({
      title: 'Tu resumen de octubre está listo',
      body: 'Mira cómo te fue en octubre.',
    });
  });

  it('speaks French, with no elision to get wrong before octobre', () => {
    setLanguage('fr');
    expect(wrapUpContent(october)).toMatchObject({
      title: 'Ton bilan pour octobre est prêt',
      body: 'Regarde comment s’est passé octobre.',
    });
  });

  it('keeps the route data the same in every language', () => {
    setLanguage('fr');
    expect(wrapUpContent(october).data).toEqual({ route: '/wrap-up', month: '2026-10' });
  });
});

describe('refreshWrapUpNotification', () => {
  it('schedules one notice under the fixed identifier, as calendar fields that do not repeat', async () => {
    await refreshWrapUpNotification('user-A', new Date(2026, 9, 11, 20, 10));

    expect(mockSchedule).toHaveBeenCalledTimes(1);
    expect(lastRequest()).toEqual({
      identifier: 'skip-wrap-up',
      content: {
        title: 'Your October wrap-up is ready',
        body: 'See how October went.',
        data: { route: '/wrap-up', month: '2026-10' },
        sound: 'default',
      },
      trigger: {
        type: 'calendar',
        year: 2026,
        month: 11,
        day: 1,
        hour: 9,
        minute: 0,
        repeats: false,
      },
    });
  });

  it('uses the same identifier every time, so a second open replaces rather than adds', async () => {
    await refreshWrapUpNotification('user-A', new Date(2026, 9, 11));
    await refreshWrapUpNotification('user-A', new Date(2026, 10, 2));

    const ids = mockSchedule.mock.calls.map(
      (call) => (call[0] as { identifier: string }).identifier,
    );
    expect(ids).toEqual(['skip-wrap-up', 'skip-wrap-up']);
    expect(lastRequest().content.data).toEqual({ route: '/wrap-up', month: '2026-11' });
  });

  it('never asks for permission, and without it schedules nothing', async () => {
    mockAccess = 'ask';

    await refreshWrapUpNotification('user-A', new Date(2026, 9, 11));

    expect(mockRequest).not.toHaveBeenCalled();
    expect(mockSchedule).not.toHaveBeenCalled();
    // Nothing left over from a time permission was given.
    expect(mockCancel).toHaveBeenCalledWith('skip-wrap-up');
  });

  it('takes the notice away when this person turned it off', async () => {
    await AsyncStorage.setItem('skip.wrapUp.user-A', 'false');

    await refreshWrapUpNotification('user-A', new Date(2026, 9, 11));

    expect(mockSchedule).not.toHaveBeenCalled();
    expect(mockCancel).toHaveBeenCalledWith('skip-wrap-up');
  });

  it("reads one person's switch, not another's", async () => {
    await AsyncStorage.setItem('skip.wrapUp.user-B', 'false');

    await refreshWrapUpNotification('user-A', new Date(2026, 9, 11));

    expect(mockSchedule).toHaveBeenCalledTimes(1);
  });

  it('swallows a refusal from iOS; the next open tries again', async () => {
    mockSchedule.mockImplementationOnce(async () => {
      throw new Error('scheduling refused');
    });

    await expect(refreshWrapUpNotification('user-A', new Date(2026, 9, 11))).resolves.toBe(
      undefined,
    );
  });

  it('lets a cancel asked for after a schedule land after it', async () => {
    let finish: () => void = () => {};
    mockSchedule.mockImplementationOnce(
      () =>
        new Promise<string>((resolve) => {
          finish = () => {
            order.push('schedule');
            resolve('skip-wrap-up');
          };
        }),
    );

    const scheduling = refreshWrapUpNotification('user-A', new Date(2026, 9, 11));
    const cancelling = cancelWrapUpNotification();
    await waitFor(() => expect(mockSchedule).toHaveBeenCalled());
    expect(mockCancel).not.toHaveBeenCalled();

    finish();
    await scheduling;
    await cancelling;

    expect(order).toEqual(['schedule', 'cancel']);
  });
});

describe('readWrapUpOn', () => {
  it('is on until turned off', async () => {
    expect(await readWrapUpOn('user-A')).toBe(true);
    await AsyncStorage.setItem('skip.wrapUp.user-A', 'false');
    expect(await readWrapUpOn('user-A')).toBe(false);
  });

  it('reads storage that refuses as on', async () => {
    jest.spyOn(AsyncStorage, 'getItem').mockRejectedValueOnce(new Error('storage unavailable'));
    expect(await readWrapUpOn('user-A')).toBe(true);
  });
});

describe('cancelWrapUpNotification', () => {
  it('cancels by the fixed identifier and never throws', async () => {
    mockCancel.mockImplementationOnce(async () => {
      throw new Error('no native module');
    });
    await expect(cancelWrapUpNotification()).resolves.toBe(undefined);
    expect(mockCancel).toHaveBeenCalledWith('skip-wrap-up');
  });
});

describe('useWrapUpNotification', () => {
  it('schedules on open for the signed-in person', async () => {
    await renderHook(() => useWrapUpNotification());
    await waitFor(() => expect(mockSchedule).toHaveBeenCalledTimes(1));
  });

  it('schedules again each time the app comes back to the front', async () => {
    await renderHook(() => useWrapUpNotification());
    await waitFor(() => expect(mockSchedule).toHaveBeenCalledTimes(1));

    await act(async () => appStateListeners.forEach((listener) => listener('background')));
    await act(async () => appStateListeners.forEach((listener) => listener('active')));

    await waitFor(() => expect(mockSchedule).toHaveBeenCalledTimes(2));
  });

  it('schedules again in the new language when the language changes', async () => {
    await renderHook(() => useWrapUpNotification());
    await waitFor(() => expect(mockSchedule).toHaveBeenCalledTimes(1));

    await act(async () => setLanguage('es'));

    await waitFor(() => expect(mockSchedule).toHaveBeenCalledTimes(2));
    expect(lastRequest().content.title).toMatch(/^Tu resumen de [a-z]+ está listo$/);
  });

  it('never asks for permission on launch or on return, without it or with it', async () => {
    mockAccess = 'ask';
    await renderHook(() => useWrapUpNotification());
    await act(async () => appStateListeners.forEach((listener) => listener('active')));

    await waitFor(() => expect(mockCancel).toHaveBeenCalled());
    expect(mockEnable).not.toHaveBeenCalled();
    expect(mockRequest).not.toHaveBeenCalled();
    expect(mockSchedule).not.toHaveBeenCalled();
  });

  it('waits for the stored session before deciding anything', async () => {
    mockSession = { ready: false, session: null };
    await renderHook(() => useWrapUpNotification());

    await act(async () => {});
    expect(mockSchedule).not.toHaveBeenCalled();
    expect(mockCancel).not.toHaveBeenCalled();
  });

  it('leaves nothing pending once signed out', async () => {
    const { rerender } = await renderHook(() => useWrapUpNotification());
    await waitFor(() => expect(mockSchedule).toHaveBeenCalledTimes(1));

    mockSession = { ready: true, session: null };
    await rerender({});

    await waitFor(() => expect(mockCancel).toHaveBeenCalledWith('skip-wrap-up'));
    expect(removeListener).toHaveBeenCalled();
    expect(order.at(-1)).toBe('cancel');
  });
});

describe('useWrapUpSwitch', () => {
  const opened = async () => {
    const hook = await renderHook(() => useWrapUpSwitch());
    await waitFor(() => expect(hook.result.current.ready).toBe(true));
    return hook.result;
  };

  it('is on by default when the phone allows notifications', async () => {
    const result = await opened();
    expect(result.current).toMatchObject({ enabled: true, refused: false });
  });

  it('reads a switch turned off earlier', async () => {
    await AsyncStorage.setItem('skip.wrapUp.user-A', 'false');
    const result = await opened();
    expect(result.current.enabled).toBe(false);
  });

  it('reads off, not on, while nothing could arrive: permission never given', async () => {
    mockAccess = 'ask';
    const result = await opened();
    expect(result.current).toMatchObject({ enabled: false, refused: false });
  });

  it('reads off and refused when the phone said no', async () => {
    mockAccess = 'refused';
    const result = await opened();
    expect(result.current).toMatchObject({ enabled: false, refused: true });
  });

  it('turned on, goes through the enable path, which asks, then schedules', async () => {
    mockAccess = 'ask';
    const result = await opened();

    let done: boolean | undefined;
    await act(async () => {
      done = await result.current.setEnabled(true);
    });

    expect(mockEnable).toHaveBeenCalledWith('user-A');
    expect(done).toBe(true);
    expect(result.current.enabled).toBe(true);
    expect(await AsyncStorage.getItem('skip.wrapUp.user-A')).toBe('true');
    expect(mockSchedule).toHaveBeenCalledTimes(1);
  });

  it('turned on and declined at the prompt, stays off, saves nothing and says refused', async () => {
    mockAccess = 'ask';
    mockAnswer = 'refused';
    await AsyncStorage.setItem('skip.wrapUp.user-A', 'false');
    const result = await opened();

    let done: boolean | undefined;
    await act(async () => {
      done = await result.current.setEnabled(true);
    });

    expect(done).toBe(false);
    expect(result.current).toMatchObject({ enabled: false, refused: true });
    expect(await AsyncStorage.getItem('skip.wrapUp.user-A')).toBe('false');
    expect(mockSchedule).not.toHaveBeenCalled();
  });

  it('turned off, remembers it and takes the pending notice away without asking anything', async () => {
    const result = await opened();

    let done: boolean | undefined;
    await act(async () => {
      done = await result.current.setEnabled(false);
    });

    expect(done).toBe(true);
    expect(mockEnable).not.toHaveBeenCalled();
    expect(result.current.enabled).toBe(false);
    expect(await AsyncStorage.getItem('skip.wrapUp.user-A')).toBe('false');
    expect(mockCancel).toHaveBeenCalledWith('skip-wrap-up');
    expect(mockSchedule).not.toHaveBeenCalled();
  });

  it('follows permission given in Settings once the app comes back', async () => {
    mockAccess = 'refused';
    const result = await opened();
    expect(result.current.enabled).toBe(false);

    mockAccess = 'allowed';
    await act(async () => appStateListeners.forEach((listener) => listener('active')));

    await waitFor(() => expect(result.current.enabled).toBe(true));
    expect(result.current.refused).toBe(false);
  });
});
