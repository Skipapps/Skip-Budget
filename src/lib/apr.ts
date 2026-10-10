/**
 * Annual percentage rate, the way Regulation Z computes it (12 CFR 1026 Appendix J, part (b)): the
 * nominal annual rate whose unit period rate `i` solves
 *
 *     A = Σⱼ  Pⱼ / [ (1 + f·i) · (1 + i)^tⱼ ]
 *
 * where `A` is the amount financed, `Pⱼ` is payment j, `tⱼ` is the whole unit periods between the
 * advance and that payment, and `f` is the leftover fraction of a unit period. APR = `i` times unit
 * periods per year.
 *
 * - The odd first period is simple interest, `(1 + f·i)`, not `(1 + i)^f`.
 * - For the odd-days fraction a monthly unit period is 30 days, even in February (Appendix J
 *   (b)(4)). It is the one place a month is not counted by the day.
 *
 * `i` has no closed form, so it is bisected; present value is strictly decreasing in `i`, so
 * bisection cannot pick the wrong root. Which charges are finance charges is the caller's call:
 * it passes the prepaid finance charge it has already identified.
 */

import { addMonths, daysBetween } from '@/lib/loan';
import { roundMoney, sumMoney, toCents } from '@/lib/money';

type AprPayment = {
  on: Date;
  amount: number;
};

export type AprInput = {
  /** The advance: the note amount, what the schedule is built on. */
  advance: number;
  /**
   * Prepaid finance charges (origination fees, points) paid at closing out of the advance. They come
   * off the amount financed but stay in the payment stream, which is why they push the APR above the
   * note rate.
   */
  prepaidFinanceCharge?: number;
  /** When the money is handed over. Time zero for every discount factor. */
  advancedOn: Date;
  /** Every scheduled payment, in date order. */
  payments: readonly AprPayment[];
  /** 12 for monthly credit, which is all this app writes today. */
  unitPeriodsPerYear?: number;
};

/** The figures in a Truth in Lending box (§1026.18). */
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
/** A monthly rate above this is not credit, it is a typo: 10,000% a month, 120,000% APR. */
const MAX_UNIT_RATE = 100;
/** Reported to 5 decimal places: far tighter than the 1/8 point §1026.22(a)(2) allows. */
const APR_DECIMALS = 5;

/**
 * Whole unit periods and leftover days between two dates, counted back from the later one
 * (Appendix J (b)(4)). Counting back keeps a stream regular: from a 31 Jan advance, payments on
 * 28 Feb, 31 Mar and 30 Apr are 1, 2 and 3 whole periods, with no odd day out of February.
 */
function unitPeriodsBetween(from: Date, to: Date): { periods: number; days: number } {
  const straightDays = daysBetween(from, to);
  if (straightDays <= 0) return { periods: 0, days: Math.max(0, straightDays) };

  let periods = (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth());
  if (periods < 0) periods = 0;
  while (periods > 0 && daysBetween(addMonths(from, periods), to) < 0) periods -= 1;

  return { periods, days: daysBetween(addMonths(from, periods), to) };
}

/** Present value of the payment stream at a unit period rate: a plain float sum, as this is a rate solve. */
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

export function truthInLending(input: AprInput): TruthInLending {
  const periodsPerYear = input.unitPeriodsPerYear ?? 12;
  // Appendix J (b)(4): a unit period is 360/n days for the odd-days fraction (30 for monthly).
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

export function annualPercentageRate(input: AprInput): number {
  return truthInLending(input).apr;
}

function solveApr(
  payments: readonly { amount: number; periods: number; fraction: number }[],
  amountFinanced: number,
  periodsPerYear: number,
): number {
  if (payments.length === 0 || amountFinanced <= 0) return 0;

  // Repaying no more than was financed is interest-free (or subsidised); Reg Z has no negative APR.
  if (presentValue(payments, 0) <= amountFinanced) return 0;

  let low = 0;
  let high = 0.01;
  while (presentValue(payments, high) > amountFinanced && high < MAX_UNIT_RATE) high *= 2;
  if (high >= MAX_UNIT_RATE) return roundTo(MAX_UNIT_RATE * periodsPerYear * 100, APR_DECIMALS);

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
