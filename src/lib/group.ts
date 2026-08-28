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
