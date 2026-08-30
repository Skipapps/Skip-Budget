/**
 * Amortisation maths for fixed-rate, fixed-term loans.
 *
 * Two things separate this from the textbook formula, and both are why a real
 * lender's statement disagrees with a naive calculator:
 *
 * 1. Interest accrues DAILY on the outstanding principal, not in twelfths of a
 *    year. A 31-day period costs more than a 28-day one — on a $30k balance at
 *    8.14% that is a $23 swing between February and March, every year.
 * 2. The gap between the money landing and the first payment is rarely one
 *    month. Fund on 30 Nov and pay first on 14 Jan and the opening period is 45
 *    days, so payment one carries half again the interest of payment two.
 *
 * Balances are carried as integer cents. Interest is the only place a division
 * happens, and it is rounded to the cent the moment it posts — which is what a
 * servicer does — so nothing drifts over 72 payments.
 */

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

const DAYS_IN_YEAR: Record<DayCountBasis, number> = {
  'actual/365': 365,
  'actual/360': 360,
  '30/360': 360,
};

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

// --- Money ------------------------------------------------------------------

const round2 = (value: number) => Math.round(value * 100) / 100;
const toCents = (value: number) => Math.round(value * 100);
const fromCents = (cents: number) => cents / 100;

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
  return round2((balance * (annualRatePercent / 100) * days) / DAYS_IN_YEAR[basis]);
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
  basis?: DayCountBasis;
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
  payment: number;
  interest: number;
  principal: number;
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
  basis: DayCountBasis;
  fundedOn: Date;
};

/** Walks the schedule at a fixed payment. The engine everything else sits on. */
function runSchedule(terms: LoanTerms, payment: number) {
  const basis = terms.basis ?? 'actual/365';
  const funded = terms.fundedOn ?? impliedFunding(terms.firstPaymentOn);
  const dates = paymentDates(terms.firstPaymentOn, terms.months);
  const paymentCents = toCents(payment);

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
    const days = daysBetween(previous, due, basis);
    const interestCents = toCents(
      accruedInterest(fromCents(balanceCents), terms.annualRatePercent, days, basis),
    );

    // The last payment settles whatever is actually left, and any payment that
    // would overshoot is trimmed — a loan cannot end owing less than nothing.
    const last = index === dates.length - 1;
    let principalCents = paymentCents - interestCents;
    if (last || principalCents > balanceCents) principalCents = balanceCents;

    const paidCents = principalCents + interestCents;
    balanceCents -= principalCents;

    // Snap to what the lender actually says is owed, then carry on from there.
    if (anchor && index === anchorIndex) balanceCents = toCents(anchor.principal);

    rows.push({
      number: index + 1,
      date: `${due.getFullYear()}-${String(due.getMonth() + 1).padStart(2, '0')}-${String(due.getDate()).padStart(2, '0')}`,
      days,
      payment: fromCents(paidCents),
      interest: fromCents(interestCents),
      principal: fromCents(principalCents),
      balance: fromCents(Math.max(0, balanceCents)),
      estimated: index <= anchorIndex,
    });

    previous = due;
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
  const dailyRate = terms.annualRatePercent / 100 / DAYS_IN_YEAR[basis];

  const growth = dates.map((due, index) => {
    const from = index === 0 ? funded : dates[index - 1];
    return 1 + dailyRate * daysBetween(from, due, basis);
  });

  // Walk backwards: `carried` is the growth from period k to the end, which is
  // both the next term of the sum and one factor of the running product.
  let sum = 0;
  let carried = 1;
  for (let index = growth.length - 1; index >= 0; index -= 1) {
    sum += carried;
    carried *= growth[index];
  }

  return sum > 0 ? round2((terms.principal * carried) / sum) : 0;
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
  const basis = schedule.basis;
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
    payoff: round2(principal + accrued),
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
    monthlyPayment: round2(monthlyPayment),
    totalPaid: round2(totalPaid),
    totalInterest: round2(totalInterest),
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
  day_count_basis: DayCountBasis;
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
