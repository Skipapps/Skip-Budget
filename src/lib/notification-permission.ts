import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

/**
 * Where notifications stand, without asking: allowed (granted or provisional), still askable, or
 * refused, which only the phone's Settings can undo. Works on a simulator too (permission is local
 * to the device); only the push token needs a real phone. Apart from push.ts so that what only reads
 * the permission does not load the database client with it.
 */
export type NotificationAccess = 'allowed' | 'ask' | 'refused';

export async function notificationAccess(): Promise<NotificationAccess> {
  if (Platform.OS !== 'ios') return 'refused';
  const existing = await Notifications.getPermissionsAsync();
  if (
    existing.granted ||
    existing.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL
  ) {
    return 'allowed';
  }
  return existing.ios?.status === Notifications.IosAuthorizationStatus.DENIED ? 'refused' : 'ask';
}

export async function notificationsAllowed(): Promise<boolean> {
  return (await notificationAccess()) === 'allowed';
}
