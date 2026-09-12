import * as Device from 'expo-device';
import * as Localization from 'expo-localization';
import * as Notifications from 'expo-notifications';
import { router, useNavigationContainerRef, type Href } from 'expo-router';
import { useEffect } from 'react';
import { AppState, Platform } from 'react-native';

import { supabase } from '@/lib/supabase';
import { useUserId } from '@/providers/session-provider';

/**
 * Telling Apple where this phone is, and Skip what time it is here.
 *
 * Two facts get stored, and the scheduler cannot send anything without both.
 * The device token is the address. The timezone is the clock: a reminder is
 * saved as "half past five" with no zone attached, deliberately, because that
 * is what somebody setting it means — so the server needs to know whose half
 * past five it is before it can turn that into a moment.
 *
 * Runs on every launch rather than once. Tokens are rotated by iOS on restore,
 * reinstall and occasionally for its own reasons, and a stale one fails
 * silently forever, so the cheap thing to do is re-register each time.
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

/** Whether notifications are allowed right now, without asking. */
export async function remindersAllowed(): Promise<boolean> {
  if (!Device.isDevice || Platform.OS !== 'ios') return false;
  const existing = await Notifications.getPermissionsAsync();
  return (
    existing.granted || existing.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL
  );
}

/**
 * Ask for notifications, then register this device.
 *
 * The ask lives here, behind a tap that explains itself — the Getting Started
 * step, or the reminders screen — and nowhere else. iOS grants one system
 * prompt per install, and spending it at launch, before the app has shown any
 * value, is how most refusals happen. Returns whether reminders can now send.
 */
export async function enableReminders(userId: string): Promise<boolean> {
  if (!Device.isDevice || Platform.OS !== 'ios') return false;

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

  // Register only what was already granted. The asking happens in
  // enableReminders, at a moment somebody chose; launch is not that moment.
  if (!(await remindersAllowed())) return;

  const token = await Notifications.getDevicePushTokenAsync();
  if (typeof token.data !== 'string' || !token.data) return;

  await supabase.from('device_tokens').upsert(
    {
      user_id: userId,
      token: token.data,
      platform: 'ios',
      // The honest default for how this app is installed today. A build signed
      // for production is only known to Apple's other host, and the sender
      // learns that from the rejection rather than guessing here.
      environment: 'development',
    } as never,
    { onConflict: 'token' },
  );
}

/**
 * Forgetting this phone, so the account's reminders stop arriving on it.
 *
 * The mirror image of registerDevice, and the thing sign-out never did. The
 * row is one per *device* (`device_tokens.token` is unique, which is what the
 * upsert above conflicts on), so this deletes by token and not by user: an
 * account signed out on a phone must keep its iPad's reminders. A phone handed
 * on, or lent to somebody who signs in with their own account and never turns
 * reminders on, otherwise keeps delivering the previous account's notices —
 * the unique-on-token constraint only moves the row when the new account
 * registers, which needs both permission and their own opt-in.
 *
 * Reading the token is what identifies the row, and it does not need the
 * notification permission: registering with APNs succeeds even where the user
 * refused the alert, so a permission revoked in iOS Settings does not strand
 * the row here. It throws on a simulator, hence the isDevice guard, and the
 * caller treats any failure as "could not tidy up" rather than as a failure to
 * sign out.
 *
 * Must be called while the session is still alive: the delete policy is
 * `auth.uid() = user_id`, so after auth.signOut() it would silently match
 * nothing.
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
 * Registers this device once a session exists.
 *
 * Failures are swallowed on purpose. Somebody who declines notifications, or
 * whose token request fails, should still get an app — the only thing lost is
 * a reminder they can still read on the notifications screen.
 */
