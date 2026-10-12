/**
 * Whether a bill counts toward spending: a loan saved with "Add to monthly bills" off does not.
 *
 * The rule, everywhere bills are counted or listed: with the flag off a bill records nothing new and
 * projects nothing. Charges already recorded stay counted, because that money went out. Turning it
 * off never removes a bill from the Loans page, its own page or its reminder.
 */

type ReadFailure = { code?: string; message?: string; details?: string } | null;

/** A row read before the column existed has no flag, and counts, as every bill did then. */
export function countsInSpending(bill: { in_spending?: boolean | null }): boolean {
  return bill.in_spending !== false;
}

/** Postgres's "undefined column" naming the flag: a database without the migration yet. */
export function lacksSpendingFlag(error: ReadFailure): boolean {
  return (
    error?.code === '42703' && /in_spending/.test(`${error.message ?? ''} ${error.details ?? ''}`)
  );
}

/**
 * Runs a bills read with the flag, and again without it on a database that lacks the column, so
 * every bill still loads (and counts) there. `read` gets ", in_spending" or "" to append to its
 * column list. Any other failure is returned as it came.
 */
export async function withSpendingFlag<R extends { error: ReadFailure }>(
  read: (flagColumn: string) => PromiseLike<R>,
): Promise<R> {
  const result = await read(', in_spending');
  return lacksSpendingFlag(result.error) ? read('') : result;
}
