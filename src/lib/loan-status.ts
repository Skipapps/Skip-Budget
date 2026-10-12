/**
 * Where a saved loan stands on a given day, read off its own schedule (`amortise`), so a bank's
 * payment, changed payments and a statement balance all count exactly as the schedule page shows
 * them. Build the terms with `termsFromStored`.
 *
 * - A payment dated on or before today is made; the rest are left. "27 of 48" is payments left of
 *   the schedule's real count, which a larger payment can bring under the term.
 * - What is left is the balance after the last payment or payoff made: principal only, as a
 *   statement prints it, without interest running since. Before either it is the amount borrowed.
 * - Paid off is the share of the amount borrowed repaid, to the whole percent (half up), and never
 *   100 while a cent is left. A balance above the amount borrowed (a first period whose interest
 *   outran the payment) reads 0, not a negative share.
 * - A loan whose last payment has passed, or that a payoff cleared, is paid off and leaves the
 *   totals; a payoff dated on or before today counts as made, as a payment does.
 */

import { toIsoDate } from '@/lib/date';
import { amortise, type LoanTerms } from '@/lib/loan';
import { fromCents, toCents } from '@/lib/money';

export type NextLoanPayment = {
  /** 1-based payment number. */
  number: number;
  /** yyyy-mm-dd */
  date: string;
  /** What that payment is: the regular one, a changed one, or the last. */
  amount: number;
};

export type LoanStatus = {
  /** The amount borrowed. */
  borrowed: number;
  /** The annual rate in percent, as saved: 6.25 is 6.25%. */
  annualRate: number;
  /**
   * yyyy-mm-dd the loan was funded, read off the schedule so it is the date interest runs from:
   * `funded_on`, else a month before the first payment.
   */
  startedOn: string;
  /** The regular payment, which the loan's monthly bill charges. */
  monthlyPayment: number;
  /** Every payment the schedule has. */
  paymentCount: number;
  paymentsMade: number;
  paymentsLeft: number;
  /** Principal still owed after the last payment made. */
  amountLeft: number;
  /** Whole percent of the amount borrowed repaid, 0 to 100; 100 only once nothing is left. */
  percentPaid: number;
  /**
   * The first payment after today, or null once the loan is paid off (or when a payoff after today
   * clears it before another payment is due).
   */
  nextPayment: NextLoanPayment | null;
  /** yyyy-mm-dd the loan ends: its last scheduled payment, or the payoff that clears it. */
  lastPaymentOn: string | null;
  /** Every payment is made: listed under "Paid off" and left out of the totals. */
  paidOff: boolean;
};

const BIG_TWO = BigInt(2);
const BIG_HUNDRED = BigInt(100);

/** paid / borrowed as a whole percent, half up, in integers: a float could tip a near-half. */
function wholePercent(paidCents: number, borrowedCents: number): number {
  if (paidCents <= 0 || borrowedCents <= 0) return 0;
  const borrowed = BigInt(borrowedCents);
  return Number((BIG_TWO * BIG_HUNDRED * BigInt(paidCents) + borrowed) / (BIG_TWO * borrowed));
}

/** The paid-off share by the rules above, for one loan or for the page's open loans together. */
function percentRepaid(borrowedCents: number, leftCents: number): number {
  return leftCents <= 0
    ? 100
    : Math.min(99, wholePercent(borrowedCents - leftCents, borrowedCents));
}

/** `today` is the device's local day as yyyy-mm-dd (`useToday`), compared with the rows' dates. */
export function loanStatus(terms: LoanTerms, today: string): LoanStatus {
  const schedule = amortise(terms);
  const rows = schedule.rows;

  const next = rows.findIndex((row) => row.date > today);
  const made = next === -1 ? rows.length : next;
  const cleared = schedule.payoffs.find((payoff) => payoff.full);
  const paidOff = cleared ? cleared.on <= today : made === rows.length;

  // What is left after the latest posting made: a payoff, when no payment came after it.
  const payoffsMade = schedule.payoffs.filter((payoff) => payoff.on <= today);
  const lastPayoff = payoffsMade[payoffsMade.length - 1];
  const borrowedCents = toCents(terms.principal);
  const leftCents = paidOff
    ? 0
    : lastPayoff && lastPayoff.afterPayments === made
      ? toCents(lastPayoff.balance)
      : made === 0
        ? borrowedCents
        : toCents(rows[made - 1].balance);
  const upcoming = paidOff ? null : (rows[made] ?? null);

  return {
    borrowed: fromCents(borrowedCents),
    annualRate: terms.annualRatePercent,
    startedOn: toIsoDate(schedule.fundedOn),
    monthlyPayment: schedule.payment,
    paymentCount: rows.length,
    paymentsMade: made,
    paymentsLeft: rows.length - made,
    amountLeft: fromCents(leftCents),
    percentPaid: percentRepaid(borrowedCents, leftCents),
    nextPayment: upcoming
      ? { number: upcoming.number, date: upcoming.date, amount: upcoming.payment }
      : null,
    lastPaymentOn: schedule.payoffOn,
    paidOff,
  };
}

export type LoansSummary = {
  /** Σ what is left on every open loan. */
  totalOwed: number;
  /** Σ the amount borrowed on every open loan. */
  totalBorrowed: number;
  /** totalBorrowed − totalOwed, never below 0. */
  totalPaid: number;
  /** totalPaid as a whole percent of totalBorrowed, by each loan's rule; 0 with no open loan. */
  percentPaid: number;
  /** The lowest and highest annual rate (percent) of the open loans; null with none open. */
  rateRange: { min: number; max: number } | null;
  /** Σ the regular payments of every open loan. */
  monthlyPayments: number;
  openCount: number;
};

/** The totals across the page's loans, from each one's status; paid-off loans are left out of every sum. */
export function loansSummary(loans: readonly { status: LoanStatus }[]): LoansSummary {
  let owedCents = 0;
  let borrowedCents = 0;
  let monthlyCents = 0;
  let rateRange: { min: number; max: number } | null = null;
  let openCount = 0;

  for (const loan of loans) {
    const { status } = loan;
    if (status.paidOff) continue;
    openCount += 1;
    owedCents += toCents(status.amountLeft);
    borrowedCents += toCents(status.borrowed);
    monthlyCents += toCents(status.monthlyPayment);
    const rate = status.annualRate;
    rateRange = rateRange
      ? { min: Math.min(rateRange.min, rate), max: Math.max(rateRange.max, rate) }
      : { min: rate, max: rate };
  }

  // A balance grown past what was borrowed is nothing repaid, not a negative amount, so the paid
  // figure agrees with the 0% printed beside it.
  const paidCents = Math.max(0, borrowedCents - owedCents);

  return {
    totalOwed: fromCents(owedCents),
    totalBorrowed: fromCents(borrowedCents),
    totalPaid: fromCents(paidCents),
    percentPaid: openCount === 0 ? 0 : percentRepaid(borrowedCents, owedCents),
    rateRange,
    monthlyPayments: fromCents(monthlyCents),
    openCount,
  };
}
