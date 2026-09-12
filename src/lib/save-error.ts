/**
 * What a failed save is allowed to say on screen.
 *
 * Everything the app throws on purpose — a validation message, `NOTHING_SAVED`,
 * `NOTHING_UPDATED` — is already written for the person reading it, so it goes
 * through untouched. What is not written for anybody is what the transport
 * throws when the connection drops mid-request: "fetch failed:
 * UnexpectedException: The network connection was lost", which is the one
 * string a user actually saw under a red line on the add screens.
 *
 * So this maps the shapes a dropped connection takes, and nothing else. It is
 * deliberately a presentation concern and lives nowhere near `src/api`: the
 * error that arrives there still carries its real text for logs and for
 * anything that needs to tell two failures apart.
 */

/** One sentence for every way the request never reached Supabase. */
export const NETWORK_MESSAGE =
  'Skip could not reach the server. Check your connection and try again.';

/**
 * The words a transport failure comes wrapped in.
 *
 * Matched as substrings rather than against a list of exact messages because
 * there is no such list: React Native, `fetch`, Supabase and iOS each phrase
 * the same dropped connection differently, and a new SDK phrases it again.
 */
const NETWORK_WORDS = [
  'network',
  'fetch failed',
  'failed to fetch',
  'connection',
  'timed out',
  'offline',
];

/** The message an unknown thrown value is carrying, if it is carrying one. */
function messageOf(thrown: unknown): string {
  if (typeof thrown === 'string') return thrown;
  if (thrown instanceof Error) return thrown.message ?? '';
  if (thrown && typeof thrown === 'object' && 'message' in thrown) {
    const message = (thrown as { message?: unknown }).message;
    return typeof message === 'string' ? message : '';
  }
  return '';
}

/**
 * Whether this failure is the connection rather than the request.
 *
 * A `TypeError` counts on its own when it mentions fetching at all: that is
 * what `fetch` itself throws when it cannot open a socket, and on some
 * platforms its message ("Load failed") names nothing else.
 */
export function isNetworkError(thrown: unknown): boolean {
  const message = messageOf(thrown).toLowerCase();

  if (NETWORK_WORDS.some((word) => message.includes(word))) return true;

  const isTypeError =
    thrown instanceof TypeError ||
    (Boolean(thrown) && typeof thrown === 'object' && (thrown as Error).name === 'TypeError');

  return isTypeError && (message.includes('fetch') || message.includes('load failed'));
}

/**
 * The line to put under a form when a save or a delete failed.
 *
 * `fallback` is what the screen would have said anyway — it is used only when
 * whatever was thrown carries no message of its own, which is the case an
 * `??` on `.message` never actually caught, because an `Error` with no message
 * has `''` rather than `undefined`.
 */
export function saveErrorMessage(thrown: unknown, fallback: string): string {
  if (isNetworkError(thrown)) return NETWORK_MESSAGE;

  const message = messageOf(thrown).trim();
  return message || fallback;
}
