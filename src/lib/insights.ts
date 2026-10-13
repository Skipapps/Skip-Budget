import type { LedgerEntry, ReceiptRow, SubscriptionRow } from '@/api/queries';
import { monthInitial } from '@/components/payments/month-bars';
import { monthBounds, monthOf } from '@/lib/bill-month';
import { fromCents, toCents } from '@/lib/money';
import { periodBuckets, type Bucket } from '@/lib/period';
import type { DateRange } from '@/lib/range';
import { currentBillCategory } from '@/lib/retired-bill-categories';

/**
 * The Insights page's figures. Pure: dates are yyyy-mm-dd text compared as text, and every sum is
 * taken in whole cents and turned back into a decimal once, so the page shows what the ledger holds
 * to the cent. Spending is read from the ledger's `allEntries`, never the free 90-day `entries`.
 */

/**
 * What the What goes out card shows. A null month or year is the current one, so a page left open
 * across the 1st moves on by itself.
 */
export type InsightsPeriod = {
  mode: 'month' | 'year';
  /** yyyy-mm picked on Choose month; null is this month. */
  month: string | null;
  /** Picked on Choose year; null is this year. */
  year: number | null;
};

export const CURRENT_PERIOD: InsightsPeriod = { mode: 'month', month: null, year: null };

const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;
const DAY = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

const yearOf = (date: string) => Number(date.slice(0, 4));
const pad4 = (year: number) => String(year).padStart(4, '0');

/** The month shown in Month mode, yyyy-mm. A malformed pick reads as this month. */
export function shownMonth(period: InsightsPeriod, today: string): string {
  return period.month && MONTH.test(period.month) ? period.month : monthOf(today);
}

/** The year shown in Year mode. A malformed pick reads as this year. */
export function shownYear(period: InsightsPeriod, today: string): number {
  const { year } = period;
  return year !== null && Number.isInteger(year) && year >= 1000 && year <= 9999
    ? year
    : yearOf(today);
}

/** Whether the card reads "This month" / "This year" rather than naming the period. */
export function isCurrentPeriod(period: InsightsPeriod, today: string): boolean {
  return period.mode === 'month'
    ? shownMonth(period, today) === monthOf(today)
    : shownYear(period, today) === yearOf(today);
}

function wholePeriod(period: InsightsPeriod, today: string): DateRange {
  if (period.mode === 'month') return monthBounds(shownMonth(period, today));
  const year = pad4(shownYear(period, today));
  return { from: `${year}-01-01`, to: `${year}-12-31` };
}

/**
 * The window the period's ledger is read over: the calendar month, or 1 Jan to 31 Dec, ending at
 * today. The page is a record, not a forecast: a bill due later this month is not spent yet.
 */
export function insightsRange(period: InsightsPeriod, today: string): DateRange {
  const whole = wholePeriod(period, today);
  return { from: whole.from, to: whole.to < today ? whole.to : today };
}

/**
 * The chart's bars across the whole period, days still to come included, so the axis never
 * shrinks as the month goes on. Month: the calendar's Sunday-to-Saturday weeks cut to the month
 * (1–3, 4–10 … in Oct 2026). Year: twelve months, labelled by initial.
 */
export function insightsBuckets(period: InsightsPeriod, today: string): Bucket[] {
  const { from } = wholePeriod(period, today);
  const anchor = new Date(yearOf(from), Number(from.slice(5, 7)) - 1, 1);
  if (period.mode === 'month') return periodBuckets('month', anchor);
  return periodBuckets('year', anchor).map((bucket, index) => ({
    ...bucket,
    label: monthInitial(index),
  }));
}

/**
 * The bar drawn dark in Year mode, 0 to 11: the picked month when it falls in the year shown, else
 * this month in this year. Null for another year with no month picked in it.
 */
export function yearHighlight(period: InsightsPeriod, today: string): number | null {
  const year = shownYear(period, today);
  if (period.month && MONTH.test(period.month) && yearOf(period.month) === year) {
    return Number(period.month.slice(5, 7)) - 1;
  }
  return year === yearOf(today) ? Number(today.slice(5, 7)) - 1 : null;
}

