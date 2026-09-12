/**
 * Annual percentage rate, the way Regulation Z computes it.
 *
 * The nominal rate on a loan is not what the loan costs. Add a $300
 * origination fee to a $10,000 note and the borrower receives $9,700 but repays
 * a $10,000 schedule — the money costs more than the note says, and the APR is
 * the single figure that says by how much. It is also the figure a US lender is
 * required to disclose (12 CFR §1026.18(e)), so it is the one number a borrower
 * can use to compare two offers.
 *
 * ## The definition
 *
 * Appendix J to Part 1026, "Annual Percentage Rate Computations for Closed-End
 * Credit Transactions", part (b): the APR is the nominal annual rate whose unit
 * period rate `i` solves
 *
 *     A = Σⱼ  Pⱼ / [ (1 + f·i) · (1 + i)^tⱼ ]
 *
 * where `A` is the amount financed, `Pⱼ` is payment j, `tⱼ` is the number of
 * whole unit periods between the advance and that payment, and `f` is the
 * leftover fraction of a unit period. The APR is then `i × unit periods per
 * year`. Two details in that formula are the ones naive implementations miss:
 *
 * - **The odd first period is simple interest, not compound.** `(1 + f·i)`, not
 *   `(1 + i)^f`. Appendix J (b)(5)(ii) is explicit about it, and it is why a
 *   loan funded 45 days before its first payment discloses a slightly different
 *   APR than one funded 30 days before.
 * - **A monthly unit period is 30 days regardless of the calendar.** Appendix J
 *   (b)(4): the fraction `f` is the odd days over the number of days in the
 *   unit period, and for monthly credit that divisor is 30, even in February.
 *   This is the one place in the app where a month is not counted by the day —
 *   deliberately, because the regulation says so.
 *
 * There is no closed form for `i`, so it is bisected. The present value is
 * strictly decreasing in `i`, so bisection cannot pick the wrong root and does
 * not care how irregular the payment stream is.
 *
 * ## What this file is not
 *
 * It does not decide which charges are finance charges — that is §1026.4 and a
 * judgement call about the particular fee. The caller passes the prepaid
 * finance charge it has already identified.
 */

import { addMonths, daysBetween } from '@/lib/loan';
import { roundMoney, sumMoney, toCents } from '@/lib/money';

export type AprPayment = {
  on: Date;
  amount: number;
};

export type AprInput = {
  /** The advance: the note amount, what the schedule is built on. */
  advance: number;
  /**
   * Prepaid finance charges — origination fees, points, anything the borrower
   * pays at closing out of the advance. Reg Z §1026.18(b): these come off the
   * amount financed but stay in the payment stream, which is exactly why they
   * push the APR above the note rate.
   */
  prepaidFinanceCharge?: number;
  /** When the money is handed over. Time zero for every discount factor. */
  advancedOn: Date;
  /** Every scheduled payment, in date order. */
  payments: readonly AprPayment[];
  /** 12 for monthly credit, which is all this app writes today. */
  unitPeriodsPerYear?: number;
};

/** The four figures in a Truth in Lending box (§1026.18). */
export type TruthInLending = {
  /** The APR as a percentage, e.g. 8.24 for 8.24%. */
  apr: number;
  /** What the borrower actually receives: advance less prepaid charges. */
  amountFinanced: number;
  /** Everything the credit costs: interest over the term plus the fees. */
  financeCharge: number;
  /** The sum of every scheduled payment. */
  totalOfPayments: number;
  /** Interest alone, with the fees taken back out. */
  totalInterest: number;
};

/** Bisection stops here: 1e-12 on a monthly rate is 1.2e-8 of a percentage point. */
const RATE_TOLERANCE = 1e-12;
/** A monthly rate above this is not credit, it is a typo. 1200% APR. */
const MAX_UNIT_RATE = 100;
/**
 * Reported to 5 decimal places. Far tighter than the 1/8 of a percentage point
 * §1026.22(a)(2) allows, and tight enough that the last digit is the maths
 * rather than the bisection.
 */
