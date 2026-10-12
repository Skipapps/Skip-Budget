import * as Notifications from 'expo-notifications';
import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { enableReminders } from '@/api/push';
import { t, useLocale } from '@/i18n';
import { monthLong } from '@/i18n/calendar';
import {
  notificationAccess,
  notificationsAllowed,
  type NotificationAccess,
} from '@/lib/notification-permission';
import { useSession, useUserId } from '@/providers/session-provider';

/**
 * The monthly wrap-up notice: a local notification for 9:00 on the 1st of next month, about the
 * month now running. It is scheduled again on every open under one identifier, which iOS treats as
 * a replacement, so only one is ever pending. Opening the app never asks for permission; turning the
 * switch on does, the way every switch on the Reminders page does.
 */

export const WRAP_UP_NOTIFICATION_ID = 'skip-wrap-up';

export const WRAP_UP_HOUR = 9;

export type WrapUpSchedule = {
  /** The month the wrap-up is about, "2026-10": the one that ends before it arrives. */
  month: string;
  /** That month as Date#getMonth counts it, for its name. */
  monthIndex: number;
  /** When it arrives, as calendar fields. `month` here is 1 to 12, as iOS counts. */
  at: { year: number; month: number; day: 1; hour: number; minute: 0 };
};

/** The next wrap-up from `now`: 9:00 on the 1st of the month after `now`'s, in local time. */
export function wrapUpSchedule(now: Date): WrapUpSchedule {
  const year = now.getFullYear();
  const monthIndex = now.getMonth();
  const december = monthIndex === 11;
  return {
    month: `${year}-${String(monthIndex + 1).padStart(2, '0')}`,
    monthIndex,
    at: {
      year: december ? year + 1 : year,
      month: december ? 1 : monthIndex + 2,
      day: 1,
      hour: WRAP_UP_HOUR,
      minute: 0,
    },
  };
}

/** The notice's words are fixed when it is scheduled, in the language on screen then. */
export function wrapUpContent(schedule: WrapUpSchedule): Notifications.NotificationContentInput {
  const month = monthLong(schedule.monthIndex);
  return {
    title: t('reminders.wrapUp.notificationTitle', { month }),
    body: t('reminders.wrapUp.notificationBody', { month }),
    // Read by tapTarget in push.ts, which only lets a yyyy-mm month through.
    data: { route: '/wrap-up', month: schedule.month },
    sound: 'default',
  };
}

const keyFor = (userId: string) => `skip.wrapUp.${userId}`;

type Area = typeof import('@react-native-async-storage/async-storage').default;

function storage(): Area | null {
  try {
    // Required on use: without the native module the import itself throws, and the root layout
    // must not fall over with it.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return (require('@react-native-async-storage/async-storage') as { default: Area }).default;
  } catch {
    return null;
  }
}

/**
 * Whether this person wants the wrap-up on this phone. On unless they turned it off; kept on the
 * phone because the notice itself is scheduled on the phone.
 */
export async function readWrapUpOn(userId: string): Promise<boolean> {
  try {
    return (await storage()?.getItem(keyFor(userId))) !== 'false';
  } catch {
    return true;
  }
}

async function writeWrapUpOn(userId: string, on: boolean): Promise<void> {
  try {
    await storage()?.setItem(keyFor(userId), String(on));
  } catch {
    // The switch keeps its new place for this session; the next launch reads the old one.
  }
}

/**
 * Schedules and cancels run one at a time, in the order asked. Otherwise a schedule that started
 * before a sign-out or a switch turned off could land after the cancel and leave a notice pending.
 */
let queue: Promise<unknown> = Promise.resolve();

function inTurn(task: () => Promise<unknown>): Promise<void> {
  const run = queue.then(task, task);
  queue = run.catch(() => {});
  return run.then(
    () => {},
    () => {},
  );
}

/**
 * Puts the next wrap-up in place for `userId`, or takes it away when they turned it off or the
 * phone does not allow notifications. Never throws: a notice that could not be scheduled is
 * scheduled again on the next open.
 */
export function refreshWrapUpNotification(userId: string, now = new Date()): Promise<void> {
  return inTurn(async () => {
    if (!(await readWrapUpOn(userId)) || !(await notificationsAllowed())) {
      await Notifications.cancelScheduledNotificationAsync(WRAP_UP_NOTIFICATION_ID);
      return;
    }

    const schedule = wrapUpSchedule(now);
    await Notifications.scheduleNotificationAsync({
      identifier: WRAP_UP_NOTIFICATION_ID,
      content: wrapUpContent(schedule),
      // Calendar fields, not a Date: iOS turns a Date into a countdown, which a change of time
      // zone before the 1st would move off 9:00 local.
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
        ...schedule.at,
        repeats: false,
      },
    });
  });
}

/** Takes the pending wrap-up away. Never throws. */
export function cancelWrapUpNotification(): Promise<void> {
  return inTurn(() => Notifications.cancelScheduledNotificationAsync(WRAP_UP_NOTIFICATION_ID));
}

/**
 * Keeps the one pending wrap-up current: on launch, on sign-in, each time the app comes back to the
 * front, and when the language changes. Signed out, nothing stays pending.
 */
export function useWrapUpNotification(): void {
  const { ready, session } = useSession();
  const userId = session?.user.id ?? null;
  const { language } = useLocale();

  // `language` is a dependency only so that a change of language reschedules the words.
  useEffect(() => {
    if (!ready) return;
    if (!userId) {
      // Covers a session that ended without signOut (expired, revoked elsewhere).
      void cancelWrapUpNotification();
      return;
    }

    void refreshWrapUpNotification(userId);
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void refreshWrapUpNotification(userId);
    });
    return () => sub.remove();
  }, [ready, userId, language]);
}

/** The "Monthly wrap-up" switch on the Reminders page. */
export function useWrapUpSwitch(): {
  /** On only when chosen and the phone allows notifications: whether one will actually arrive. */
  enabled: boolean;
  /** The phone refused notifications to Skip; only its Settings can change that. */
  refused: boolean;
  ready: boolean;
  /** Resolves to whether the switch ended where it was asked to go. */
  setEnabled: (on: boolean) => Promise<boolean>;
} {
  const userId = useUserId();
  const [chosen, setChosen] = useState(true);
  const [readFor, setReadFor] = useState<string | null>(null);
  const [access, setAccess] = useState<NotificationAccess | null>(null);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    void readWrapUpOn(userId).then((on) => {
      if (cancelled) return;
      setChosen(on);
      setReadFor(userId);
    });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  // Read again on every return to the app: the answer changes in the phone's Settings, and the
  // system prompt itself sends the app inactive and back.
  useEffect(() => {
    let cancelled = false;
    const read = () =>
      void notificationAccess().then(
        (next) => !cancelled && setAccess(next),
        () => !cancelled && setAccess('ask'),
      );
    read();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') read();
    });
    return () => {
      cancelled = true;
      sub.remove();
    };
  }, []);

  const setEnabled = useCallback(
    async (on: boolean) => {
      if (!userId) return false;
      if (on) {
        const allowed = await enableReminders(userId).catch(() => false);
        setAccess(await notificationAccess().catch((): NotificationAccess => 'ask'));
        if (!allowed) return false;
      }
      setChosen(on);
      await writeWrapUpOn(userId, on);
      await refreshWrapUpNotification(userId);
      return true;
    },
    [userId],
  );

  return {
    enabled: chosen && access === 'allowed',
    refused: access === 'refused',
    ready: (!userId || readFor === userId) && access !== null,
    setEnabled,
  };
}
