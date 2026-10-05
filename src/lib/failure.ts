import * as Sentry from '@sentry/react-native';

/**
 * What a failure is allowed to say on screen: one line, whatever went wrong or whoever raised it.
 *
 * Form hints ("Enter the bank name.") and statements about the device ("Scanning needs a
 * camera") are not failures and keep their own words.
 */
export const FAILURE_MESSAGE = 'Something went wrong. Please try again.';

/** An Error Sentry can group, from whatever was thrown. */
function asError(thrown: unknown): Error {
  if (thrown instanceof Error) return thrown;
  if (typeof thrown === 'string') return new Error(thrown);
  if (thrown && typeof thrown === 'object' && 'message' in thrown) {
    const message = (thrown as { message?: unknown }).message;
    if (typeof message === 'string' && message) return new Error(message);
  }
  return new Error('Unknown failure');
}

/**
 * The line for a caught error, which also sends the real cause where it can be found: Sentry in
 * a release build (caught errors never reach the crash handler), the Metro log in development
 * (not a LogBox toast, which would add a second message on screen).
 */
export function failureMessage(thrown?: unknown): string {
  if (thrown !== undefined) {
    if (__DEV__) console.log('[failure]', thrown);
    else Sentry.captureException(asError(thrown), { tags: { handled: 'failure-message' } });
  }
  return FAILURE_MESSAGE;
}
