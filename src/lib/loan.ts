/**
 * Amortisation maths for fixed-rate, fixed-term loans. The aim is a schedule that matches the
 * lender's own statement to the cent:
 *
 * 1. The accrual convention is a choice (`AccrualBasis`). A US auto or personal lender accrues
 *    daily, so a 31-day period costs more than a 28-day one; a mortgage servicer or UK personal
 *    lender charges monthly rests (one twelfth of the rate), so February costs the same as March.
 * 2. The gap between funding and the first payment is rarely one month (fund 30 Nov, pay first
 *    14 Jan is a 45-day opening period), so payment one carries more interest than payment two.
 * 3. Balances are integer cents and interest is rounded to the cent once per period when it posts,
 *    half up (see `@/lib/money`), so nothing drifts over 360 payments.
 * 4. The final payment absorbs the accumulated rounding so the balance closes at exactly zero.
 *
 * The Reg Z APR lives in `@/lib/apr`, as it is a disclosure rather than a schedule.
 */

import { fromCents, roundMoney, toCents, wholeCents } from '@/lib/money';

/**
 * How a lender turns a date range into an interest fraction. 'actual/365' is the US
 * installment-loan default; '30/360' counts every month as 30 days and is exactly the flat
 * "APR / 12" model.
 */
export type DayCountBasis = 'actual/365' | 'actual/360' | '30/360';

/**
 * Everything the engine can price. 'monthly' is monthly rests: each scheduled period costs the
 * nominal annual rate over twelve, applied whole, as the annuity formula assumes.
 *
 * It differs from '30/360' only in an odd first period: 'monthly' charges the leftover days as
 * simple per diem interest on actual/365, '30/360' as thirtieths of a month. Over whole months the
 * two are identical, so a whole-month 'monthly' loan can be stored as '30/360' without moving a cent.
 */
export type AccrualBasis = DayCountBasis | 'monthly';

const DAYS_IN_YEAR: Record<DayCountBasis, number> = {
  'actual/365': 365,
  'actual/360': 360,
  '30/360': 360,
};

const dayCountOf = (basis: AccrualBasis): DayCountBasis =>
  basis === 'monthly' ? 'actual/365' : basis;

const MS_PER_DAY = 86_400_000;

/** A local calendar date pinned to UTC midnight, so DST cannot bend a day count. */
const utcDay = (date: Date) => Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());

/** A yyyy-mm-dd column as local midnight, not UTC — dates here have no time zone. */
const fromIsoDate = (value: string) => new Date(`${value}T00:00:00`);

/** Days from one date to another under the given convention. */
export function daysBetween(from: Date, to: Date, basis: DayCountBasis = 'actual/365'): number {
  if (basis !== '30/360') return Math.round((utcDay(to) - utcDay(from)) / MS_PER_DAY);

  // US 30/360: clamp the start to the 30th, and only pull a 31st back to the 30th when the start was
  // already there, or Jan 30 to Jan 31 would count as zero days.
  const start = Math.min(from.getDate(), 30);
  const end = to.getDate() === 31 && start >= 30 ? 30 : to.getDate();
  return (
    360 * (to.getFullYear() - from.getFullYear()) +
    30 * (to.getMonth() - from.getMonth()) +
    (end - start)
  );
}

/**
 * The same day of the month, some months away, without drifting. The day is clamped to the target
 * month's length from the ORIGINAL day, so 31 Jan + 1 month is 28 Feb but + 2 months is 31 March.
 * Stepping month by month would drag every payment after one February onto the 28th.
 */
export function addMonths(date: Date, months: number): Date {
  const moved = new Date(date);
  moved.setDate(1);
  moved.setMonth(date.getMonth() + months);
  const lastOfMonth = new Date(moved.getFullYear(), moved.getMonth() + 1, 0).getDate();
  moved.setDate(Math.min(date.getDate(), lastOfMonth));
  return moved;
}

/**
 * A span as whole months plus leftover days, the shape a monthly-rest lender bills in. Months are
 * counted first: 30 Nov to 14 Jan is one month and fifteen days.
 */
export function monthsAndDaysBetween(from: Date, to: Date): { months: number; days: number } {
  if (utcDay(to) <= utcDay(from)) return { months: 0, days: 0 };

  let months = (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth());
  if (months < 0) months = 0;
  // The month arithmetic can overshoot by one when `to`'s day of month is earlier than `from`'s.
  while (months > 0 && utcDay(addMonths(from, months)) > utcDay(to)) months -= 1;

  return { months, days: daysBetween(addMonths(from, months), to) };
}

/**
 * The fraction for one SCHEDULED period. Same as `interestFraction` except under monthly rests,
 * where a scheduled period is one rest whatever the calendar did to the due dates (28 Feb to
 * 30 Mar is a month and two days, but billing those days would charge thirteen rests a year). The
 * odd days of the OPENING period are a real stub and are still charged.
 */
function scheduledFraction(
  from: Date,
  to: Date,
  annualRatePercent: number,
  basis: AccrualBasis,
  opening: boolean,
): number {
  if (basis === 'monthly' && !opening) {
    return annualRatePercent > 0 ? annualRatePercent / 100 / 12 : 0;
  }
  return interestFraction(from, to, annualRatePercent, basis);
}

/**
 * The share of a year's interest a balance earns between two dates, under any convention. Returned
 * unrounded: this is a rate, not a posting.
 */
export function interestFraction(
  from: Date,
  to: Date,
  annualRatePercent: number,
  basis: AccrualBasis = 'actual/365',
): number {
  if (annualRatePercent <= 0) return 0;
  const rate = annualRatePercent / 100;

  if (basis === 'monthly') {
    const { months, days } = monthsAndDaysBetween(from, to);
    // Whole months at the monthly rest, the stub at the per diem rate.
    return (months * rate) / 12 + (days * rate) / DAYS_IN_YEAR['actual/365'];
  }

  const days = daysBetween(from, to, basis);
  return days <= 0 ? 0 : (days * rate) / DAYS_IN_YEAR[basis];
}

