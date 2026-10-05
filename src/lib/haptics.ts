import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

/**
 * Fire from `onPress`, never `onPressIn`: `onPressIn` also fires for the finger about to scroll
 * the list, so it would buzz on every scroll.
 *
 * The on/off switch is a module flag rather than a hook so a handler anywhere can ask without
 * subscribing; the preferences provider owns the value and writes it here.
 */

let enabled = true;

/** Called by the preferences provider. Not for general use. */
export function setHapticsEnabled(next: boolean) {
  enabled = next;
}

// Android's generic haptic is a buzz rather than a tap, so haptics are iOS-only.
const supported = Platform.OS === 'ios';

function fire(run: () => Promise<void>) {
  if (!enabled || !supported) return;
  try {
    // A device with no haptic engine rejects rather than throwing.
    run().catch(() => {});
  } catch {
    // A native module missing from the build throws on the call itself. Haptics run before the
    // action they accompany (`withTap`), so letting this escape would make the press do nothing.
  }
}

/** A control was pressed. The default for buttons, rows, chips and keys. */
export function tap() {
  fire(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
}

/** A switch moved, or a value stepped. Slightly firmer than a tap. */
export function toggle() {
  fire(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium));
}

/** Something finished and went well — saved, added, paid. */
export function success() {
  fire(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
}

/** Something was refused or could not be done. */
export function warn() {
  fire(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning));
}

/** A value inside a control changed — a keypad digit, a chip, a day cell. */
export function selection() {
  fire(() => Haptics.selectionAsync());
}
