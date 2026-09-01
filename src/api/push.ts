import * as Device from 'expo-device';
import * as Localization from 'expo-localization';
import * as Notifications from 'expo-notifications';
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
        if (!cancelled) await storeTimezone(userId);
      } catch {
        // Nothing the person holding the phone can act on.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userId]);
}
