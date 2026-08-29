import * as Device from 'expo-device';
import * as Localization from 'expo-localization';
import * as Notifications from 'expo-notifications';
import { useEffect } from 'react';
import { Platform } from 'react-native';

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

async function registerDevice(userId: string): Promise<void> {
  // A simulator has no push certificate and cannot be given a token; asking
  // throws rather than returning null.
  if (!Device.isDevice || Platform.OS !== 'ios') return;

  const existing = await Notifications.getPermissionsAsync();
  const granted =
    existing.granted || existing.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;

  const decision = granted ? existing : await Notifications.requestPermissionsAsync();
  if (!decision.granted) return;

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

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    (async () => {
      try {
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