/**
 * Interest posts as an exact fraction, not a float product: in cents,
 *
 *     balance¢ × rate% × weight / (100 × per)
 *
 * where weight/per is the share of a year (days/365, days/360, or for monthly rests
 * (365·months + 12·days)/4380, which is months/12 + days/365 on one denominator), rounded half up
 * once. Floating point decides the half on 12 significant digits (`toCents`), so from postings of
 * about $100 up a value a hair under a half cent can round the wrong way: 146,049.4999997¢ is
 * $1,460.49, which the float path posted as $1,460.50. That moved roughly one typical loan in
 * 20,000 (one large loan in 3,000) by a cent from that row on; the exact figure is the lender's.
 *
 * The rate is held as whole billionths of a percent. A rate with more decimals than that (a
 * solved one) has no exact form, and posts through floating point as before.
 */
const RATE_UNITS_PER_PERCENT = 1e9;
const BIG_ZERO = BigInt(0);
const BIG_TWO = BigInt(2);
const BIG_POSTING_SCALE = BigInt(100 * RATE_UNITS_PER_PERCENT);

function exactRate(annualRatePercent: number): bigint | null {
  if (!(annualRatePercent > 0)) return null;
  const units = Number((annualRatePercent * RATE_UNITS_PER_PERCENT).toPrecision(15));
  return Number.isSafeInteger(units) ? BigInt(units) : null;
}

/** The denominator of a year's share under each convention. */
const SHARE_PER: Record<AccrualBasis, number> = {
  'actual/365': 365,
  'actual/360': 360,
  '30/360': 360,
  monthly: 4380,
};

/** The numerator over `SHARE_PER`, mirroring `interestFraction` and `scheduledFraction` exactly. */
function shareWeight(from: Date, to: Date, basis: AccrualBasis, wholeRest: boolean): number {
  if (basis === 'monthly') {
    if (wholeRest) return 365;
    const { months, days } = monthsAndDaysBetween(from, to);
    return 365 * months + 12 * days;
  }
  return Math.max(0, daysBetween(from, to, basis));
}

/** Σ balance¢ × weight, times the rate, as cents rounded half up. Never negative. */
function postExact(weighted: bigint, rate: bigint, basis: AccrualBasis): number {
  if (weighted <= BIG_ZERO) return 0;
  const numerator = weighted * rate;
  const denominator = BIG_POSTING_SCALE * BigInt(SHARE_PER[basis]);
  return Number((BIG_TWO * numerator + denominator) / (BIG_TWO * denominator));
}

/** One posting in cents: exact when the rate has an exact form, floating point when it has not. */
function postingCents(
  balanceCents: number,
  weight: number,
  annualRatePercent: number,
  basis: AccrualBasis,
): number {
  const rate = exactRate(annualRatePercent);
  if (rate !== null) return postExact(BigInt(balanceCents) * BigInt(weight), rate, basis);
  if (!(annualRatePercent > 0) || balanceCents <= 0) return 0;
  return toCents((fromCents(balanceCents) * (annualRatePercent / 100) * weight) / SHARE_PER[basis]);
}

/**
 * The least level payment at which the balance can never rise after the first payment: it covers
 * the costliest scheduled period's interest (a 31-day month on daily accrual, 31/360 on
 * actual/360, one rest on monthly rests) on the most the loan can owe from then on, which is the
 * amount borrowed or what the first payment leaves, whichever is more. Below it a shortfall
 * compounds; at or above it every balance stays within that amount, so no figure can run away.
 *
 * The opening period may cost more than the payment (its odd days are a stub). That is why the
 * balance it leaves counts, and why the condition is solved, not read off one month's interest:
 * the least m in cents with  posting(max(P, P + opening − m), costliest) ≤ m,  which only gets
 * easier as m grows, so it is settled a cent at a time from the closed-form estimate.
 */
export function steadyPayment(terms: LoanTerms): number {
  if (terms.principal <= 0 || terms.months <= 0 || !(terms.annualRatePercent > 0)) return 0;

  const basis = terms.basis ?? 'actual/365';
  const funded = fundingOf(terms);
  const dates = dueDatesOf(terms);

  let costliest = 0;
  for (let index = 1; index < dates.length; index += 1) {
    costliest = Math.max(
      costliest,
      shareWeight(dates[index - 1], dates[index], basis, basis === 'monthly'),
    );
  }
  // A single payment settles everything; there is no later period to keep up with.
  if (costliest === 0) return 0;

  const principal = toCents(terms.principal);
  const rate = terms.annualRatePercent;
  const opening = postingCents(principal, shareWeight(funded, dates[0], basis, false), rate, basis);
  const covers = (cents: number) =>
    postingCents(Math.max(principal, principal + opening - cents), costliest, rate, basis) <= cents;

  // m ≥ (P + opening)·q / (1 + q) and m ≥ P·q, where q is the costliest period's share of the rate.
  const share = ((rate / 100) * costliest) / SHARE_PER[basis];
  const estimate = Math.max(
    1,
    Math.ceil(Math.max(principal * share, ((principal + opening) * share) / (1 + share))),
  );

  // The estimate is a cent or two out at most, but the exact cent is found by bisection on the
  // monotone condition, so a poor estimate costs a few steps, never a walk of millions.
  let low = estimate - 1; // does not cover, once widened
  let high = estimate; // covers, once widened
  for (let step = 1; !covers(high); step *= 2) high += step;
  for (let step = 1; low >= 1 && covers(low); step *= 2) low = Math.max(0, low - step);
  while (high - low > 1) {
    const middle = Math.floor((low + high) / 2);
    if (covers(middle)) high = middle;
    else low = middle;
  }
  return fromCents(high);
}

/** Interest earned on a balance over a span of days, rounded to the cent as it posts. */
export function accruedInterest(
  balance: number,
  annualRatePercent: number,
  days: number,
  basis: DayCountBasis = 'actual/365',
): number {
  if (balance <= 0 || days <= 0 || annualRatePercent <= 0) return 0;
  const rate = exactRate(annualRatePercent);
  if (rate !== null && Number.isInteger(days)) {
    return fromCents(postExact(BigInt(toCents(balance)) * BigInt(days), rate, basis));
  }
  return roundMoney((balance * (annualRatePercent / 100) * days) / DAYS_IN_YEAR[basis]);
}

