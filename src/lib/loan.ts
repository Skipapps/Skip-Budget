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

import { fromCents, roundMoney, toCents } from '@/lib/money';

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

/** Interest earned on a balance over a span of days, rounded to the cent as it posts. */
export function accruedInterest(
  balance: number,
  annualRatePercent: number,
  days: number,
  basis: DayCountBasis = 'actual/365',
): number {
  if (balance <= 0 || days <= 0 || annualRatePercent <= 0) return 0;
  return roundMoney((balance * (annualRatePercent / 100) * days) / DAYS_IN_YEAR[basis]);
}

export type LoanTerms = {
  /** Amount financed — the note, not the sticker price. */
  principal: number;
  annualRatePercent: number;
  months: number;
  firstPaymentOn: Date;
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
};

/** A one-off overpayment: an amount, and the day it lands. */
export type LumpSum = {
  on: Date;
  amount: number;
};

/** Money paid on top of the contract payment, all against principal. It shortens the term, not the payment. */
export type Prepayment = {
  /** Added to every scheduled payment. */
  monthly?: number;
  /** One-off amounts on given dates. */
  lumpSums?: readonly LumpSum[];
};

function impliedFunding(firstPaymentOn: Date): Date {
  const funded = new Date(firstPaymentOn);
  funded.setMonth(funded.getMonth() - 1);
  if (funded.getDate() !== firstPaymentOn.getDate()) funded.setDate(0);
  return funded;
}

export function paymentDates(firstPaymentOn: Date, months: number): Date[] {
  const anchor = firstPaymentOn.getDate();
  const dates: Date[] = [];

  for (let index = 0; index < months; index += 1) {
    const due = new Date(firstPaymentOn);
    due.setDate(1); // Set the day last, or a 31st anchor rolls into next month.
    due.setMonth(firstPaymentOn.getMonth() + index);
    const lastOfMonth = new Date(due.getFullYear(), due.getMonth() + 1, 0).getDate();
    due.setDate(Math.min(anchor, lastOfMonth));
    dates.push(due);
  }

  return dates;
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
  /** yyyy-mm-dd of the last payment, which overpayments can bring forward. */
  payoffOn: string | null;
};

/**
 * Walks the schedule at a fixed payment, in integer cents. The order inside a period is the order a
 * servicer posts in:
 *
 * 1. A lump sum credits on the day it arrives (daily-accrual bases only), so the rest of the period
 *    accrues on the smaller balance.
 * 2. Interest posts, rounded to the cent once per period even if a lump sum split it.
 * 3. The contract payment covers that interest first, the rest reduces principal (a payment smaller
 *    than the interest never touches the balance).
 * 4. Any recurring overpayment then comes off principal.
 *
 * Under 'monthly' rests a lump sum applies at the due date of the period it falls in. The balance
 * never goes below zero: an overshooting payment is trimmed to what is owed.
 */
function runSchedule(terms: LoanTerms, payment: number) {
  const basis = terms.basis ?? 'actual/365';
  const funded = terms.fundedOn ?? impliedFunding(terms.firstPaymentOn);
  const dates = paymentDates(terms.firstPaymentOn, terms.months);
  const paymentCents = toCents(payment);
  const monthlyExtraCents = Math.max(0, toCents(terms.extra?.monthly ?? 0));

  const creditsOnTheDay = basis !== 'monthly';
  const lumpSums = (terms.extra?.lumpSums ?? [])
    .map((lump) => ({ on: lump.on, cents: Math.max(0, toCents(lump.amount)) }))
    .filter((lump) => lump.cents > 0)
    .sort((a, b) => utcDay(a.on) - utcDay(b.on));

  // The last payment on or before the statement date is where the real balance takes over.
  const anchor = terms.statement;
  const anchorIndex = anchor
    ? dates.reduce((found, due, index) => (utcDay(due) <= utcDay(anchor.on) ? index : found), -1)
    : -1;

  const rows: ScheduleRow[] = [];
  let balanceCents = toCents(terms.principal);
  let previous = funded;

  for (let index = 0; index < dates.length; index += 1) {
    const due = dates[index];
    const days = daysBetween(previous, due, dayCountOf(basis));

    // A lump sum dated before funding is honoured at funding, not dropped.
    const inPeriod = lumpSums.filter((lump) =>
      index === 0
        ? utcDay(lump.on) <= utcDay(due)
        : utcDay(lump.on) > utcDay(previous) && utcDay(lump.on) <= utcDay(due),
    );

    let creditedCents = 0;
    let interest = 0;
    let cursor = previous;
    let split = false;

    if (creditsOnTheDay) {
      for (const lump of inPeriod) {
        const at = utcDay(lump.on) < utcDay(previous) ? previous : lump.on;
        interest +=
          fromCents(balanceCents) * interestFraction(cursor, at, terms.annualRatePercent, basis);
        const applied = Math.min(lump.cents, balanceCents);
        balanceCents -= applied;
        creditedCents += applied;
        cursor = at;
        split = true;
      }
    }

    // An unsplit period is charged as one scheduled period; the tail of a split one is a span of days.
    interest +=
      fromCents(balanceCents) *
      (split
        ? interestFraction(cursor, due, terms.annualRatePercent, basis)
        : scheduledFraction(previous, due, terms.annualRatePercent, basis, index === 0));
    const interestCents = toCents(interest);

    if (!creditsOnTheDay) {
      for (const lump of inPeriod) {
        const applied = Math.min(lump.cents, balanceCents);
        balanceCents -= applied;
        creditedCents += applied;
      }
    }

    // The last payment settles whatever is left; an overshooting payment is trimmed.
    const last = index === dates.length - 1;
    let principalCents = paymentCents - interestCents;
    if (last || principalCents > balanceCents) principalCents = balanceCents;
    balanceCents -= principalCents;

    const extraCents = Math.min(monthlyExtraCents, balanceCents);
    balanceCents -= extraCents;

    const offBalanceCents = principalCents + extraCents + creditedCents;
    const paidCents = offBalanceCents + interestCents;

    // Snap to what the lender says is owed, then carry on from there.
    if (anchor && index === anchorIndex) balanceCents = toCents(anchor.principal);

    rows.push({
      number: index + 1,
      date: `${due.getFullYear()}-${String(due.getMonth() + 1).padStart(2, '0')}-${String(due.getDate()).padStart(2, '0')}`,
      days,
      payment: fromCents(paidCents),
      interest: fromCents(interestCents),
      principal: fromCents(offBalanceCents),
      extra: fromCents(extraCents + creditedCents),
      balance: fromCents(Math.max(0, balanceCents)),
      estimated: index <= anchorIndex,
    });

    previous = due;

    // Overpayments end the loan early; no zero-payment rows are emitted.
    if (balanceCents <= 0) break;
  }

  return { rows, basis, fundedOn: funded, shortfallCents: balanceCents };
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
 */
export function solvePayment(terms: Omit<LoanTerms, 'payment'>): number {
  if (terms.principal <= 0 || terms.months <= 0) return 0;

  const basis = terms.basis ?? 'actual/365';
  const funded = terms.fundedOn ?? impliedFunding(terms.firstPaymentOn);
  const dates = paymentDates(terms.firstPaymentOn, terms.months);

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

  return sum > 0 ? roundMoney((terms.principal * carried) / sum) : 0;
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
      fundedOn: terms.fundedOn ?? impliedFunding(terms.firstPaymentOn),
      payoffOn: null,
    };
  }

  const payment = terms.payment ?? solvePayment(terms);
  const { rows, basis, fundedOn } = runSchedule(terms, payment);

  const totalPaidCents = rows.reduce((sum, row) => sum + toCents(row.payment), 0);
  const totalInterestCents = rows.reduce((sum, row) => sum + toCents(row.interest), 0);

  return {
    payment,
    finalPayment: rows[rows.length - 1].payment,
    rows,
    totalPaid: fromCents(totalPaidCents),
    totalInterest: fromCents(totalInterestCents),
    interestShare: totalPaidCents > 0 ? totalInterestCents / totalPaidCents : 0,
    basis,
    fundedOn,
    payoffOn: rows[rows.length - 1].date,
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
 * 8.14% is $89.60 not yet billed).
 */
