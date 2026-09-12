/**
 * Amortisation maths for fixed-rate, fixed-term loans.
 *
 * The aim is a schedule that matches the lender's own statement to the cent,
 * not one that matches a textbook. Four things separate the two:
 *
 * 1. **The convention is a choice, not a constant.** A US auto or personal
 *    lender accrues DAILY, so a 31-day period costs more than a 28-day one —
 *    on a $30k balance at 8.14% that is a $23 swing between February and March,
 *    every year. A mortgage servicer or a UK personal lender charges MONTHLY
 *    RESTS, one twelfth of the rate, and February costs the same as March. Both
 *    are mainstream and neither is a rounding of the other, so both are here
 *    (`AccrualBasis`), along with 30/360 and actual/360.
 * 2. **The gap between the money landing and the first payment is rarely one
 *    month.** Fund on 30 Nov and pay first on 14 Jan and the opening period is
 *    45 days, so payment one carries half again the interest of payment two.
 * 3. **Cents are posted, not carried.** Balances are integer cents and interest
 *    is rounded to the cent the moment it posts — once per period, however many
 *    pieces the period was accrued in — which is what a servicer does, so
 *    nothing drifts over 360 payments. Half goes up; see `@/lib/money`.
 * 4. **The last payment is not the same as the others.** Three hundred and
 *    sixty roundings have to land somewhere, and a lender puts them on the
 *    final payment so the balance closes at exactly zero.
 *
 * Overpayments (`Prepayment`) ride on top of all of that, and `comparePrepayment`
 * is what turns them into the two figures a borrower actually wants: the
 * interest avoided and the months removed from the end. The Reg Z APR lives
 * next door in `@/lib/apr`, because it is a disclosure rather than a schedule.
 */

import { fromCents, roundMoney, toCents } from '@/lib/money';

// --- Day counts -------------------------------------------------------------

/**
 * How a lender turns a date range into an interest fraction.
 *
 * 'actual/365' is the US installment-loan default (auto, personal). '30/360'
 * is the bond/mortgage convention where every month is 30 days — it is also
 * exactly the flat "APR ÷ 12" model, which is why it is offered here rather
 * than treated as a separate kind of maths.
 */
export type DayCountBasis = 'actual/365' | 'actual/360' | '30/360';

/**
 * Everything the engine can price, including the one convention that is not a
 * day count at all.
 *
 * 'monthly' is monthly rests: the period rate is the nominal annual rate over
 * twelve, applied whole, exactly as the textbook annuity formula assumes and
 * exactly how a US mortgage servicer and a UK personal lender post interest.
 * February costs the same as March. It is the mainstream convention — it is
 * what every rate table, every comparison site and most statements use — so it
 * is offered alongside the daily ones rather than hidden behind them.
 *
 * The only place it can disagree with '30/360' is an odd first period: 'monthly'
 * charges the leftover days as simple daily interest on actual/365 (the "per
 * diem" or "odd days interest" a lender collects at closing), while '30/360'
 * counts them as thirtieths of a month. Over whole months the two are
 * arithmetically identical — 30 days ÷ 360 is one twelfth — which is why a
 * whole-month 'monthly' loan can be stored as '30/360' without moving a cent.
 */
export type AccrualBasis = DayCountBasis | 'monthly';

const DAYS_IN_YEAR: Record<DayCountBasis, number> = {
  'actual/365': 365,
  'actual/360': 360,
  '30/360': 360,
};

/** How to count days under a convention that is not itself a day count. */
const dayCountOf = (basis: AccrualBasis): DayCountBasis =>
  basis === 'monthly' ? 'actual/365' : basis;

const MS_PER_DAY = 86_400_000;

/** A local calendar date pinned to UTC midnight, so DST cannot bend a day count. */
const utcDay = (date: Date) => Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());

/** Days from one date to another under the given convention. */
export function daysBetween(from: Date, to: Date, basis: DayCountBasis = 'actual/365'): number {
  if (basis !== '30/360') return Math.round((utcDay(to) - utcDay(from)) / MS_PER_DAY);

  // US 30/360: clamp the start to the 30th, and only pull a 31st back to the
  // 30th when the start was already there — otherwise Jan 30 → Jan 31 vanishes.
  const start = Math.min(from.getDate(), 30);
  const end = to.getDate() === 31 && start >= 30 ? 30 : to.getDate();
  return (
    360 * (to.getFullYear() - from.getFullYear()) +
    30 * (to.getMonth() - from.getMonth()) +
    (end - start)
  );
}

