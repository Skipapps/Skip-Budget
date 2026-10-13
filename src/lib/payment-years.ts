import { monthOf } from '@/lib/bill-month';
import { fromCents, toCents } from '@/lib/money';
import { PRO_HISTORY_YEARS } from '@/lib/wall';

/**
 * Payment history by year: the "Paid in {year}" card (total, count, average a month, the twelve
 * bars), the month groups under it, and the years list. Pure. Every figure is summed in whole cents
 * over the whole window it is given; only the rows a list draws stop at `listFloor`, so a free
 * account sees Pro's figures with fewer rows (the app's one history rule).
 */

/** What a figure needs of a payment. `PaymentEntry` is one. */
export type Paid = { date: string; amount: number };

function yearOf(date: string): number {
  return Number(date.slice(0, 4));
}

function yearStart(year: number): string {
  return `${String(year).padStart(4, '0')}-01-01`;
}

/** The first day the payment pages read: 1 Jan of the oldest of seven calendar years. */
export function paymentFloor(today: string): string {
  return yearStart(yearOf(today) - (PRO_HISTORY_YEARS - 1));
}

/** A year with no day on or after the list floor: its rows are Pro's, its figures everyone's. */
export function isProOnlyYear(year: number, listFloor: string): boolean {
  return `${String(year).padStart(4, '0')}-12-31` < listFloor;
}

/**
 * The months a year's total is shared over: from January, or from the month of the first payment
 * in the window when that falls in the year; to this month in this year, else December. A year
 * before the first payment, or after today, has none.
 */
export function avgMonths(year: number, today: string, first: string | null): number {
  const thisYear = yearOf(today);
  if (year > thisYear || !first || yearOf(first) > year) return 0;
  const from = yearOf(first) === year ? Number(first.slice(5, 7)) : 1;
  const to = year === thisYear ? Number(today.slice(5, 7)) : 12;
  return Math.max(0, to - from + 1);
}

/**
 * A total in cents shared over months, rounded half away from zero to the cent, as `toCents`
 * rounds. Integer arithmetic only: floor((2·|c| + m) / (2·m)) is |c| / m rounded half up.
 */
export function averageCents(totalCents: number, months: number): number {
  if (months <= 0) return 0;
  const rounded = Math.floor((2 * Math.abs(totalCents) + months) / (2 * months));
  return totalCents < 0 && rounded !== 0 ? -rounded : rounded;
}

export type YearSummary = {
  year: number;
  total: number;
  count: number;
  /** Total ÷ `months`, to the cent. */
  average: number;
  months: number;
  /** January to December, each month's total; months still to come are 0. */
  bars: number[];
  /** This month's bar on this year's card, else null. */
  highlight: number | null;
};

/**
 * One year's card. `all` is every payment of the kind shown in the window, hidden rows included:
 * the first of them decides where the average starts.
 */
export function yearSummary(all: readonly Paid[], year: number, today: string): YearSummary {
  const floor = paymentFloor(today);
  let first: string | null = null;
  const barCents = new Array<number>(12).fill(0);
  let count = 0;
  for (const row of all) {
    if (row.date > today || row.date < floor) continue;
    if (first === null || row.date < first) first = row.date;
    if (yearOf(row.date) !== year) continue;
    barCents[Number(row.date.slice(5, 7)) - 1] += toCents(row.amount);
    count += 1;
  }
  const totalCents = barCents.reduce((total, cents) => total + cents, 0);
  const months = avgMonths(year, today, first);
  return {
    year,
    total: fromCents(totalCents),
    count,
    average: fromCents(averageCents(totalCents, months)),
    months,
    bars: barCents.map(fromCents),
    highlight: year === yearOf(today) ? Number(today.slice(5, 7)) - 1 : null,
  };
}

export type MonthGroup<T extends Paid> = {
  /** yyyy-mm */
  month: string;
  /** The whole month, hidden rows included: a figure. */
  total: number;
  count: number;
  /** On or after `listFloor`, newest first. */
  rows: T[];
};

/**
 * A year's rows by month, newest month first. Only months with a row to draw are listed; a month the
 * floor cuts through keeps its whole total over the rows it shows.
 */
export function monthGroups<T extends Paid>(
  yearRows: readonly T[],
  listFloor: string,
): MonthGroup<T>[] {
  const byMonth = new Map<string, { cents: number; count: number; rows: T[] }>();
  for (const row of yearRows) {
    const month = monthOf(row.date);
    const group = byMonth.get(month) ?? { cents: 0, count: 0, rows: [] };
    group.cents += toCents(row.amount);
    group.count += 1;
    if (row.date >= listFloor) group.rows.push(row);
    byMonth.set(month, group);
  }
  return [...byMonth.entries()]
    .filter(([, group]) => group.rows.length > 0)
    .sort(([a], [b]) => (a < b ? 1 : a > b ? -1 : 0))
    .map(([month, group]) => ({
      month,
      total: fromCents(group.cents),
      count: group.count,
      // A stable sort: one day's rows keep the order they came in.
      rows: group.rows.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0)),
    }));
}

/** Whether a list stopped short of some of these rows, so the history notice belongs under it. */
export function hidesOlder(rows: readonly Paid[], listFloor: string): boolean {
  return rows.some((row) => row.date < listFloor);
}

export type YearsList = {
  /** The oldest year listed: "Paid since {first}". */
  first: number;
  total: number;
  count: number;
  /** Newest first: every year with a payment in the window, and this year always. */
  years: { year: number; total: number; count: number; proOnly: boolean }[];
};

/** Choose year and All years. `all` is the window's payments of the kind shown. */
export function yearsList(all: readonly Paid[], today: string, listFloor: string): YearsList {
  const floor = paymentFloor(today);
  const thisYear = yearOf(today);
  const byYear = new Map<number, { cents: number; count: number }>([
    [thisYear, { cents: 0, count: 0 }],
  ]);
  for (const row of all) {
    if (row.date > today || row.date < floor) continue;
    const year = yearOf(row.date);
    const held = byYear.get(year) ?? { cents: 0, count: 0 };
    held.cents += toCents(row.amount);
    held.count += 1;
    byYear.set(year, held);
  }
  const years = [...byYear.entries()]
    .sort(([a], [b]) => b - a)
    .map(([year, held]) => ({
      year,
      total: fromCents(held.cents),
      count: held.count,
      proOnly: isProOnlyYear(year, listFloor),
    }));
  const cents = [...byYear.values()].reduce((total, held) => total + held.cents, 0);
  return {
    first: years[years.length - 1].year,
    total: fromCents(cents),
    count: years.reduce((total, year) => total + year.count, 0),
    years,
  };
}
