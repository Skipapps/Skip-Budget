import { fromCents, toCents } from '@/lib/money';
import { ofKind, type PaymentEntry, type PaymentKindFilter } from '@/lib/payment-entries';
import { matchesSearch } from '@/lib/search';

/**
 * Payment search: which payments answer a query and the filters, and how the answer is grouped by
 * year. Counts and totals are figures, so they take in every match; rows stop at the list floor,
 * as everywhere else on free.
 */

export type DateRangeChoice =
  'any' | 'thisMonth' | 'last3Months' | 'thisYear' | 'lastYear' | { from: string; to: string };

export type PaymentFilters = {
  range: DateRangeChoice;
  /** Inclusive, in whole cents; null for no bound. */
  minCents: number | null;
  maxCents: number | null;
  /** A card or account id; '' for payments with none set; null for every one. */
  source: string | null;
};

export const NO_FILTERS: PaymentFilters = Object.freeze({
  range: 'any',
  minCents: null,
  maxCents: null,
  source: null,
});

/** How many of the three filter rows (date range, amount, paid from) narrow the search. */
export function activeFilterCount(filters: PaymentFilters): number {
  return (
    (filters.range !== 'any' ? 1 : 0) +
    (filters.minCents !== null || filters.maxCents !== null ? 1 : 0) +
    (filters.source !== null ? 1 : 0)
  );
}

/** Whether to show results: for a query or a filter, never for neither. */
export function isSearching(query: string, filters: PaymentFilters): boolean {
  return query.trim() !== '' || activeFilterCount(filters) > 0;
}

const DAY = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

/** The 1st of the month `back` months before today's. */
function firstOfMonthsBack(today: string, back: number): string {
  const index = Number(today.slice(0, 4)) * 12 + Number(today.slice(5, 7)) - 1 - back;
  const year = Math.floor(index / 12);
  const month = index - year * 12 + 1;
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-01`;
}

/**
 * The days a choice covers, both ends inclusive; null is open. A picked day that is not a date is
 * open rather than a guess.
 */
export function rangeBounds(
  range: DateRangeChoice,
  today: string,
): { from: string | null; to: string | null } {
  const year = Number(today.slice(0, 4));
  switch (range) {
    case 'any':
      return { from: null, to: null };
    case 'thisMonth':
      return { from: firstOfMonthsBack(today, 0), to: today };
    case 'last3Months':
      return { from: firstOfMonthsBack(today, 2), to: today };
    case 'thisYear':
      return { from: `${year}-01-01`, to: today };
    case 'lastYear':
      return { from: `${year - 1}-01-01`, to: `${year - 1}-12-31` };
    default:
      return {
        from: DAY.test(range.from) ? range.from : null,
        to: DAY.test(range.to) ? range.to : null,
      };
  }
}

/** The name it went out under, or the plan's name now: a renamed plan is found by either. */
export function matchesPayment(
  payment: Pick<PaymentEntry, 'name' | 'planName'>,
  query: string,
): boolean {
  if (matchesSearch(payment.name, query)) return true;
  return payment.planName !== null && matchesSearch(payment.planName, query);
}

function byNewest(a: PaymentEntry, b: PaymentEntry): number {
  if (a.date !== b.date) return a.date < b.date ? 1 : -1;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

/** Every payment that answers the query, the tab and the filters, newest first. */
export function searchPayments<T extends PaymentEntry>(
  all: readonly T[],
  options: { query: string; kind: PaymentKindFilter; filters: PaymentFilters; today: string },
): T[] {
  const { query, kind, filters, today } = options;
  const { from, to } = rangeBounds(filters.range, today);
  const { minCents, maxCents, source } = filters;
  return ofKind(all, kind)
    .filter((payment) => {
      if (from !== null && payment.date < from) return false;
      if (to !== null && payment.date > to) return false;
      if (source !== null && payment.sourceId !== source) return false;
      const cents = toCents(payment.amount);
      if (minCents !== null && cents < minCents) return false;
      if (maxCents !== null && cents > maxCents) return false;
      return matchesPayment(payment, query);
    })
    .sort(byNewest);
}

/** Years drawn in full before the rest fold into one row. */
const FULL_YEARS = 2;

export type SearchYear<T> = {
  year: number;
  /** Every match that year, listed or not: a figure. */
  total: number;
  count: number;
  /** The ones listed: on or after the list floor, newest first. */
  rows: T[];
};

export type SearchGroups<T> = {
  /** Every match, listed or not. */
  count: number;
  total: number;
  /** Oldest and newest year with a match; null with none. */
  span: { first: number; last: number } | null;
  /** Years with a row to list, newest first: two, or all of them when `expanded`. */
  groups: SearchYear<T>[];
  /** Older years with rows to list, folded into one row; null with none, or when `expanded`. */
  folded: { newest: number; oldest: number; count: number } | null;
  /** Matches older than the list floor: the screen says they are kept, with Pro. */
  hiddenOlder: boolean;
  hiddenCount: number;
};

/** The matches as the results draw them: by year, newest first, rows stopping at `listFloor`. */
export function searchGroups<T extends PaymentEntry>(
  matches: readonly T[],
  listFloor: string,
  expanded: boolean,
): SearchGroups<T> {
  const years = new Map<number, { cents: number; count: number; rows: T[] }>();
  let cents = 0;
  let hiddenCount = 0;

  for (const payment of [...matches].sort(byNewest)) {
    const year = Number(payment.date.slice(0, 4));
    const amount = toCents(payment.amount);
    cents += amount;
    let bucket = years.get(year);
    if (!bucket) {
      bucket = { cents: 0, count: 0, rows: [] };
      years.set(year, bucket);
    }
    bucket.cents += amount;
    bucket.count += 1;
    if (payment.date >= listFloor) bucket.rows.push(payment);
    else hiddenCount += 1;
  }

  const newestFirst = [...years.keys()].sort((a, b) => b - a);
  const listed: SearchYear<T>[] = [];
  for (const year of newestFirst) {
    const bucket = years.get(year)!;
    if (bucket.rows.length === 0) continue;
    listed.push({ year, total: fromCents(bucket.cents), count: bucket.count, rows: bucket.rows });
  }

  const rest = expanded ? [] : listed.slice(FULL_YEARS);
  return {
    count: matches.length,
    total: fromCents(cents),
    span:
      newestFirst.length > 0
        ? { first: newestFirst[newestFirst.length - 1], last: newestFirst[0] }
        : null,
    groups: expanded ? listed : listed.slice(0, FULL_YEARS),
    folded:
      rest.length > 0
        ? {
            newest: rest[0].year,
            oldest: rest[rest.length - 1].year,
            count: rest.reduce((sum, year) => sum + year.rows.length, 0),
          }
        : null,
    hiddenOlder: hiddenCount > 0,
    hiddenCount,
  };
}
