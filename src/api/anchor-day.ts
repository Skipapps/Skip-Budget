/**
 * The day of the month a monthly, quarterly or yearly bill or subscription keeps (`anchor_day`).
 * The database sets it; the app only reads it, so its schedule is walked from that day and a 31st
 * survives a short month. A row read without it walks from its stored date's own day, as before.
 */

type ReadFailure = { code?: string; message?: string; details?: string } | null;

/** Postgres's "undefined column" naming anchor_day: a database without the column yet. */
export function lacksAnchorDay(error: ReadFailure): boolean {
  return (
    error?.code === '42703' && /anchor_day/.test(`${error.message ?? ''} ${error.details ?? ''}`)
  );
}

/**
 * Runs a bills or subscriptions read with the anchor day, and again without it on a database that
 * lacks the column, so every plan still loads there. `read` gets ", anchor_day" or "" to append to
 * its column list. Any other failure is returned as it came. Innermost of the column fallbacks:
 * withLogoColumns retries on any 42703, which would drop the logos for a missing anchor day.
 */
export async function withAnchorDay<R extends { error: ReadFailure }>(
  read: (anchorColumn: string) => PromiseLike<R>,
): Promise<R> {
  const result = await read(', anchor_day');
  return lacksAnchorDay(result.error) ? read('') : result;
}
