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

/**
 * The line for a caught error — and, in development, the error itself.
 *
 * The screen no longer says what actually broke, so this is where the real
 * cause stays findable: it goes to the Metro log (not a LogBox toast, which
 * would put a second message on the screen this exists to keep to one).
 */
export function failureMessage(thrown?: unknown): string {
  if (__DEV__ && thrown !== undefined) console.log('[failure]', thrown);
  return FAILURE_MESSAGE;
}
