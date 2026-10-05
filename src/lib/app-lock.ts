/**
 * Face ID in front of the app.
 *
 * No hardware, nothing enrolled, or module missing from the build all mean "do not lock": locking
 * would shut the user out of their own budget with no way back in. Only a failed authentication
 * is the user's problem.
 *
 * The lock is a screen in front of local data, not a security boundary.
 *
 * The module is loaded on demand: `requireNativeModule` throws on evaluation when the native side
 * is not in the binary, so a plain import would crash any older build, including installed dev
 * clients.
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
    return { available: false, reason: 'unsupported' };
  }
}

/**
 * Asks for a face, a fingerprint or the device passcode. The passcode fallback stays on so a face
 * that will not scan never locks the user out.
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