/** What Choose month and Choose year list. */
export type PeriodChoices = {
  /** yyyy-mm, newest first. */
  months: string[];
  /** Newest first. */
  years: number[];
  /** `months` under their year, newest first: Choose month's headings. */
  monthsByYear: { year: number; months: string[] }[];
};

/**
 * Months and years with any money on record, plus the current ones, from the floor
 * (`paymentFloor(today)`) to today. Pass the dates of receipts, charges, pay and payoffs; anything
 * after today is left out, so a receipt dated ahead never offers a month with nothing in it yet.
 */
export function periodChoices(
  dates: Iterable<string>,
  today: string,
  floor: string,
): PeriodChoices {
  const months = new Set<string>([monthOf(today)]);
  for (const date of dates) {
    // Date columns only: a timestamp's first ten characters are its UTC day, not the person's.
    if (typeof date !== 'string' || !DAY.test(date) || date < floor || date > today) continue;
    months.add(monthOf(date));
  }

  const sorted = [...months].sort((a, b) => b.localeCompare(a));
  const monthsByYear: PeriodChoices['monthsByYear'] = [];
  for (const month of sorted) {
    const year = yearOf(month);
    const group = monthsByYear[monthsByYear.length - 1];
    if (group && group.year === year) group.months.push(month);
    else monthsByYear.push({ year, months: [month] });
  }

  return { months: sorted, years: monthsByYear.map((group) => group.year), monthsByYear };
}

const BIG_TWO = BigInt(2);
const BIG_HUNDRED = BigInt(100);

/**
 * `partCents` as a whole percent of `wholeCents`, half up: 159,999 of 1,000,000 is 16. BigInt
 * because 200 × a large figure in cents passes 2^53, where a float can tip a near-half. Null when
 * there is no whole to share. A share above 100 is kept: spending can pass income.
 */
export function percentOfCents(partCents: number, wholeCents: number): number | null {
  if (!Number.isSafeInteger(wholeCents) || wholeCents <= 0) return null;
  const part = Number.isSafeInteger(partCents) ? Math.max(0, partCents) : 0;
  const whole = BigInt(wholeCents);
  return Number((BIG_TWO * BIG_HUNDRED * BigInt(part) + whole) / (BIG_TWO * whole));
}

/**
 * Whether a share rounded to 0% though something is there ($49.99 of $10,000), so the page says
 * "less than 1%" instead of a 0% that reads as nothing.
 */
export function belowOnePercent(partCents: number, percent: number | null): boolean {
  return percent === 0 && partCents > 0;
}

/** `percentOfCents` for two amounts as the app holds them: 1,599.99 of 10,000.00 is 16. */
export function wholePercent(part: number, whole: number): number | null {
  return percentOfCents(toCents(part), toCents(whole));
}

/** What the spending figures read of a ledger entry. */
export type SpendEntry = Pick<LedgerEntry, 'amount' | 'date' | 'kind'>;

type SpendKind = 'receipt' | 'bill' | 'subscription';

const SPENDING: ReadonlySet<string> = new Set<SpendKind>(['receipt', 'bill', 'subscription']);

/** Spending is money out of a spending kind: pay never counts, whatever its sign. */
function spentCents(entry: SpendEntry): number {
  return entry.amount < 0 && SPENDING.has(entry.kind) ? Math.abs(toCents(entry.amount)) : 0;
}

const inside = (date: string, range: DateRange | undefined) =>
  !range || (date >= range.from && date <= range.to);

/** The What goes out card's rows. */
export type SpendSummary = {
  receipts: number;
  /** Loan payoffs included, as Home's Monthly bills tile counts them. */
  bills: number;
  subscriptions: number;
  /** "Recorded in this period": the three rows together, to the cent. */
  total: number;
  /** Entries summed. */
  count: number;
};

