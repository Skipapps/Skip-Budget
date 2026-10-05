import { MONTHS_SHORT, WEEKDAYS_SHORT, toIsoDate } from '@/lib/date';
import type { DateRange } from '@/lib/range';

/**
 * Windows you step through, with fixed edges everybody agrees on (week Sunday to Saturday, calendar
 * month, January to December), unlike the dashboard's windows measured from today.
 */

export const PERIODS = [
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
  { value: 'year', label: 'Year' },
  { value: 'all', label: 'All' },
] as const;

export type PeriodKey = (typeof PERIODS)[number]['value'];

/** How far back the app keeps anything. Stepping stops here. */
export const HISTORY_YEARS = 7;

/** One division inside a period: a day, a week, or a month. */
export type Bucket = {
  key: string;
  /** Axis label. Short: a phone fits about six characters per bar. */
  label: string;
  from: string;
  to: string;
};

const startOfWeek = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate() - date.getDay());

export function periodRange(key: PeriodKey, anchor: Date): DateRange {
  const year = anchor.getFullYear();
  const month = anchor.getMonth();

  if (key === 'week') {
    const sunday = startOfWeek(anchor);
    const saturday = new Date(sunday.getFullYear(), sunday.getMonth(), sunday.getDate() + 6);
    return { from: toIsoDate(sunday), to: toIsoDate(saturday) };
  }

  if (key === 'month') {
    // Day 0 of the next month is this month's last day, which sidesteps leap-year and 30/31 cases.
    return {
      from: toIsoDate(new Date(year, month, 1)),
      to: toIsoDate(new Date(year, month + 1, 0)),
    };
  }

  if (key === 'year') {
    return { from: toIsoDate(new Date(year, 0, 1)), to: toIsoDate(new Date(year, 11, 31)) };
  }

  // The last HISTORY_YEARS years, ending with the anchor's year.
  return {
    from: toIsoDate(new Date(year - (HISTORY_YEARS - 1), 0, 1)),
    to: toIsoDate(new Date(year, 11, 31)),
  };
}

export function stepPeriod(key: PeriodKey, anchor: Date, delta: number): Date {
  const year = anchor.getFullYear();
  const month = anchor.getMonth();
  const day = anchor.getDate();

  if (key === 'week') return new Date(year, month, day + delta * 7);
  // Day 1 first: stepping from the 31st would otherwise skid past a short month.
  if (key === 'month') return new Date(year, month + delta, 1);
  if (key === 'year') return new Date(year + delta, month, 1);
  return anchor;
}

export function periodLabel(key: PeriodKey, anchor: Date): string {
  const range = periodRange(key, anchor);
  if (key === 'all') return `${range.from.slice(0, 4)} – ${range.to.slice(0, 4)}`;
  if (key === 'year') return String(anchor.getFullYear());
  if (key === 'month') return `${MONTHS_SHORT[anchor.getMonth()]} ${anchor.getFullYear()}`;

  const [, , fromDay] = range.from.split('-').map(Number);
  const [, toMonth, toDay] = range.to.split('-').map(Number);
  const fromMonth = Number(range.from.split('-')[1]);
  return fromMonth === toMonth
    ? `${fromDay} – ${toDay} ${MONTHS_SHORT[toMonth - 1]}`
    : `${fromDay} ${MONTHS_SHORT[fromMonth - 1]} – ${toDay} ${MONTHS_SHORT[toMonth - 1]}`;
}

/** The divisions a period is read in: a week as days, a month as weeks, a year as months, All as years. */
export function periodBuckets(key: PeriodKey, anchor: Date): Bucket[] {
  const range = periodRange(key, anchor);

  if (key === 'week') {
    const sunday = startOfWeek(anchor);
    return Array.from({ length: 7 }, (_, index) => {
      const day = new Date(sunday.getFullYear(), sunday.getMonth(), sunday.getDate() + index);
      const iso = toIsoDate(day);
      return {
        key: iso,
        label: `${day.getDate()} ${WEEKDAYS_SHORT[day.getDay()]}`,
        from: iso,
        to: iso,
      };
    });
  }

  if (key === 'month') {
    const buckets: Bucket[] = [];
    let cursor = startOfWeek(new Date(range.from + 'T00:00:00'));

    // Six weeks covers any month.
    for (let guard = 0; guard < 6; guard += 1) {
      const end = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + 6);
      // Clipped to the month, so the first and last bars hold only its own days.
      const from = toIsoDate(cursor) < range.from ? range.from : toIsoDate(cursor);
      const to = toIsoDate(end) > range.to ? range.to : toIsoDate(end);

      buckets.push({
        key: from,
        label: `${Number(from.slice(8))}–${Number(to.slice(8))}`,
        from,
        to,
      });

      if (to >= range.to) break;
      cursor = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + 7);
    }
    return buckets;
  }

  if (key === 'year') {
    return Array.from({ length: 12 }, (_, month) => {
      const from = toIsoDate(new Date(anchor.getFullYear(), month, 1));
      return {
        key: from,
        label: MONTHS_SHORT[month],
        from,
        to: toIsoDate(new Date(anchor.getFullYear(), month + 1, 0)),
      };
    });
  }

  const lastYear = anchor.getFullYear();
  return Array.from({ length: HISTORY_YEARS }, (_, index) => {
    const year = lastYear - (HISTORY_YEARS - 1) + index;
    return {
      key: String(year),
      label: String(year),
      from: toIsoDate(new Date(year, 0, 1)),
      to: toIsoDate(new Date(year, 11, 31)),
    };
  });
}

/** Whether stepping forward would land past the period containing today. */
export function isLatestPeriod(key: PeriodKey, anchor: Date, today: Date): boolean {
  // "All" has nowhere to step, so both ends read as reached and the arrows come up disabled.
  if (key === 'all') return true;
  return periodRange(key, anchor).to >= periodRange(key, today).to;
}

/** Whether stepping back would leave the years the app keeps. */
export function isEarliestPeriod(key: PeriodKey, anchor: Date, today: Date): boolean {
  if (key === 'all') return true;
  const floor = new Date(today.getFullYear() - HISTORY_YEARS, today.getMonth(), today.getDate());
  return periodRange(key, stepPeriod(key, anchor, -1)).to < toIsoDate(floor);
}