export function useRegisterPush(): void {
  const userId = useUserId();

  // The icon badge means "something waiting inside" — so being inside clears
  // it. Without this, the badge every push sets outlives the notification it
  // announced and sits on the icon pointing at nothing.
  useEffect(() => {
    const clear = () => void Notifications.setBadgeCountAsync(0).catch(() => {});
    clear();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') clear();
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    (async () => {
      try {
        // Every account gets its clock stored, reminders or not: the server
        // computes each user's own "today" — bill and subscription charge
        // dates, reminder times — from profiles.timezone, and someone who
        // never enables reminders must not be billed on UTC's calendar. Runs
        // each launch, so travel updates it too.
        await storeTimezone(userId);
        if (cancelled) return;

        // Only for an account that chose reminders. The phone's permission is
        // shared by every account on it, so registering on permission alone
        // silently opted every fresh sign-in into another account's choice.
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

/**
 * Where a tapped notification is allowed to take somebody.
 *
 * An allow-list, and deliberately not a URL. The route arrives from the server
 * inside the push payload, which makes it data rather than an instruction: a
 * name that is not on this list opens nothing. Handing a pushed string to
 * `Linking.openURL` or to `router.push` unchecked would let whatever can reach
 * the sender pick any screen, any deep link and any external URL scheme the
 * phone knows, so the payload only ever selects from routes this build already
 * decided to allow.
 *
 * The key is what the server sends; the value is the route this app owns.
 */
const TAP_ROUTES: Record<string, Href> = {
  '/add-receipt': '/add-receipt',
};

/** How long to wait for a navigator before giving the tap up, in ms. */
const NAVIGATOR_WAIT = 10_000;
const NAVIGATOR_POLL = 50;

/**
 * Opening the screen a notification was about.
 *
 * Until now nothing read a tap at all: every notification opened the app
 * wherever it was last left, which is fine for "your payment went out" and
 * wrong for "any receipts from today?" — that one is asking for an action, so
 * it has to land on the form.
 *
 * Two things make this more than one `router.push`:
 *
 *   The tap can be what launched the app. `useLastNotificationResponse` covers
 *   that case — it reads the response iOS recorded before JavaScript existed,
 *   not just the ones that arrive while the app is running — but at that
 *   moment there is no navigator yet. This hook lives in the root layout,
 *   which renders nothing until the stored session has been read, and
 *   `router.push` before the container mounts is queued and then dropped on
 *   the floor (expo-router 57, `global-state/routingQueue.js` `run()`: the
 *   queue is emptied whether or not `ref.current` exists). So it waits for
 *   `isReady()` rather than pushing into the void.
 *
 *   The response is sticky. The hook keeps returning the same tap, so it is
 *   cleared once used; without that, a reload replays the last tap and drops
 *   somebody back into a form they already closed.
 *
 * Checked against https://docs.expo.dev/versions/v57.0.0/sdk/notifications/ —
 * `useLastNotificationResponse`, `DEFAULT_ACTION_IDENTIFIER` and
 * `clearLastNotificationResponseAsync` are all SDK 57 APIs, and the docs' own
 * example is this same shape with `Linking.openURL` where this uses the
 * allow-list above.
 */
export function useNotificationRouting(): void {
  const response = Notifications.useLastNotificationResponse();
  const navigation = useNavigationContainerRef();
  const userId = useUserId();

  useEffect(() => {
    if (!response) return;

    // A plain tap only. Dismissing a notification is not a request to go
    // anywhere, and this app defines no action buttons.
    if (response.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) return;

    // Signed out, every route behind the session is the wrong place to land.
    // userId is a dependency, so a tap that arrives first is honoured once the
    // session has been read rather than being thrown away.
    if (!userId) return;

    const asked = response.notification.request.content.data?.route;
    const target = typeof asked === 'string' ? TAP_ROUTES[asked] : undefined;
    if (!target) return;

    let timer: ReturnType<typeof setTimeout> | undefined;
    let waited = 0;

    const go = () => {
      if (!navigation.isReady()) {
        waited += NAVIGATOR_POLL;
        // Giving up rather than polling forever. A phone left on the lock
        // screen should not keep a timer alive for the rest of the session.
        if (waited > NAVIGATOR_WAIT) return;
        timer = setTimeout(go, NAVIGATOR_POLL);
        return;
      }

      router.push(target);
      // Used, so it must not be answered twice.
      void Notifications.clearLastNotificationResponseAsync().catch(() => {});
    };

    go();

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [response, navigation, userId]);
}
