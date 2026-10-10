/**
 * Where a saved loan stands on a given day, read off its own schedule (`amortise`), so a bank's
 * payment, changed payments and a statement balance all count exactly as the schedule page shows
 * them. Build the terms with `termsFromStored`.
 *
 * - A payment dated on or before today is made; the rest are left. "27 of 48" is payments left of
 *   the schedule's real count, which a larger payment can bring under the term.
 * - What is left is the balance after the last payment made: principal only, as a statement prints
 *   it, without interest running since. Before the first payment it is the amount borrowed.
 * - Paid off is the share of the amount borrowed repaid, to the whole percent (half up), and never
 *   100 while a cent is left. A balance above the amount borrowed (a first period whose interest
 *   outran the payment) reads 0, not a negative share.
 * - A loan whose last payment has passed is paid off and leaves the totals.
 */

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
  /** The first payment after today, or null once the loan is paid off. */
  nextPayment: NextLoanPayment | null;
  /** yyyy-mm-dd of the last scheduled payment. */
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

/** `today` is the device's local day as yyyy-mm-dd (`useToday`), compared with the rows' dates. */
export function loanStatus(terms: LoanTerms, today: string): LoanStatus {
  const schedule = amortise(terms);
  const rows = schedule.rows;

  const next = rows.findIndex((row) => row.date > today);
  const made = next === -1 ? rows.length : next;
  const paidOff = made === rows.length;

  const borrowedCents = toCents(terms.principal);
  const leftCents = paidOff ? 0 : made === 0 ? borrowedCents : toCents(rows[made - 1].balance);
  const percent =
    leftCents <= 0 ? 100 : Math.min(99, wholePercent(borrowedCents - leftCents, borrowedCents));
  const upcoming = paidOff ? null : rows[made];

  return {
    borrowed: fromCents(borrowedCents),
    monthlyPayment: schedule.payment,
    paymentCount: rows.length,
    paymentsMade: made,
    paymentsLeft: rows.length - made,
    amountLeft: fromCents(leftCents),
    percentPaid: percent,
    nextPayment: upcoming
      ? { number: upcoming.number, date: upcoming.date, amount: upcoming.payment }
      : null,
    lastPaymentOn: schedule.payoffOn,
    paidOff,
  };
}

export type LoansSummary<L> = {
  /** Σ what is left on every open loan. */
  totalOwed: number;
  /** Σ the regular payments of every open loan. */
  monthlyPayments: number;
  /** The soonest next payment of any open loan, with its loan; the first listed wins a tie. */
  nextPayment: (NextLoanPayment & { loan: L }) | null;
  openCount: number;
  paidOffCount: number;
};

/**
 * The totals across the page's loans. Pass each loan with its status (and whatever the page needs
 * to name it); paid-off loans are counted but left out of every sum.
 */
export function loansSummary<L extends { status: LoanStatus }>(
  loans: readonly L[],
): LoansSummary<L> {
  let owedCents = 0;
  let monthlyCents = 0;
  let soonest: (NextLoanPayment & { loan: L }) | null = null;
  let openCount = 0;

  for (const loan of loans) {
    const { status } = loan;
    if (status.paidOff) continue;
    openCount += 1;
    owedCents += toCents(status.amountLeft);
    monthlyCents += toCents(status.monthlyPayment);
    if (status.nextPayment && (!soonest || status.nextPayment.date < soonest.date)) {
      soonest = { ...status.nextPayment, loan };
    }
  }

  return {
    totalOwed: fromCents(owedCents),
    monthlyPayments: fromCents(monthlyCents),
    nextPayment: soonest,
    openCount,
    paidOffCount: loans.length - openCount,
  };
}