/**
 * The same day of the month, some months away, without drifting.
 *
 * The day is set last and clamped to the length of the target month, so 31 Jan
 * plus one month is 28 Feb and not 3 March — and because the clamp is applied
 * to the ORIGINAL day each time rather than to the running one, 31 Jan plus two
 * months is 31 March again. Walking a date forward a month at a time is the bug
 * this exists to avoid: one February drags every later payment to the 28th and
 * never lets go.
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
 * A span as whole months plus leftover days — the shape a monthly-rest lender
 * bills in, and the shape Reg Z's Appendix J discounts in.
 *
 * The months are counted first and the days are what is left over, so funding
 * on 30 Nov with a first payment on 14 Jan is one month and fifteen days, not
 * forty-five days of nothing in particular.
 */
export function monthsAndDaysBetween(from: Date, to: Date): { months: number; days: number } {
  if (utcDay(to) <= utcDay(from)) return { months: 0, days: 0 };

  let months = (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth());
  if (months < 0) months = 0;
  // The month arithmetic above can overshoot by one whenever the day of month
  // of `to` is earlier than the day of month of `from`.
  while (months > 0 && utcDay(addMonths(from, months)) > utcDay(to)) months -= 1;

  return { months, days: daysBetween(addMonths(from, months), to) };
}

/**
 * The fraction for one SCHEDULED period of a loan.
 *
 * Identical to `interestFraction` everywhere except monthly rests, where a
 * scheduled period is one rest by definition — whatever the calendar did to the
 * due dates. It has to be: a 30th-of-the-month loan runs 28 Feb → 30 Mar, which
 * is a month and two days by any honest count, and billing those two days would
 * charge thirteen rests a year on a twelve-rest loan. The odd days of the
 * OPENING period are real and are still charged, because that gap is a genuine
 * stub the borrower holds the money through.
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
 * The share of a year's interest a balance earns between two dates.
 *
 * One function for all four conventions, because it is the only place they
 * actually differ — everything downstream is the same arithmetic. Returned
 * unrounded: this is a rate, not a posting, and the rounding belongs at the
 * moment the interest hits the account.
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

// --- Money ------------------------------------------------------------------

/**
 * Interest earned on a balance over a span of days.
 *
 * Rounded to the cent because that is the figure that posts to the account;
 * carrying fractions of a cent forward would put the schedule a few cents away
 * from the statement it is meant to reproduce.
 */
export function accruedInterest(
  balance: number,
  annualRatePercent: number,
  days: number,
  basis: DayCountBasis = 'actual/365',
): number {
  if (balance <= 0 || days <= 0 || annualRatePercent <= 0) return 0;
  return roundMoney((balance * (annualRatePercent / 100) * days) / DAYS_IN_YEAR[basis]);
}

// --- Terms ------------------------------------------------------------------

