/**
 * Face ID in front of the app.
 *
 * Every call is guarded, because there are four different ways this is not
 * available and only one of them is an error worth showing: the phone has no
 * biometric hardware, the user has not enrolled a face or a finger, the module
 * is missing from this build, or authentication genuinely failed. Only the
 * last is the user's problem, and the first three all mean the same thing to
 * the app — do not lock, because we would lock somebody out of their own
 * budget with no way back in.
 *
 * The lock is a screen in front of local data, not a security boundary. The
 * data is already behind the account; this stops the person beside you reading
 * your balance over your shoulder.
 *
 * The module is loaded on demand rather than imported. `requireNativeModule`
 * throws the moment it is evaluated when the native side is not in the build,
 * so a plain import would take the whole app down on any binary made before
 * this shipped — including every dev client already installed. Asked for
 * inside a try, the same situation is just a phone that cannot offer the lock.
 */

type LocalAuthentication = typeof import('expo-local-authentication');

let cached: LocalAuthentication | null | undefined;

function load(): LocalAuthentication | null {
  if (cached !== undefined) return cached;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    cached = require('expo-local-authentication') as LocalAuthentication;
  } catch {
    cached = null;
  }
  return cached;
}

export type LockCapability =
  | { available: true; label: string }
  | { available: false; reason: 'no-hardware' | 'not-enrolled' | 'unsupported' };

/** What this phone can actually do, asked before the switch is offered. */
export async function lockCapability(): Promise<LockCapability> {
  const LocalAuthentication = load();
  if (!LocalAuthentication) return { available: false, reason: 'unsupported' };

  try {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    if (!hasHardware) return { available: false, reason: 'no-hardware' };

    const enrolled = await LocalAuthentication.isEnrolledAsync();
    if (!enrolled) return { available: false, reason: 'not-enrolled' };

    const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
    const label = types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)
      ? 'Face ID'
      : types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)
        ? 'Touch ID'
        : 'your passcode';

    return { available: true, label };
  } catch {
    // Present but refusing to answer. Same outcome: do not offer the lock.
    return { available: false, reason: 'unsupported' };
  }
}

/**
 * Asks for a face, a fingerprint or the device passcode.
 *
 * The passcode fallback is deliberately left on. A face that will not scan in
 * the dark is common, and a lock with no way past it is a lock on the user's
 * own money rather than a feature.
 */
export async function authenticate(reason = 'Unlock Skip'): Promise<boolean> {
  const LocalAuthentication = load();
  if (!LocalAuthentication) return false;

  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: reason,
      cancelLabel: 'Cancel',
      disableDeviceFallback: false,
    });
    return result.success;
  } catch {
    return false;
  }
}

/** What to tell someone whose phone cannot do this. */
export function unavailableMessage(reason: Exclude<LockCapability, { available: true }>['reason']) {
  switch (reason) {
    case 'no-hardware':
      return 'This phone has no Face ID or Touch ID.';
    case 'not-enrolled':
      return 'Set up Face ID or Touch ID in your phone’s settings first, then come back.';
    case 'unsupported':
      return 'App lock is not available in this build of Skip.';
  }
}