export type LoanTerms = {
  /** Amount financed — the note, not the sticker price. */
  principal: number;
  annualRatePercent: number;
  months: number;
  firstPaymentOn: Date;
  /**
   * The day of the month payments fall on, 1–31, clamped to each month's end. Only payments after
   * the first follow it; without it they follow the first payment's own day. It matters when the
   * first payment was itself clamped: a day-31 loan first due 28 Feb is next due 31 Mar, not 28 Mar.
   */
  paymentDay?: number;
  /** When interest starts running. Defaults to one month before the first payment. */
  fundedOn?: Date;
  basis?: AccrualBasis;
  /**
   * The lender's actual payment, when known from a statement. Pass it whenever you have it: lenders
   * round the solved payment by house rules, so a contract can sit a cent or two off the derived
   * figure, and every later balance inherits the gap.
   */
  payment?: number;
  /**
   * A principal balance read off a statement, and the date it was true. Under daily accrual a late
   * payment's extra interest rides the balance for the rest of the term, so a schedule rebuilt from
   * origination alone drifts cents to dollars from the lender's. Anchoring makes everything from
   * that date forward exact; only the reconstructed past stays an estimate.
   */
  statement?: { on: Date; principal: number };
  /** Anything paid above the contract payment. */
  extra?: Prepayment;
  /**
   * Single payments the person changed, by 1-based payment number: the contract payment for that
   * date in place of the level one. Validate through `@/lib/loan-overrides`; the engine only skips
   * what would break the schedule (see `runSchedule`).
   */
  paymentOverrides?: PaymentOverrideMap;
  /**
   * Money paid on top of the schedule, full or partial, in the order it was paid. Part of the
   * contract, unlike `extra`: see `runSchedule` for how each posts. Check new ones with
   * `checkPayoff` (`@/lib/loan-payoff`).
   */
  payoffs?: readonly LoanPayoff[];
};

/** Payment number to amount. A plain object, so it stores as JSON and survives a route param. */
export type PaymentOverrideMap = Readonly<Record<number, number>>;

/** A payoff as paid: the day and the amount, in whole cents. */
export type LoanPayoff = {
  /** The stored row's id; absent for one that is not on file (a route param, a preview). */
  id?: string;
  on: Date;
  amount: number;
};

/** How a payoff posted. */
export type PayoffPosting = {
  /** The stored row's id, or null. */
  id: string | null;
  /** yyyy-mm-dd */
  on: string;
  /** As paid. More than interest + principal only when it paid more than was owed. */
  amount: number;
  /** Interest it covered: what built up since the last payment or payoff. */
  interest: number;
  /** What came off the balance. */
  principal: number;
  /** Principal still owed after it. */
  balance: number;
  /** It cleared the loan: the schedule ends on its date, with no row after it. */
  full: boolean;
  /** Scheduled payments made before it; one due the same day posts first. */
  afterPayments: number;
};

/** A one-off overpayment: an amount, and the day it lands. */
type LumpSum = {
  on: Date;
  amount: number;
};

/** Money paid on top of the contract payment, all against principal. It shortens the term, not the payment. */
type Prepayment = {
  /** Added to every scheduled payment. */
  monthly?: number;
  /** One-off amounts on given dates. */
  lumpSums?: readonly LumpSum[];
};

/**
 * The changed payments the engine can take, in cents: a whole payment number and a positive amount
 * in whole cents. The term's last payment always settles what is left, so it is never changed.
 */
function overrideCents(map: PaymentOverrideMap | undefined, months: number): Map<number, number> {
  const cents = new Map<number, number>();
  for (const [key, amount] of Object.entries(map ?? {})) {
    const number = Number(key);
    const value = wholeCents(amount);
    if (Number.isInteger(number) && number >= 1 && number < months && value !== null && value > 0) {
      cents.set(number, value);
    }
  }
  return cents;
}

/**
 * Changed payments read back from storage (a jsonb object) or a route param (its JSON text). Keys
 * are payment numbers, values amounts; anything else is left out, and nothing left is undefined.
 */
