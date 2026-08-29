import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

/**
 * The taps you feel.
 *
 * Deliberately fired from `onPress` and never from `onPressIn`. A press event
 * only arrives when a touch went down and came back up on the same control,
 * which is exactly what "the user pressed this" means. `onPressIn` fires the
 * moment a finger lands — including the finger that is about to drag the list
 * away — so wiring it there buzzes on every scroll and turns a confirmation
 * into noise.
 *
 * The switch is read from a module flag rather than a hook, so a handler deep
 * inside a component can ask without every button growing a subscription. The
 * preferences provider owns the value and writes it here when it changes.
 */

let enabled = true;

/** Called by the preferences provider. Not for general use. */
export function setHapticsEnabled(next: boolean) {
  enabled = next;
}

// Android's generic haptic is coarser than iOS's and lands closer to a buzz
// than a tap. Kept to iOS rather than shipping something that feels broken.
const supported = Platform.OS === 'ios';

function fire(run: () => Promise<void>) {
  if (!enabled || !supported) return;
  // A device with no haptic engine rejects rather than throwing synchronously,
  // and a missed tap is not worth an unhandled rejection.
  run().catch(() => {});
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