function summaryCents(entries: readonly SpendEntry[], range?: DateRange) {
  const cents: Record<SpendKind, number> = { receipt: 0, bill: 0, subscription: 0 };
  let count = 0;
  for (const entry of entries) {
    const spent = spentCents(entry);
    if (spent === 0 || !inside(entry.date, range)) continue;
    cents[entry.kind as SpendKind] += spent;
    count += 1;
  }
  return { ...cents, total: cents.receipt + cents.bill + cents.subscription, count };
}

/**
 * Spending by kind over the period's ledger (`useLedger(insightsRange(...)).allEntries`). `range`
 * narrows it further when one ledger covers more than the figure wants.
 */
export function spendSummary(entries: readonly SpendEntry[], range?: DateRange): SpendSummary {
  const cents = summaryCents(entries, range);
  return {
    receipts: fromCents(cents.receipt),
    bills: fromCents(cents.bill),
    subscriptions: fromCents(cents.subscription),
    total: fromCents(cents.total),
    count: cents.count,
  };
}

/** A chart bar and the spending dated in it. */
export type SpendBucket = Bucket & { amount: number };

/** Spending per bar, each summed in cents: the bars add up to the card's total. */
export function spendByBucket(
  entries: readonly SpendEntry[],
  buckets: readonly Bucket[],
): SpendBucket[] {
  return buckets.map((bucket) => {
    let cents = 0;
    for (const entry of entries) {
      if (entry.date >= bucket.from && entry.date <= bucket.to) cents += spentCents(entry);
    }
    return { ...bucket, amount: fromCents(cents) };
  });
}

/** The plum card: always the current calendar month, whatever period is picked below it. */
export type HeroFigures = {
  /**
   * Pay dated in this calendar month: recorded, still to come, and one-offs. Weekly pay of $1,000
   * is $5,000 in a five-Friday month, unlike What comes in's every-month average.
   */
  in: number;
  /** Spending dated from the 1st to today: What goes out's figure for this month. */
  out: number;
  /** in − out; below zero once more went out than came in. */
  left: number;
  /** left < 0: the card says "over" with the amount unsigned. */
  over: boolean;
  /** out as a whole percent of in; null with no pay this month, when the line is hidden. */
  spentPercent: number | null;
  /** Something was spent, yet `spentPercent` rounded to 0. */
  belowOnePercent: boolean;
};

/**
 * From the ledger over the whole current month (`useLedger(monthBounds(monthOf(today)), today)
 * .allEntries`): the whole month is read so pay still to come counts, while spending stops at today.
 */
export function heroFigures(entries: readonly SpendEntry[], today: string): HeroFigures {
  const month = monthBounds(monthOf(today));
  let inCents = 0;
  for (const entry of entries) {
    if (entry.kind !== 'income' || entry.amount <= 0 || !inside(entry.date, month)) continue;
    inCents += toCents(entry.amount);
  }
  const outCents = summaryCents(entries, { from: month.from, to: today }).total;
  const leftCents = inCents - outCents;
  const spentPercent = percentOfCents(outCents, inCents);
  return {
    in: fromCents(inCents),
    out: fromCents(outCents),
    left: fromCents(leftCents),
    over: leftCents < 0,
    spentPercent,
    belowOnePercent: belowOnePercent(outCents, spentPercent),
  };
}

/**
 * Category ids by ledger entry: the ledger carries a category only on bills, so a receipt's and a
 * subscription's come from their own rows. Build with `categoryLookups`.
 */
export type CategoryLookups = {
  /** By ledger entry id (`receipt-<id>`). */
  receipts: ReadonlyMap<string, string>;
  /** By subscription id, which is the entry's `planId`. */
  subscriptions: ReadonlyMap<string, string>;
};

/** From `useReceipts().data` and `useSubscriptions().data`. */
export function categoryLookups(
  receipts: readonly Pick<ReceiptRow, 'id' | 'category_id'>[],
  subscriptions: readonly Pick<SubscriptionRow, 'id' | 'category_id'>[],
): CategoryLookups {
  return {
    // The ledger's own id for a receipt; the F7 fixture builds a real ledger to hold the two together.
    receipts: new Map(receipts.map((row) => [`receipt-${row.id}`, row.category_id])),
    subscriptions: new Map(subscriptions.map((row) => [row.id, row.category_id])),
  };
}

