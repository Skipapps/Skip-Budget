import { t } from '@/i18n';

/** The windows the dashboard and the transactions page are read through. Pure: the anchor is an argument. */
export const RANGES = [
  {
    value: 'today',
    get label() {
      return t('dates.today');
    },
  },
  {
    value: 'week',
    get label() {
      return t('dates.week');
    },
  },
  {
    value: 'month',
    get label() {
      return t('dates.month');
    },
  },
  {
    value: 'year',
    get label() {
      return t('dates.year');
    },
  },
] as const;

/** The same windows plus "All", which is history: it ends today, as a future charge is not a transaction yet. */
export const LEDGER_RANGES = [
  ...RANGES,
  {
    value: 'all',
    get label() {
      return t('dates.all');
    },
  },
] as const;

export type RangeKey = 'today' | 'week' | 'month' | 'year' | 'all';

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

/** The window a key describes around a date. Weeks run Sunday to Saturday, as the calendar does. */
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
      // Day 0 of the next month is this month's last day, which sidesteps leap-year and 30/31 cases.
      return { from: iso(new Date(year, month, 1)), to: iso(new Date(year, month + 1, 0)) };

    case 'year':
      return { from: iso(new Date(year, 0, 1)), to: iso(new Date(year, 11, 31)) };

    case 'all':
      // Bills and subscriptions clamp to their own start date, so the epoch cannot invent history.
      return { from: '1970-01-01', to: iso(anchor) };
  }
}

/**
 * The day after `day` through the last day of its month. On the last day it ends before it starts,
 * which every consumer reads as an empty window.
 */
export function restOfMonth(day: Date): DateRange {
  const next = new Date(day.getFullYear(), day.getMonth(), day.getDate() + 1);
  return { from: iso(next), to: rangeFor('month', day).to };
}

export type Bucket = 'day' | 'week' | 'month';

/** How finely to chop a window for a chart: roughly 7 to 31 marks whatever the range. */
export function bucketFor(key: RangeKey): Bucket {
  if (key === 'all' || key === 'year') return 'month';
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

  // Bounded: 400 covers a year of days.
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