export function payoffQuote(terms: LoanTerms, asOf: Date): PayoffQuote {
  const schedule = amortise(terms);
  // A payoff is for one particular day, so even a monthly-rest loan is quoted with per diem interest
  // from the last posting, as a servicer's payoff letter does.
  const basis = dayCountOf(schedule.basis);
  const asOfDay = utcDay(asOf);

  const paid = schedule.rows.filter((row) => utcDay(new Date(`${row.date}T00:00:00`)) <= asOfDay);
  const upcoming = schedule.rows.filter(
    (row) => utcDay(new Date(`${row.date}T00:00:00`)) > asOfDay,
  );

  const last = paid[paid.length - 1] ?? null;
  const next = upcoming[0] ?? null;

  const principal = last ? last.balance : terms.principal;
  const since = last ? new Date(`${last.date}T00:00:00`) : schedule.fundedOn;
  const daysAccrued = Math.max(0, daysBetween(since, asOf, basis));
  const accrued = accruedInterest(principal, terms.annualRatePercent, daysAccrued, basis);

  const year = asOf.getFullYear();
  const interestIn = (target: number) =>
    fromCents(
      paid
        .filter((row) => Number(row.date.slice(0, 4)) === target)
        .reduce((sum, row) => sum + toCents(row.interest), 0),
    );

  return {
    principal,
    accruedInterest: accrued,
    payoff: roundMoney(principal + accrued),
    daysAccrued,
    lastPaymentOn: last ? new Date(`${last.date}T00:00:00`) : null,
    nextPaymentOn: next ? new Date(`${next.date}T00:00:00`) : null,
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

export function payoffDate(start: Date, months: number): Date {
  const dates = paymentDates(start, months);
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

export function scheduleByYear(rows: ScheduleRow[]) {
  const years = new Map<string, ScheduleRow[]>();
  for (const row of rows) {
    const year = row.date.slice(0, 4);
    const bucket = years.get(year);
    if (bucket) bucket.push(row);
    else years.set(year, [row]);
  }

  return [...years.entries()].map(([year, payments]) => ({
    year,
    payments,
    interest: fromCents(payments.reduce((sum, row) => sum + toCents(row.interest), 0)),
    principal: fromCents(payments.reduce((sum, row) => sum + toCents(row.principal), 0)),
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
};

/** A yyyy-mm-dd column as local midnight, not UTC — dates here have no time zone. */
const fromIsoDate = (value: string) => new Date(`${value}T00:00:00`);

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
    fundedOn: loan.funded_on ? fromIsoDate(loan.funded_on) : undefined,
    basis: loan.day_count_basis,
    payment: loan.monthly_payment > 0 ? loan.monthly_payment : undefined,
    statement:
      loan.statement_on && loan.statement_principal !== null
        ? { on: fromIsoDate(loan.statement_on), principal: loan.statement_principal }
        : undefined,
  };
}
