import * as Sentry from '@sentry/react-native';

/**
 * What a failure is allowed to say on screen: one line, everywhere.
 *
 * The Founder's call (2026-09-28). A save, load, delete, sign-in, purchase or
 * send that goes wrong says this and nothing else — however it went wrong, and
 * whoever raised it: the connection, Supabase, a Postgres rule, the App Store.
 * A dozen differently worded apologies read as a dozen different problems;
 * one line reads as "try that again", which is the only thing any of them
 * ever asked of the person.
 *
 * Form hints are not failures. "Enter the bank name." is checked before
 * anything is sent and names the field to fix, so it keeps its own words.
 * Neither are statements about the device ("Scanning needs a camera") — those
 * are true every time, and trying again would change nothing.
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
 * The line for a caught error — and the error itself, kept where it can be
 * found.
 *
 * The screen no longer says what actually broke, so this is where the real
 * cause goes: to Sentry in a release build, where every one of these would
 * otherwise vanish (caught errors never reach the crash handler), and to the
 * Metro log in development (not a LogBox toast, which would put a second
 * message on the screen this exists to keep to one).
 */
export function failureMessage(thrown?: unknown): string {
  if (thrown !== undefined) {
    if (__DEV__) console.log('[failure]', thrown);
    else Sentry.captureException(asError(thrown), { tags: { handled: 'failure-message' } });
  }
  return FAILURE_MESSAGE;
}
