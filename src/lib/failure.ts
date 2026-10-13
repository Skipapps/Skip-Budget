import * as Sentry from '@sentry/react-native';

import { t } from '@/i18n';

/**
 * What a failure is allowed to say on screen: one line, whatever went wrong or whoever raised it.
 *
 * Form hints ("Enter the bank name.") and statements about the device ("Scanning needs a
 * camera") are not failures and keep their own words.
 *
 * This constant is the English line only, frozen at import; failureText() follows the language.
 */
export const FAILURE_MESSAGE = 'Something went wrong. Please try again.';

/** The one failure line in the language on screen. */
export function failureText(): string {
  return t('common.failure');
}

/** Words Postgres puts before a quoted name of its own: `constraint "bills_pkey"`. */
const NAMED_BEFORE =
  /\b(?:constraint|relation|column|table|index|function|type|schema|sequence|trigger|policy|view|extension)\s+$/i;

/**
 * A message with what the person typed or owns blanked: quoted values (`uuid: "abc"`), key/value
 * groups (`(name)=(Netflix)`), ids and figures. Quoted names of the database's own objects are
 * kept, since they say which rule refused; so are the column names in a key group.
 */
function scrubMessage(message: string): string {
  return message
    .replace(/\(([^()]*)\)=\((?:[^()]|\([^()]*\))*\)/g, '($1)=(<value>)')
    .replace(/"(?:[^"\\]|\\.)*"/g, (quoted: string, offset: number, whole: string) =>
      NAMED_BEFORE.test(whole.slice(Math.max(0, offset - 16), offset)) ? quoted : '"<value>"',
    )
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '<id>')
    .replace(/\d+(\.\d+)?/g, '<n>');
}

/**
 * An Error Sentry can group, from whatever was thrown, carrying its name, scrubbed message and
 * stack and nothing else. A Supabase error is an Error with `details` and `hint` on it, and an
 * integration that sends an error's own fields would carry those along.
 */
function asError(thrown: unknown): Error {
  if (thrown instanceof Error) {
    const message = scrubMessage(thrown.message);
    const clean = new Error(message);
    clean.name = thrown.name;
    // The stack's first line repeats the message. A function, so a `$&` in the message cannot put
    // the raw one back.
    clean.stack = thrown.stack?.replace(thrown.message, () => message);
    return clean;
  }
  if (typeof thrown === 'string') return new Error(scrubMessage(thrown));
  if (thrown && typeof thrown === 'object' && 'message' in thrown) {
    const message = (thrown as { message?: unknown }).message;
    if (typeof message === 'string' && message) return new Error(scrubMessage(message));
  }
  return new Error('Unknown failure');
}

/**
 * The PostgREST or Postgres error code ("23505", "P0001", "PGRST116"), when there is one. Only the
 * code is ever sent: an error's details and hint can repeat the person's own values ("Key
 * (name)=(Netflix) already exists"), and a report describes what the app was doing, not what the
 * budget holds.
 */
function databaseCode(thrown: unknown): string | undefined {
  if (!thrown || typeof thrown !== 'object' || !('code' in thrown)) return undefined;
  const code = (thrown as { code?: unknown }).code;
  return typeof code === 'string' && code ? code : undefined;
}

/**
 * Sends a caught error to Sentry, grouped by its database code and message. Every handled error is
 * thrown from the same few lines, so Sentry's usual grouping by stack would fold every cause into
 * one issue. `tags` must not hold anything the person typed or owns.
 */
export function reportFailure(
  thrown: unknown,
  handled: string,
  tags: Record<string, string> = {},
): void {
  const code = databaseCode(thrown);
  Sentry.captureException(asError(thrown), {
    tags: { handled, ...tags, ...(code ? { code } : {}) },
    extra: code ? { code } : {},
    fingerprint: failureFingerprint(thrown, handled),
  });
}

/**
 * Which issue a caught error belongs to: where it was caught, its code (or kind) and its scrubbed
 * message, in which ids and figures are already blanked, so one cause groups as one issue.
 */
export function failureFingerprint(thrown: unknown, handled: string): string[] {
  const error = asError(thrown);
  return [handled, databaseCode(thrown) ?? error.name, error.message];
}

/**
 * The line for a caught error, which also sends the real cause where it can be found: Sentry in
 * a release build (caught errors never reach the crash handler), the Metro log in development
 * (not a LogBox toast, which would add a second message on screen).
 */
export function failureMessage(thrown?: unknown): string {
  if (thrown !== undefined) {
    if (__DEV__) console.log('[failure]', thrown);
    else reportFailure(thrown, 'failure-message');
  }
  return failureText();
}
