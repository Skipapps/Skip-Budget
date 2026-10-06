import * as Device from 'expo-device';
import * as Localization from 'expo-localization';
import * as Notifications from 'expo-notifications';
import { router, useNavigationContainerRef, type Href } from 'expo-router';
import { useEffect } from 'react';
import { AppState, Platform } from 'react-native';

import { supabase } from '@/lib/supabase';
import { useUserId } from '@/providers/session-provider';

/**
 * Registers this phone with Apple and stores the timezone the scheduler needs. The device token is
 * the address; the timezone is the clock, since a reminder is saved as "half past five" with no
 * zone and the server must know whose half past five it is. Runs every launch: iOS rotates tokens
 * on restore and reinstall, and a stale one fails silently forever.
 */

/** A notice that arrives while the app is open should still be seen. */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Whether notifications are allowed right now, without asking. Works on a simulator too (permission
 * is local to the device); only the push token needs a real phone (see registerDevice).
 */
export async function remindersAllowed(): Promise<boolean> {
  if (Platform.OS !== 'ios') return false;
  const existing = await Notifications.getPermissionsAsync();
  return (
    existing.granted || existing.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL
  );
}

/**
 * Ask for notifications, then register this device. The ask lives only behind a tap that explains
 * itself: iOS grants one system prompt per install, and spending it at launch is how most refusals
 * happen. Returns whether reminders can now send.
 */
export async function enableReminders(userId: string): Promise<boolean> {
  // The ask works on a simulator; registerDevice is what skips it there.
  if (Platform.OS !== 'ios') return false;

  const allowed = await remindersAllowed();
  const decision = allowed
    ? await Notifications.getPermissionsAsync()
    : await Notifications.requestPermissionsAsync();
  if (
    !decision.granted &&
    decision.ios?.status !== Notifications.IosAuthorizationStatus.PROVISIONAL
  )
    return false;

  try {
    await registerDevice(userId);
    await storeTimezone(userId);
    // The account's yes, written down — launch reads this from now on.
    await supabase
      .from('profiles')
      .update({ reminders_enabled_at: new Date().toISOString() } as never)
      .eq('id', userId);
  } catch {
    // A token failure loses nothing that the next attempt will not retry.
  }
  return true;
}

async function registerDevice(userId: string): Promise<void> {
  // A simulator has no push certificate and cannot be given a token; asking
  // throws rather than returning null.
  if (!Device.isDevice || Platform.OS !== 'ios') return;

  // Register only what was already granted; asking happens in enableReminders.
  if (!(await remindersAllowed())) return;

  const token = await Notifications.getDevicePushTokenAsync();
  if (typeof token.data !== 'string' || !token.data) return;

  await supabase.from('device_tokens').upsert(
    {
      user_id: userId,
      token: token.data,
      platform: 'ios',
      // A production-signed build is only known to Apple's other host; the sender learns that from
      // the rejection.
      environment: 'development',
    } as never,
    { onConflict: 'token' },
  );
}

/**
 * Forgetting this phone, so the account's reminders stop arriving on it. Deletes by token, not by
 * user: the row is one per *device* (`device_tokens.token` is unique), and an account signed out on
 * a phone must keep its iPad's reminders. Left in place, a handed-on phone would keep delivering
 * the previous account's notices, since the unique constraint only moves the row when the new
 * account opts in.
 *
 * Reading the token needs no notification permission (APNs registration succeeds even where the
 * alert was refused). It throws on a simulator, hence the isDevice guard; callers treat failure as
 * "could not tidy up", not a failure to sign out. Call while the session is alive: the delete
 * policy is `auth.uid() = user_id`, so after auth.signOut() it silently matches nothing.
 */
export async function forgetDevice(userId: string): Promise<void> {
  if (!Device.isDevice || Platform.OS !== 'ios') return;

  const token = await Notifications.getDevicePushTokenAsync();
  if (typeof token.data !== 'string' || !token.data) return;

  const { error } = await supabase
    .from('device_tokens')
    .delete()
    .eq('user_id', userId)
    .eq('token', token.data);

  if (error) throw new Error(error.message);
}

async function storeTimezone(userId: string): Promise<void> {
  const zone = Localization.getCalendars()[0]?.timeZone;
  if (!zone) return;
  await supabase
    .from('profiles')
    .update({ timezone: zone } as never)
    .eq('id', userId);
}

/**
 * Registers this device once a session exists. Failures are swallowed: someone who declines
 * notifications, or whose token request fails, should still get an app.
 */
