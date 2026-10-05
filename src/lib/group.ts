/** Key of the trailing group for rows with no date yet; they are not dropped. */
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
    /** 'desc' puts the newest first (history); 'asc' the soonest first (upcoming). */
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
 * The day order of {@link groupByDate}'s `'asc'` for a flat list: oldest first, undated trailing,
 * ties broken by id. Returns a new array; the input is owned by a query cache.
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
    if (left === NO_DATE) return 1;
    if (right === NO_DATE) return -1;
    return left.localeCompare(right);
  });
}