const APR_DECIMALS = 5;

/**
 * Whole unit periods and leftover days between two dates, counting back from
 * the later one — Appendix J (b)(4)'s "unit periods ... measured backward from
 * the date of the payment".
 *
 * Counting back rather than forward is what keeps a stream regular: from a
 * 31 Jan advance, the payments on 28 Feb, 31 Mar and 30 Apr are 1, 2 and 3
 * whole unit periods, with no odd day appearing out of February.
 */
function unitPeriodsBetween(from: Date, to: Date): { periods: number; days: number } {
  const straightDays = daysBetween(from, to);
  if (straightDays <= 0) return { periods: 0, days: Math.max(0, straightDays) };

  let periods = (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth());
  if (periods < 0) periods = 0;
  while (periods > 0 && daysBetween(addMonths(from, periods), to) < 0) periods -= 1;

  return { periods, days: daysBetween(addMonths(from, periods), to) };
}

/**
 * Present value of the payment stream at a given unit period rate.
 *
 * Kept as a plain float sum: this is a rate solve, not a posting, so there is
 * no cent to round to until the answer comes out.
 */
function presentValue(
  payments: readonly { amount: number; periods: number; fraction: number }[],
  unitRate: number,
): number {
  let total = 0;
  for (const payment of payments) {
    total +=
      payment.amount / ((1 + payment.fraction * unitRate) * (1 + unitRate) ** payment.periods);
  }
  return total;
}

/** The whole Truth in Lending box for a payment stream. */
export function truthInLending(input: AprInput): TruthInLending {
  const periodsPerYear = input.unitPeriodsPerYear ?? 12;
  // Appendix J (b)(4): a unit period is 360/n days for the purpose of the odd
  // days fraction — 30 for monthly credit.
  const daysPerUnitPeriod = 360 / periodsPerYear;

  const fees = Math.max(0, input.prepaidFinanceCharge ?? 0);
  const amountFinanced = roundMoney(input.advance - fees);
  const totalOfPayments = sumMoney(input.payments.map((payment) => payment.amount));
  const totalInterest = roundMoney(totalOfPayments - input.advance);
  const financeCharge = roundMoney(totalInterest + fees);

  const discounted = input.payments
    .filter((payment) => toCents(payment.amount) > 0)
    .map((payment) => {
      const { periods, days } = unitPeriodsBetween(input.advancedOn, payment.on);
      return { amount: payment.amount, periods, fraction: days / daysPerUnitPeriod };
    });

  return {
    apr: solveApr(discounted, amountFinanced, periodsPerYear),
    amountFinanced,
    financeCharge,
    totalOfPayments,
    totalInterest,
  };
}

/** Just the rate, for callers that only want the headline. */
export function annualPercentageRate(input: AprInput): number {
  return truthInLending(input).apr;
}

function solveApr(
  payments: readonly { amount: number; periods: number; fraction: number }[],
  amountFinanced: number,
  periodsPerYear: number,
): number {
  if (payments.length === 0 || amountFinanced <= 0) return 0;

  // At a zero rate the present value is simply what is repaid. If that is no
  // more than what was financed, nothing is being charged for the credit —
  // an interest-free plan, or a subsidy. Reg Z has no negative APR to quote.
  if (presentValue(payments, 0) <= amountFinanced) return 0;

  let low = 0;
  let high = 0.01;
  while (presentValue(payments, high) > amountFinanced && high < MAX_UNIT_RATE) high *= 2;
  if (high >= MAX_UNIT_RATE) return roundTo(MAX_UNIT_RATE * periodsPerYear * 100, APR_DECIMALS);

  // The present value falls monotonically as the rate rises, so the root is
  // bracketed and bisection converges on it without any derivative.
  while (high - low > RATE_TOLERANCE) {
    const middle = (low + high) / 2;
    if (presentValue(payments, middle) > amountFinanced) low = middle;
    else high = middle;
  }

  return roundTo(((low + high) / 2) * periodsPerYear * 100, APR_DECIMALS);
}

function roundTo(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}