export function readPaymentOverrides(value: unknown): PaymentOverrideMap | undefined {
  let parsed: unknown = value;
  if (typeof value === 'string') {
    try {
      parsed = JSON.parse(value);
    } catch {
      return undefined;
    }
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return undefined;

  const read: Record<number, number> = {};
  for (const [key, amount] of Object.entries(parsed as Record<string, unknown>)) {
    const cents = typeof amount === 'number' ? wholeCents(amount) : null;
    if (/^[1-9]\d*$/.test(key) && cents !== null && cents > 0) read[Number(key)] = fromCents(cents);
  }
  return Object.keys(read).length > 0 ? read : undefined;
}

/** A day of the month a loan can be paid on. */
export function isPaymentDay(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 31;
}

/** `date` moved by whole months, on `day` clamped to that month's end. */
function onDayOfMonth(date: Date, months: number, day: number): Date {
  const moved = new Date(date);
  moved.setDate(1); // Set the day last, or a 31st rolls into the next month.
  moved.setMonth(date.getMonth() + months);
  const lastOfMonth = new Date(moved.getFullYear(), moved.getMonth() + 1, 0).getDate();
  moved.setDate(Math.min(day, lastOfMonth));
  return moved;
}

const anchorDay = (firstPaymentOn: Date, paymentDay: number | undefined) =>
  isPaymentDay(paymentDay) ? paymentDay : firstPaymentOn.getDate();

/** A month before the first payment, on the payment day. */
function impliedFunding(firstPaymentOn: Date, paymentDay?: number): Date {
  return onDayOfMonth(firstPaymentOn, -1, anchorDay(firstPaymentOn, paymentDay));
}

/**
 * Every due date: the first payment as given, then one a month on the payment day (the first
 * payment's day when none is given), clamped to each month's end.
 */
export function paymentDates(firstPaymentOn: Date, months: number, paymentDay?: number): Date[] {
  const anchor = anchorDay(firstPaymentOn, paymentDay);
  const dates: Date[] = [];

  for (let index = 0; index < months; index += 1) {
    dates.push(
      onDayOfMonth(firstPaymentOn, index, index === 0 ? firstPaymentOn.getDate() : anchor),
    );
  }

  return dates;
}

function dueDatesOf(terms: Omit<LoanTerms, 'payment'>): Date[] {
  return paymentDates(terms.firstPaymentOn, terms.months, terms.paymentDay);
}

function fundingOf(terms: Omit<LoanTerms, 'payment'>): Date {
  return terms.fundedOn ?? impliedFunding(terms.firstPaymentOn, terms.paymentDay);
}

export type ScheduleRow = {
  /** 1-based payment number. */
  number: number;
  /** yyyy-mm-dd */
  date: string;
  /** Days this payment covers. */
  days: number;
  /** Everything paid on this date: the contract payment plus any overpayment. */
  payment: number;
  interest: number;
  /** Everything that came off the balance, overpayments included. */
  principal: number;
  /** The part of `principal` that was paid above the contract payment. */
  extra: number;
  /** What is still owed after this payment. */
  balance: number;
  /**
   * What would close the loan on this date: the balance brought forward (after any lump sum) plus
   * this period's interest. A payment at or above it is the last one.
   */
  owed: number;
  /** True when the person changed this payment and the schedule took it. */
  overridden: boolean;
  /** True for rows reconstructed from origination, before any statement anchor. */
  estimated: boolean;
};

export type Amortisation = {
  /** The level payment, whether supplied or solved for. */
  payment: number;
  /** The last one, which absorbs the rounding and may differ from the rest. */
  finalPayment: number;
  rows: ScheduleRow[];
  totalPaid: number;
  totalInterest: number;
  /** Interest as a share of everything paid, 0–1. */
  interestShare: number;
  basis: AccrualBasis;
  fundedOn: Date;
  /**
   * yyyy-mm-dd the loan ends: its last payment, which overpayments and payoffs can bring forward,
   * or the payoff that cleared it.
   */
  payoffOn: string | null;
  /** The payoffs the loan reached, in the order they posted. */
  payoffs: PayoffPosting[];
};

/** A yyyy-mm-dd for a local date. */
const isoOf = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

/** A payoff as the engine posts it, in cents. `quote` stands for "whatever is owed then". */
type PayoffEvent = { id: string | null; on: Date; cents: number; quote: boolean };

/**
 * The payoffs the engine can take (a valid date, a positive amount in whole cents), by date. The
 * sort is stable, so payoffs paid the same day post in the order given, and a quote comes last.
 */
function payoffEvents(payoffs: readonly LoanPayoff[] | undefined, quoteOn?: Date): PayoffEvent[] {
  const events: PayoffEvent[] = [];
  for (const payoff of payoffs ?? []) {
    const cents = wholeCents(payoff.amount);
    if (cents !== null && cents > 0 && !Number.isNaN(payoff.on.getTime())) {
      events.push({ id: payoff.id ?? null, on: payoff.on, cents, quote: false });
    }
  }
  if (quoteOn) events.push({ id: null, on: quoteOn, cents: 0, quote: true });
  return events.sort((a, b) => utcDay(a.on) - utcDay(b.on));
}

/**
 * The weight of one piece of a period a payoff splits. On daily bases it is the days, as for a
 * lump sum. On monthly rests it is per diem on actual/365 (12 × days over the 4380 denominator),
 * as a lender's payoff figure counts the days since the last posting, so a payoff for exactly the
 * quoted amount clears the loan.
 */
function splitWeight(from: Date, to: Date, basis: AccrualBasis): number {
  return basis === 'monthly'
    ? 12 * Math.max(0, daysBetween(from, to))
    : Math.max(0, daysBetween(from, to, basis));
}

function splitFraction(from: Date, to: Date, annualRatePercent: number, basis: AccrualBasis) {
  return interestFraction(from, to, annualRatePercent, dayCountOf(basis));
}

/** What `payoffQuote` asks of a run: the balance and interest owed on its day, and since when. */
type QuotedPosting = { principalCents: number; interestCents: number; since: Date };

/**
 * Walks the schedule at a fixed payment, in integer cents. The order inside a period is the order a
 * servicer posts in:
 *
 * 1. A lump sum credits on the day it arrives (daily-accrual bases only), so the rest of the period
 *    accrues on the smaller balance.
 * 2. A payoff posts the interest built up since the last payment or payoff, rounded to the cent,
 *    then pays that interest first and the rest off principal. What it leaves of that interest is
 *    paid by the next payment, before its own. One that clears the balance ends the schedule.
 * 3. Interest posts, rounded to the cent once per period even if a lump sum split it.
 * 4. The contract payment (or the person's changed payment for that date) covers that interest
 *    first and the rest reduces principal. A level payment smaller than the interest leaves the
 *    shortfall on the balance, which is what `solvePayment`'s recursion assumes.
 * 5. Any recurring overpayment then comes off principal.
 *
 * A payoff dated on a due date posts after that day's payment. Under 'monthly' rests a lump sum
 * applies at the due date of the period it falls in. The balance never goes below zero: an
 * overshooting payment is trimmed to what is owed.
 *
 * `quoteOn` adds a payoff of whatever is owed that day, after any paid that day, and returns it as
 * `quote` (null when the loan is already paid off by then).
 */
function runSchedule(terms: LoanTerms, payment: number, quoteOn?: Date) {
  const basis = terms.basis ?? 'actual/365';
  const funded = fundingOf(terms);
  const dates = dueDatesOf(terms);
  const paymentCents = toCents(payment);
  const monthlyExtraCents = Math.max(0, toCents(terms.extra?.monthly ?? 0));
  const changedCents = overrideCents(terms.paymentOverrides, terms.months);
  const rate = exactRate(terms.annualRatePercent);

  const creditsOnTheDay = basis !== 'monthly';
  const lumpSums = (terms.extra?.lumpSums ?? [])
    .map((lump) => ({ on: lump.on, cents: Math.max(0, toCents(lump.amount)) }))
    .filter((lump) => lump.cents > 0)
    .sort((a, b) => utcDay(a.on) - utcDay(b.on));
  const payoffs = payoffEvents(terms.payoffs, quoteOn);

  // The last payment on or before the statement date is where the real balance takes over.
  const anchor = terms.statement;
  const anchorIndex = anchor
    ? dates.reduce((found, due, index) => (utcDay(due) <= utcDay(anchor.on) ? index : found), -1)
    : -1;

  const rows: ScheduleRow[] = [];
  const postings: PayoffPosting[] = [];
  let quote: QuotedPosting | null = null;
  let balanceCents = toCents(terms.principal);
  let previous = funded;
  let nextPayoff = 0;
  let cleared = false;

  for (let index = 0; index < dates.length; index += 1) {
    const due = dates[index];
    const days = daysBetween(previous, due, dayCountOf(basis));

    // A lump sum dated before funding is honoured at funding, not dropped.
    const inPeriod = lumpSums.filter((lump) =>
      index === 0
        ? utcDay(lump.on) <= utcDay(due)
        : utcDay(lump.on) > utcDay(previous) && utcDay(lump.on) <= utcDay(due),
    );

    // Payoffs before this due date; those dated on the last one come after its payment.
    const payoffsInPeriod: PayoffEvent[] = [];
    while (nextPayoff < payoffs.length && utcDay(payoffs[nextPayoff].on) < utcDay(due)) {
      payoffsInPeriod.push(payoffs[nextPayoff]);
      nextPayoff += 1;
    }

    let creditedCents = 0;
    // One form per loan: exact when the rate has an exact form, floating point when it has not.
    let interest = 0;
    let weighted = BIG_ZERO;
    let cursor = previous;
    let split = false;
    // Interest a payoff posted but did not cover; the next payment pays it first.
    let carriedCents = 0;
    let postedOn = previous;

    const events: ({ on: Date; cents: number } | PayoffEvent)[] = creditsOnTheDay
      ? [...inPeriod]
      : [];
    if (payoffsInPeriod.length > 0) {
      // Stable, so a lump sum paid the same day as a payoff credits first.
      events.push(...payoffsInPeriod);
      events.sort((a, b) => utcDay(a.on) - utcDay(b.on));
    }

    for (const event of events) {
      const at = utcDay(event.on) < utcDay(previous) ? previous : event.on;
      if (rate !== null) {
        weighted += BigInt(balanceCents) * BigInt(splitWeight(cursor, at, basis));
      } else {
        interest +=
          fromCents(balanceCents) * splitFraction(cursor, at, terms.annualRatePercent, basis);
      }
      cursor = at;
      split = true;

      if (!('quote' in event)) {
        const applied = Math.min(event.cents, balanceCents);
        balanceCents -= applied;
        creditedCents += applied;
        continue;
      }

      const owedInterestCents =
        carriedCents + (rate !== null ? postExact(weighted, rate, basis) : toCents(interest));
      weighted = BIG_ZERO;
      interest = 0;

      if (event.quote) {
        quote = { principalCents: balanceCents, interestCents: owedInterestCents, since: postedOn };
        balanceCents = 0;
        carriedCents = 0;
        cleared = true;
        break;
      }

      const interestPaidCents = Math.min(event.cents, owedInterestCents);
      const principalPaidCents = Math.min(event.cents - interestPaidCents, balanceCents);
      carriedCents = owedInterestCents - interestPaidCents;
      balanceCents -= principalPaidCents;
      postedOn = at;
      postings.push({
        id: event.id,
        on: isoOf(event.on),
        amount: fromCents(event.cents),
        interest: fromCents(interestPaidCents),
        principal: fromCents(principalPaidCents),
        balance: fromCents(balanceCents),
        full: balanceCents <= 0,
        afterPayments: rows.length,
      });
      if (balanceCents <= 0) {
        cleared = true;
        break;
      }
    }

    if (cleared) break;

    // An unsplit period is charged as one scheduled period; the tail of a split one is a span of days.
    if (rate !== null) {
      weighted +=
        BigInt(balanceCents) *
        BigInt(
          split
            ? splitWeight(cursor, due, basis)
            : shareWeight(previous, due, basis, basis === 'monthly' && index > 0),
        );
    } else {
      interest +=
        fromCents(balanceCents) *
        (split
          ? splitFraction(cursor, due, terms.annualRatePercent, basis)
          : scheduledFraction(previous, due, terms.annualRatePercent, basis, index === 0));
    }
    const interestCents =
      carriedCents + (rate !== null ? postExact(weighted, rate, basis) : toCents(interest));

    if (!creditsOnTheDay) {
      for (const lump of inPeriod) {
        const applied = Math.min(lump.cents, balanceCents);
        balanceCents -= applied;
        creditedCents += applied;
      }
    }

    const owedCents = balanceCents + interestCents;

    // The last payment settles whatever is left; an overshooting payment is trimmed. A changed
    // payment that would leave more of the period's interest unpaid than the level payment does is
    // not taken, so a change can never make the balance grow where the contract would not.
    const last = index === dates.length - 1;
    const asked = changedCents.get(index + 1);
    const taken = asked !== undefined && !last && asked >= Math.min(interestCents, paymentCents);
    let principalCents = (taken ? asked : paymentCents) - interestCents;
    if (last || principalCents > balanceCents) principalCents = balanceCents;
    // A change that pays what the level payment would have paid anyway is no change.
    const overridden =
      taken && principalCents !== Math.min(paymentCents - interestCents, balanceCents);
    balanceCents -= principalCents;

    const extraCents = Math.min(monthlyExtraCents, balanceCents);
    balanceCents -= extraCents;

    const offBalanceCents = principalCents + extraCents + creditedCents;
    const paidCents = offBalanceCents + interestCents;

    // Snap to what the lender says is owed, then carry on from there. A payoff before it is
    // already in the lender's figure.
    if (anchor && index === anchorIndex) balanceCents = toCents(anchor.principal);

    rows.push({
      number: index + 1,
      date: isoOf(due),
      days,
      payment: fromCents(paidCents),
      interest: fromCents(interestCents),
      principal: fromCents(offBalanceCents),
      extra: fromCents(extraCents + creditedCents),
      balance: fromCents(Math.max(0, balanceCents)),
      owed: fromCents(owedCents),
      overridden,
      estimated: index <= anchorIndex,
    });

    previous = due;

    // Overpayments end the loan early; no zero-payment rows are emitted.
    if (balanceCents <= 0) break;
  }

  return {
    rows,
    basis,
    fundedOn: funded,
    shortfallCents: balanceCents,
    payoffs: postings,
    quote,
  };
}

/**
 * The level payment that closes the loan exactly on its final due date. The annuity formula
 * assumes equal periods, which daily interest breaks, but the balance recursion
 *
 *     Bₖ = Bₖ₋₁·(1 + r·dₖ) − payment
 *
 * is linear in the payment, so it unrolls into a closed form (no search, which matters as the
 * calculator recomputes on every slider drag):
 *
 *     payment = P · ∏ₖ(1 + r·dₖ) / Σₖ ∏ⱼ₌ₖ₊₁(1 + r·dⱼ)
 *
 * A 0% loan needs no special case: every factor is 1, so the answer is principal / months.
 *
 * The payment is rounded half up, as lenders publish it, and the last payment absorbs the cents.
 * A cent of payment moves the last one by `Σ` cents, though, and on a loan that barely shrinks
 * (60% over 20 years) that is more than a whole payment, so rounding down can leave a balloon of
 * thousands, even billions. There, when the last payment would be more than two regular ones, the
 * payment rounds up a cent, as a lender's would; the loan may then end a little early.
 */
export function solvePayment(terms: Omit<LoanTerms, 'payment'>): number {
  if (terms.principal <= 0 || terms.months <= 0) return 0;

  const basis = terms.basis ?? 'actual/365';
  const funded = fundingOf(terms);
  const dates = dueDatesOf(terms);

  const growth = dates.map((due, index) => {
    const from = index === 0 ? funded : dates[index - 1];
    return 1 + scheduledFraction(from, due, terms.annualRatePercent, basis, index === 0);
  });

  // Walk backwards: `carried` is the growth from period k to the end.
  let sum = 0;
  let carried = 1;
  for (let index = growth.length - 1; index >= 0; index -= 1) {
    sum += carried;
    carried *= growth[index];
  }

  if (!(sum > 0)) return 0;
  const rounded = toCents((terms.principal * carried) / sum);
  if (sum <= rounded) return fromCents(rounded);

  const plain = {
    ...terms,
    extra: undefined,
    statement: undefined,
    paymentOverrides: undefined,
    payoffs: undefined,
  };
  const { rows } = runSchedule(plain, fromCents(rounded));
  if (toCents(rows[rows.length - 1].payment) <= 2 * rounded) return fromCents(rounded);
  // One cent up always suffices: it is at least half a cent above the exact payment, and that half
  // cent, carried to the end by the same Σ, outweighs every half cent of interest rounding at once.
  return fromCents(rounded + 1);
}

export function amortise(terms: LoanTerms): Amortisation {
  if (terms.principal <= 0 || terms.months <= 0) {
    return {
      payment: 0,
      finalPayment: 0,
      rows: [],
      totalPaid: 0,
      totalInterest: 0,
      interestShare: 0,
      basis: terms.basis ?? 'actual/365',
      fundedOn: fundingOf(terms),
      payoffOn: null,
      payoffs: [],
    };
  }

  const payment = terms.payment ?? solvePayment(terms);
  const { rows, basis, fundedOn, payoffs } = runSchedule(terms, payment);

  let totalPaidCents = rows.reduce((sum, row) => sum + toCents(row.payment), 0);
  let totalInterestCents = rows.reduce((sum, row) => sum + toCents(row.interest), 0);
  for (const payoff of payoffs) {
    totalPaidCents += toCents(payoff.interest) + toCents(payoff.principal);
    totalInterestCents += toCents(payoff.interest);
  }

  const last = rows[rows.length - 1];
  const cleared = payoffs.find((payoff) => payoff.full);

  return {
    payment,
    // A payoff before the first payment leaves no rows.
    finalPayment: last ? last.payment : 0,
    rows,
    totalPaid: fromCents(totalPaidCents),
    totalInterest: fromCents(totalInterestCents),
    interestShare: totalPaidCents > 0 ? totalInterestCents / totalPaidCents : 0,
    basis,
    fundedOn,
    payoffOn: cleared ? cleared.on : last ? last.date : null,
    payoffs,
  };
}

export type PrepaymentComparison = {
  /** The loan as contracted, with nothing extra paid. */
  base: Amortisation;
  /** The same loan with the overpayments applied. */
  accelerated: Amortisation;
  /** Interest the overpayments avoid, in money. */
  interestSaved: number;
  /** Payments the overpayments remove from the end of the term. */
  monthsSaved: number;
};

/**
 * What paying extra is worth. Both schedules run at the SAME contract payment (solved from the
 * original terms): "this loan with and without the extra", not a re-solved shorter loan, which would
 * always report a smaller saving. The saving is interest avoided, not money made.
 */
export function comparePrepayment(terms: LoanTerms): PrepaymentComparison {
  const base = amortise({ ...terms, extra: undefined });
  const hasExtra = (terms.extra?.monthly ?? 0) > 0 || (terms.extra?.lumpSums?.length ?? 0) > 0;
  const accelerated = hasExtra ? amortise({ ...terms, payment: base.payment }) : base;

  return {
    base,
    accelerated,
    interestSaved: roundMoney(base.totalInterest - accelerated.totalInterest),
    monthsSaved: base.rows.length - accelerated.rows.length,
  };
}

export type PayoffQuote = {
  /** Principal still owed, before today's unbilled interest. */
  principal: number;
  /** Interest since the last payment — the "accrued this period" line. */
  accruedInterest: number;
  /** What it would take to close the loan today. */
  payoff: number;
  daysAccrued: number;
  /** When `accruedInterest` started running: the last payment or payoff, or the funding date. */
  accruedSince: Date;
  lastPaymentOn: Date | null;
  nextPaymentOn: Date | null;
  nextPaymentAmount: number;
  /** Interest posted in the calendar year of `asOf`. */
  interestPaidThisYear: number;
  /** Interest posted in the year before that. */
  interestPaidLastYear: number;
  /** Interest posted by the most recent payment. */
  interestPaidLastPeriod: number;
};

/**
 * What the lender's app shows on any given day. A payoff is not the schedule balance: it also
 * includes the interest running since the last payment posted (14 days into a period on $28.7k at
 * 8.14% is $89.60 not yet billed). `payoff` is exactly what clears the loan that day, after any
 * payment or payoff dated that day: the engine posts it as a payoff of that amount, so the two can
 * never disagree. `asOf` is a date or a yyyy-mm-dd.
 */
export function payoffQuote(terms: LoanTerms, asOf: Date | string): PayoffQuote {
  const day = typeof asOf === 'string' ? fromIsoDate(asOf) : asOf;
  const schedule = amortise(terms);
  // A payoff is for one particular day, so even a monthly-rest loan is quoted with per diem interest
  // from the last posting, as a servicer's payoff letter does.
  const basis = dayCountOf(schedule.basis);
  const asOfDay = utcDay(day);

  const paid = schedule.rows.filter((row) => utcDay(fromIsoDate(row.date)) <= asOfDay);
  const upcoming = schedule.rows.filter((row) => utcDay(fromIsoDate(row.date)) > asOfDay);
  const payoffsPaid = schedule.payoffs.filter(
    (payoff) => utcDay(fromIsoDate(payoff.on)) <= asOfDay,
  );

  const last = paid[paid.length - 1] ?? null;
  const next = upcoming[0] ?? null;
  const priced = schedule.rows.length > 0 || schedule.payoffs.length > 0;

  const quoted =
    priced && !Number.isNaN(asOfDay) ? runSchedule(terms, schedule.payment, day).quote : null;

  // Without a quote the loan is paid off by then (or there is nothing to price): what is left is
  // nothing, and the days run from its last posting.
  const lastPayoff = payoffsPaid[payoffsPaid.length - 1];
  const lastPosted =
    lastPayoff && (!last || lastPayoff.afterPayments >= last.number) ? lastPayoff.on : last?.date;
  const principalCents = quoted ? quoted.principalCents : priced ? 0 : toCents(terms.principal);
  const accruedCents = quoted ? quoted.interestCents : 0;
  const since = quoted ? quoted.since : lastPosted ? fromIsoDate(lastPosted) : schedule.fundedOn;
  const daysAccrued = Math.max(0, daysBetween(since, day, basis));

  const year = day.getFullYear();
  const interestIn = (target: number) =>
    fromCents(
      paid
        .filter((row) => Number(row.date.slice(0, 4)) === target)
        .reduce((sum, row) => sum + toCents(row.interest), 0) +
        payoffsPaid
          .filter((payoff) => Number(payoff.on.slice(0, 4)) === target)
          .reduce((sum, payoff) => sum + toCents(payoff.interest), 0),
    );

  return {
    principal: fromCents(principalCents),
    accruedInterest: fromCents(accruedCents),
    payoff: fromCents(principalCents + accruedCents),
    daysAccrued,
    accruedSince: since,
    lastPaymentOn: last ? fromIsoDate(last.date) : null,
    nextPaymentOn: next ? fromIsoDate(next.date) : null,
    nextPaymentAmount: next ? next.payment : 0,
    interestPaidThisYear: interestIn(year),
    interestPaidLastYear: interestIn(year - 1),
    interestPaidLastPeriod: last ? last.interest : 0,
  };
}

export type LoanBreakdown = {
  monthlyPayment: number;
  totalPaid: number;
  totalInterest: number;
  /** Interest as a share of everything paid, 0–1. */
  interestShare: number;
};

/**
 * The quoted cost of a loan on the flat "APR / 12" convention, M = P · r(1+r)^n / ((1+r)^n - 1).
 * It is what rate tables print, not what a US installment lender bills (use `amortise` with a real
 * funding date). A 0% rate would divide by zero, so it is handled separately.
 */
export function calculateLoan(
  principal: number,
  annualRatePercent: number,
  months: number,
): LoanBreakdown {
  if (principal <= 0 || months <= 0) {
    return { monthlyPayment: 0, totalPaid: 0, totalInterest: 0, interestShare: 0 };
  }

  const monthlyRate = annualRatePercent / 100 / 12;

  const monthlyPayment =
    monthlyRate === 0
      ? principal / months
      : (principal * monthlyRate * Math.pow(1 + monthlyRate, months)) /
        (Math.pow(1 + monthlyRate, months) - 1);

  const totalPaid = monthlyPayment * months;
  const totalInterest = totalPaid - principal;

  return {
    monthlyPayment: roundMoney(monthlyPayment),
    totalPaid: roundMoney(totalPaid),
    totalInterest: roundMoney(totalInterest),
    interestShare: totalPaid > 0 ? totalInterest / totalPaid : 0,
  };
}

/** The term's last due date, which payments above the contract can come before. */
export function payoffDate(start: Date, months: number, paymentDay?: number): Date {
  const dates = paymentDates(start, months, paymentDay);
  return dates[dates.length - 1] ?? new Date(start);
}

/** "3 yrs 6 mo" — clearer than a raw month count once terms get long. */
export function formatTerm(months: number): string {
  const years = Math.floor(months / 12);
  const remainder = months % 12;
  if (years === 0) return `${remainder} mo`;
  if (remainder === 0) return `${years} yr${years === 1 ? '' : 's'}`;
  return `${years} yr${years === 1 ? '' : 's'} ${remainder} mo`;
}

/** @deprecated Prefer `ScheduleRow`, which carries the period's day count. */
export type AmortisationRow = ScheduleRow;

/**
 * Where every payment goes.
 *
 * @deprecated Prefer `amortise`, which takes a funding date and a day-count basis. This keeps the
 * flat 30/360 model so existing callers are not silently repriced.
 */
export function amortisationSchedule(
  principal: number,
  annualRatePercent: number,
  months: number,
  firstPaymentOn: Date,
): ScheduleRow[] {
  if (principal <= 0 || months <= 0) return [];

  return amortise({
    principal,
    annualRatePercent,
    months,
    firstPaymentOn,
    basis: '30/360',
    payment: calculateLoan(principal, annualRatePercent, months).monthlyPayment,
  }).rows;
}

/**
 * Payments by year, with each year's interest and principal. Payoffs count in the year they were
 * paid, interest built up the year before included, so the years add up to the schedule's totals.
 */
export function scheduleByYear(rows: ScheduleRow[], payoffs: readonly PayoffPosting[] = []) {
  const years = new Map<string, { payments: ScheduleRow[]; payoffs: PayoffPosting[] }>();
  const yearOf = (year: string) => {
    let entry = years.get(year);
    if (!entry) {
      entry = { payments: [], payoffs: [] };
      years.set(year, entry);
    }
    return entry;
  };
  for (const row of rows) yearOf(row.date.slice(0, 4)).payments.push(row);
  for (const payoff of payoffs) yearOf(payoff.on.slice(0, 4)).payoffs.push(payoff);

  return [...years.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([year, { payments, payoffs: paid }]) => ({
      year,
      payments,
      payoffs: paid,
      interest: fromCents(
        payments.reduce((sum, row) => sum + toCents(row.interest), 0) +
          paid.reduce((sum, payoff) => sum + toCents(payoff.interest), 0),
      ),
      principal: fromCents(
        payments.reduce((sum, row) => sum + toCents(row.principal), 0) +
          paid.reduce((sum, payoff) => sum + toCents(payoff.principal), 0),
      ),
    }));
}

/** A loan as the database holds it. Structural, so the data layer stays out of here. */
export type StoredLoan = {
  principal: number;
  annual_rate: number;
  term_months: number;
  monthly_payment: number;
  first_payment_on: string | null;
  funded_on: string | null;
  day_count_basis: AccrualBasis;
  statement_on: string | null;
  statement_principal: number | null;
  /** The jsonb of changed payments; optional so a row read before the column existed still fits. */
  payment_overrides?: unknown;
  /** 1–31, or null when payments follow the first payment's own day; optional as above. */
  payment_day?: number | null;
  /** Its `loan_payoffs` rows, embedded; optional as above, and absent or null for none. */
  payoffs?: readonly StoredPayoff[] | null;
};

/** A `loan_payoffs` row, as much of it as the schedule needs. */
export type StoredPayoff = {
  id: string;
  /** yyyy-mm-dd */
  paid_on: string;
  /** numeric(14,2), which PostgREST may send as text. */
  amount: number | string;
  /** Orders payoffs paid the same day. */
  created_at?: string | null;
};

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Stored payoffs as the engine takes them, by date and then by when they were recorded, so the
 * same day's payoffs post in the order they were made. Rows that are not a real day and a positive
 * whole-cent amount are left out; nothing left is undefined.
 */
export function readStoredPayoffs(rows: unknown): LoanPayoff[] | undefined {
  if (!Array.isArray(rows)) return undefined;
  const read: (LoanPayoff & { recorded: string })[] = [];
  for (const row of rows as Partial<Record<keyof StoredPayoff, unknown>>[]) {
    if (!row || typeof row !== 'object') continue;
    const { id, paid_on: paidOn, amount, created_at: createdAt } = row;
    if (typeof paidOn !== 'string' || !ISO_DAY.test(paidOn)) continue;
    const on = fromIsoDate(paidOn);
    const cents =
      typeof amount === 'number' || typeof amount === 'string' ? wholeCents(Number(amount)) : null;
    if (Number.isNaN(on.getTime()) || isoOf(on) !== paidOn || cents === null || cents <= 0)
      continue;
    read.push({
      ...(typeof id === 'string' ? { id } : {}),
      on,
      amount: fromCents(cents),
      recorded: typeof createdAt === 'string' ? createdAt : '',
    });
  }
  read.sort(
    (a, b) =>
      utcDay(a.on) - utcDay(b.on) ||
      (a.recorded < b.recorded ? -1 : a.recorded > b.recorded ? 1 : 0) ||
      ((a.id ?? '') < (b.id ?? '') ? -1 : (a.id ?? '') > (b.id ?? '') ? 1 : 0),
  );
  const payoffs = read.map(({ recorded: _recorded, ...payoff }) => payoff);
  return payoffs.length > 0 ? payoffs : undefined;
}

/**
 * Terms for a loan already on file. The stored monthly payment is passed through as the contract
 * payment, not re-solved, since re-deriving it reintroduces the cent of difference. Returns null
 * when the row cannot build a schedule.
 */
export function termsFromStored(loan: StoredLoan, fallbackFirstPayment?: string): LoanTerms | null {
  const first = loan.first_payment_on ?? fallbackFirstPayment;
  if (!first || loan.principal <= 0 || loan.term_months <= 0) return null;

  return {
    principal: loan.principal,
    annualRatePercent: loan.annual_rate,
    months: loan.term_months,
    firstPaymentOn: fromIsoDate(first),
    paymentDay: isPaymentDay(loan.payment_day) ? loan.payment_day : undefined,
    fundedOn: loan.funded_on ? fromIsoDate(loan.funded_on) : undefined,
    basis: loan.day_count_basis,
    payment: loan.monthly_payment > 0 ? loan.monthly_payment : undefined,
    statement:
      loan.statement_on && loan.statement_principal !== null
        ? { on: fromIsoDate(loan.statement_on), principal: loan.statement_principal }
        : undefined,
    paymentOverrides: readPaymentOverrides(loan.payment_overrides),
    payoffs: readStoredPayoffs(loan.payoffs),
  };
}