/** A Where it goes row. `id` is the stored category id; the page names it. */
export type CategoryTotal = { id: string; amount: number; count: number };

/** What the category and merchant figures read of a ledger entry. */
export type GroupEntry = SpendEntry &
  Pick<LedgerEntry, 'id' | 'label' | 'planId' | 'categoryId' | 'iconId' | 'domain' | 'logoHidden'>;

function categoryOf(entry: GroupEntry, lookups: CategoryLookups): string {
  if (entry.kind === 'bill') return currentBillCategory(entry.categoryId || 'other');
  if (entry.kind === 'receipt') return lookups.receipts.get(entry.id) || 'other';
  return lookups.subscriptions.get(entry.planId ?? '') || 'other';
}

/**
 * Spending by category, biggest first (equal amounts by id, so the order never flickers), the
 * first `limit`. A row whose category cannot be found, or was never set, is Other. A bill filed
 * under a retired category counts under the one it became.
 */
export function categoryTotals(
  entries: readonly GroupEntry[],
  lookups: CategoryLookups,
  limit = 6,
): CategoryTotal[] {
  const totals = new Map<string, { cents: number; count: number }>();
  for (const entry of entries) {
    const spent = spentCents(entry);
    if (spent === 0) continue;
    const id = categoryOf(entry, lookups);
    const found = totals.get(id) ?? { cents: 0, count: 0 };
    found.cents += spent;
    found.count += 1;
    totals.set(id, found);
  }
  return [...totals.entries()]
    .sort(([leftId, left], [rightId, right]) =>
      left.cents !== right.cents ? right.cents - left.cents : leftId.localeCompare(rightId),
    )
    .slice(0, limit)
    .map(([id, { cents, count }]) => ({ id, amount: fromCents(cents), count }));
}

/** A Where you spend most row. */
export type MerchantTotal = {
  name: string;
  amount: number;
  /** "N times". */
  count: number;
  /** The first row's (the newest): a bill draws its category mark, the rest a brand mark. */
  kind: LedgerEntry['kind'];
  /** Any row's website: one row that knows the brand settles it for the store. */
  domain: string | null;
  /** Every row chose letters. Letters show only when this holds and no row has a website. */
  logoHidden: boolean;
  categoryId: string | null;
  iconId: string | null;
};

/**
 * Spending by name (the entry's label, exactly), the first `limit`, by amount; equal amounts by
 * times paid, then by name. The logo fields follow the page's existing rules.
 */
export function merchantTotals(entries: readonly GroupEntry[], limit = 5): MerchantTotal[] {
  const byName = new Map<string, MerchantTotal & { cents: number }>();
  for (const entry of entries) {
    const spent = spentCents(entry);
    if (spent === 0) continue;
    const found = byName.get(entry.label);
    if (found) {
      found.cents += spent;
      found.count += 1;
      found.domain = found.domain ?? entry.domain ?? null;
      found.logoHidden = found.logoHidden && Boolean(entry.logoHidden);
      found.categoryId = found.categoryId ?? entry.categoryId ?? null;
      found.iconId = found.iconId ?? entry.iconId ?? null;
    } else {
      byName.set(entry.label, {
        name: entry.label,
        cents: spent,
        amount: 0,
        count: 1,
        kind: entry.kind,
        domain: entry.domain ?? null,
        logoHidden: Boolean(entry.logoHidden),
        categoryId: entry.categoryId ?? null,
        iconId: entry.iconId ?? null,
      });
    }
  }
  return [...byName.values()]
    .sort((left, right) =>
      left.cents !== right.cents
        ? right.cents - left.cents
        : left.count !== right.count
          ? right.count - left.count
          : left.name.localeCompare(right.name),
    )
    .slice(0, limit)
    .map(({ cents, ...merchant }) => ({ ...merchant, amount: fromCents(cents) }));
}