export function useRegisterPush(): void {
  const userId = useUserId();

  // The badge means "something waiting inside", so being inside clears it; otherwise it outlives
  // the notification and points at nothing.
  useEffect(() => {
    const clear = () => void Notifications.setBadgeCountAsync(0).catch(() => {});
    clear();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') clear();
    });
    return () => sub.remove();
  }, []);

  // The buttons under a pressed-and-held notification. The content extension
  // (targets/notification-content) names "View"; this category is what iOS needs, and the fallback
  // where that extension is absent (an older build, a Watch).
  useEffect(() => {
    void registerCategories().catch(() => {});
  }, []);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    (async () => {
      try {
        // Every account gets its clock stored, reminders or not: the server computes each user's
        // own "today" (charge dates, reminder times) from profiles.timezone, and nobody should be
        // billed on UTC's calendar. Runs each launch, so travel updates it.
        await storeTimezone(userId);
        if (cancelled) return;

        // Only for an account that chose reminders: the phone's permission is shared by every
        // account on it, so registering on permission alone would opt a fresh sign-in into
        // another's choice.
        const { data } = await supabase
          .from('profiles')
          .select('reminders_enabled_at')
          .eq('id', userId)
          .maybeSingle();
        if (cancelled || !data?.reminders_enabled_at) return;

        await registerDevice(userId);
      } catch {
        // Nothing the person holding the phone can act on.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  useNotificationRouting();
}

/** The category every Skip notification carries; see send-push/index.ts. */
export const NOTIFICATION_CATEGORY = 'skip.item';

/** The "View …" button's identifier, routed like a plain tap. */
export const VIEW_ACTION = 'view';

/** "Remind me in 1 hour", handled by the content extension on the phone. */
export const SNOOZE_ACTION = 'snooze';

function registerCategories(): Promise<unknown> {
  return Notifications.setNotificationCategoryAsync(NOTIFICATION_CATEGORY, [
    { identifier: VIEW_ACTION, buttonTitle: 'View', options: { opensAppToForeground: true } },
    {
      identifier: SNOOZE_ACTION,
      buttonTitle: 'Remind me in 1 hour',
      options: { opensAppToForeground: false },
    },
  ]);
}

/**
 * Where a tapped notification may take somebody. An allow-list, not a URL: the route arrives in the
 * push payload, so it is data, and handing it to `Linking.openURL` or `router.push` unchecked would
 * let whatever can reach the sender pick any screen or URL scheme. The key is what the server
 * sends; the value is the route this app owns.
 */
const TAP_ROUTES: Record<string, Href> = {
  '/add-receipt': '/add-receipt',
  '/transactions': '/transactions',
};

/**
 * Routes that also need an item id (bill, subscription, card or account). The id must look like a
 * row id, so the payload can name a record and nothing else.
 */
const ITEM_ROUTES = {
  '/bill': '/bill/[id]',
  '/subscription': '/subscription/[id]',
  '/source': '/source/[id]',
} as const;

const ROW_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The screen a notification's data asks for, if this build allows it. */
export function tapTarget(data: Record<string, unknown> | undefined): Href | undefined {
  const asked = data?.route;
  if (typeof asked !== 'string') return undefined;
  if (asked in TAP_ROUTES) return TAP_ROUTES[asked];
  if (asked in ITEM_ROUTES) {
    const id = data?.id;
    if (typeof id !== 'string' || !ROW_ID.test(id)) return undefined;
    return { pathname: ITEM_ROUTES[asked as keyof typeof ITEM_ROUTES], params: { id } } as Href;
  }
  return undefined;
}

/** How long to wait for a navigator before giving the tap up, in ms. */
const NAVIGATOR_WAIT = 10_000;
const NAVIGATOR_POLL = 50;

/**
 * Opens the screen a notification was about. Two things make it more than one `router.push`:
 *
 * - The tap can be what launched the app. `useLastNotificationResponse` reads the response iOS
 *   recorded before JavaScript existed, but then there is no navigator yet: this hook lives in the
 *   root layout, which renders nothing until the stored session is read, and `router.push` before
 *   the container mounts is queued and dropped (expo-router 57, `global-state/routingQueue.js`
 *   `run()`). So it waits for `isReady()`.
 * - The response is sticky: the hook keeps returning the same tap, so it is cleared once used, or a
 *   reload replays it and drops somebody back into a form they already closed.
 */
export function useNotificationRouting(): void {
  const response = Notifications.useLastNotificationResponse();
  const navigation = useNavigationContainerRef();
  const userId = useUserId();

  useEffect(() => {
    if (!response) return;

    // A plain tap, or the card's "View" button. Dismissing is not a request
    // to go anywhere, and "Remind me in 1 hour" is answered on the phone.
    const action = response.actionIdentifier;
    if (action !== Notifications.DEFAULT_ACTION_IDENTIFIER && action !== VIEW_ACTION) return;

    // Signed out, every route behind the session is the wrong place to land. userId is a
    // dependency, so a tap that arrives first is honoured once the session has been read.
    if (!userId) return;

    const target = tapTarget(response.notification.request.content.data);
    if (!target) return;

    let timer: ReturnType<typeof setTimeout> | undefined;
    let waited = 0;

    const go = () => {
      if (!navigation.isReady()) {
        waited += NAVIGATOR_POLL;
        // Give up rather than poll forever: a phone left on the lock screen should not keep a timer
        // alive.
        if (waited > NAVIGATOR_WAIT) return;
        timer = setTimeout(go, NAVIGATOR_POLL);
        return;
      }

      router.push(target);
      void Notifications.clearLastNotificationResponseAsync().catch(() => {});
    };

    go();

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [response, navigation, userId]);
}
