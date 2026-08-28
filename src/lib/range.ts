/**
 * The four windows the dashboard and the transactions page can be read through.
 *
 * A money app that lists everything is unreadable — a year of a busy account is
 * thousands of rows and no answer. Bounding the view to a window turns the list
 * into something with a total at the top of it.
 *
 * Pure: the anchor date is an argument, never the clock.
 */

export const RANGES = [
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
  { value: 'year', label: 'Year' },
] as const;

export type RangeKey = (typeof RANGES)[number]['value'];

export type DateRange = {
  /** yyyy-mm-dd, inclusive. */
  from: string;
  /** yyyy-mm-dd, inclusive. */
  to: string;
};

function iso(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

/**
 * The window a key describes around a date.
 *
 * Weeks run Sunday to Saturday, matching the calendar elsewhere in the app —
 * WEEKDAY_INITIALS starts on S, and two different week shapes in one product is
 * the kind of inconsistency people notice without being able to name.
 */
export function rangeFor(key: RangeKey, anchor: Date): DateRange {
  const year = anchor.getFullYear();
  const month = anchor.getMonth();
  const day = anchor.getDate();

  switch (key) {
    case 'today':
      return { from: iso(anchor), to: iso(anchor) };

    case 'week': {
      const sunday = new Date(year, month, day - anchor.getDay());
      const saturday = new Date(year, month, day - anchor.getDay() + 6);
      return { from: iso(sunday), to: iso(saturday) };
    }

    case 'month':
      // Day 0 of the next month is the last day of this one, which sidesteps
      // every leap-year and 30/31 special case.
      return { from: iso(new Date(year, month, 1)), to: iso(new Date(year, month + 1, 0)) };

    case 'year':
      return { from: iso(new Date(year, 0, 1)), to: iso(new Date(year, 11, 31)) };
  }
}

export type Bucket = 'day' | 'week' | 'month';

/**
 * How finely to chop a window for a chart.
 *
 * A year as 365 bars is a smear on a phone; a week as 7 is readable. The bucket
 * is chosen so a chart lands between roughly 7 and 31 marks whatever the range.
 */
export function bucketFor(key: RangeKey): Bucket {
  if (key === 'year') return 'month';
  if (key === 'month') return 'week';
  return 'day';
}

/** Start of the bucket a date belongs to, as yyyy-mm-dd. */
export function bucketKey(date: string, bucket: Bucket): string {
  if (bucket === 'month') return `${date.slice(0, 7)}-01`;
  if (bucket === 'day') return date;

  const [year, month, day] = date.split('-').map(Number);
  const parsed = new Date(year, month - 1, day);
  const sunday = new Date(year, month - 1, day - parsed.getDay());
  return iso(sunday);
}

/** Every bucket start in a window, oldest first, including empty ones. */
export function bucketsIn(range: DateRange, bucket: Bucket): string[] {
  const [fromYear, fromMonth, fromDay] = range.from.split('-').map(Number);
  const keys: string[] = [];
  const cursor = new Date(fromYear, fromMonth - 1, fromDay);

  // Bounded: 400 covers a year of days with room to spare.
  for (let guard = 0; guard < 400; guard += 1) {
    const key = bucketKey(iso(cursor), bucket);
    if (key > range.to && keys.length > 0) break;
    if (!keys.includes(key)) keys.push(key);

    if (bucket === 'month') cursor.setMonth(cursor.getMonth() + 1);
    else if (bucket === 'week') cursor.setDate(cursor.getDate() + 7);
    else cursor.setDate(cursor.getDate() + 1);

    if (iso(cursor) > range.to) break;
  }

  return keys;
}