export type LoanTerms = {
  /** Amount financed — the note, not the sticker price. */
  principal: number;
  annualRatePercent: number;
  months: number;
  firstPaymentOn: Date;
  /**
   * When interest starts running. Defaults to one month before the first
   * payment, which is the only assumption available when you are pricing a
   * hypothetical loan rather than tracking a real one.
   */
  fundedOn?: Date;
  basis?: AccrualBasis;
  /**
   * The lender's actual payment, when you know it from a statement.
   *
   * Worth passing whenever you have it. Lenders round the solved payment by
   * their own house rules, so a contract can sit a cent or two off anything
   * derived from first principles — and every later balance inherits that gap.
   */
  payment?: number;
  /**
   * A principal balance read off a statement, and the date it was true.
   *
   * This matters more than it looks. Under daily accrual a payment that lands
   * two days late costs two days more interest, and that difference never
   * washes out — it rides the balance for the rest of the term. Real histories
   * are full of such nudges, so a schedule rebuilt from origination alone will
   * sit cents to dollars away from the lender's. Anchoring to a figure you can
   * actually read makes everything from that date forward exact, and leaves
   * only the reconstructed past as an estimate.
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

/**
 * Money paid on top of the contract payment, all of it against principal.
 *
 * Two shapes cover almost every real case: rounding the payment up every month,
 * and throwing a bonus or a tax refund at the balance once. Both shorten the
 * term rather than the payment — which is what a lender does unless the
 * borrower asks for a formal re-amortisation.
 */
export type Prepayment = {
  /** Added to every scheduled payment. */
  monthly?: number;
  /** One-off amounts on given dates. */
  lumpSums?: readonly LumpSum[];
};

/** The month before the first payment, used when no funding date is known. */
function impliedFunding(firstPaymentOn: Date): Date {
  const funded = new Date(firstPaymentOn);
  funded.setMonth(funded.getMonth() - 1);
  if (funded.getDate() !== firstPaymentOn.getDate()) funded.setDate(0);
  return funded;
}

/** Due dates for the whole term, holding the day of month through short months. */
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

// --- Schedule ---------------------------------------------------------------

export type ScheduleRow = {
  /** 1-based payment number. */
  number: number;
  /** yyyy-mm-dd */
  date: string;
  /** Days this payment covers — the reason its interest differs from the last. */
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
 * Walks the schedule at a fixed payment. The engine everything else sits on.
 *
 * The order inside a period is the order a servicer posts in, and it is not
 * arbitrary:
 *
 * 1. A lump sum credits on the day it arrives (daily-accrual conventions only —
 *    see below), so the rest of the period accrues on the smaller balance.
 * 2. Interest for the period posts, rounded to the cent once. One posting, one
 *    rounding: splitting a period at a lump sum does not mean rounding twice,
 *    because the statement still shows a single interest line.
 * 3. The contract payment covers that interest first; what is left reduces
 *    principal. This is why a payment that is smaller than the interest never
 *    touches the balance.
 * 4. Any recurring overpayment comes off the principal after that.
 *
 * Under 'monthly' rests a mid-period credit does not accrue differently,
 * because the convention has no notion of a day — the rest is the rest. So for
 * that basis a lump sum applies at the due date of the period it falls in,
 * which is what a lender billing on monthly rests actually does.
 *
 * Every figure is carried as integer cents, and the balance is never allowed
 * below zero: a payment that would overshoot is trimmed to what is owed.
 */
function runSchedule(terms: LoanTerms, payment: number) {
  const basis = terms.basis ?? 'actual/365';
  const funded = terms.fundedOn ?? impliedFunding(terms.firstPaymentOn);
  const dates = paymentDates(terms.firstPaymentOn, terms.months);
  const paymentCents = toCents(payment);
  const monthlyExtraCents = Math.max(0, toCents(terms.extra?.monthly ?? 0));

  // Daily conventions credit on the day; periodic rests credit at the rest.
  const creditsOnTheDay = basis !== 'monthly';
  const lumpSums = (terms.extra?.lumpSums ?? [])
    .map((lump) => ({ on: lump.on, cents: Math.max(0, toCents(lump.amount)) }))
    .filter((lump) => lump.cents > 0)
    .sort((a, b) => utcDay(a.on) - utcDay(b.on));

  // The last payment on or before the stated date is where the real balance
  // takes over from the reconstructed one.
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

    // A lump sum dated before the money even landed is honoured at funding
    // rather than dropped, so a mistyped date cannot silently cost nothing.
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

    // An unsplit period is one scheduled period and is charged as one; the tail
    // of a split period is a span of days like any other.
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

    // The last payment settles whatever is actually left, and any payment that
    // would overshoot is trimmed — a loan cannot end owing less than nothing.
    const last = index === dates.length - 1;
    let principalCents = paymentCents - interestCents;
    if (last || principalCents > balanceCents) principalCents = balanceCents;
    balanceCents -= principalCents;

    const extraCents = Math.min(monthlyExtraCents, balanceCents);
    balanceCents -= extraCents;

    const offBalanceCents = principalCents + extraCents + creditedCents;
    const paidCents = offBalanceCents + interestCents;

    // Snap to what the lender actually says is owed, then carry on from there.
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

    // Overpayments end the loan early. Emitting the remaining rows as zeroes
    // would be a schedule of payments nobody makes.
    if (balanceCents <= 0) break;
  }

  return { rows, basis, fundedOn: funded, shortfallCents: balanceCents };
}

/**
 * The level payment that closes the loan exactly on its final due date.
 *
 * There is no annuity formula for this, because the annuity formula assumes
 * every period is the same length — the assumption that breaks the moment
 * interest is charged by the day. But the balance recursion
 *
 *     Bₖ = Bₖ₋₁·(1 + r·dₖ) − payment
 *
 * is linear in the payment, so it unrolls into a closed form rather than
 * needing a search:
 *
 *     payment = P · ∏ₖ(1 + r·dₖ) / Σₖ ∏ⱼ₌ₖ₊₁(1 + r·dⱼ)
 *
 * Both halves fall out of one backwards pass, which matters because the
 * calculator recomputes this on every drag of a slider — and a 40-year term
 * bisected to the cent is 40,000 rows of arithmetic per frame.
 *
 * A 0% loan needs no special case: every factor is 1, the product is 1, the
 * sum is n, and the answer is principal ÷ months.
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

  // Walk backwards: `carried` is the growth from period k to the end, which is
  // both the next term of the sum and one factor of the running product.
  let sum = 0;
  let carried = 1;
  for (let index = growth.length - 1; index >= 0; index -= 1) {
    sum += carried;
    carried *= growth[index];
  }

  return sum > 0 ? roundMoney((terms.principal * carried) / sum) : 0;
}

/** The full picture: every payment, where it goes, and what it costs. */
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

// --- Overpayments -----------------------------------------------------------

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
 * What paying extra is worth.
 *
 * Both schedules are run at the SAME contract payment — the one solved from
 * the original terms — because that is the comparison a borrower is actually
 * making: not "a bigger loan versus a smaller one" but "this loan, with and
 * without the extra". Solving the payment again against the shortened term
 * would quietly answer a different question and always report a smaller saving.
 *
 * The saving is interest avoided, not money made: paying $100 a month extra
 * costs $100 a month. It is reported next to the months removed from the end so
 * the two are read together.
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

// --- Statement figures ------------------------------------------------------

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
 * What the lender's app shows on any given day.
 *
 * A payoff quote is not the schedule balance. The schedule says what you owe
 * the instant a payment posts; a payoff says what you owe now, which includes
 * the interest that has been quietly running since. Fourteen days into a period
 * on a $28.7k balance at 8.14% that is $89.60 nobody has billed you for yet.
 */
export function payoffQuote(terms: LoanTerms, asOf: Date): PayoffQuote {
  const schedule = amortise(terms);
  // A payoff quote is a figure for one particular day, so even a monthly-rest
  // loan is quoted with per diem interest from the last posting — which is what
  // a servicer's own payoff letter does.
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

// --- Summary ----------------------------------------------------------------

export type LoanBreakdown = {
  monthlyPayment: number;
  totalPaid: number;
  totalInterest: number;
  /** Interest as a share of everything paid, 0–1. */
  interestShare: number;
};

/**
 * The quoted cost of a loan, on the flat "APR ÷ 12" convention.
 *
 * M = P · r(1+r)^n / ((1+r)^n − 1)
 *
 * This is the number every rate table and comparison site prints, so it is what
 * a calculator should show when nobody has said when the money lands. It is not
 * what a US installment lender will bill — for that, use `amortise` with a real
 * funding date. A 0% rate divides by zero here, so it is handled separately
 * rather than returning NaN; interest-free plans are a real case.
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

/** Last payment date, given when repayments start. */
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

// --- Back-compat ------------------------------------------------------------

/** @deprecated Prefer `ScheduleRow`, which carries the period's day count. */
export type AmortisationRow = ScheduleRow;

/**
 * Where every payment goes.
 *
 * @deprecated Prefer `amortise`, which takes a funding date and a day-count
 * basis. This keeps the flat 30/360 model the app shipped with, so existing
 * callers are not silently repriced.
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

/** Schedule rows grouped into years, for a term too long to scan flat. */
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

// --- Stored loans -----------------------------------------------------------

/** A loan as the database holds it. Structural, so the data layer stays out of here. */
export type StoredLoan = {
  principal: number;
  annual_rate: number;
  term_months: number;
  monthly_payment: number;
  first_payment_on: string | null;
  funded_on: string | null;
  /**
   * Including 'monthly' rests: the column can hold it from
   * `20260912100002_monthly_rests.sql` onwards, and the engine has always
   * priced it.
   */
  day_count_basis: AccrualBasis;
  statement_on: string | null;
  statement_principal: number | null;
};

/** A yyyy-mm-dd column as local midnight, not UTC — dates here have no time zone. */
const fromIsoDate = (value: string) => new Date(`${value}T00:00:00`);

/**
 * Terms for a loan already on file.
 *
 * The stored monthly payment is passed through as the contract payment rather
 * than being re-solved. It is what the lender actually bills, and re-deriving
 * it would reintroduce the cent of difference this whole engine exists to
 * avoid. Returns null when there is not enough on the row to build a schedule.
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
