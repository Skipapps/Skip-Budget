/**
 * Groups dated rows into day sections.
 *
 * Every list in the app that shows dated money — receipts, bills,
 * subscriptions — reads the same way because they all come through here. Rows
 * with no date yet are not dropped; they collect under one trailing group, so
 * a bill waiting on a date is still visible rather than silently missing.
 */

export const NO_DATE = '';

export type DateGroup<T> = {
  /** yyyy-mm-dd, or NO_DATE for rows without one. */
  date: string;
  items: T[];
  /** Signed sum of the group, when an amount accessor was given. */
  total: number;
};

export function groupByDate<T>(
  items: T[],
  dateOf: (item: T) => string | null | undefined,
  options: {
    amountOf?: (item: T) => number;
    /** 'desc' puts the newest first — right for history. 'asc' for upcoming. */
    direction?: 'asc' | 'desc';
  } = {},
): DateGroup<T>[] {
  const { amountOf, direction = 'desc' } = options;

  const buckets = new Map<string, T[]>();
  for (const item of items) {
    const key = dateOf(item) || NO_DATE;
    const bucket = buckets.get(key);
    if (bucket) bucket.push(item);
    else buckets.set(key, [item]);
  }

  return [...buckets.entries()]
    .sort(([a], [b]) => {
      // Undated rows sort last whichever way the dated ones run.
      if (a === NO_DATE) return 1;
      if (b === NO_DATE) return -1;
      return direction === 'desc' ? b.localeCompare(a) : a.localeCompare(b);
    })
    .map(([date, groupItems]) => ({
      date,
      items: groupItems,
      total: amountOf ? groupItems.reduce((sum, item) => sum + amountOf(item), 0) : 0,
    }));
}

/**
 * The same day order as {@link groupByDate}'s `'asc'`, for a list that is not
 * grouped.
 *
 * Two screens render dated rows flat — the source ledger and the savings
 * months — and both need the house rule: oldest day first, today last, undated
 * rows trailing, and rows sharing a day left in their existing order (ties
 * broken by id, exactly as every sort in the app already does). Written once
 * here rather than twice inline, so it can be tested rather than eyeballed.
 *
 * Returns a new array; the input is not mutated, because both call sites hand
 * it data owned by a query cache.
 */
export function sortByDateAscending<T>(
  items: readonly T[],
  dateOf: (item: T) => string | null | undefined,
  idOf: (item: T) => string,
): T[] {
  return [...items].sort((a, b) => {
    const left = dateOf(a) || NO_DATE;
    const right = dateOf(b) || NO_DATE;
    if (left === right) return idOf(a).localeCompare(idOf(b));
    // Undated rows sort last, the same way they do when grouped.
    if (left === NO_DATE) return 1;
    if (right === NO_DATE) return -1;
    return left.localeCompare(right);
  });
}
